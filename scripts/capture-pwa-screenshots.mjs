import {createServer} from 'node:http';
import {mkdir,readFile,stat} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {chromium} from '@playwright/test';

const root=resolve(new URL('../',import.meta.url).pathname.replace(/^\/(.:)/,'$1'));
const output=resolve(root,'screenshots');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png'};

function localPath(url){
  const pathname=decodeURIComponent(new URL(url,'http://127.0.0.1').pathname),relative=pathname==='/'?'index.html':pathname.replace(/^\/+/,''),target=resolve(root,relative);
  if(target!==root&&!target.startsWith(`${root}${sep}`))throw new Error('INVALID_PATH');
  return target;
}

const server=createServer(async(request,response)=>{
  try{
    let target=localPath(request.url);const info=await stat(target);if(info.isDirectory())target=resolve(target,'index.html');
    response.writeHead(200,{'Content-Type':types[extname(target).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});response.end(await readFile(target));
  }catch{response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});response.end('Not found');}
});

await new Promise(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));
const address=server.address(),base=`http://127.0.0.1:${address.port}`;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'es-PY',timezoneId:'America/Asuncion',colorScheme:'dark'});
  const mobilePage=await mobile.newPage();await mobilePage.goto(`${base}/index.html?module=home`,{waitUntil:'domcontentloaded'});await mobilePage.locator('#homeStatusCard').waitFor();await mobilePage.waitForTimeout(500);await mobilePage.screenshot({path:resolve(output,'mobile-home-390x844.png')});await mobile.close();

  const desktop=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,locale:'es-PY',timezoneId:'America/Asuncion',colorScheme:'dark'});
  const desktopPage=await desktop.newPage();await desktopPage.goto(`${base}/index.html?module=gym`,{waitUntil:'domcontentloaded'});await desktopPage.locator('#quickSetLoggerPanel').waitFor();await desktopPage.waitForTimeout(500);await desktopPage.screenshot({path:resolve(output,'desktop-gym-1440x900.png')});await desktop.close();
}finally{await browser.close();await new Promise(resolveClose=>server.close(resolveClose));}

console.log('Screenshots PWA generados: 390x844 y 1440x900.');
