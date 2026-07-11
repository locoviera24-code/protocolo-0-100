import {test,expect} from '@playwright/test';

async function reset(page, path='/index.html') {
  await page.goto(path);
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
}

async function expectNoHorizontalOverflow(page) {
  const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth+1);
}

test('barra inferior navega sin tapar contenido movil',async ({page},testInfo)=>{
  test.skip(testInfo.project.name==='desktop-chromium','Cobertura movil');
  await page.setViewportSize({width:390,height:844});
  await reset(page);

  const nav=page.locator('.bottomNav');
  await expect(nav).toBeVisible();
  await expect(page.locator('#openGymPartyTopBtn')).toBeHidden();
  await expect(page.getByRole('heading',{name:'Registro del día'})).toBeVisible();
  await expect(page.locator('#totalScreen')).toBeHidden();
  await page.locator('.dailyDetails summary').click();
  await expect(page.locator('#totalScreen')).toBeVisible();

  await nav.locator('[data-module-target="gym"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-module','gym');
  await expect(page.locator('#quickSetLoggerPanel')).toBeAttached();

  await nav.locator('[data-module-target="nutricion"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-module','nutricion');
  await expect(page.getByRole('button',{name:'Agregar alimento',exact:true}).first()).toBeVisible();

  await nav.locator('[data-module-target="progreso"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-module','progreso');
  await expect(page.getByRole('heading',{name:'Progreso',exact:true})).toBeVisible();

  await nav.locator('[data-module-target="mas"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-module','mas');
  await expect(page.getByRole('heading',{name:'Más herramientas'})).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({path:testInfo.outputPath('mobile-more.png'),fullPage:true});
});

test('layout responde de 320 a 430 px sin scroll horizontal',async ({page},testInfo)=>{
  test.skip(testInfo.project.name!=='android-chromium','Una pasada Chromium evita duplicacion');
  for(const width of [320,360,390,412,430]){
    await page.setViewportSize({width,height:800});
    await reset(page,'/index.html?module=gym');
    await expect(page.locator('.bottomNav')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const navBox=await page.locator('.bottomNav').boundingBox();
    expect(navBox?.width).toBeLessThanOrEqual(width+1);
  }
});

test('escritorio usa lateral compacto y oculta barra inferior',async ({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Cobertura escritorio');
  await page.setViewportSize({width:1440,height:900});
  await reset(page);
  await expect(page.locator('.bottomNav')).toBeHidden();
  await expect(page.locator('.sideDrawer')).toBeVisible();
  await page.locator('.sideDrawer [data-module-target="gym"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-module','gym');
  const navPrecedesWorkout=await page.evaluate(()=>!!(document.querySelector('.gymSectionNav').compareDocumentPosition(document.querySelector('#todayWorkoutPanel'))&Node.DOCUMENT_POSITION_FOLLOWING));
  expect(navPrecedesWorkout).toBe(true);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({path:testInfo.outputPath('desktop-gym.png'),fullPage:true});
});

test('movimiento reducido y enlace de invitacion conservan contratos',async ({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/index.html');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/index.html?gymPartyCode=ABCD1234');
  await expect(page.locator('body')).toHaveAttribute('data-module','gym-party');
  await expect(page).not.toHaveURL(/gymPartyCode=/);
  const behavior=await page.evaluate(()=>window.preferredMotionBehavior());
  expect(behavior).toBe('auto');
});
