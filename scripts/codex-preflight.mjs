import {existsSync, readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const requireAndroid=process.argv.includes('--require-android');

function execute(command,args=[]){
  return spawnSync(command,args,{cwd:root,encoding:'utf8',windowsHide:true});
}

function text(command,args=[]){
  const result=execute(command,args);
  if(result.error||result.status!==0)throw result.error||new Error(`${command} termino con codigo ${result.status}`);
  return String(result.stdout||result.stderr||'').trim();
}

function optionalVersion(command,args=[]){
  const result=execute(command,args);
  if(result.error||result.status!==0)return null;
  return String(result.stdout||result.stderr||'').trim().split(/\r?\n/)[0]||null;
}

function findAdb(){
  const executable=process.platform==='win32'?'adb.exe':'adb';
  const candidates=[
    process.env.ADB,
    process.env.ANDROID_SDK_ROOT&&join(process.env.ANDROID_SDK_ROOT,'platform-tools',executable),
    process.env.ANDROID_HOME&&join(process.env.ANDROID_HOME,'platform-tools',executable),
    process.platform==='win32'&&join(homedir(),'Downloads','platform-tools-latest-windows','platform-tools',executable),
    process.platform==='win32'&&join(homedir(),'Downloads','platform-tools',executable),
    executable
  ].filter(Boolean);
  for(const candidate of [...new Set(candidates)]){
    if(candidate.includes('/')||candidate.includes('\\')){
      if(!existsSync(candidate))continue;
    }
    if(optionalVersion(candidate,['version']))return candidate;
  }
  return null;
}

function backupSchema(){
  const source=readFileSync(join(root,'data','schema-registry.js'),'utf8');
  const match=source.match(/entry\('versionedState',[\s\S]*?schemaVersion:\s*(\d+)/);
  if(!match)throw new Error('No se pudo resolver el backup schema desde data/schema-registry.js.');
  return Number(match[1]);
}

const app=JSON.parse(readFileSync(join(root,'app-version.json'),'utf8'));
const stable=JSON.parse(readFileSync(join(root,'.github','stable-release.json'),'utf8'));
const status=text('git',['status','--porcelain=v1']);
const java=optionalVersion('java',['-version']);
const npmCommand=process.platform==='win32'?'npm.cmd':'npm';
const npmFromUserAgent=String(process.env.npm_config_user_agent||'').match(/\bnpm\/([^\s]+)/)?.[1]||null;
const npm=npmFromUserAgent||optionalVersion(npmCommand,['--version']);
const adb=findAdb();
let adbDevices=[];
if(adb){
  const result=execute(adb,['devices','-l']);
  if(!result.error&&result.status===0)adbDevices=String(result.stdout||'').split(/\r?\n/).slice(1).map(line=>line.trim()).filter(Boolean);
}
const connected=adbDevices.some(line=>/\sdevice(?:\s|$)/.test(line));

console.log('Codex preflight (read-only)');
console.log(`Repository root: ${root}`);
console.log(`Branch: ${text('git',['branch','--show-current'])||'(detached)'}`);
console.log(`HEAD: ${text('git',['rev-parse','HEAD'])}`);
console.log(`Working tree: ${status?`changes detected (${status.split(/\r?\n/).length})`:'clean'}`);
if(status)console.log(status);
console.log(`App: ${app.version} build ${app.build} Android ${app.versionCode}`);
console.log(`Stable registry: ${stable.version} build ${stable.build} channel ${stable.channel}`);
console.log(`Backup schema: ${backupSchema()}`);
console.log(`Node: ${process.version}`);
console.log(`npm: ${npm||'WARN unavailable'}`);
console.log(`Java: ${java||'WARN unavailable'}`);
console.log(`ADB: ${adb||'WARN unavailable'}`);
console.log(`ADB devices: ${adbDevices.length?adbDevices.join(' | '):'none'}`);

if(requireAndroid&&!adb){
  console.error('ERROR: --require-android requiere ADB disponible.');
  process.exit(1);
}
if(requireAndroid&&!connected){
  console.error('ERROR: --require-android requiere al menos un dispositivo en estado device.');
  process.exit(1);
}
