import {readFile,writeFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('../app-version.json',import.meta.url),'utf8'));
const generated=`(function(root){\n  'use strict';\n  const info={version:'${manifest.version}',versionCode:${manifest.versionCode},build:${manifest.build},updatedAt:'${manifest.updatedAt}'};\n  info.cacheLabel=\`${'${info.version}'}+${'${info.build}'}\`;\n  info.cacheName=\`protocolo-0-100-pwa-${'${info.version}'}-b${'${info.build}'}\`;\n  info.apkName=\`protocolo-0-100-v${'${info.version}'}-release.apk\`;\n  root.APP_VERSION_INFO=Object.freeze(info);\n})(globalThis);\n`;
const check=process.argv.includes('--check');

async function ensure(url,expected,label){
  const current=await readFile(url,'utf8');
  if(check&&current!==expected)throw new Error(`${label} no coincide con app-version.json`);
  if(!check&&current!==expected)await writeFile(url,expected,'utf8');
}

await ensure(new URL('../app-version.js',import.meta.url),generated,'app-version.js');

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
    .replace(/id="aboutUpdatedAt">[^<]*/, 'id="aboutUpdatedAt">—')
    .replace('rel="noopener">Código y licencias','rel="noopener noreferrer">Código y licencias');
  await writeFile(indexUrl,html,'utf8');
}
