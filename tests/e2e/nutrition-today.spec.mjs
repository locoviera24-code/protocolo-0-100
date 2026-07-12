import {test,expect} from '@playwright/test';

async function resetNutrition(page){
  await page.goto('/index.html');
  await page.evaluate(async()=>{localStorage.clear();await window.APP_DATA.clearAllData();});
  await page.goto('/index.html?module=nutrition&view=meals');
  await expect.poll(()=>page.evaluate(()=>Boolean(window.NUTRITION_STORE))).toBe(true);
}

test('Nutricion presenta Hoy, Agregar y Progreso sin ajustes avanzados en el flujo diario',async({page})=>{
  await resetNutrition(page);
  const tabs=page.locator('#tab-nutricion .nutritionNav [data-nutrition-view]');
  await expect(tabs).toHaveCount(3);
  await expect(tabs).toHaveText(['Hoy','Agregar','Progreso']);
  await expect(page.locator('#nutritionTodayCard')).toBeVisible();
  await expect(page.locator('#nutritionBuilderCard')).toBeHidden();
  await expect(page.locator('#nutritionWeight')).not.toBeVisible();
  await expect(page.locator('#nutritionTargetsCard')).toHaveCount(1);
  await expect(page.locator('#nutritionSettingsMount #nutritionTargetsCard')).toHaveCount(1);
  await page.getByRole('button',{name:'Agregar',exact:true}).click();
  await expect(page.locator('#nutritionBuilderCard')).toBeVisible();
  await expect(page.locator('#customFoodName')).toBeHidden();
  await expect(page.locator('#nutritionFoodSearch')).toBeVisible();
  await expect(page.locator('#addFoodBtn')).toBeHidden();
});

test('Hoy agrupa alimentos por comida y conserva agua y peso por separado',async({page})=>{
  await resetNutrition(page);
  const date=await page.locator('#nutritionDate').inputValue();
  await page.evaluate(({date})=>window.NUTRITION_STORE.saveBodyMetrics({[date]:{water:500,weight:72.5,savedAt:new Date().toISOString()}}),{date});
  await page.reload();
  await expect(page.locator('#nutritionWaterSummary')).toContainText('500');
  await page.locator('#nutritionWaterAdd250').click();
  await expect(page.locator('#nutritionWaterSummary')).toContainText('750');
  expect(await page.evaluate(date=>window.NUTRITION_STORE.bodyMetrics()[date].weight,date)).toBe(72.5);
  await page.locator('#undoNutritionWaterBtn').click();
  await expect(page.locator('#nutritionWaterSummary')).toContainText('500');

  await page.locator('[data-open-nutrition-view="registrar"]').first().click();
  await page.locator('.nutritionFoodFallback summary').click();
  await page.locator('#nutritionFood').selectOption({index:1});
  await page.locator('#foodQuantity').fill('150');
  await page.locator('#foodAmountNextBtn').click();
  await page.locator('#nutritionMeal').selectOption('Almuerzo');
  await page.locator('#foodMealNextBtn').click();
  await page.locator('#addFoodBtn').click();
  await page.getByRole('button',{name:'Hoy',exact:true}).click();
  await expect(page.locator('.nutritionMealGroup')).toHaveCount(1);
  await expect(page.locator('.nutritionMealGroup')).toContainText('Almuerzo');
  await expect(page.locator('.nutritionMealGroup')).toContainText('150 g');
});

test('Nutricion no provoca desplazamiento horizontal en pantalla pequena',async({page})=>{
  await page.setViewportSize({width:320,height:568});
  await resetNutrition(page);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator('#nutritionWaterAdd250')).toBeVisible();
});

test('Peso corporal usa kg canonicos al mostrar y guardar libras',async({page})=>{
  await resetNutrition(page);
  const date=await page.locator('#nutritionDate').inputValue();
  await page.evaluate(({date})=>window.NUTRITION_STORE.saveBodyMetrics({[date]:{water:0,weight:70,savedAt:new Date().toISOString()}}),{date});
  await page.goto('/index.html?module=more&view=settings');
  await page.locator('#settingsUnit').selectOption('lb');
  await page.locator('#saveUiSettingsBtn').click();
  await expect(page.locator('#nutritionWeightUnit')).toHaveText('lb');
  await expect(page.locator('#nutritionWeight')).toHaveValue('154.3');
  await page.locator('#nutritionWeight').fill('160');
  await page.locator('#saveNutritionWeightBtn').click();
  const stored=await page.evaluate(date=>window.NUTRITION_STORE.bodyMetrics()[date].weight,date);
  expect(stored).toBeCloseTo(72.575,3);
});

test('Agregar alimento guia seleccion, cantidad, comida, revision y Deshacer',async({page})=>{
  await resetNutrition(page);
  await page.getByRole('button',{name:'Agregar',exact:true}).click();
  await expect(page.locator('[data-food-flow-step="search"]')).toBeVisible();
  await page.locator('#nutritionFoodSearch').fill('mandioca');
  const choices=page.locator('[data-food-flow-select]');
  expect(await choices.count()).toBeGreaterThan(0);
  await choices.first().click();
  await expect(page.locator('[data-food-flow-step="amount"]')).toBeVisible();
  await expect(page.locator('#nutritionAmountStepTitle')).toBeFocused();
  await page.locator('#foodQuantity').fill('1');
  await page.locator('#foodUnit').selectOption('taza');
  await page.locator('#foodAmountNextBtn').click();
  await page.locator('#nutritionMeal').selectOption('Cena');
  await page.locator('#foodMealNextBtn').click();
  await expect(page.locator('#nutritionReviewStepTitle')).toBeFocused();
  await expect(page.locator('#nutritionFoodReview')).toContainText('Cena');
  await expect(page.locator('#nutritionFoodReview')).toContainText('Calorías');
  await page.locator('#addFoodBtn').click();
  await expect(page.locator('#nutritionTodayCard')).toBeVisible();
  await expect(page.locator('#nutritionDayList')).toContainText('Cena');
  await page.getByRole('button',{name:'Agregar',exact:true}).click();
  await expect(page.locator('#nutritionFoodSuggestions')).toContainText('Recientes');
  await expect(page.locator('#nutritionFoodSuggestions')).toContainText('Mandioca');
  await page.locator('#cancelFoodFlowBtn').click();
  await page.locator('#undoLastFoodBtn').click();
  await expect(page.locator('#nutritionDayList')).not.toContainText('Mandioca');
});

test('Alimento personalizado solo se crea al completar el flujo',async({page})=>{
  await resetNutrition(page);
  await page.getByRole('button',{name:'Agregar',exact:true}).click();
  await page.locator('#customFoodDetails summary').click();
  await page.locator('#customFoodName').fill('Sopa casera de prueba');
  await page.locator('#foodCalories').fill('80');
  await page.locator('#foodProtein').fill('4');
  await page.locator('#foodCarbs').fill('10');
  await page.locator('#foodFat').fill('2');
  await page.locator('#useCustomFoodBtn').click();
  expect(await page.evaluate(()=>window.NUTRITION_STORE.customFoods().some(food=>food.name==='Sopa casera de prueba'))).toBe(false);
  await page.locator('#foodQuantity').fill('250');
  await page.locator('#foodAmountNextBtn').click();
  await page.locator('#nutritionMeal').selectOption('Almuerzo');
  await page.locator('#foodMealNextBtn').click();
  await page.locator('#addFoodBtn').click();
  expect(await page.evaluate(()=>window.NUTRITION_STORE.customFoods().some(food=>food.name==='Sopa casera de prueba'))).toBe(true);
  await expect(page.locator('#nutritionDayList')).toContainText('Sopa casera de prueba');
});
