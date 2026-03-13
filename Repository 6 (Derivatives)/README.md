# Automated Derivatives Risk Report System

A production-grade Python pipeline that fetches live market data, prices an options portfolio using Black-Scholes, computes full Greeks, generates P&L attribution, writes AI-powered risk commentary via the Claude API, and produces a formatted PDF report — all in a single command.

---

## Architecture

```
Repository 6 (Derivatives)/
├── main.py                    # Pipeline entry point (12-step orchestration)
├── config.py                  # Centralised configuration + env vars
├── portfolio.csv              # Option positions (ticker, type, strike, expiry, qty, entry)
├── requirements.txt
│
├── data/
│   ├── __init__.py
│   ├── market_data.py         # yfinance wrappers with 3-retry logic
│   └── storage.py             # SQLite snapshot persistence
│
├── engine/
│   ├── __init__.py
│   ├── pricing.py             # Black-Scholes + implied-vol solver (Newton-Raphson / Brent)
│   ├── greeks.py              # Delta, Gamma, Vega, Theta, Rho
│   └── portfolio.py           # Per-position MtM, aggregation, payload builder
│
├── narrator/
│   ├── __init__.py
│   └── claude_narrator.py     # Claude API (claude-sonnet-4-5) risk commentary
│
├── reports/
│   ├── __init__.py
│   ├── pdf_report.py          # fpdf2-based PDF generator
│   └── output/                # Generated PDFs land here
│
└── scheduler/
    ├── __init__.py
    └── run_daily.py           # Long-running scheduler (fires pipeline daily)
```

---

## Setup

### 1. Clone / navigate to the project

```bash
cd "Repository 6 (Derivatives)"
```

### 2. Create a virtual environment (recommended)

```bash
python -m venv .venv
source .venv/bin/activate        # Linux / macOS
.venv\Scripts\activate           # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set the Anthropic API key

The pipeline calls Claude to generate institutional-quality risk commentary.
You **must** set your Anthropic API key as an environment variable:

```bash
# Linux / macOS
export ANTHROPIC_API_KEY="sk-ant-..."

# Windows (Command Prompt)
set ANTHROPIC_API_KEY=sk-ant-...

# Windows (PowerShell)
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

> Without the key the pipeline still runs; it will skip AI commentary and embed a placeholder message in the PDF.

---

## Running the Pipeline

### Single run (generate today's report)

```bash
python main.py
```

The script will:
1. Fetch live spot prices, risk-free rate, VIX, and daily market moves via Yahoo Finance.
2. Compute implied volatility, current price, and Greeks for every position.
3. Aggregate net Dollar Delta / Gamma / Vega / Theta across the book.
4. Check against risk limits (Delta limit: $100,000 | Vega limit: $200,000).
5. Flag any option expiring within 7 calendar days.
6. Send the full payload to Claude and receive a four-paragraph narrative.
7. Generate a timestamped PDF in `reports/output/`.
8. Persist today's snapshot to `snapshots.db` for tomorrow's delta comparison.

### Daily scheduler (runs every day at 16:30 local time)

```bash
python scheduler/run_daily.py
```

Override the run time:

```bash
python scheduler/run_daily.py --time 17:00
```

Test immediately without waiting:

```bash
python scheduler/run_daily.py --run-once
```

---

## portfolio.csv Format

```
ticker,option_type,strike,expiry,quantity,entry_price
SPY,call,580,2026-04-17,10,8.50
SPY,put,540,2026-04-17,-5,6.20
```

| Column | Type | Notes |
|---|---|---|
| `ticker` | str | Yahoo Finance symbol (SPY, QQQ, AAPL, …) |
| `option_type` | str | `call` or `put` (case-insensitive) |
| `strike` | float | Option strike price in USD |
| `expiry` | str | Expiration date `YYYY-MM-DD` |
| `quantity` | int | Contracts held — **negative = short** |
| `entry_price` | float | Option premium at trade inception (per share, not per contract) |

Each contract covers **100 shares** (OPTION_MULTIPLIER = 100).

---

## Output Description

### PDF Report (`reports/output/derivatives_risk_report_<TIMESTAMP>.pdf`)

| Section | Contents |
|---|---|
| **Header** | Firm branding, report date |
| **Executive Summary** | Total MtM, daily P&L, P&L attribution (delta / vega / theta), active position count, alert count |
| **Portfolio Greeks** | Net Dollar Delta, Vega, Gamma, Theta vs prior day vs limits — colour-coded OK / BREACH |
| **Top 5 by Vega** | Highest-vega positions with ticker, type, strike, expiry, qty, MtM, $ vega, implied vol |
| **Market Context** | Daily percentage move for each underlying + VIX level |
| **Risk Alerts** | Limit breaches and near-expiry warnings |
| **AI Commentary** | Four-paragraph Claude narrative: P&L drivers, Greek exposure changes, vol environment, forward watch items |

### Snapshot Database (`snapshots.db`)

SQLite file in the project root.  Each row stores the full serialised metrics dict for one trading day, keyed by `YYYY-MM-DD`.  The pipeline loads the most-recent prior snapshot (up to 7 calendar days back) to compute day-over-day changes in Greeks.

---

## Configuration (`config.py`)

| Variable | Default | Description |
|---|---|---|
| `PORTFOLIO_FILE` | `portfolio.csv` | Path to the portfolio CSV |
| `CLAUDE_API_KEY` | `$ANTHROPIC_API_KEY` | Anthropic API key |
| `RISK_FREE_RATE_TICKER` | `^IRX` | Yahoo Finance ticker for T-bill yield |
| `DELTA_LIMIT` | 100,000 | Maximum absolute net dollar delta |
| `VEGA_LIMIT` | 200,000 | Maximum absolute net dollar vega |
| `REPORT_OUTPUT_DIR` | `reports/output/` | PDF output directory |
| `OPTION_MULTIPLIER` | 100 | Shares per contract |
| `FETCH_RETRIES` | 3 | yfinance retry attempts |
| `FETCH_RETRY_DELAY_SEC` | 2.0 | Seconds between retries |

---

## Pricing Model

- **Model**: Black-Scholes-Merton (European options)
- **Implied Vol Solver**: Newton-Raphson (primary) → Brent's method (fallback) → 20% default
- **Time convention**: `T = max((expiry − today) / 365, 1/365)` to avoid zero-time singularities
- **Risk-free rate**: 13-week T-bill (^IRX) annualised percentage, converted to decimal
- **Dollar Greeks**: `Greek × quantity × 100`

---

## Extending the System

- **Add underlyings**: Append rows to `portfolio.csv` — the pipeline auto-discovers unique tickers.
- **Change risk limits**: Edit `DELTA_LIMIT` / `VEGA_LIMIT` in `config.py`.
- **Custom commentary prompt**: Edit `_SYSTEM_PROMPT` in `narrator/claude_narrator.py`.
- **Different Claude model**: Change `_MODEL` in `narrator/claude_narrator.py`.
- **Add Greeks (e.g. Vomma, Charm)**: Extend `engine/greeks.py` and add columns in `reports/pdf_report.py`.
