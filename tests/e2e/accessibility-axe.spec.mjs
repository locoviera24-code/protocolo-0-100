import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {waitForAppReady} from './helpers/app-ready.mjs';

const ROUTES=[
  ['Inicio','/index.html?module=home&view=register'],
  ['Gym','/index.html?module=gym&view=train'],
  ['Nutrición','/index.html?module=nutrition&view=meals'],
  ['Progreso','/index.html?module=progress&view=overview'],
  ['Más','/index.html?module=more&view=root'],
  ['Datos y copias','/index.html?module=more&view=data'],
  ['Gym Party','/index.html?module=gym&view=group']
];

async function clean(page){
  await page.goto('/index.html');
  await waitForAppReady(page);
  await page.evaluate(async()=>{localStorage.clear();sessionStorage.clear();await window.APP_DATA.clearAllData();});
}

for(const [name,path] of ROUTES){
  test(`@axe ${name} no tiene infracciones graves WCAG A/AA`,async({page})=>{
    await clean(page);
    await page.goto(path);
    await waitForAppReady(page);
    await page.locator('#mainContent').waitFor({state:'visible'});
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    const severe=result.violations.filter(item=>['serious','critical'].includes(item.impact));
    expect(severe,JSON.stringify(severe.map(item=>({id:item.id,impact:item.impact,help:item.help,targets:item.nodes.map(node=>node.target)})),null,2)).toEqual([]);
  });
}

test('@axe tabs de Inicio responden a flechas, Home y End',async({page})=>{
  await clean(page);await page.goto('/index.html?module=home&view=register');await waitForAppReady(page);
  const register=page.locator('#protocol-tab-registro'),summary=page.locator('#protocol-tab-dashboard');
  await register.focus();await register.press('ArrowRight');
  await expect(summary).toBeFocused();await expect(summary).toHaveAttribute('aria-selected','true');await expect(page.locator('#tab-dashboard')).toBeVisible();
  await summary.press('Home');
  await expect(register).toBeFocused();await expect(register).toHaveAttribute('aria-selected','true');await expect(page.locator('#tab-registro')).toBeVisible();
  await register.press('End');await expect(summary).toBeFocused();
});

test('@axe drawer cerrado queda fuera del orden de foco y restaura el control',async({page})=>{
  await clean(page);await page.goto('/index.html?module=home&view=register');await waitForAppReady(page);
  const trigger=page.locator('#openDrawerBtn'),drawer=page.locator('#sideDrawer');
  if(!await trigger.isVisible()){
    if(await drawer.isVisible()){await expect(drawer).not.toHaveAttribute('inert','');await expect(drawer).toHaveAttribute('aria-hidden','false');}
    else{await expect(drawer).toHaveAttribute('inert','');await expect(drawer).toHaveAttribute('aria-hidden','true');}
    return;
  }
  await expect(drawer).toHaveAttribute('inert','');
  await trigger.click();
  await expect(drawer).not.toHaveAttribute('inert','');await expect(page.locator('#closeDrawerBtn')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveAttribute('inert','');await expect(trigger).toBeFocused();
});
