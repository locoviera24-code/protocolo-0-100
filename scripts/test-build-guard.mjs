import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../app/build-guard.js',import.meta.url),'utf8');
const version=JSON.parse(await readFile(new URL('../app-version.json',import.meta.url),'utf8'));

function run(currentBuild){
  const button={disabled:true,textContent:'',addEventListener(){}};
  const document={documentElement:{dataset:{}},body:{innerHTML:''},getElementById:id=>id==='activateCompatibleBuild'?button:null};
  const window={APP_VERSION_INFO:{build:currentBuild},stopCalls:0,stop(){this.stopCalls+=1;}};
  const context={window,document,navigator:{},location:{reload(){}},Object,Number};
  vm.runInNewContext(source,context,{filename:'app/build-guard.js'});
  return{window,document,button};
}

const aligned=run(version.build);
assert.equal(aligned.window.__PWA_BUILD_MISMATCH,undefined);
assert.equal(aligned.window.stopCalls,0);
assert.equal(aligned.document.body.innerHTML,'');

const mismatch=run(version.build-1);
assert.equal(mismatch.window.__PWA_BUILD_MISMATCH.expectedBuild,version.build);
assert.equal(mismatch.window.__PWA_BUILD_MISMATCH.currentBuild,version.build-1);
assert.equal(mismatch.window.stopCalls,1);
assert.match(mismatch.document.body.innerHTML,/Actualizacion pendiente/);
assert.equal(mismatch.button.disabled,false);
assert.equal(mismatch.button.textContent,'Recargar');

console.log('Guard de build correcto: arranque normal alineado y bloqueo recuperable ante assets mezclados.');
