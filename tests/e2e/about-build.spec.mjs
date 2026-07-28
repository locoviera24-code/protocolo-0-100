import {test,expect} from '@playwright/test';

test.use({serviceWorkers:'block'});

async function openAbout(page){
  await page.goto('/index.html');
  await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
  await page.goto('/index.html?module=more&view=about');
  await expect.poll(()=>page.evaluate(()=>Boolean(window.APP_BUILD_INFO))).toBe(true);
}

test('Acerca de muestra metadatos del artifact y comprueba el build activo',async({page})=>{
  await openAbout(page);
  const version=await page.evaluate(()=>window.APP_VERSION_INFO);
  await expect(page.locator('#aboutWebVersion')).toHaveText(version.version);
  await expect(page.locator('#aboutBuildNumber')).toHaveText(String(version.build));
  await expect(page.locator('#aboutChannel')).toHaveText('Desarrollo');
  await expect(page.locator('#aboutCacheVersion')).toHaveText(version.cacheLabel);
  await page.locator('#checkForUpdateBtn').click();
  await expect(page.locator('#aboutUpdateStatus')).toHaveText('La aplicación está actualizada');
  await expect(page.locator('#aboutLastUpdateCheck')).toContainText('Última comprobación:');
});

test('Acerca de detecta un build publicado posterior sin recargar',async({page})=>{
  await page.route(/build-info\.json\?__pwa_update_check=/,route=>route.fulfill({contentType:'application/json',body:JSON.stringify({schemaVersion:1,version:'2.7.0',versionCode:33,build:89,commit:'abcdef1234567890',artifactCreatedAt:'2026-07-28T12:00:00.000Z',channel:'stable'})}));
  await page.route(/app-version\.json\?__pwa_update_check=/,route=>route.fulfill({contentType:'application/json',body:JSON.stringify({version:'2.7.0',versionCode:33,build:89,updatedAt:'2026-07-28'})}));
  await openAbout(page);
  await page.locator('#checkForUpdateBtn').click();
  await expect(page.locator('#aboutUpdateStatus')).toContainText('Hay una actualización disponible: build 89');
  await expect(page.locator('#checkForUpdateBtn')).toHaveText('Preparar actualización');
});

test('una actualización preparada no se activa mientras existan borradores',async({page})=>{
  await openAbout(page);
  const result=await page.evaluate(async()=>{
    window.APP_DRAFTS.schedule({id:'update-safe-test',domain:'test',payload:{value:1}},{debounceMs:0});
    window.APP_DRAFTS.flushAll();
    let messages=0;
    const worker={postMessage(){messages+=1;}};
    const blocked=await window.APP_BUILD_INFO.activate({waiting:worker},worker);
    window.APP_DRAFTS.remove('update-safe-test');
    const accepted=await window.APP_BUILD_INFO.activate({waiting:worker},worker);
    return{blocked,accepted,messages};
  });
  expect(result.blocked.ok).toBe(false);
  expect(result.blocked.reasons.join(' ')).toContain('borradores');
  expect(result.accepted.ok).toBe(true);
  expect(result.messages).toBe(1);
});
