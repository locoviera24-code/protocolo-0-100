import {createServer} from 'node:http';
import {mkdir,readFile,stat} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {chromium} from '@playwright/test';

const root=resolve(new URL('../',import.meta.url).pathname.replace(/^\/(.:)/,'$1'));
const output=resolve(root,'docs/screenshots/web-core-flow-p0');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png'};

function localPath(url){
  const pathname=decodeURIComponent(new URL(url,'http://127.0.0.1').pathname),relative=pathname==='/'?'index.html':pathname.replace(/^\/+/,'');
  const target=resolve(root,relative);
  if(target!==root&&!target.startsWith(root+sep))throw new Error('INVALID_PATH');
  return target;
}

const server=createServer(async(request,response)=>{
  try{
    let target=localPath(request.url),info=await stat(target);if(info.isDirectory())target=resolve(target,'index.html');
    response.writeHead(200,{'Content-Type':types[extname(target).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});response.end(await readFile(target));
  }catch{response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});response.end('Not found');}
});

await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});

async function capture(name,path,selector,options={}){
  const context=await browser.newContext({viewport:options.viewport||{width:390,height:844},deviceScaleFactor:1,isMobile:!!options.mobile,hasTouch:!!options.mobile,locale:'es-PY',timezoneId:'America/Asuncion',colorScheme:'dark'});
  await context.addInitScript(enabled=>{localStorage.clear();sessionStorage.clear();if(enabled)localStorage.setItem('protocolo_0_100_ui_preferences_v1',JSON.stringify({experimentalFeaturesEnabled:true,experimentalFeaturesEnabledAt:'2026-08-03T00:00:00.000Z'}));},!!options.experimental);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(base+path,{waitUntil:'domcontentloaded'});
  await page.locator(selector).waitFor({state:'visible'});
  await page.waitForTimeout(350);
  if(errors.length)throw new Error(name+': '+errors.join(' | '));
  await page.screenshot({path:resolve(output,name+'.png'),fullPage:false});
  await context.close();
}

try{
  await capture('mobile-home','/index.html?module=home&view=register','#homeStatusCard',{viewport:{width:390,height:844},mobile:true});
  await capture('mobile-gym','/index.html?module=gym&view=train','#quickSetLoggerPanel',{viewport:{width:390,height:844},mobile:true});
  await capture('mobile-progress-empty','/index.html?module=progress&view=gym','[data-progress-empty="gym"]',{viewport:{width:390,height:844},mobile:true});
  await capture('desktop-experimental','/index.html?module=more&view=experimental','#experimentalFeaturesContent',{viewport:{width:1440,height:900},experimental:true});
  await capture('desktop-capabilities','/index.html?module=more&view=about','#platformCapabilitiesTable',{viewport:{width:1440,height:900}});
}finally{
  await browser.close();await new Promise(done=>server.close(done));
}

console.log('Evidencias Web Core Flow P0 generadas sin incorporarlas al precache.');
