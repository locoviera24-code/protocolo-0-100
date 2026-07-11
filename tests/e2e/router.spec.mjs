import {test,expect} from '@playwright/test';

async function clean(page,path='/index.html'){
  await page.goto('/index.html');
  await page.evaluate(()=>localStorage.clear());
  await page.goto(path);
}

test('deep links y Atrás conservan la vista jerarquica',async ({page})=>{
  await clean(page,'/index.html?module=gym&view=routine');
  await expect(page.locator('body')).toHaveAttribute('data-module','gym');
  await expect(page).toHaveURL(/module=gym&view=routine/);
  await expect(page.locator('#routeBackBtn')).toBeVisible();
  await expect(page.locator('#workoutConfigPanel details').first()).toHaveAttribute('open','');
  await page.locator('#routeBackBtn').click();
  await expect(page).toHaveURL(/module=gym&view=train/);
  await expect(page.locator('#routeBackBtn')).toBeHidden();

  await page.locator('[data-gym-section="progress"]').click();
  await expect(page).toHaveURL(/module=gym&view=progress/);
  await page.goBack();
  await expect(page).toHaveURL(/module=gym&view=train/);
  await expect(page.locator('body')).toHaveAttribute('data-module','gym');
});

test('Más abre pantallas propias y no reutiliza el dashboard',async ({page})=>{
  await clean(page);
  await page.locator('[data-module-target="mas"]:visible').first().click();
  await expect(page).toHaveURL(/module=more&view=root/);
  await page.getByRole('button',{name:/Ajustes/}).first().click();
  await expect(page).toHaveURL(/module=more&view=settings/);
  await expect(page.locator('#tab-settings')).toBeVisible();
  await expect(page.locator('#tab-dashboard')).toBeHidden();
  await expect(page.locator('#currentModuleTitle')).toHaveText('Ajustes');
  await expect(page.locator('#settingsViewTitle')).toBeFocused();
  await expect(page.locator('.bottomNav [data-module-target="mas"]')).toHaveAttribute('aria-current','page');
  await page.reload();
  await expect(page.locator('#tab-settings')).toBeVisible();
  await page.locator('#routeBackBtn').click();
  await expect(page).toHaveURL(/module=more&view=root/);
  await expect(page.locator('#tab-mas')).toBeVisible();
});

test('alias Gym Party antiguo se vuelve deep link canonico',async ({page})=>{
  await clean(page,'/index.html?module=gym-party');
  await expect(page).toHaveURL(/module=gym&view=group/);
  await expect(page.locator('body')).toHaveAttribute('data-module','gym-party');
  await expect(page.locator('.bottomNav [data-module-target="gym"]')).toHaveAttribute('aria-current','page');
});
