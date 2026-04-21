// ET7 Service Worker
// Strategy:
//   - App shell (HTML, fonts, Plotly) → Cache-first, update in background
//   - Data files (ks_data.json, etc.)  → Network-first, fall back to cache
//   - Everything else                  → Network with cache fallback

const CACHE_NAME    = 'et7-v1';
const DATA_CACHE    = 'et7-data-v1';

// App shell — cached on install, served from cache first
const SHELL_URLS = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=Rajdhani:wght@500;600;700&display=swap',
  'https://cdn.plot.ly/plotly-2.27.0.min.js',
];

// Data files — fetched fresh when online, cached as fallback
const DATA_PATTERNS = [
  /ks_data\.json$/,
  /ne_data\.json$/,
  /co_data\.json$/,
  /crop_stages\.json$/,
];

// ── INSTALL: pre-cache the app shell ─────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())  // activate immediately
  );
});

// ── ACTIVATE: remove old caches ───────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())  // take control immediately
  );
});

// ── FETCH: routing logic ──────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and browser-extension requests
  if(event.request.method !== 'GET') return;
  if(url.protocol === 'chrome-extension:') return;

  // Data files → network-first, fall back to cache
  const isData = DATA_PATTERNS.some(p => p.test(url.pathname));
  if(isData){
    event.respondWith(networkFirstData(event.request));
    return;
  }

  // App shell + everything else → cache-first, update in background
  event.respondWith(cacheFirstWithUpdate(event.request));
});

// Network-first: try network, cache on success, fall back to cache
async function networkFirstData(request){
  try{
    const networkResponse = await fetch(request);
    if(networkResponse.ok){
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch(err){
    const cached = await caches.match(request, { cacheName: DATA_CACHE });
    if(cached) return cached;
    // Return a meaningful offline response for data files
    return new Response(
      JSON.stringify({ error: 'offline', message: 'County data unavailable offline — please reconnect.' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Cache-first: serve from cache, update cache in background
async function cacheFirstWithUpdate(request){
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(networkResponse => {
    if(networkResponse.ok){
      caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(() => null);

  return cached || await fetchPromise || new Response('Offline', { status: 503 });
}
