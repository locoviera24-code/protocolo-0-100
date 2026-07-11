import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const versionSource = await readFile(new URL('../app-version.js', import.meta.url), 'utf8');
const versionManifest = JSON.parse(await readFile(new URL('../app-version.json', import.meta.url), 'utf8'));
const currentCacheName = `protocolo-0-100-pwa-${versionManifest.version}-b${versionManifest.build}`;
const previousCacheName = `protocolo-0-100-pwa-${versionManifest.version}-b${versionManifest.build-1}`;
const handlers = {};
const deletedCaches = [];
const cacheStores = new Map();
let skipWaitingCalls = 0;
let fetchImpl = async () => {
  throw new Error('offline');
};

function requestKey(request) {
  return typeof request === 'string'
    ? new URL(request, 'https://app.test/protocolo/sw.js').href
    : request.url;
}

function withoutSearch(value) {
  const url = new URL(value, 'https://app.test/protocolo/');
  url.search = '';
  url.hash = '';
  return url.href;
}

class MockCache {
  constructor() {
    this.entries = new Map();
  }

  async addAll(assets) {
    for (const asset of assets) {
      this.entries.set(new URL(asset, 'https://app.test/protocolo/sw.js').href, new Response(asset));
    }
  }

  async match(request, options = {}) {
    const key = requestKey(request);
    if (this.entries.has(key)) return this.entries.get(key).clone();
    if (!options.ignoreSearch) return undefined;
    const canonical = withoutSearch(key);
    for (const [candidate, response] of this.entries) {
      if (withoutSearch(candidate) === canonical) return response.clone();
    }
    return undefined;
  }

  async put(request, response) {
    this.entries.set(requestKey(request), response.clone());
  }
}

const caches = {
  async open(name) {
    if (!cacheStores.has(name)) cacheStores.set(name, new MockCache());
    return cacheStores.get(name);
  },
  async keys() {
    return [...cacheStores.keys()];
  },
  async delete(name) {
    deletedCaches.push(name);
    return cacheStores.delete(name);
  }
};

const self = {
  location: {href: 'https://app.test/protocolo/sw.js', origin: 'https://app.test'},
  clients: {claim: async () => undefined},
  skipWaiting: async () => { skipWaitingCalls += 1; },
  addEventListener(type, handler) {
    handlers[type] = handler;
  }
};

const context=vm.createContext({
  self,
  caches,
  fetch: request => fetchImpl(request),
  URL,
  Set,
  Response,
  console
});
context.importScripts=()=>vm.runInContext(versionSource,context,{filename:'app-version.js'});
vm.runInContext(source,context,{filename:'sw.js'});

let installation;
handlers.install({waitUntil(value) { installation = Promise.resolve(value); }});
await installation;
assert.equal(skipWaitingCalls, 0, 'La instalacion no debe activar una actualizacion sin permiso');
handlers.message({data: {type: 'SKIP_WAITING'}});
assert.equal(skipWaitingCalls, 1, 'El boton de actualizar debe poder activar el worker en espera');

function dispatchFetch(request) {
  let responsePromise;
  const waits = [];
  handlers.fetch({
    request,
    respondWith(value) {
      responsePromise = Promise.resolve(value);
    },
    waitUntil(value) {
      waits.push(Promise.resolve(value));
    }
  });
  return {responsePromise, waits};
}

cacheStores.set('protocolo-0-100-pwa-legacy', new MockCache());
cacheStores.set(previousCacheName, new MockCache());
cacheStores.set(currentCacheName, new MockCache());
cacheStores.set('otra-app-cache', new MockCache());
let activation;
handlers.activate({waitUntil(value) { activation = Promise.resolve(value); }});
await activation;
assert.deepEqual(deletedCaches.sort(), ['protocolo-0-100-pwa-legacy', previousCacheName].sort());
assert.equal(cacheStores.has('otra-app-cache'), true);

const fdc = dispatchFetch({method: 'GET', mode: 'cors', url: 'https://api.nal.usda.gov/fdc/v1/foods/search'});
assert.equal(fdc.responsePromise, undefined);

const unknown = dispatchFetch({method: 'GET', mode: 'cors', url: 'https://app.test/protocolo/otro.json'});
assert.equal(unknown.responsePromise, undefined);

fetchImpl = async () => new Response('window.GYM_PARTY_FIREBASE_CONFIG={projectId:"real"};');
const firebaseOnline = dispatchFetch({method: 'GET', mode: 'cors', url: 'https://app.test/protocolo/firebase-config.js?v=34'});
assert.match(await (await firebaseOnline.responsePromise).text(), /projectId:"real"/);
fetchImpl = async () => { throw new Error('offline'); };
const firebaseOffline = dispatchFetch({method: 'GET', mode: 'cors', url: 'https://app.test/protocolo/firebase-config.js'});
const firebaseFallback = await firebaseOffline.responsePromise;
assert.equal(firebaseFallback.status, 200);
assert.match(await firebaseFallback.text(), /GYM_PARTY_FIREBASE_CONFIG/);

const currentCache = await caches.open(currentCacheName);
currentCache.entries.set('https://app.test/protocolo/index.html', new Response('offline-index'));
const navigation = dispatchFetch({method: 'GET', mode: 'navigate', url: 'https://app.test/protocolo/?v=211'});
assert.equal(await (await navigation.responsePromise).text(), 'offline-index');

currentCache.entries.set('https://app.test/protocolo/workout-features.js', new Response('cached-core'));
const core = dispatchFetch({method: 'GET', mode: 'cors', url: 'https://app.test/protocolo/workout-features.js?v=220'});
assert.equal(await (await core.responsePromise).text(), 'cached-core');
await Promise.all(core.waits);

console.log('Service worker correcto: actualizacion consentida, Firebase no cacheado, cache acotada y navegacion offline.');
