import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const npmCli=process.env.npm_execpath;
const npmCommand=npmCli?process.execPath:(process.platform==='win32'?'npm.cmd':'npm');
const npmPrefix=npmCli?[npmCli]:[];
const pwsh=process.platform==='win32'?'pwsh.exe':'pwsh';

const stages=[
  ['Version and generated metadata','npm',['run','test:version']],
  ['Precache and manifest','npm',['run','test:precache']],
  ['Manifest contract','npm',['run','test:manifest']],
  ['Quality and release contracts','node',['scripts/test-quality-gate.mjs']],
  ['Android release contract','node',['scripts/test-android-release.mjs']],
  ['Pages release contract','node',['scripts/test-pages-release.mjs']],
  ['Service worker contract','node',['scripts/test-service-worker.mjs']],
  ['Application modules','npm',['run','test:modules']],
  ['Routing and layout','npm',['run','test:router']],
  ['Layout coordinator','npm',['run','test:layout']],
  ['Home and settings','npm',['run','test:home-settings']],
  ['Settings contract','npm',['run','test:settings']],
  ['Data and backup','npm',['run','test:data']],
  ['Workout domain','node',['scripts/test-workout-features.mjs']],
  ['Workout metrics','node',['scripts/test-workout-metrics.mjs']],
  ['Workout equipment','node',['scripts/test-workout-equipment.mjs']],
  ['Workout progression','node',['scripts/test-progression-engine.mjs']],
  ['Workout anomalies','node',['scripts/test-workout-anomalies.mjs']],
  ['Native workout controls','npm',['run','test:native-controls']],
  ['Gym Party contracts','node',['scripts/test-gym-party.mjs']],
  ['Gym Party sync','node',['scripts/test-gym-party-sync.mjs']],
  ['Progress domain','npm',['run','test:progress']],
  ['Nutrition domain','npm',['run','test:nutrition']],
  ['Nutrition confidence','npm',['run','test:fdc']],
  ['WebView security','node',['scripts/test-android-webview-security.mjs']],
  ['Static accessibility','node',['scripts/test-accessibility.mjs']],
  ['Repository structure and asset parity','pwsh',['-NoProfile','-File','scripts/validate-app.ps1','-CheckAndroidAssets']]
];

function commandFor(kind,args){
  if(kind==='npm')return{command:npmCommand,args:[...npmPrefix,...args]};
  if(kind==='node')return{command:process.execPath,args};
  return{command:pwsh,args};
}

const gateStarted=performance.now();
console.log(`Local gate: ${stages.length} deterministic stages`);
for(let index=0;index<stages.length;index+=1){
  const [label,kind,args]=stages[index];
  const stageStarted=performance.now();
  const {command,args:resolvedArgs}=commandFor(kind,args);
  console.log(`\n[${index+1}/${stages.length}] ${label}`);
  const result=spawnSync(command,resolvedArgs,{cwd:root,stdio:'inherit',windowsHide:true});
  const elapsed=((performance.now()-stageStarted)/1000).toFixed(1);
  if(result.error||result.status!==0){
    console.error(`FAILED: ${label} (${elapsed}s)`);
    if(result.error)console.error(result.error.message);
    process.exit(Number.isInteger(result.status)&&result.status!==0?result.status:1);
  }
  console.log(`PASS: ${label} (${elapsed}s)`);
}
console.log(`\nLocal gate PASS in ${((performance.now()-gateStarted)/1000).toFixed(1)}s.`);
