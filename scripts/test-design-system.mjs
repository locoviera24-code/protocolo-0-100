import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const allow=JSON.parse(await readFile(new URL('./design-token-allowlist.json',import.meta.url),'utf8'));
const styleNames=(await readdir(new URL('../styles/',import.meta.url))).filter(name=>name.endsWith('.css'));
const styleSources=await Promise.all(styleNames.map(async name=>[name,await readFile(new URL('../styles/'+name,import.meta.url),'utf8')]));
const appStyles=styleSources.filter(([name])=>name!=='tokens.css').map(([,source])=>source).join('\n');
const sourceNames=['index.html','ui/router.js','ui/navigation.js','progress/progress-view.js','workout-features.js','gym-party.js','advanced-features.js'];
const sourceText=(await Promise.all(sourceNames.map(name=>readFile(new URL('../'+name,import.meta.url),'utf8')))).join('\n');

function values(pattern,text,group=0){
  return [...text.matchAll(pattern)].map(match=>(match[group]??match[0]).trim()).sort();
}
function assertAllowed(label,current,allowed){
  const permitted=new Set(allowed);
  const unknown=[...new Set(current.filter(value=>!permitted.has(value)))];
  assert.deepEqual(unknown,[],`Nuevos ${label} hardcodeados fuera de la allowlist: ${unknown.join(', ')}`);
}
function directValues(current){return current.filter(value=>!value.startsWith('var(')&&value!=='none');}

assertAllowed('colores',values(/(?<![\w-])#[0-9a-fA-F]{3,8}(?![\w-])|rgba?\([^)]*\)/g,appStyles),allow.colors);
assertAllowed('radios',directValues(values(/border-radius\s*:\s*([^;}{]+)/g,appStyles,1)),allow.radii);
assertAllowed('sombras',directValues(values(/(?:box-shadow|filter\s*:\s*drop-shadow)\s*:\s*([^;}{]+)/g,appStyles,1)),allow.shadows);
assertAllowed('tamaños tipográficos',directValues(values(/font-size\s*:\s*([^;}{]+)/g,appStyles,1)),allow.fontSizes);
assertAllowed('estilos inline',values(/style="([^"]+)"/g,sourceText,1),allow.inlineStyles);

const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.doesNotMatch(index,/<style(?:\s|>)/i,'index.html no debe contener bloques <style>');
assert.doesNotMatch(sourceText,/style\.textContent\s*=|createElement\(\s*['"]style['"]\s*\)/,'JavaScript no debe inyectar hojas CSS');
const navText=[...index.matchAll(/<(?:nav|aside)[^>]*>[\s\S]*?<\/(?:nav|aside)>/gi)].map(match=>match[0].replace(/<svg[\s\S]*?<\/svg>/gi,'')).join('\n');
assert.doesNotMatch(navText,/\p{Extended_Pictographic}/u,'La navegación debe usar iconos SVG, no emojis');
console.log(`Sistema visual correcto: ${styleNames.length} hojas externas, sin CSS inyectado y presupuestos protegidos.`);
