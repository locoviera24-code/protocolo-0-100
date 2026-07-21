import {createHash} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {extname} from 'node:path';

export const PRECACHE_SCHEMA_VERSION=1;
export const PRECACHE_FILE='precache-manifest.js';
const TEXT_ASSET_EXTENSIONS=new Set(['.css','.html','.js','.json','.mjs','.svg','.txt','.webmanifest','.xml']);

export function isPrecacheCandidate(path){
  return !['sw.js',PRECACHE_FILE,'asset-manifest.json'].includes(path);
}

export function isOptionalPrecacheAsset(path){
  return path==='app-version.json'||path==='manifest.webmanifest'||/\.(?:png|svg|webp)$/i.test(path);
}

export function sha256(data){
  return createHash('sha256').update(data).digest('hex');
}

export function normalizePrecacheData(path,data){
  const buffer=Buffer.isBuffer(data)?data:Buffer.from(data);
  if(!TEXT_ASSET_EXTENSIONS.has(extname(path).toLowerCase()))return buffer;
  return Buffer.from(buffer.toString('utf8').replace(/\r\n?/g,'\n'),'utf8');
}

export function precacheFingerprint(path,data){
  const normalized=normalizePrecacheData(path,data);
  return{bytes:normalized.byteLength,sha256:sha256(normalized)};
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
