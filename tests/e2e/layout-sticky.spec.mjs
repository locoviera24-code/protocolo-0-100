import {test,expect} from '@playwright/test';

async function clean(page,path){
  await page.goto('/index.html');
  await page.evaluate(()=>localStorage.clear());
  await page.goto(path);
}

test('capas sticky no se superponen en movil',async ({page},testInfo)=>{
  test.skip(testInfo.project.name!=='android-chromium');
  await page.setViewportSize({width:320,height:568});
  await clean(page,'/index.html?module=gym&view=train');
  await page.evaluate(()=>{window.scrollTo(0,document.body.scrollHeight);window.dispatchEvent(new Event('layout-refresh'));});
  await page.waitForTimeout(150);
  const layout=await page.evaluate(()=>{
    const rect=selector=>document.querySelector(selector)?.getBoundingClientRect().toJSON();
    return {top:rect('.moduleTopbar'),context:rect('.gymSectionNav'),action:rect('.quickStickyActions'),bottom:rect('.bottomNav'),activeActions:document.querySelectorAll('.layoutStickyAction.layoutActive').length,contextName:document.body.dataset.layoutContext,actionName:document.body.dataset.layoutAction};
  });
  expect(layout.activeActions).toBeLessThanOrEqual(1);
  expect(layout.context.top).toBeGreaterThanOrEqual(layout.top.bottom-1);
  expect(layout.action.bottom).toBeLessThanOrEqual(layout.bottom.top+1);
  expect(layout.contextName).toBe('gym');
  expect(layout.actionName).toBe('gym');

  await page.locator('#quickWeight').focus();
  await expect(page.locator('body')).toHaveClass(/keyboardOpen/);
  await expect(page.locator('.bottomNav')).toBeHidden();
  await expect(page.locator('#saveQuickSetBtn')).toBeVisible();
});

test('banner de actualización respeta navegación y acción',async ({page},testInfo)=>{
  test.skip(testInfo.project.name!=='android-chromium');
  await page.setViewportSize({width:390,height:844});
  await clean(page,'/index.html?module=home&view=register');
  await page.evaluate(()=>{
    const banner=document.createElement('div');
    banner.className='updateBanner';
    banner.innerHTML='<span>Nueva versión disponible</span><button>Actualizar ahora</button>';
    document.body.appendChild(banner);
    window.dispatchEvent(new Event('layout-refresh'));
  });
  await page.waitForTimeout(150);
  const boxes=await page.evaluate(()=>({banner:document.querySelector('.updateBanner').getBoundingClientRect().toJSON(),nav:document.querySelector('.bottomNav').getBoundingClientRect().toJSON(),action:document.querySelector('.dailySaveBar').getBoundingClientRect().toJSON()}));
  expect(boxes.banner.bottom).toBeLessThanOrEqual(boxes.nav.top+1);
  expect(boxes.banner.bottom).toBeLessThanOrEqual(boxes.action.top+1);
  await expect(page.getByText('Nueva versión disponible')).toBeVisible();
});

test('escritorio mantiene topbar y contexto sin acciones fijas',async ({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium');
  await clean(page,'/index.html?module=gym&view=train');
  const layout=await page.evaluate(()=>{
    const top=document.querySelector('.moduleTopbar').getBoundingClientRect();
    const context=document.querySelector('.gymSectionNav').getBoundingClientRect();
    return {topBottom:top.bottom,contextTop:context.top,actionPosition:getComputedStyle(document.querySelector('.quickStickyActions')).position};
  });
  expect(layout.contextTop).toBeGreaterThanOrEqual(layout.topBottom-1);
  expect(layout.actionPosition).toBe('static');
});

