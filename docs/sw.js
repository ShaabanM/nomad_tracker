// Service Worker for offline caching
const CACHE_NAME = 'nomad-tracker-v7';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/data/jurisdictions.js',
  './js/data/citizenship-rules.js',
  './js/data/tax-rules.js',
  './js/services/storage.js',
  './js/services/rules-engine.js',
  './js/services/tips-engine.js',
  './js/services/tax-engine.js',
  './js/services/location.js',
  './js/views/dashboard.js',
  './js/views/timeline.js',
  './js/views/settings.js',
  './js/views/detail.js',
  './js/views/onboarding.js',
  './js/views/gap-review.js',
  './js/views/location-override.js',
  './js/views/tax-dashboard.js',
  './js/views/tax-detail.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Install: cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML + module JS so updates reach users fast;
// cache-first for static assets (CSS, icons, images); network-first for API.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Network-first for reverse-geocoding API
  if (url.hostname === 'api.bigdatacloud.net') {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Network-first for HTML + JS + CSS so we don't serve stale code indefinitely
  const isAppCode = req.destination === 'document' ||
    req.destination === 'script' ||
    req.destination === 'style' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css');

  if (isAppCode) {
    event.respondWith(
      fetch(req).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for everything else (CSS, icons, manifest)
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      });
    })
  );
});
