import {test,expect} from '@playwright/test';

test('Nutricion usa el repositorio y conserva entradas tras recargar',async({page})=>{
  await page.goto('/index.html');
  await page.evaluate(async()=>{localStorage.clear();await window.APP_DATA.clearAllData();});
  await page.goto('/index.html?module=nutrition&view=meals');
  await expect.poll(()=>page.evaluate(()=>!!window.NUTRITION_STORE&&!!window.NUTRITION_MODEL)).toBe(true);
  await page.locator('[data-open-nutrition-view="registrar"]').first().click();
  await page.locator('#nutritionFoodSearch').fill('mandioca');
  await page.locator('[data-food-flow-select]').first().click();
  await page.locator('#foodQuantity').fill('150');
  await page.locator('#foodAmountNextBtn').click();
  await page.locator('#nutritionMeal').selectOption('Almuerzo');
  await page.locator('#foodMealNextBtn').click();
  await page.locator('#addFoodBtn').click();
  await expect(page.locator('#nutritionDayList')).not.toContainText('Todavía no registraste');
  await expect.poll(async()=>{
    try{
      return await page.evaluate(async()=>{
        if(!window.APP_DATA?.flush||!window.NUTRITION_STORE?.entries||!window.APP_REPOSITORIES?.nutrition?.getAsync)return null;
        await window.APP_DATA.flush();
        const local=window.NUTRITION_STORE.entries();
        const indexed=await window.APP_REPOSITORIES.nutrition.getAsync(window.NUTRITION_STORE.keys.entries,[]);
        return{localCount:local.length,grams:local[0]?.grams,meal:local[0]?.meal,sameId:indexed[0]?.id===local[0]?.id,backupCount:window.buildCompleteBackup().nutritionEntries.length};
      });
    }catch(error){
      if(String(error).includes('Execution context was destroyed'))return null;
      throw error;
    }
  }).toEqual({localCount:1,grams:150,meal:'Almuerzo',sameId:true,backupCount:1});
  await page.reload();
  expect(await page.evaluate(()=>window.NUTRITION_STORE.entries().length)).toBe(1);
});
