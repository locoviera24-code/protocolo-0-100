const CACHE_PREFIX = 'protocolo-0-100-pwa-';
const CACHE_NAME = `${CACHE_PREFIX}v24`;
const CORE_ASSETS = ['./', './index.html', './nutrition-data.js', './fdc-client.js', './workout-features.js', './gym-party.js', './advanced-features.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
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

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  if (CORE_URLS.has(canonicalUrl(event.request.url))) {
    event.respondWith(coreAssetResponse(event.request, event));
  }
});
