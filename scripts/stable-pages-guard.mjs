import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

function positiveInteger(value,code){
  const number=Number(value);
  if(!Number.isSafeInteger(number)||number<=0)throw new Error(code);
  return number;
}

export function validateStablePagesPromotion(appVersion,stableRelease,{channel}={}){
  const normalizedChannel=String(channel||'').trim();
  if(normalizedChannel==='beta')return Object.freeze({channel:'beta',aligned:false});
  if(normalizedChannel!=='stable')throw new Error('PAGES_CHANNEL_INVALID');
  if(String(stableRelease?.channel||'').trim()!=='stable')throw new Error('PAGES_STABLE_CHANNEL_INVALID');
  const appBuild=positiveInteger(appVersion?.build,'PAGES_APP_BUILD_INVALID');
  const stableBuild=positiveInteger(stableRelease?.build,'PAGES_STABLE_BUILD_INVALID');
  if(String(appVersion?.version||'').trim()!==String(stableRelease?.version||'').trim()||appBuild!==stableBuild){
    throw new Error(`PAGES_STABLE_METADATA_MISMATCH:app=${appVersion?.version}+${appBuild}:stable=${stableRelease?.version}+${stableBuild}`);
  }
  return Object.freeze({channel:'stable',aligned:true,version:String(appVersion.version),build:appBuild});
}

async function main(){
  const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
  const [appVersion,stableRelease]=await Promise.all([
    readFile(resolve(root,'app-version.json'),'utf8').then(JSON.parse),
    readFile(resolve(root,'.github/stable-release.json'),'utf8').then(JSON.parse)
  ]);
  const result=validateStablePagesPromotion(appVersion,stableRelease,{channel:process.env.PAGES_CHANNEL});
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const invoked=process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url;
if(invoked)await main();
