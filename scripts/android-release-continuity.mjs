import {appendFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const CERTIFICATE_PATTERN=/Signer #\d+ certificate SHA-256 digest:\s*([0-9A-Fa-f:]+)/g;
const PACKAGE_PATTERN=/^package:\s+name='([^']+)'\s+versionCode='(\d+)'(?:\s+versionName='([^']*)')?/m;

function fail(code,message){
  const error=new Error(message||code);
  error.code=code;
  throw error;
}

export function normalizeCertificateSha256(value){
  const digest=String(value||'').replaceAll(':','').trim().toLowerCase();
  if(!/^[0-9a-f]{64}$/.test(digest))fail('APK_CERTIFICATE_INVALID');
  return digest;
}

export function parseSignerCertificateSha256(report){
  const matches=[...String(report||'').matchAll(CERTIFICATE_PATTERN)]
    .map(match=>normalizeCertificateSha256(match[1]));
  if(matches.length===0)fail('APK_CERTIFICATE_MISSING');
  if(matches.length!==1)fail('APK_CERTIFICATE_AMBIGUOUS');
  return matches[0];
}

export function parseApkBadging(report){
  const match=String(report||'').match(PACKAGE_PATTERN);
  if(!match)fail('APK_BADGING_INVALID');
  const versionCode=Number(match[2]);
  if(!Number.isSafeInteger(versionCode)||versionCode<=0)fail('APK_VERSION_CODE_INVALID');
  return Object.freeze({packageName:match[1],versionCode,versionName:match[3]||''});
}

export function selectPreviousStableApk(release){
  if(!release||typeof release!=='object'||release.draft===true||release.prerelease===true){
    fail('PREVIOUS_STABLE_RELEASE_INVALID');
  }
  const releaseTag=String(release.tag_name||'').trim();
  if(!releaseTag)fail('PREVIOUS_STABLE_RELEASE_INVALID');
  const assets=Array.isArray(release.assets)?release.assets:[];
  const apks=assets.filter(asset=>String(asset?.name||'').toLowerCase().endsWith('.apk'));
  if(apks.length===0)fail('PREVIOUS_STABLE_APK_MISSING');
  if(apks.length!==1)fail('PREVIOUS_STABLE_APK_AMBIGUOUS');
  const assetId=Number(apks[0].id);
  const assetName=String(apks[0].name||'').trim();
  if(!Number.isSafeInteger(assetId)||assetId<=0||!assetName)fail('PREVIOUS_STABLE_APK_INVALID');
  return Object.freeze({releaseTag,assetId,assetName});
}

export function verifyAndroidReleaseContinuity({
  previousCertificate,
  candidateCertificate,
  previousPackage,
  candidatePackage
}){
  const previousCertificateSha256=normalizeCertificateSha256(previousCertificate);
  const candidateCertificateSha256=normalizeCertificateSha256(candidateCertificate);
  if(previousCertificateSha256!==candidateCertificateSha256){
    fail('ANDROID_SIGNING_CERTIFICATE_MISMATCH','ERROR: Android signing certificate does not match previous stable APK.');
  }
  if(previousPackage?.packageName!==candidatePackage?.packageName){
    fail('ANDROID_APPLICATION_ID_MISMATCH','ERROR: Android applicationId does not match previous stable APK.');
  }
  const previousVersionCode=Number(previousPackage?.versionCode);
  const candidateVersionCode=Number(candidatePackage?.versionCode);
  if(!Number.isSafeInteger(previousVersionCode)||previousVersionCode<=0||
    !Number.isSafeInteger(candidateVersionCode)||candidateVersionCode<=previousVersionCode){
    fail('ANDROID_VERSION_CODE_NOT_INCREMENTED','ERROR: Android versionCode must be greater than previous stable APK.');
  }
  return Object.freeze({
    certificateSha256:candidateCertificateSha256,
    packageName:candidatePackage.packageName,
    previousVersionCode,
    candidateVersionCode
  });
}

async function appendOutputs(values){
  const output=process.env.GITHUB_OUTPUT;
  if(!output)fail('GITHUB_OUTPUT_REQUIRED');
  await appendFile(output,`${Object.entries(values).map(([key,value])=>`${key}=${value}`).join('\n')}\n`,'utf8');
}

async function selectCommand(file){
  if(!file)fail('PREVIOUS_RELEASE_FILE_REQUIRED');
  const release=JSON.parse((await readFile(resolve(file),'utf8')).replace(/^\uFEFF/,''));
  const selected=selectPreviousStableApk(release);
  await appendOutputs({
    release_tag:selected.releaseTag,
    asset_id:selected.assetId,
    asset_name:selected.assetName
  });
  process.stdout.write(`Previous stable APK: ${selected.releaseTag}/${selected.assetName}\n`);
}

async function verifyCommand(){
  const required=[
    'PREVIOUS_CERT_REPORT','CANDIDATE_CERT_REPORT',
    'PREVIOUS_BADGING_REPORT','CANDIDATE_BADGING_REPORT'
  ];
  for(const name of required)if(!process.env[name])fail(`${name}_REQUIRED`);
  const [previousCert,candidateCert,previousBadging,candidateBadging]=await Promise.all([
    readFile(resolve(process.env.PREVIOUS_CERT_REPORT),'utf8'),
    readFile(resolve(process.env.CANDIDATE_CERT_REPORT),'utf8'),
    readFile(resolve(process.env.PREVIOUS_BADGING_REPORT),'utf8'),
    readFile(resolve(process.env.CANDIDATE_BADGING_REPORT),'utf8')
  ]);
  const result=verifyAndroidReleaseContinuity({
    previousCertificate:parseSignerCertificateSha256(previousCert),
    candidateCertificate:parseSignerCertificateSha256(candidateCert),
    previousPackage:parseApkBadging(previousBadging),
    candidatePackage:parseApkBadging(candidateBadging)
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

async function main(){
  const [command,file]=process.argv.slice(2);
  if(command==='select')return selectCommand(file);
  if(command==='verify')return verifyCommand();
  fail('ANDROID_RELEASE_CONTINUITY_COMMAND_INVALID');
}

const invoked=process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url;
if(invoked)await main();
