const CACHE_PREFIX = 'protocolo-0-100-pwa-';
// v45 corresponde al rediseño completo y la migracion Firebase de 2.7.0.
const CACHE_NAME = `${CACHE_PREFIX}v45`;
const CORE_ASSETS = ['./', './index.html', './styles/tokens.css', './styles/base.css', './styles/components.css', './styles/modules.css', './styles/responsive.css', './nutrition-data.js', './fdc-client.js', './workout-store.js', './workout-plan.js', './workout-metrics.js', './workout-ranking.js', './workout-ui.js', './workout-features.js', './firebase-service.js', './gym-party-sync.js', './gym-party-metrics.js', './gym-party-ui.js', './gym-party.js', './advanced-features.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const CORE_URLS = new Set(CORE_ASSETS.map(asset => new URL(asset, self.location.href).href));

function canonicalUrl(requestUrl) {
  const url = new URL(requestUrl);
  url.search = '';
  url.hash = '';
  return url.href;
}

function isCacheable(response) {
  return !!response && response.ok && response.type === 'basic';
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) await cache.put('./index.html', response.clone());
    return response;
  } catch (error) {
    const fallback = await cache.match('./index.html') || await cache.match('./');
    return fallback || new Response('La app no está disponible sin conexión todavía.', {
      status: 503,
      headers: {'Content-Type': 'text/plain; charset=utf-8'}
    });
  }
}

async function coreAssetResponse(request, event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, {ignoreSearch: true});
  const network = fetch(request).then(async response => {
    if (isCacheable(response)) await cache.put(canonicalUrl(request.url), response.clone());
    return response;
  }).catch(() => null);

  if (cached) {
    event.waitUntil(network.then(() => undefined));
    return cached;
  }

  return await network || new Response('Recurso no disponible sin conexión.', {
    status: 503,
    headers: {'Content-Type': 'text/plain; charset=utf-8'}
  });
}

async function firebaseConfigResponse(request) {
  try {
    return await fetch(request, {cache: 'no-store'});
  } catch (error) {
    return new Response('window.GYM_PARTY_FIREBASE_CONFIG=window.GYM_PARTY_FIREBASE_CONFIG||{};', {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  }
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/firebase-config.js')) {
    event.respondWith(firebaseConfigResponse(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  if (CORE_URLS.has(canonicalUrl(event.request.url))) {
    event.respondWith(coreAssetResponse(event.request, event));
  }
});
