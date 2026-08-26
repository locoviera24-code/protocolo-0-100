import {appendFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const VERSION_PATTERN=/^\d+\.\d+\.\d+$/;
const PRERELEASE_SUFFIX_PATTERN=/^[0-9A-Za-z](?:[0-9A-Za-z.-]*[0-9A-Za-z])?$/;

function positiveInteger(value,code){
  const number=Number(value);
  if(!Number.isInteger(number)||number<=0)throw new Error(code);
  return number;
}

function parsePrerelease(value){
  if(value===true||value==='true')return true;
  if(value===false||value===''||value==null||value==='false')return false;
  throw new Error('RELEASE_PRERELEASE_INVALID');
}

export function createReleaseIdentity(manifest,{requestedTag='',prerelease=false}={}){
  const version=String(manifest?.version||'').trim();
  if(!VERSION_PATTERN.test(version))throw new Error('RELEASE_VERSION_INVALID');
  const build=positiveInteger(manifest?.build,'RELEASE_BUILD_INVALID');
  const versionCode=positiveInteger(manifest?.versionCode,'RELEASE_VERSION_CODE_INVALID');
  const isPrerelease=parsePrerelease(prerelease);
  const baseTag=`v${version}-build.${build}`;
  let tag=String(requestedTag||'').trim();

  if(isPrerelease){
    const prefix=`${baseTag}-`;
    if(!tag.startsWith(prefix)||!PRERELEASE_SUFFIX_PATTERN.test(tag.slice(prefix.length))){
      throw new Error(`RELEASE_PRERELEASE_TAG_INVALID:${prefix}<suffix>`);
    }
  }else{
    if(tag&&tag!==baseTag)throw new Error(`RELEASE_STABLE_TAG_INVALID:${baseTag}`);
    tag=baseTag;
  }

  const artifact=`protocolo-0-100-${tag}-android.${versionCode}-release`;
  return Object.freeze({
    version,
    build,
    versionCode,
    prerelease:isPrerelease,
    tag,
    artifact,
    apk:`${artifact}.apk`,
    checksum:`${artifact}.apk.sha256`,
    title:`Protocolo 0-100 v${version} (build ${build}, Android ${versionCode})`
  });
}

export function validateReleaseRef(ref,{prerelease=false}={}){
  if(!parsePrerelease(prerelease)&&ref!=='refs/heads/main')throw new Error('RELEASE_STABLE_REQUIRES_MAIN');
  return true;
}

async function main(){
  const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
  const manifest=JSON.parse(await readFile(resolve(root,'app-version.json'),'utf8'));
  const identity=createReleaseIdentity(manifest,{
    requestedTag:process.env.RELEASE_TAG,
    prerelease:process.env.RELEASE_PRERELEASE
  });
  validateReleaseRef(process.env.GITHUB_REF||'',identity);

  const output=process.env.GITHUB_OUTPUT;
  if(!output)throw new Error('GITHUB_OUTPUT_REQUIRED');
  const lines=Object.entries(identity).map(([key,value])=>`${key}=${value}`).join('\n');
  await appendFile(output,`${lines}\n`,'utf8');
  process.stdout.write(`${JSON.stringify(identity)}\n`);
}

const invoked=process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url;
if(invoked)await main();
