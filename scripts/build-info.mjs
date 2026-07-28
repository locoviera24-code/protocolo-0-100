import {execFileSync} from 'node:child_process';

const CHANNELS=new Set(['beta','stable','development']);

function sourceCommit(env=process.env){
  const provided=String(env.GITHUB_SHA||env.APP_COMMIT||'').trim();
  if(/^[a-f\d]{7,40}$/i.test(provided))return provided.toLowerCase();
  try{return execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().toLowerCase();}
  catch{return'development';}
}

function artifactDate(env=process.env){
  const provided=String(env.ARTIFACT_CREATED_AT||'').trim();
  if(provided&&Number.isFinite(Date.parse(provided)))return new Date(provided).toISOString();
  return new Date().toISOString();
}

export function createBuildInfo(version,{env=process.env}={}){
  const requested=String(env.QUALITY_CHANNEL||env.APP_CHANNEL||'development').trim().toLowerCase();
  return{
    schemaVersion:1,
    version:String(version.version),
    versionCode:Number(version.versionCode),
    build:Number(version.build),
    commit:sourceCommit(env),
    artifactCreatedAt:artifactDate(env),
    channel:CHANNELS.has(requested)?requested:'development'
  };
}

export function renderBuildInfo(info){return`${JSON.stringify(info,null,2)}\n`;}
