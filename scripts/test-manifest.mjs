import {createHash} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=resolve(new URL('../',import.meta.url).pathname.replace(/^\/(.:)/,'$1'));
const manifest=JSON.parse(await readFile(resolve(root,'manifest.webmanifest'),'utf8'));

function assert(condition,message){
  if(!condition)throw new Error(message);
}

async function readPng(relativePath,expectedSize){
  const path=resolve(root,relativePath),info=await stat(path);
  assert(info.isFile()&&info.size>100,`${relativePath} no es un PNG utilizable`);
  const buffer=await readFile(path);
  assert(buffer.subarray(1,4).toString('ascii')==='PNG',`${relativePath} no tiene firma PNG`);
  const width=buffer.readUInt32BE(16),height=buffer.readUInt32BE(20);
  assert(`${width}x${height}`===expectedSize,`${relativePath} mide ${width}x${height}, se esperaba ${expectedSize}`);
  return createHash('sha256').update(buffer).digest('hex');
}

assert(manifest.orientation==='any','La PWA debe permitir cualquier orientacion');
assert(manifest.start_url==='./index.html'&&manifest.scope==='./','start_url y scope deben seguir siendo relativos');

const iconContracts=[
  ['icons/icon-192.png','192x192','any'],
  ['icons/icon-512.png','512x512','any'],
  ['icons/icon-maskable-192.png','192x192','maskable'],
  ['icons/icon-maskable-512.png','512x512','maskable']
];
for(const [src,size,purpose] of iconContracts){
  const icon=manifest.icons?.find(item=>item.src===src);
  assert(icon&&icon.sizes===size&&icon.purpose===purpose,`Contrato de icono incompleto: ${src}`);
  assert(!String(icon.purpose).includes('any maskable'),`${src} mezcla propositos incompatibles`);
  await readPng(src,size);
}

const shortcutContracts=[
  ['./index.html?module=home&view=register','icons/shortcut-home-96.png'],
  ['./index.html?module=gym&view=train','icons/shortcut-gym-96.png'],
  ['./index.html?module=gym&view=train&quickLog=1','icons/shortcut-set-96.png'],
  ['./index.html?module=nutrition&view=meals','icons/shortcut-nutrition-96.png'],
  ['./index.html?module=gym&view=group','icons/shortcut-party-96.png']
];
const shortcutHashes=[];
for(const [url,iconSrc] of shortcutContracts){
  const shortcut=manifest.shortcuts?.find(item=>item.url===url);
  assert(shortcut,`Falta shortcut ${url}`);
  const icon=shortcut.icons?.find(item=>item.src===iconSrc);
  assert(icon?.sizes==='96x96',`Falta icono dedicado para ${url}`);
  shortcutHashes.push(await readPng(iconSrc,'96x96'));
}
assert(new Set(shortcutHashes).size===shortcutHashes.length,'Los shortcuts deben tener iconos visualmente distintos');

const screenshotContracts=[
  ['screenshots/mobile-home-390x844.png','390x844','narrow'],
  ['screenshots/desktop-gym-1440x900.png','1440x900','wide']
];
for(const [src,size,formFactor] of screenshotContracts){
  const screenshot=manifest.screenshots?.find(item=>item.src===src);
  assert(screenshot?.sizes===size&&screenshot.form_factor===formFactor,`Contrato de screenshot incompleto: ${src}`);
  assert(screenshot.label,`Falta descripcion accesible para ${src}`);
  await readPng(src,size);
}

console.log(`Manifest PWA valido: ${manifest.icons.length} iconos, ${manifest.shortcuts.length} shortcuts y ${manifest.screenshots.length} screenshots.`);
