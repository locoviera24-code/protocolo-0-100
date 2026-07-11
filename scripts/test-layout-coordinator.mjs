import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const navigation=await readFile(new URL('../ui/navigation.js',import.meta.url),'utf8');
const tokens=await readFile(new URL('../styles/tokens.css',import.meta.url),'utf8');
const modules=await readFile(new URL('../styles/modules.css',import.meta.url),'utf8');
const responsive=await readFile(new URL('../styles/responsive.css',import.meta.url),'utf8');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');

for(const contract of ['visualViewport','focusin','focusout','ResizeObserver','layoutStickyAction','layoutContextNav','layout-refresh','keyboardOpen','keyboardGraceUntil','topbarCondensed']){
  assert.match(navigation,new RegExp(contract),`Falta coordinador: ${contract}`);
}
for(const token of ['--layout-topbar-height','--layout-context-height','--layout-bottom-nav-height','--layout-action-height','--layout-banner-height','--layout-keyboard-inset']){
  assert.match(tokens,new RegExp(token),`Falta token de layout: ${token}`);
}
assert.match(modules,/\.layoutStickyAction:not\(\.layoutActive\)\s*\{\s*position:\s*static/);
assert.match(modules,/\.updateBanner\.layoutActive[\s\S]*--layout-action-height/);
assert.doesNotMatch(responsive,/bottom:\s*calc\(var\(--nav-height\)/,'Responsive no debe calcular sticky con altura fija');
assert.doesNotMatch(html,/updateKeyboardState/,'No debe quedar la heuristica antigua de teclado');
console.log('Layout correcto: una acción sticky, alturas coordinadas, teclado y banners.');
