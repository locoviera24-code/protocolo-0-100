import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const gate=await read('.github/workflows/quality-gate.yml');
const validate=await read('.github/workflows/validate-app.yml');
const pages=await read('.github/workflows/deploy-pages.yml');
const debug=await read('.github/workflows/build-debug-apk.yml');
const release=await read('.github/workflows/build-release-apk.yml');
const playwright=await read('playwright.config.mjs');
const playwrightWebDist=await read('playwright.web-dist.config.mjs');
const stableRelease=JSON.parse(await read('.github/stable-release.json'));
const appVersion=JSON.parse(await read('app-version.json'));
const callers=[validate,pages,debug,release];
const workflowNames=(await readdir(new URL('../.github/workflows/',import.meta.url))).filter(name=>/\.ya?ml$/i.test(name)).sort();
const expectedWorkflowNames=['build-debug-apk.yml','build-release-apk.yml','deploy-pages.yml','quality-gate.yml','validate-app.yml'];
assert.deepEqual(workflowNames,expectedWorkflowNames,'Todo workflow debe estar incluido en los guards de seguridad');
const workflows=Object.fromEntries(await Promise.all(workflowNames.map(async name=>[`.github/workflows/${name}`,await read(`.github/workflows/${name}`)])));
const expectedActions=new Map([
  ['actions/checkout',['3d3c42e5aac5ba805825da76410c181273ba90b1','v7']],
  ['actions/setup-java',['b6effb05e454b25005698d916606bdc6ffcbf961','v5']],
  ['actions/setup-node',['820762786026740c76f36085b0efc47a31fe5020','v7']],
  ['android-actions/setup-android',['40fd30fb8d7440372e1316f5d1809ec01dcd3699','v4']],
  ['gradle/actions/setup-gradle',['9c971963bec38e04b3d30dcc455b5382be2fdbfb','v6']],
  ['actions/upload-artifact',['043fb46d1a93c77aae656e7c1c64a875d1fc6a0a','v7']],
  ['actions/download-artifact',['3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c','v8']],
  ['actions/configure-pages',['983d7736d9b0ae728b81ab479565c72886d7745b','v5']],
  ['actions/upload-pages-artifact',['56afc609e74202658d3ffba0e8f6dda462b719fa','v3']],
  ['actions/deploy-pages',['d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e','v4']]
]);
const firebaseSecrets=['FIREBASE_API_KEY','FIREBASE_AUTH_DOMAIN','FIREBASE_PROJECT_ID','FIREBASE_APP_ID','FIREBASE_MESSAGING_SENDER_ID','FIREBASE_STORAGE_BUCKET'];

let externalActionCount=0;
for(const [path,source] of Object.entries(workflows)){
  for(const line of source.match(/^\s*uses:\s+\S+.*$/gm)||[]){
    const reference=line.match(/^\s*uses:\s+(\S+)/)?.[1]||'';
    if(reference.startsWith('./'))continue;
    const match=line.match(/^\s*uses:\s+([^@\s]+)@([a-f\d]{40})\s+#\s+(v\d+)\s*$/);
    assert.ok(match,`${path} debe fijar ${reference} por SHA completo y conservar comentario de version`);
    const expected=expectedActions.get(match[1]);
    assert.ok(expected,`${path} usa una Action externa no inventariada: ${match[1]}`);
    assert.deepEqual([match[2],match[3]],expected,`${path} no usa el SHA verificado para ${match[1]}`);
    externalActionCount+=1;
  }
}
assert.equal(externalActionCount,22,'Debe auditarse cada uso de Actions externas');

const expectedSecretsByWorkflow={
  '.github/workflows/build-debug-apk.yml':firebaseSecrets,
  '.github/workflows/build-release-apk.yml':[...firebaseSecrets,'ANDROID_KEYSTORE_BASE64','ANDROID_KEYSTORE_PASSWORD','ANDROID_KEY_ALIAS','ANDROID_KEY_PASSWORD'],
  '.github/workflows/deploy-pages.yml':firebaseSecrets,
  '.github/workflows/quality-gate.yml':firebaseSecrets,
  '.github/workflows/validate-app.yml':[]
};
for(const [path,source] of Object.entries(workflows)){
  const used=[...new Set([...source.matchAll(/\$\{\{\s*secrets\.([A-Z][A-Z0-9_]*)\s*\}\}/g)].map(match=>match[1]))].sort();
  assert.deepEqual(used,[...expectedSecretsByWorkflow[path]].sort(),`${path} debe usar exclusivamente sus Secrets permitidos`);
}
const writes=[];
for(const [path,source] of Object.entries(workflows)){
  assert.doesNotMatch(source,/^\s*permissions:\s+write-all\s*$/gm,`${path} no puede conceder write-all`);
  for(const match of source.matchAll(/^\s+([a-z][a-z-]*):\s+write\s*$/gm))writes.push(`${path}:${match[1]}`);
}
assert.deepEqual(writes.sort(),[
  '.github/workflows/build-release-apk.yml:contents',
  '.github/workflows/deploy-pages.yml:id-token',
  '.github/workflows/deploy-pages.yml:pages'
],'Solo los jobs publicadores pueden recibir permisos de escritura');

for(const caller of callers)assert.match(caller,/uses: \.\/\.github\/workflows\/quality-gate\.yml/,'Todo canal publicable debe depender del mismo gate');
for(const command of [
  'npm run test:precache','node ./scripts/test-service-worker.mjs','npm run test:e2e','npm run test:rules',
  'npm run test:data','npm run test:nutrition','npm run test:progress','npm run test:fdc',
  'npm run test:native-controls',
  'node ./scripts/test-gym-party.mjs','node ./scripts/test-accessibility.mjs','npm run test:web-dist:e2e',
  'node ./scripts/test-android-release.mjs','node ./scripts/test-pages-release.mjs',
  'gradle :app:testDebugUnitTest --stacktrace --no-daemon',
  'gradle :app:assembleDebug :app:assembleRelease --stacktrace --no-daemon'
])assert.ok(gate.includes(command),`El quality gate no ejecuta ${command}`);
for(const contract of ['workflow_call:','channel:','beta','stable','actions/upload-artifact@','android-actions/setup-android@','gradle/actions/setup-gradle@','protocolo-web-','protocolo-android-debug-','-CheckAndroidAssets','test-release.jks'])assert.ok(gate.includes(contract),`Falta contrato del quality gate: ${contract}`);

for(const caller of callers)assert.doesNotMatch(caller,/secrets:\s*inherit/,'Ningun caller debe heredar todos los Secrets');
assert.doesNotMatch(validate,/\$\{\{\s*secrets\./,'El gate de PR/main no debe recibir Secrets');
const workflowCallBlock=gate.match(/workflow_call:\s*\r?\n([\s\S]*?)\r?\n  workflow_dispatch:/)?.[1]||'';
const declaredWorkflowCallSecrets=[...workflowCallBlock.matchAll(/^      ([A-Z][A-Z0-9_]+):\s*$/gm)].map(match=>match[1]).sort();
assert.deepEqual(declaredWorkflowCallSecrets,[...firebaseSecrets].sort(),'El reusable debe declarar exclusivamente los Secrets Firebase aprobados');
for(const secret of firebaseSecrets){
  assert.match(gate,new RegExp(`\\r?\\n      ${secret}:\\r?\\n        required: false`),`El reusable debe declarar ${secret} como opcional`);
  for(const [name,caller] of [['debug',debug],['release',release],['pages',pages]]){
    assert.match(caller,new RegExp(`${secret}: \\$\\{\\{ secrets\\.${secret} \\}\\}`),`${name} debe transmitir explicitamente ${secret}`);
  }
}
for(const caller of [debug,pages])assert.doesNotMatch(caller,/ANDROID_KEYSTORE_|ANDROID_KEY_ALIAS|ANDROID_KEY_PASSWORD/,'Solo release puede acceder a Secrets Android');
const checkoutCount=[...Object.values(workflows)].reduce((total,source)=>total+(source.match(/uses: actions\/checkout@/g)||[]).length,0);
const nonPersistentCheckoutCount=[...Object.values(workflows)].reduce((total,source)=>total+(source.match(/uses: actions\/checkout@[a-f\d]{40} # v7\s+with:\s+persist-credentials: false/g)||[]).length,0);
assert.equal(checkoutCount,3);
assert.equal(nonPersistentCheckoutCount,checkoutCount,'Todo checkout debe desactivar credenciales persistentes');

const stepBlock=(source,name)=>source.match(new RegExp(`      - name: ${name}\\r?\\n([\\s\\S]*?)(?=\\r?\\n      - name:|$)`))?.[1]||'';
const jvmStep=stepBlock(gate,'Ejecutar tests JVM Android');
const junitEvidenceStep=stepBlock(gate,'Conservar resultados JUnit Android');
const androidBuildStep=stepBlock(gate,'Compilar APK debug y release de prueba');
const playwrightEvidenceStep=stepBlock(gate,'Conservar evidencia Playwright ante fallo');
assert.match(jvmStep,/working-directory: android-native-wrapper[\s\S]*run: gradle :app:testDebugUnitTest --stacktrace --no-daemon/,'La suite JVM debug completa debe ejecutarse sin daemon');
assert.ok(gate.indexOf('- name: Ejecutar tests JVM Android')<gate.indexOf('- name: Compilar APK debug y release de prueba'),'Los tests JVM deben preceder la compilacion Android');
assert.match(androidBuildStep,/run: gradle :app:assembleDebug :app:assembleRelease --stacktrace --no-daemon/,'La compilacion APK debe permanecer separada y sin daemon');
assert.doesNotMatch(androidBuildStep,/testDebugUnitTest/,'La compilacion no debe ocultar la tarea JVM');
assert.match(junitEvidenceStep,/if: always\(\)/,'JUnit debe conservarse incluso cuando falla la tarea JVM');
assert.match(junitEvidenceStep,/name: protocolo-android-jvm-tests-\$\{\{ env\.QUALITY_CHANNEL \}\}/);
assert.match(junitEvidenceStep,/path: android-native-wrapper\/app\/build\/test-results\/testDebugUnitTest\//);
assert.match(junitEvidenceStep,/if-no-files-found: ignore/,'La ausencia legitima de XML no debe ocultar el fallo original');
assert.match(junitEvidenceStep,/retention-days: \$\{\{ env\.QUALITY_CHANNEL == 'stable' && 90 \|\| 30 \}\}/);
assert.match(gate,/id: axe[\s\S]*id: e2e[\s\S]*id: web_dist/,'Cada productor Playwright debe exponer su outcome');
assert.match(playwrightEvidenceStep,/if: \$\{\{ failure\(\) && \(steps\.axe\.outcome == 'failure' \|\| steps\.e2e\.outcome == 'failure' \|\| steps\.web_dist\.outcome == 'failure'\) \}\}/);
assert.match(playwrightEvidenceStep,/name: playwright-failure-evidence-\$\{\{ env\.QUALITY_CHANNEL \}\}/);
assert.match(playwrightEvidenceStep,/path: test-results\//);
assert.match(playwrightEvidenceStep,/if-no-files-found: ignore/);
assert.match(playwrightEvidenceStep,/retention-days: \$\{\{ env\.QUALITY_CHANNEL == 'stable' && 90 \|\| 30 \}\}/);
assert.doesNotMatch(gate,/^\s*continue-on-error:/m,'Los fallos deben conservar su estado autoritativo');
assert.doesNotMatch(gate,/playwright[^\n]*--retries(?:=|\s)/,'El workflow no debe introducir retries Playwright silenciosos');
for(const config of [playwright,playwrightWebDist])assert.doesNotMatch(config,/^\s*retries\s*:/m,'Playwright no debe ocultar flakes mediante retries');
assert.match(playwright,/trace:'retain-on-failure'/,'Playwright debe generar trace ante fallo cuando el proyecto lo soporta');

assert.match(validate,/push:[\s\S]*branches:/,'main y PR deben ejecutar el gate beta');
assert.match(pages,/push:[\s\S]*branches:[\s\S]*- main[\s\S]*paths:[\s\S]*\.github\/stable-release\.json/,'Una solicitud versionada en main debe poder publicar la linea base estable');
assert.doesNotMatch(pages,/push:[\s\S]*branches:[\s\S]*- main\s+(?![\s\S]*paths:)/,'Pages estable no debe publicarse automaticamente por cada commit');
assert.match(pages,/if: github\.event_name == 'push' \|\| inputs\.channel == 'stable'/);
assert.match(pages,/github\.event_name == 'push' && 'stable' \|\| inputs\.channel/);
assert.match(pages,/promotion-guard:/);
assert.match(pages,/node \.\/scripts\/stable-pages-guard\.mjs/);
assert.match(pages,/quality:[\s\S]*?needs: promotion-guard/);
assert.match(pages,/deploy:[\s\S]*?needs: \[promotion-guard, quality\]/);
assert.match(pages,/actions\/download-artifact@[a-f\d]{40} # v8/);
assert.equal(stableRelease.channel,'stable');
assert.equal(stableRelease.version,appVersion.version,'La solicitud estable debe usar la version activa');
assert.ok(Number.isInteger(stableRelease.build)&&stableRelease.build>0,'La solicitud estable debe declarar un build valido');
assert.ok(Number(stableRelease.build)<=Number(appVersion.build),'La solicitud estable no puede apuntar a un build futuro');
assert.doesNotMatch(debug,/\n  push:/,'El APK manual no debe duplicar el gate automatico de main');
assert.doesNotMatch(debug,/gh release/);
assert.match(release,/needs: quality/);
assert.match(release,/permissions:\s+contents: read/,'Release debe ser read-only por defecto');
assert.match(release,/release-apk:[\s\S]*?permissions:\s+contents: write/,'Solo el job publicador necesita contents: write');
assert.doesNotMatch(release,/\$GITHUB_ENV[^\n]*ANDROID_KEYSTORE|ANDROID_KEYSTORE[^\n]*>> "\$GITHUB_ENV"/,'La firma real no debe persistirse en GITHUB_ENV');
assert.ok(release.indexOf('gradle/actions/setup-gradle@')<release.indexOf('ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}'),'Actions externas deben configurarse antes de exponer firma real');
const signingStep=stepBlock(release,'Compilar APK release firmado');
for(const secret of ['ANDROID_KEYSTORE_BASE64','ANDROID_KEYSTORE_PASSWORD','ANDROID_KEY_ALIAS','ANDROID_KEY_PASSWORD']){
  assert.match(signingStep,new RegExp(`\\$\\{\\{ secrets\\.${secret} \\}\\}`),`El paso de firma debe recibir ${secret}`);
  assert.equal((release.match(new RegExp(`secrets\\.${secret}`,'g'))||[]).length,1,`${secret} no debe exponerse fuera del paso de firma`);
}
assert.match(signingStep,/trap 'rm -f "\$ANDROID_KEYSTORE_PATH"' EXIT/,'El keystore debe borrarse al terminar el paso de firma incluso si falla');
assert.ok(signingStep.indexOf("trap 'rm -f")<signingStep.indexOf('base64 --decode'),'El cleanup debe registrarse antes de materializar el keystore');
assert.match(signingStep,/gradle :app:assembleRelease --stacktrace --no-daemon/,'La firma real no debe heredarse a un Gradle daemon persistente');
assert.doesNotMatch(signingStep,/uses:/,'Ninguna Action externa debe ejecutarse dentro del alcance de la firma real');
assert.match(pages,/deploy:[\s\S]*?permissions:\s+contents: read\s+pages: write\s+id-token: write/,'Solo deploy debe recibir permisos Pages');
assert.match(release,/node \.\/scripts\/release-identity\.mjs/);
assert.match(release,/gh release create/);
assert.match(release,/gh release create[^\n]+--target "\$GITHUB_SHA"/);
assert.doesNotMatch(release,/--clobber/);
assert.doesNotMatch(release,/\n  push:/,'El release estable debe requerir despacho manual deliberado');

for(const caller of callers)assert.doesNotMatch(caller,/npm run test:e2e/,'Las matrices no deben duplicarse fuera del gate');

console.log('Quality gate unico correcto: beta automatica, estable por despacho o solicitud versionada, E2E, Firestore, web y Android compartidos.');
