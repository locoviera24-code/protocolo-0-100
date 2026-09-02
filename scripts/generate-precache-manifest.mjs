import {readFile,stat,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {discoverWebAssets,repoRoot,sourceFor} from './build-web-dist.mjs';
import {PRECACHE_FILE,createPrecacheManifest,precacheFingerprint,renderPrecacheManifest} from './precache-manifest.mjs';

const output=resolve(repoRoot,PRECACHE_FILE);
const assets=[];
for(const path of await discoverWebAssets()){
  if(path===PRECACHE_FILE)continue;
  const source=sourceFor(path);
  if(!(await stat(source)).isFile())throw new Error(`Falta la fuente de precache para ${path}`);
  const data=await readFile(source);
  assets.push({path,...precacheFingerprint(path,data)});
}
const version=JSON.parse(await readFile(resolve(repoRoot,'app-version.json'),'utf8'));
const content=renderPrecacheManifest(createPrecacheManifest({version,assets}));

if(process.argv.includes('--check')){
  const current=await readFile(output,'utf8').catch(()=>null);
  const normalizedCurrent=current?.replace(/\r\n?/g,'\n')??null;
  if(normalizedCurrent!==content)throw new Error('precache-manifest.js esta desactualizado. Ejecuta npm run build:precache.');
  console.log(`Precache alineado: build ${version.build}, ${assets.length} recursos descubiertos.`);
}else{
  await writeFile(output,content,'utf8');
  console.log(`Precache generado: build ${version.build}, ${assets.length} recursos descubiertos.`);
}
