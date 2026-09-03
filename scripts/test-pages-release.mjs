import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateStablePagesPromotion} from './stable-pages-guard.mjs';

const pages=await readFile(new URL('../.github/workflows/deploy-pages.yml',import.meta.url),'utf8');
const app={version:'2.7.0',build:96,versionCode:40};
const stable89={version:'2.7.0',build:89,channel:'stable'};
const stable96={version:'2.7.0',build:96,channel:'stable'};

assert.throws(()=>validateStablePagesPromotion(app,stable89,{channel:'stable'}),/PAGES_STABLE_METADATA_MISMATCH/);
assert.deepEqual(validateStablePagesPromotion(app,stable96,{channel:'stable'}),{
  channel:'stable',aligned:true,version:'2.7.0',build:96
});
assert.deepEqual(validateStablePagesPromotion(app,stable89,{channel:'beta'}),{channel:'beta',aligned:false});
assert.throws(()=>validateStablePagesPromotion(app,{...stable96,channel:'beta'},{channel:'stable'}),/PAGES_STABLE_CHANNEL_INVALID/);
assert.throws(()=>validateStablePagesPromotion(app,stable96,{channel:'preview'}),/PAGES_CHANNEL_INVALID/);

const guardStart=pages.indexOf('promotion-guard:');
const qualityStart=pages.indexOf('\n  quality:');
const deployStart=pages.indexOf('\n  deploy:');
const deployAction=pages.indexOf('actions/deploy-pages@');
assert.ok(guardStart>=0&&guardStart<qualityStart&&qualityStart<deployStart&&deployStart<deployAction);
const guardJob=pages.slice(guardStart,qualityStart);
const qualityJob=pages.slice(qualityStart,deployStart);
assert.match(guardJob,/node \.\/scripts\/stable-pages-guard\.mjs/);
assert.match(guardJob,/PAGES_CHANNEL: \$\{\{ github\.event_name == 'push' && 'stable' \|\| inputs\.channel \}\}/);
assert.doesNotMatch(guardJob,/continue-on-error:\s*true/);
assert.match(qualityJob,/needs: promotion-guard/);
assert.match(pages,/deploy:[\s\S]*?needs: \[promotion-guard, quality\]/);
assert.match(pages,/push:[\s\S]*?paths:[\s\S]*?\.github\/stable-release\.json/);

console.log('Pages stable protegido por metadata alineada; beta permanece independiente.');
