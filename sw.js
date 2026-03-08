// KIKOU Service Worker - PWA + Offline + Auto-generated Icons
const CACHE_NAME = 'kikou-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// ========================================
// AUTO-GENERATE ICONS via OffscreenCanvas
// ========================================
async function generateIconResponse(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background - dark gradient
  ctx.fillStyle = '#0d0d14';
  ctx.beginPath();
  const r = size * 0.12;
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Ambient glow
  const glow = ctx.createRadialGradient(size * 0.35, size * 0.4, 0, size * 0.5, size * 0.5, size * 0.6);
  glow.addColorStop(0, 'rgba(245, 158, 11, 0.18)');
  glow.addColorStop(0.6, 'rgba(139, 92, 246, 0.06)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Border accent
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = Math.max(1, size * 0.012);
  ctx.stroke();

  // "K" letter
  const fontSize = size * 0.52;
  ctx.font = `900 ${fontSize}px "Segoe UI", system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Gold gradient for K
  const grad = ctx.createLinearGradient(size * 0.25, size * 0.2, size * 0.75, size * 0.8);
  grad.addColorStop(0, '#f59e0b');
  grad.addColorStop(0.4, '#fbbf24');
  grad.addColorStop(0.7, '#f59e0b');
  grad.addColorStop(1, '#d97706');
  ctx.fillStyle = grad;
  ctx.fillText('K', size * 0.5, size * 0.48);

  // Small purple sparkle
  ctx.font = `700 ${size * 0.09}px system-ui`;
  ctx.fillStyle = '#a78bfa';
  ctx.fillText('\u2726', size * 0.77, size * 0.24);

  // Convert to PNG blob
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Response(blob, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000'
    }
  });
}

// ========================================
// INSTALL: Cache core assets
// ========================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Cache core files
      await cache.addAll(ASSETS_TO_CACHE);

      // Pre-generate and cache icons
      const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
      for (const size of sizes) {
        try {
          const response = await generateIconResponse(size);
          const url = new URL(`./icons/icon-${size}.png`, self.location.origin + self.location.pathname.replace('sw.js', ''));
          await cache.put(url.href, response);
        } catch (e) {
          console.warn(`Failed to generate icon-${size}:`, e);
        }
      }
    })
  );
  self.skipWaiting();
});

// ========================================
// ACTIVATE: Clean old caches
// ========================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ========================================
// FETCH: Serve from cache, generate icons on-the-fly, fallback to network
// ========================================
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Intercept icon requests - generate dynamically if not cached
  const iconMatch = url.pathname.match(/icons\/icon-(\d+)\.png$/);
  if (iconMatch) {
    const size = parseInt(iconMatch[1]);
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return generateIconResponse(size).then(response => {
          // Cache for future use
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return response;
        });
      })
    );
    return;
  }

  // Normal requests: cache-first, network fallback
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchResponse => {
        if (event.request.method === 'GET') {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return fetchResponse;
      });
    }).catch(() => {
      if (event.request.destination === 'document') {
        return caches.match('./index.html');
      }
    })
  );
});
