"""
config.py
---------
Central configuration for the Derivatives Risk Report System.
All tuneable parameters and environment-variable driven secrets live here.
"""

import os

# ---------------------------------------------------------------------------
# Portfolio
# ---------------------------------------------------------------------------
PORTFOLIO_FILE: str = "portfolio.csv"

# ---------------------------------------------------------------------------
# Claude / Anthropic
# ---------------------------------------------------------------------------
CLAUDE_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

# ---------------------------------------------------------------------------
# Market data tickers
# ---------------------------------------------------------------------------
RISK_FREE_RATE_TICKER: str = "^IRX"   # 13-week T-bill yield
VIX_TICKER: str = "^VIX"

# ---------------------------------------------------------------------------
# Risk limits (dollar notional)
# ---------------------------------------------------------------------------
DELTA_LIMIT: float = 100_000.0   # maximum absolute net dollar delta
VEGA_LIMIT: float = 200_000.0    # maximum absolute net dollar vega

# ---------------------------------------------------------------------------
# Report output
# ---------------------------------------------------------------------------
REPORT_OUTPUT_DIR: str = "reports/output/"

# ---------------------------------------------------------------------------
# Options mechanics
# ---------------------------------------------------------------------------
OPTION_MULTIPLIER: int = 100   # standard US equity options contract multiplier

# ---------------------------------------------------------------------------
# Data-fetch resilience
# ---------------------------------------------------------------------------
FETCH_RETRIES: int = 3
FETCH_RETRY_DELAY_SEC: float = 2.0
