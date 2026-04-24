// ET7 Service Worker — v3
// Single cache, cache-first for everything.
// All files pre-cached on install. Bump CACHE_NAME to update.

const CACHE_NAME = 'et7-v1';

const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './plotly-2.27.0.min.js',
  './ks_data.json',
  // Add future state files here:
  // './ne_data.json',
  // './co_data.json',
  './fonts/IBMPlexSans-Regular.ttf',
  './fonts/IBMPlexSans-SemiBold.ttf',
  './fonts/IBMPlexSans-Bold.ttf',
  './fonts/IBMPlexMono-Regular.ttf',
  './fonts/IBMPlexMono-SemiBold.ttf',
  './fonts/IBMPlexMono-Bold.ttf',
];

// ── INSTALL: pre-cache everything ────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: delete any old caches ──────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first for everything ────────────────────────
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  if(new URL(event.request.url).protocol === 'chrome-extension:') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(response => {
        if(response.ok){
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        }
        return response;
      }).catch(() => new Response('Offline', { status: 503 }));
    })
  );
});
