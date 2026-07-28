import {readFile,writeFile} from 'node:fs/promises';
import {renderBuildInfo} from './build-info.mjs';

const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('../app-version.json',import.meta.url),'utf8'));
const generated=`(function(root){\n  'use strict';\n  const info={version:'${manifest.version}',versionCode:${manifest.versionCode},build:${manifest.build},updatedAt:'${manifest.updatedAt}'};\n  info.cacheLabel=\`${'${info.version}'}+${'${info.build}'}\`;\n  info.cacheName=\`protocolo-0-100-pwa-${'${info.version}'}-b${'${info.build}'}\`;\n  info.apkName=\`protocolo-0-100-v${'${info.version}'}-release.apk\`;\n  root.APP_VERSION_INFO=Object.freeze(info);\n})(globalThis);\n`;
const buildGuard=`(function(root){\n  'use strict';\n  const expectedBuild=${manifest.build},currentBuild=Number(root.APP_VERSION_INFO?.build)||0;\n  if(!currentBuild||currentBuild===expectedBuild)return;\n  root.__PWA_BUILD_MISMATCH=Object.freeze({expectedBuild,currentBuild});\n  const render=()=>{\n    document.documentElement.dataset.buildMismatch='true';\n    document.body.innerHTML='<main class="mainContent" aria-labelledby="buildMismatchTitle"><section class="moduleCard emptyState"><h1 id="buildMismatchTitle">Actualizacion pendiente</h1><p>Hay una version nueva, pero el navegador todavia conserva archivos anteriores. Actualiza para abrir la app de forma consistente.</p><button type="button" class="primary" id="activateCompatibleBuild" disabled>Preparando actualizacion...</button></section></main>';\n    const button=document.getElementById('activateCompatibleBuild');\n    if(!('serviceWorker'in navigator)){button.disabled=false;button.textContent='Recargar';button.addEventListener('click',()=>location.reload());return;}\n    let waiting=null;\n    navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});\n    const ready=worker=>{if(!worker)return;waiting=worker;button.disabled=false;button.textContent='Actualizar ahora';};\n    navigator.serviceWorker.register('./sw.js').then(async registration=>{await registration.update();if(registration.waiting)return ready(registration.waiting);const worker=registration.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed')ready(registration.waiting||worker);});}).catch(()=>{button.disabled=false;button.textContent='Reintentar';});\n    button.addEventListener('click',()=>{if(waiting)waiting.postMessage({type:'SKIP_WAITING'});else location.reload();});\n  };\n  render();\n  root.stop?.();\n})(window);\n`;
const check=process.argv.includes('--check');

async function ensure(url,expected,label){
  const current=await readFile(url,'utf8');
  if(check&&current.replace(/\r\n/g,'\n')!==expected.replace(/\r\n/g,'\n'))throw new Error(`${label} no coincide con app-version.json`);
  if(!check&&current!==expected)await writeFile(url,expected,'utf8');
}

await ensure(new URL('../app-version.js',import.meta.url),generated,'app-version.js');
await ensure(new URL('../app/build-guard.js',import.meta.url),buildGuard,'app/build-guard.js');

const buildInfoUrl=new URL('../build-info.json',import.meta.url);
const currentBuildInfo=JSON.parse(await readFile(buildInfoUrl,'utf8'));
if(currentBuildInfo.version!==manifest.version||Number(currentBuildInfo.versionCode)!==manifest.versionCode||Number(currentBuildInfo.build)!==manifest.build)throw new Error('build-info.json no coincide con app-version.json');
if(!check){
  await writeFile(buildInfoUrl,renderBuildInfo({schemaVersion:1,version:manifest.version,versionCode:manifest.versionCode,build:manifest.build,commit:'development',artifactCreatedAt:`${manifest.updatedAt}T00:00:00.000Z`,channel:'development'}),'utf8');
}

if(!check){
  for(const name of ['package.json','package-lock.json']){
    const url=new URL(`../${name}`,import.meta.url),data=JSON.parse(await readFile(url,'utf8'));
    data.version=manifest.version;
    if(data.packages?.[''])data.packages[''].version=manifest.version;
    await writeFile(url,`${JSON.stringify(data,null,2)}\n`,'utf8');
  }
  const indexUrl=new URL('../index.html',import.meta.url);
  let html=await readFile(indexUrl,'utf8');
  html=html.replace(/id="aboutWebVersion">[^<]*/, 'id="aboutWebVersion">—')
    .replace(/id="aboutCacheVersion">[^<]*/, 'id="aboutCacheVersion">—')
    .replace('rel="noopener">Código y licencias','rel="noopener noreferrer">Código y licencias');
  await writeFile(indexUrl,html,'utf8');
}
