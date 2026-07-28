import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const repoRoot=resolve(fileURLToPath(new URL('../',import.meta.url)));
const source=await readFile(new URL('../sw.js',import.meta.url),'utf8');
const versionSource=await readFile(new URL('../app-version.js',import.meta.url),'utf8');
const manifestSource=await readFile(new URL('../precache-manifest.js',import.meta.url),'utf8');
const versionManifest=JSON.parse(await readFile(new URL('../app-version.json',import.meta.url),'utf8'));
const manifestScope={};vm.runInNewContext(manifestSource,manifestScope);
const manifest=manifestScope.PRECACHE_MANIFEST;
const currentCacheName=`protocolo-0-100-pwa-${versionManifest.version}-b${versionManifest.build}`;
const previousCacheName=`protocolo-0-100-pwa-${versionManifest.version}-b${versionManifest.build-1}`;
const baseUrl='https://app.test/protocolo/';
const assetBodies=new Map();
for(const asset of [...manifest.required,...manifest.optional]){
  const path=asset.url.replace(/^\.\//,'');
  assetBodies.set(new URL(asset.url,baseUrl).href,await readFile(resolve(repoRoot,path)));
}

function requestKey(request){return typeof request==='string'?new URL(request,baseUrl).href:request.url;}
function withoutSearch(value){const url=new URL(value,baseUrl);url.search='';url.hash='';return url.href;}

class MockCache{
  constructor(){this.entries=new Map();}
  async match(request,options={}){
    const restore=entry=>entry?new Response(entry.body.slice(0),{status:entry.status,headers:entry.headers}):undefined;
    const key=requestKey(request);if(this.entries.has(key))return restore(this.entries.get(key));
    if(!options.ignoreSearch)return undefined;
    const canonical=withoutSearch(key);for(const [candidate,response] of this.entries)if(withoutSearch(candidate)===canonical)return restore(response);
  }
  async put(request,response){this.entries.set(requestKey(request),{body:new Uint8Array(await response.clone().arrayBuffer()),status:response.status,headers:[...response.headers.entries()]});}
  async keys(){return [...this.entries.keys()].map(url=>new Request(url));}
  async delete(request){return this.entries.delete(requestKey(request));}
}

function createHarness({failUrls=[],corruptUrls=[]}={}){
  const handlers={},deletedCaches=[],cacheStores=new Map(),fetchCalls=[];
  let skipWaitingCalls=0,customFetch=null;
  const fail=new Set(failUrls.map(url=>new URL(url,baseUrl).href)),corrupt=new Set(corruptUrls.map(url=>new URL(url,baseUrl).href));
  const caches={
    async open(name){if(!cacheStores.has(name))cacheStores.set(name,new MockCache());return cacheStores.get(name);},
    async keys(){return[...cacheStores.keys()];},
    async delete(name){deletedCaches.push(name);return cacheStores.delete(name);}
  };
  const defaultFetch=async request=>{
    const url=requestKey(request);fetchCalls.push(url);
    if(customFetch)return customFetch(request);
    if(fail.has(url))return new Response('missing',{status:404});
    if(!assetBodies.has(url))throw new Error(`unexpected network request: ${url}`);
    return new Response(corrupt.has(url)?Buffer.from('corrupt'):assetBodies.get(url),{status:200});
  };
  const self={location:{href:`${baseUrl}sw.js`,origin:'https://app.test'},clients:{claim:async()=>undefined},skipWaiting:async()=>{skipWaitingCalls+=1;},addEventListener(type,handler){handlers[type]=handler;}};
  const context=vm.createContext({self,caches,fetch:defaultFetch,URL,Map,Set,Response,Request,Uint8Array,TextDecoder,TextEncoder,crypto:webcrypto,console});
  context.importScripts=(...urls)=>{for(const url of urls)vm.runInContext(url.includes('app-version')?versionSource:manifestSource,context,{filename:url});};
  vm.runInContext(source,context,{filename:'sw.js'});
  async function install(){let pending;handlers.install({waitUntil(value){pending=Promise.resolve(value);}});return pending;}
  async function activate(){let pending;handlers.activate({waitUntil(value){pending=Promise.resolve(value);}});return pending;}
  function dispatchFetch(request){let responsePromise;const waits=[];handlers.fetch({request,respondWith(value){responsePromise=Promise.resolve(value);},waitUntil(value){waits.push(Promise.resolve(value));}});return{responsePromise,waits};}
  async function diagnostic(){let result,pending;handlers.message({data:{type:'PWA_CACHE_DIAGNOSTIC'},ports:[{postMessage(value){result=value;}}],waitUntil(value){pending=Promise.resolve(value);}});await pending;return result;}
  return{handlers,caches,cacheStores,deletedCaches,fetchCalls,install,activate,dispatchFetch,diagnostic,setCustomFetch(value){customFetch=value;},skipWaitingCalls:()=>skipWaitingCalls};
}

assert.equal(manifest.cacheName,currentCacheName,'El manifiesto debe corresponder a la version activa');
assert.ok(manifest.required.some(asset=>asset.url==='./index.html'));
assert.ok(manifest.required.some(asset=>asset.url==='./offline.html'));
assert.ok(manifest.optional.length>0,'Debe existir al menos un asset opcional');

const normal=createHarness();
normal.cacheStores.set(previousCacheName,new MockCache());
normal.cacheStores.set('otra-app-cache',new MockCache());
await normal.install();
assert.equal(normal.cacheStores.has(previousCacheName),true,'Instalar no debe retirar la version activa anterior');
assert.equal(normal.cacheStores.has(currentCacheName),true,'El build validado debe quedar preparado');
assert.equal(normal.cacheStores.has(`${currentCacheName}-staging`),false,'La cache temporal debe retirarse al validar');
normal.handlers.message({data:{type:'SKIP_WAITING'}});
assert.equal(normal.skipWaitingCalls(),1,'La actualizacion debe seguir requiriendo consentimiento');
await normal.activate();
assert.equal(normal.cacheStores.has(previousCacheName),false,'Activar debe retirar la version anterior');
assert.equal(normal.cacheStores.has('otra-app-cache'),true,'No debe borrar caches de otras aplicaciones');
const diagnostic=await normal.diagnostic();
assert.deepEqual([...diagnostic.missingRequired],[]);
assert.deepEqual([...diagnostic.missingOptional],[]);

const beforeNavigationFetches=normal.fetchCalls.length;
const navigation=normal.dispatchFetch({method:'GET',mode:'navigate',url:`${baseUrl}?v=next`});
assert.match(await(await navigation.responsePromise).text(),/<title>Protocolo/);
assert.equal(normal.fetchCalls.length,beforeNavigationFetches,'La navegacion controlada no debe mezclar un index de otro build');
const core=normal.dispatchFetch({method:'GET',mode:'cors',url:`${baseUrl}workout-features.js?v=next`});
assert.match(await(await core.responsePromise).text(),/WORKOUT_FEATURES/);
const unknown=normal.dispatchFetch({method:'GET',mode:'cors',url:`${baseUrl}otro.json`});
assert.equal(unknown.responsePromise,undefined);
const external=normal.dispatchFetch({method:'GET',mode:'cors',url:'https://api.nal.usda.gov/fdc/v1/foods/search'});
assert.equal(external.responsePromise,undefined);

normal.setCustomFetch(async()=>new Response('{"build":89}',{status:200,headers:{'Content-Type':'application/json'}}));
const updateCheck=normal.dispatchFetch(new Request(`${baseUrl}app-version.json?__pwa_update_check=1`));
assert.equal(await(await updateCheck.responsePromise).json().then(value=>value.build),89,'La comprobacion explicita debe omitir la cache activa');
normal.setCustomFetch(null);

normal.setCustomFetch(async()=>new Response('window.GYM_PARTY_FIREBASE_CONFIG={projectId:"real"};'));
const firebaseOnline=normal.dispatchFetch({method:'GET',mode:'cors',url:`${baseUrl}firebase-config.js?v=1`});
assert.match(await(await firebaseOnline.responsePromise).text(),/projectId:"real"/);
normal.setCustomFetch(async()=>{throw new Error('offline');});
const firebaseOffline=normal.dispatchFetch({method:'GET',mode:'cors',url:`${baseUrl}firebase-config.js`});
assert.match(await(await firebaseOffline.responsePromise).text(),/GYM_PARTY_FIREBASE_CONFIG/);

const optionalUrl=manifest.optional[0].url,optionalFailure=createHarness({failUrls:[optionalUrl]});
await optionalFailure.install();
assert.equal(optionalFailure.cacheStores.has(currentCacheName),true,'Un asset opcional ausente no debe bloquear la actualizacion');
assert.deepEqual([...(await optionalFailure.diagnostic()).missingOptional],[optionalUrl]);

const requiredUrl=manifest.required.find(asset=>asset.url!=='./index.html').url;
for(const harness of [createHarness({failUrls:[requiredUrl]}),createHarness({corruptUrls:[requiredUrl]})]){
  harness.cacheStores.set(previousCacheName,new MockCache());
  await assert.rejects(harness.install(),/PRECACHE_(?:HTTP|INTEGRITY)/);
  assert.equal(harness.cacheStores.has(previousCacheName),true,'Un deploy incompleto debe conservar la version anterior');
  assert.equal(harness.cacheStores.has(currentCacheName),false,'Un build incompleto no debe quedar disponible');
  assert.equal(harness.cacheStores.has(`${currentCacheName}-staging`),false,'El rollback debe limpiar la cache temporal');
}

console.log(`Service worker atomico correcto: ${manifest.required.length} obligatorios, ${manifest.optional.length} opcionales, hashes, rollback y navegacion coherente.`);
