import {test,expect} from '@playwright/test';
import {waitForAppReady} from './helpers/app-ready.mjs';

const WORKOUT_KEY='protocolo_0_100_workout_sessions_v1';
const PROTOCOL_KEY='protocolo_0_100_tracker_v1';

async function clean(page){
  await page.goto('/index.html');
  await waitForAppReady(page);
  await page.evaluate(()=>window.APP_DATA.clearAllData());
  await page.reload();
  await waitForAppReady(page);
}

test('conserva divergencias reconciliadas sin guardar contenido personal',async({page})=>{
  await clean(page);
  await page.evaluate(async key=>{
    window.APP_DATA.write(key,[{id:'base',date:'2026-07-27',note:'SECRETO_BASE',exercises:[]}]);
    await window.APP_DATA.flush();
    localStorage.setItem(key,JSON.stringify([{id:'write-ahead',date:'2026-07-28',note:'SECRETO_DIVERGENCIA',exercises:[]}]))
  },WORKOUT_KEY);
  await page.reload();
  await waitForAppReady(page);
  const first=await page.evaluate(async()=>({audit:await window.APP_DATA.compatibilityAudit(),exported:await window.APP_DATA.compatibilityAuditExport()}));
  expect(first.audit.totalDivergences).toBe(1);
  expect(first.audit.events[0]).toMatchObject({domain:'workout',type:'divergence',resolution:'local-write-ahead'});
  expect(first.audit.events[0]).not.toHaveProperty('localChecksum');
  expect(first.audit.events[0]).not.toHaveProperty('indexedChecksum');
  expect(first.audit.events[0]).not.toHaveProperty('raw');
  expect(JSON.stringify(first.exported)).not.toContain('SECRETO_');
  await page.reload();
  await waitForAppReady(page);
  const persisted=await page.evaluate(()=>window.APP_DATA.compatibilityAudit());
  expect(persisted.totalDivergences).toBe(1);
  expect(persisted.events).toHaveLength(1);
});

test('borrar el historial tecnico no borra el registro recuperado',async({page})=>{
  await clean(page);
  await page.evaluate(async key=>{
    window.APP_DATA.write(key,[{date:'2026-07-28',score:84,note:'registro intacto'}]);
    await window.APP_DATA.flush();
    localStorage.removeItem(key);
  },PROTOCOL_KEY);
  await page.reload();
  await waitForAppReady(page,{features:['PROTOCOL_FEATURES']});
  const result=await page.evaluate(async key=>{
    const before=await window.APP_DATA.compatibilityAudit();
    await window.APP_DATA.clearCompatibilityAudit();
    const after=await window.APP_DATA.compatibilityAudit();
    return{before,after,active:window.APP_DATA.readResult(key),indexed:await window.APP_DATA.readIndexedResult(key),local:JSON.parse(localStorage.getItem(key))};
  },PROTOCOL_KEY);
  expect(result.before.totalRecoveries).toBe(1);
  expect(result.before.events[0]).toMatchObject({domain:'protocol',type:'recovery',resolution:'indexeddb-recovery'});
  expect(result.after.totalChecks).toBe(0);
  expect(result.after.events).toEqual([]);
  expect(result.active.value[0].note).toBe('registro intacto');
  expect(result.indexed.value[0].note).toBe('registro intacto');
  expect(result.local[0].note).toBe('registro intacto');
});

test('Datos y copias permite comprobar y exportar el diagnostico tecnico',async({page})=>{
  await clean(page);
  await page.setViewportSize({width:320,height:568});
  await page.goto('/index.html?module=more&view=data');
  await waitForAppReady(page);
  await expect(page.locator('#compatibilityAuditSummary')).toContainText('comprobación');
  await expect(page.locator('#compatibilityAuditSummary')).not.toContainText('Preparando');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.locator('#dataAdvancedDiagnostics > summary').click();
  const before=Number(await page.locator('#compatibilityAuditChecks').textContent());
  await page.locator('#verifyCompatibilityBtn').click();
  await expect.poll(async()=>Number(await page.locator('#compatibilityAuditChecks').textContent())).toBeGreaterThan(before);
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#exportCompatibilityAuditBtn').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('protocolo-diagnostico-compatibilidad.json');
});

test('dos pestanas conservan todas las comprobaciones concurrentes',async({page,context})=>{
  await clean(page);
  const second=await context.newPage();
  await second.goto('/index.html');
  await waitForAppReady(second);
  const before=await page.evaluate(async()=> (await window.APP_DATA.compatibilityAudit()).totalChecks);
  await Promise.all([page.evaluate(()=>window.APP_DATA.verifyCompatibility()),second.evaluate(()=>window.APP_DATA.verifyCompatibility())]);
  const after=await page.evaluate(async()=> (await window.APP_DATA.compatibilityAudit()).totalChecks);
  expect(after).toBe(before+10);
  await second.close();
});

test('el diagnostico mantiene el modo compatible cuando IndexedDB no existe',async({browser})=>{
  const context=await browser.newContext();
  await context.addInitScript(()=>Object.defineProperty(window,'indexedDB',{configurable:true,value:undefined}));
  const page=await context.newPage();
  await page.goto('/index.html?module=more&view=data');
  await waitForAppReady(page);
  const audit=await page.evaluate(()=>window.APP_DATA.compatibilityAudit());
  expect(audit.available).toBe(false);
  await expect(page.locator('#compatibilityAuditSummary')).toContainText('no está disponible');
  await expect(page.locator('#protocolStorageStatus')).toContainText('Modo compatible');
  await context.close();
});
