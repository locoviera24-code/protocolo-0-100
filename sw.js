importScripts('./app-version.js','./precache-manifest.js');

const CACHE_PREFIX='protocolo-0-100-pwa-';
const CACHE_NAME=APP_VERSION_INFO.cacheName;
const STAGING_CACHE_NAME=`${CACHE_NAME}-staging`;
const PRECACHE=validateManifest(PRECACHE_MANIFEST);
const PRECACHE_ASSETS=[...PRECACHE.required,...PRECACHE.optional];
const PRECACHE_BY_URL=new Map(PRECACHE_ASSETS.map(asset=>[canonicalUrl(new URL(asset.url,self.location.href)),asset]));
const INDEX_ASSET=PRECACHE.required.find(asset=>asset.url.endsWith('/index.html'));
const OFFLINE_ASSET=PRECACHE.required.find(asset=>asset.url.endsWith('/offline.html'));

function validateManifest(manifest){
  if(!manifest||manifest.schemaVersion!==1||manifest.version!==APP_VERSION_INFO.version||manifest.build!==APP_VERSION_INFO.build||manifest.cacheName!==CACHE_NAME)throw new Error('PRECACHE_VERSION_MISMATCH');
  if(!Array.isArray(manifest.required)||!manifest.required.length||!Array.isArray(manifest.optional))throw new Error('PRECACHE_INVALID_MANIFEST');
  for(const asset of [...manifest.required,...manifest.optional]){
    if(!asset?.url||!/^[a-f\d]{64}$/i.test(asset.sha256)||!Number.isFinite(asset.bytes))throw new Error('PRECACHE_INVALID_ASSET');
  }
  return manifest;
}

function canonicalUrl(requestUrl){
  const url=new URL(requestUrl,self.location.href);
  url.search='';
  url.hash='';
  return url.href;
}

function isCacheable(response){
  return !!response&&response.ok&&['basic','cors','default'].includes(response.type);
}

function isTextAsset(url){
  return /\.(?:css|html|js|json|mjs|svg|txt|webmanifest|xml)$/i.test(new URL(url,self.location.href).pathname);
}

async function responseFingerprint(response,url){
  const raw=new Uint8Array(await response.clone().arrayBuffer());
  const bytes=isTextAsset(url)?new TextEncoder().encode(new TextDecoder().decode(raw).replace(/\r\n?/g,'\n')):raw;
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return{bytes:bytes.byteLength,sha256:[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('')};
}

async function verifiedResponse(asset){
  const url=new URL(asset.url,self.location.href);
  const response=await fetch(new Request(url,{cache:'reload',credentials:'same-origin'}));
  if(!isCacheable(response))throw new Error(`PRECACHE_HTTP_${response?.status||0}`);
  const fingerprint=await responseFingerprint(response,asset.url);
  if(fingerprint.bytes!==asset.bytes||fingerprint.sha256!==asset.sha256)throw new Error(`PRECACHE_INTEGRITY_${asset.url}`);
  return response;
}

async function fillCache(name,assets,{tolerateFailures=false}={}){
  const cache=await caches.open(name),failures=[];
  for(const asset of assets){
    try{await cache.put(canonicalUrl(new URL(asset.url,self.location.href)),await verifiedResponse(asset));}
    catch(error){if(!tolerateFailures)throw error;failures.push({url:asset.url,error:String(error?.message||error)});}
  }
  return failures;
}

async function validateRequiredCache(name){
  const cache=await caches.open(name);
  for(const asset of PRECACHE.required){
    const response=await cache.match(canonicalUrl(new URL(asset.url,self.location.href)));
    if(!response||response.status!==200||(await responseFingerprint(response,asset.url)).sha256!==asset.sha256)throw new Error(`PRECACHE_INCOMPLETE_${asset.url}`);
  }
}

async function copyCache(sourceName,targetName){
  await caches.delete(targetName);
  const source=await caches.open(sourceName),target=await caches.open(targetName);
  for(const request of await source.keys())await target.put(request,await source.match(request));
}

async function installBuild(){
  await caches.delete(STAGING_CACHE_NAME);
  await caches.delete(CACHE_NAME);
  try{
    await fillCache(STAGING_CACHE_NAME,PRECACHE.required);
    await fillCache(STAGING_CACHE_NAME,PRECACHE.optional,{tolerateFailures:true});
    await validateRequiredCache(STAGING_CACHE_NAME);
    await copyCache(STAGING_CACHE_NAME,CACHE_NAME);
    await validateRequiredCache(CACHE_NAME);
    await caches.delete(STAGING_CACHE_NAME);
  }catch(error){
    await Promise.all([caches.delete(STAGING_CACHE_NAME),caches.delete(CACHE_NAME)]);
    throw error;
  }
}

async function activateBuild(){
  await validateRequiredCache(CACHE_NAME);
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)));
  await self.clients.claim();
}

async function cachedShellNavigation(){
  const cache=await caches.open(CACHE_NAME);
  const shell=INDEX_ASSET&&await cache.match(canonicalUrl(new URL(INDEX_ASSET.url,self.location.href)));
  if(shell)return shell;
  const offline=OFFLINE_ASSET&&await cache.match(canonicalUrl(new URL(OFFLINE_ASSET.url,self.location.href)));
  return offline||new Response('La app no esta disponible sin conexion todavia.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
}

async function precachedAssetResponse(request,asset){
  const cache=await caches.open(CACHE_NAME),key=canonicalUrl(request.url),cached=await cache.match(key);
  if(cached)return cached;
  try{
    const response=await verifiedResponse(asset);
    await cache.put(key,response.clone());
    return response;
  }catch{
    return new Response('Recurso no disponible para esta version.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }
}

async function firebaseConfigResponse(request){
  try{return await fetch(request,{cache:'no-store'});}
  catch{return new Response('window.GYM_PARTY_FIREBASE_CONFIG=window.GYM_PARTY_FIREBASE_CONFIG||{};',{status:200,headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store'}});}
}

async function cacheDiagnostic(){
  const cache=await caches.open(CACHE_NAME),missingRequired=[],missingOptional=[];
  for(const [assets,missing] of [[PRECACHE.required,missingRequired],[PRECACHE.optional,missingOptional]]){
    for(const asset of assets)if(!await cache.match(canonicalUrl(new URL(asset.url,self.location.href))))missing.push(asset.url);
  }
  return{version:PRECACHE.version,build:PRECACHE.build,cacheName:CACHE_NAME,required:PRECACHE.required.length,optional:PRECACHE.optional.length,missingRequired,missingOptional};
}

self.addEventListener('install',event=>event.waitUntil(installBuild()));
self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING'){self.skipWaiting();return;}
  if(event.data?.type==='PWA_CACHE_DIAGNOSTIC'&&event.ports?.[0]){
    const operation=cacheDiagnostic().then(result=>event.ports[0].postMessage(result));
    event.waitUntil?.(operation);
  }
});
self.addEventListener('activate',event=>event.waitUntil(activateBuild()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('/firebase-config.js')){event.respondWith(firebaseConfigResponse(event.request));return;}
  if(event.request.mode==='navigate'){event.respondWith(cachedShellNavigation());return;}
  const asset=PRECACHE_BY_URL.get(canonicalUrl(event.request.url));
  if(asset)event.respondWith(precachedAssetResponse(event.request,asset));
});
