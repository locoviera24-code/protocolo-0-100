import {test,expect} from '@playwright/test';

const routes=[
  ['Inicio','/index.html?module=home'],
  ['Gym','/index.html?module=gym&view=train'],
  ['Nutricion','/index.html?module=nutrition&view=today'],
  ['Progreso','/index.html?module=progress&view=overview'],
  ['Gym Party','/index.html?module=gym&view=group'],
  ['Mas','/index.html?module=more&view=menu'],
  ['Datos y copias','/index.html?module=more&view=data']
];

test('artifact publicado carga modulos, rutas y service worker sin errores',async({page,request})=>{
  const consoleErrors=[],pageErrors=[],failedRequests=[],badResponses=[],routeStates=[];
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('requestfailed',requestItem=>failedRequests.push(`${requestItem.url()} ${requestItem.failure()?.errorText||''}`));
  page.on('response',response=>{if(response.status()>=400)badResponses.push(`${response.status()} ${response.url()}`);});

  for(const [name,route] of routes){
    const response=await page.goto(route,{waitUntil:'networkidle'});
    expect(response?.status(),`${name} debe responder 200`).toBe(200);
    await page.waitForFunction(()=>window.PROGRESS_VIEW&&window.NUTRITION_VIEW&&window.WORKOUT_SET_MODEL);
    const state=await page.evaluate(()=>({
      numbers:typeof window.APP_NUMBERS,
      drafts:typeof window.APP_DRAFTS,
      repositories:typeof window.APP_REPOSITORIES,
      setModel:typeof window.WORKOUT_SET_MODEL,
      nutrition:typeof window.NUTRITION_VIEW,
      progress:typeof window.PROGRESS_VIEW
    }));
    routeStates.push({name,state});
  }

  for(const asset of ['/app/numbers.js','/app/drafts.js','/app/dates.js','/gym/set-model.js','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-maskable-192.png','/icons/shortcut-nutrition-96.png','/screenshots/mobile-home-390x844.png','/screenshots/desktop-gym-1440x900.png','/offline.html','/precache-manifest.js']){
    const response=await request.get(asset);
    expect(response.status(),`${asset} debe responder 200`).toBe(200);
  }
  const worker=await page.evaluate(async()=>{
    if(!('serviceWorker'in navigator))return'';
    const registration=await navigator.serviceWorker.ready;
    return registration.active?.scriptURL||registration.waiting?.scriptURL||registration.installing?.scriptURL||'';
  });
  expect(worker).toContain('/sw.js');
  const cacheDiagnostic=await page.evaluate(async()=>{
    const registration=await navigator.serviceWorker.ready,worker=registration.active;
    return new Promise((resolve,reject)=>{const channel=new MessageChannel(),timer=setTimeout(()=>reject(new Error('cache diagnostic timeout')),5000);channel.port1.onmessage=event=>{clearTimeout(timer);resolve(event.data);};worker.postMessage({type:'PWA_CACHE_DIAGNOSTIC'},[channel.port2]);});
  });
  expect(cacheDiagnostic.missingRequired).toEqual([]);
  expect(cacheDiagnostic.build).toBe(await page.evaluate(()=>window.APP_VERSION_INFO.build));
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(badResponses).toEqual([]);
  for(const {name,state} of routeStates)expect(state,`${name} debe cargar todos los modulos`).toEqual({numbers:'object',drafts:'object',repositories:'object',setModel:'object',nutrition:'object',progress:'object'});
});
