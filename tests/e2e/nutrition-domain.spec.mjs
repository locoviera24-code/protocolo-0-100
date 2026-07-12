import {test,expect} from '@playwright/test';

test('Nutricion usa el repositorio y conserva entradas tras recargar',async({page})=>{
  await page.goto('/index.html');
  await page.evaluate(async()=>{localStorage.clear();await window.APP_DATA.clearAllData();});
  await page.goto('/index.html?module=nutrition&view=meals');
  await expect.poll(()=>page.evaluate(()=>!!window.NUTRITION_STORE&&!!window.NUTRITION_MODEL)).toBe(true);
  await page.locator('[data-open-nutrition-view="registrar"]').first().click();
  await page.locator('#nutritionFood').selectOption({index:1});
  await page.locator('#foodQuantity').fill('150');
  await page.locator('#nutritionMeal').selectOption('Almuerzo');
  await page.locator('#addFoodBtn').click();
  await expect(page.locator('#nutritionDayList')).not.toContainText('Todavía no registraste');
  const before=await page.evaluate(async()=>{await window.APP_DATA.flush();const local=window.NUTRITION_STORE.entries();const indexed=await window.APP_REPOSITORIES.nutrition.getAsync(window.NUTRITION_STORE.keys.entries,[]);return{local,indexed,backup:window.buildCompleteBackup()};});
  expect(before.local).toHaveLength(1);expect(before.local[0].grams).toBe(150);expect(before.local[0].meal).toBe('Almuerzo');
  expect(before.indexed[0].id).toBe(before.local[0].id);expect(before.backup.nutritionEntries).toHaveLength(1);
  await page.reload();
  expect(await page.evaluate(()=>window.NUTRITION_STORE.entries().length)).toBe(1);
});
