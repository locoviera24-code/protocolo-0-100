import {createHash} from 'node:crypto';

export const PRECACHE_SCHEMA_VERSION=1;
export const PRECACHE_FILE='precache-manifest.js';

export function isPrecacheCandidate(path){
  return !['sw.js',PRECACHE_FILE,'asset-manifest.json'].includes(path);
}

export function isOptionalPrecacheAsset(path){
  return path==='app-version.json'||path==='manifest.webmanifest'||/\.(?:png|svg|webp)$/i.test(path);
}

export function sha256(data){
  return createHash('sha256').update(data).digest('hex');
}

export function createPrecacheManifest({version,assets}){
  const entries=assets.filter(asset=>isPrecacheCandidate(asset.path)).map(asset=>({
    url:`./${asset.path}`,
    bytes:asset.bytes,
    sha256:asset.sha256,
    required:!isOptionalPrecacheAsset(asset.path)
  }));
  return{
    schemaVersion:PRECACHE_SCHEMA_VERSION,
    version:version.version,
    build:version.build,
    cacheName:`protocolo-0-100-pwa-${version.version}-b${version.build}`,
    required:entries.filter(asset=>asset.required).map(({required,...asset})=>asset),
    optional:entries.filter(asset=>!asset.required).map(({required,...asset})=>asset)
  };
}

export function renderPrecacheManifest(manifest){
  return `globalThis.PRECACHE_MANIFEST=Object.freeze(${JSON.stringify(manifest,null,2)});\n`;
}
