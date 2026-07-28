import {cp,mkdir,readFile,rm,stat,writeFile} from 'node:fs/promises';
import {dirname,extname,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PRECACHE_FILE,createPrecacheManifest,normalizePrecacheData,renderPrecacheManifest,sha256} from './precache-manifest.mjs';
import {createBuildInfo,renderBuildInfo} from './build-info.mjs';

export const repoRoot=resolve(fileURLToPath(new URL('../',import.meta.url)));
export const distRoot=resolve(repoRoot,process.env.WEB_DIST_DIR||'dist-pages');
const entryAssets=['index.html','offline.html','manifest.webmanifest','sw.js','app-version.json','build-info.json',PRECACHE_FILE];

function insideRoot(target,root=repoRoot){
  return target===root||target.startsWith(`${root}${sep}`);
}

function localAsset(reference,from='index.html'){
  const value=String(reference||'').trim();
  if(!value||value.startsWith('#')||value.startsWith('data:')||value.startsWith('blob:')||value.startsWith('javascript:')||value.startsWith('mailto:')||value.startsWith('tel:')||/^[a-z][a-z\d+.-]*:/i.test(value)||value.startsWith('//'))return'';
  const clean=value.split('#')[0].split('?')[0].replace(/\\/g,'/');
  if(!clean||clean==='.'||clean==='./'||clean==='/')return'index.html';
  const base=clean.startsWith('/')?repoRoot:resolve(repoRoot,dirname(from));
  const target=resolve(base,clean.replace(/^\/+/,''));
  if(!insideRoot(target))throw new Error(`Referencia fuera del repositorio: ${reference} desde ${from}`);
  const result=relative(repoRoot,target).replace(/\\/g,'/');
  return result||'index.html';
}

function htmlDependencies(source,from){
  const result=[];
  for(const match of source.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)){
    const asset=localAsset(match[1],from);if(asset)result.push(asset);
  }
  return result;
}

function cssDependencies(source,from){
  const result=[];
  for(const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)){
    const asset=localAsset(match[1],from);if(asset)result.push(asset);
  }
  return result;
}

function serviceWorkerDependencies(source,from){
  const result=[];
  for(const match of source.matchAll(/["'](\.\.?\/[^"']*)["']/g)){
    const asset=localAsset(match[1],from);if(asset)result.push(asset);
  }
  return result;
}

function manifestDependencies(source,from){
  const manifest=JSON.parse(source),refs=[];
  if(manifest.start_url)refs.push(manifest.start_url);
  for(const icon of manifest.icons||[])if(icon?.src)refs.push(icon.src);
  for(const screenshot of manifest.screenshots||[])if(screenshot?.src)refs.push(screenshot.src);
  for(const shortcut of manifest.shortcuts||[]){
    if(shortcut?.url)refs.push(shortcut.url);
    for(const icon of shortcut?.icons||[])if(icon?.src)refs.push(icon.src);
  }
  return refs.map(ref=>localAsset(ref,from)).filter(Boolean);
}

async function dependenciesFor(asset,source){
  const extension=extname(asset).toLowerCase();
  if(extension==='.html')return htmlDependencies(source,asset);
  if(extension==='.css')return cssDependencies(source,asset);
  if(extension==='.webmanifest')return manifestDependencies(source,asset);
  if(asset==='sw.js')return serviceWorkerDependencies(source,asset);
  return[];
}

export async function discoverWebAssets(entries=entryAssets){
  const discovered=new Set(),queue=[...entries];
  while(queue.length){
    const asset=queue.shift();
    if(discovered.has(asset))continue;
    const sourcePath=resolve(repoRoot,asset);
    if(!insideRoot(sourcePath))throw new Error(`Asset fuera del repositorio: ${asset}`);
    let info;
    try{info=await stat(sourcePath);}catch{throw new Error(`Falta el recurso web requerido: ${asset}`);}
    if(!info.isFile())throw new Error(`El recurso web no es un archivo: ${asset}`);
    discovered.add(asset);
    const extension=extname(asset).toLowerCase();
    if(['.html','.css','.js','.webmanifest'].includes(extension)){
      const source=await readFile(sourcePath,'utf8');
      for(const dependency of await dependenciesFor(asset,source))if(!discovered.has(dependency))queue.push(dependency);
    }
  }
  return [...discovered].sort((a,b)=>a.localeCompare(b));
}

export function sourceFor(asset){
  if(asset==='firebase-config.js'&&process.env.WEB_FIREBASE_CONFIG_PATH)return resolve(process.env.WEB_FIREBASE_CONFIG_PATH);
  return resolve(repoRoot,asset);
}

export async function buildWebDist(){
  if(!insideRoot(distRoot)||distRoot===repoRoot)throw new Error(`Directorio de salida inseguro: ${distRoot}`);
  const assets=await discoverWebAssets();
  const version=JSON.parse(await readFile(resolve(repoRoot,'app-version.json'),'utf8'));
  const generatedBuildInfo=Buffer.from(renderBuildInfo(createBuildInfo(version)),'utf8');
  await rm(distRoot,{recursive:true,force:true});
  await mkdir(distRoot,{recursive:true});
  const inventory=[];
  for(const asset of assets.filter(asset=>asset!==PRECACHE_FILE)){
    const source=sourceFor(asset),target=resolve(distRoot,asset);
    if(!insideRoot(target,distRoot))throw new Error(`Destino fuera del artifact: ${asset}`);
    try{if(!(await stat(source)).isFile())throw new Error();}catch{throw new Error(`Falta la fuente de build para ${asset}: ${source}`);}
    await mkdir(dirname(target),{recursive:true});
    if(asset==='build-info.json')await writeFile(target,generatedBuildInfo);
    else await cp(source,target);
    const copiedData=await readFile(target),data=normalizePrecacheData(asset,copiedData);
    if(!data.equals(copiedData))await writeFile(target,data);
    inventory.push({path:asset,bytes:data.byteLength,sha256:sha256(data),required:true});
  }
  const precache=createPrecacheManifest({version,assets:inventory});
  const precacheContent=renderPrecacheManifest(precache),precacheTarget=resolve(distRoot,PRECACHE_FILE);
  await writeFile(precacheTarget,precacheContent,'utf8');
  const precacheData=await readFile(precacheTarget);
  inventory.push({path:PRECACHE_FILE,bytes:precacheData.byteLength,sha256:sha256(precacheData),required:true});
  inventory.sort((a,b)=>a.path.localeCompare(b.path));
  await writeFile(resolve(distRoot,'.nojekyll'),'','utf8');
  const manifest={schemaVersion:2,version:version.version,build:version.build,cacheName:precache.cacheName,assets:inventory,precache:{required:precache.required.length,optional:precache.optional.length}};
  await writeFile(resolve(distRoot,'asset-manifest.json'),`${JSON.stringify(manifest,null,2)}\n`,'utf8');
  return manifest;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const manifest=await buildWebDist();
  console.log(`Artifact web listo: ${manifest.assets.length} recursos, version ${manifest.version}, build ${manifest.build}.`);
}
