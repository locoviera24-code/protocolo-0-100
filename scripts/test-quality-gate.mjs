import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const gate=await read('.github/workflows/quality-gate.yml');
const validate=await read('.github/workflows/validate-app.yml');
const pages=await read('.github/workflows/deploy-pages.yml');
const debug=await read('.github/workflows/build-debug-apk.yml');
const release=await read('.github/workflows/build-release-apk.yml');
const callers=[validate,pages,debug,release];

for(const caller of callers)assert.match(caller,/uses: \.\/\.github\/workflows\/quality-gate\.yml/,'Todo canal publicable debe depender del mismo gate');
for(const command of [
  'npm run test:precache','node ./scripts/test-service-worker.mjs','npm run test:e2e','npm run test:rules',
  'npm run test:data','npm run test:nutrition','npm run test:progress','npm run test:fdc',
  'node ./scripts/test-gym-party.mjs','node ./scripts/test-accessibility.mjs','npm run test:web-dist:e2e',
  'gradle :app:assembleDebug :app:assembleRelease'
])assert.ok(gate.includes(command),`El quality gate no ejecuta ${command}`);
for(const contract of ['workflow_call:','channel:','beta','stable','actions/upload-artifact@v7','protocolo-web-','protocolo-android-debug-','-CheckAndroidAssets','test-release.jks'])assert.ok(gate.includes(contract),`Falta contrato del quality gate: ${contract}`);

assert.match(validate,/push:[\s\S]*branches:/,'main y PR deben ejecutar el gate beta');
assert.doesNotMatch(pages,/\n  push:/,'Pages estable no debe publicarse automaticamente por cada commit');
assert.match(pages,/if: inputs\.channel == 'stable'/);
assert.match(pages,/needs: quality/);
assert.match(pages,/actions\/download-artifact@v8/);
assert.doesNotMatch(debug,/\n  push:/,'El APK manual no debe duplicar el gate automatico de main');
assert.doesNotMatch(debug,/gh release/);
assert.match(release,/needs: quality/);
assert.match(release,/gh release create/);

for(const caller of callers)assert.doesNotMatch(caller,/npm run test:e2e/,'Las matrices no deben duplicarse fuera del gate');

console.log('Quality gate unico correcto: beta automatica, estable manual, E2E, Firestore, web y Android compartidos.');
