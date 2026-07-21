import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,join,normalize,resolve,sep} from 'node:path';
import {buildWebDist,discoverWebAssets,distRoot,repoRoot} from './build-web-dist.mjs';

const manifest=await buildWebDist();
const discovered=await discoverWebAssets();
await assert.rejects(()=>discoverWebAssets(['recurso-requerido-ausente.js']),/Falta el recurso web requerido/,'El build debe fallar ante una dependencia ausente');
const inventoryPaths=manifest.assets.map(asset=>asset.path).sort();
assert.deepEqual(inventoryPaths,discovered,'El inventario debe coincidir con las dependencias descubiertas');
for(const required of ['app/numbers.js','app/drafts.js','app/dates.js','data/schema-registry.js','data/backup-service.js','gym/set-model.js','progress/progress-view.js','firebase-config.js','offline.html','precache-manifest.js'])assert.ok(inventoryPaths.includes(required),`Falta ${required} en el artifact`);
assert.equal(manifest.schemaVersion,2,'El inventario debe declarar el contrato atomico');
assert.equal(manifest.cacheName,`protocolo-0-100-pwa-${manifest.version}-b${manifest.build}`);
assert.ok(manifest.precache.required>0&&manifest.precache.optional>0,'El precache debe separar recursos obligatorios y opcionales');

for(const asset of manifest.assets){
  const data=await readFile(resolve(distRoot,asset.path));
  assert.equal(data.byteLength,asset.bytes,`Tamano incorrecto para ${asset.path}`);
  assert.equal(createHash('sha256').update(data).digest('hex'),asset.sha256,`Hash incorrecto para ${asset.path}`);
}

const pagesWorkflow=await readFile(resolve(repoRoot,'.github/workflows/deploy-pages.yml'),'utf8');
const validationWorkflow=await readFile(resolve(repoRoot,'.github/workflows/validate-app.yml'),'utf8');
const qualityWorkflow=await readFile(resolve(repoRoot,'.github/workflows/quality-gate.yml'),'utf8');
assert.match(validationWorkflow,/push:[\s\S]*branches:/,'Todo cambio en main, incluido app/**, debe disparar el gate');
assert.doesNotMatch(validationWorkflow,/paths-ignore:/,'El gate no debe omitir cambios dentro de app/**');
assert.match(pagesWorkflow,/uses: \.\/\.github\/workflows\/quality-gate\.yml/,'Pages debe consumir el gate unico');
assert.match(qualityWorkflow,/npm run build:web/,'El gate debe usar el constructor unico');
assert.match(qualityWorkflow,/npm run test:web-dist/,'El gate debe validar el artifact');
assert.match(qualityWorkflow,/npm run build:precache/,'El gate debe regenerar el precache antes de construir');
assert.doesNotMatch(pagesWorkflow,/cp index\.html .*dist-pages/,'Pages no debe mantener otra lista manual de archivos');

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const relativePath=normalize(pathname==='/'?'index.html':pathname.replace(/^\/+/,''));
    const file=resolve(join(distRoot,relativePath));
    if(file!==distRoot&&!file.startsWith(`${distRoot}${sep}`))throw new Error('outside root');
    const info=await stat(file),target=info.isDirectory()?join(file,'index.html'):file;
    response.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'no-store'});
    response.end(await readFile(target));
  }catch{
    response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});response.end('No encontrado');
  }
});
await new Promise((resolveStart,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolveStart);});
try{
  const address=server.address(),base=`http://127.0.0.1:${address.port}`;
  for(const asset of manifest.assets){
    const response=await fetch(`${base}/${asset.path}`);
    assert.equal(response.status,200,`${asset.path} debe responder 200`);
    assert.ok((await response.arrayBuffer()).byteLength>0||asset.bytes===0,`${asset.path} debe conservar contenido`);
  }
  for(const route of ['?module=home','?module=gym&view=train','?module=nutrition&view=today','?module=progress&view=overview','?module=gym&view=group','?module=more&view=menu','?module=more&view=data']){
    const response=await fetch(`${base}/index.html${route}`);
    assert.equal(response.status,200,`La ruta ${route} debe responder 200`);
    assert.match(await response.text(),/app\/numbers\.js/,`La ruta ${route} debe usar el HTML completo`);
  }
  assert.equal((await fetch(`${base}/asset-ausente.js`)).status,404,'Un recurso ausente debe conservar un 404 detectable');
}finally{
  await new Promise(resolveClose=>server.close(resolveClose));
}

console.log(`Artifact web correcto: ${manifest.assets.length} recursos con hash, rutas profundas y modulos app/ servidos sin 404.`);
