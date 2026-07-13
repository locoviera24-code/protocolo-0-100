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
  await expect(page.locator('#nutritionFoodSuggestions')).toContainText('Agregar igual que la última vez');
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

test('El menu de alimento permite editar, mover, eliminar y Deshacer',async({page})=>{
  await resetNutrition(page);
  const date=await page.locator('#nutritionDate').inputValue();
  await page.evaluate(date=>{window.NUTRITION_STORE.saveEntries([{id:'food-editable',foodId:'test-food',date,meal:'Almuerzo',name:'Alimento editable',grams:100,calories:120,protein:10,carbs:15,fat:2,nutrients:{fiber:3},nutrientStatus:{fiber:'known'},savedAt:new Date().toISOString()}]);window.renderNutrition();},date);

  await page.locator('.nutritionFoodMenu summary').click();
  await page.getByRole('menuitem',{name:'Editar cantidad'}).click();
  await expect(page.locator('#nutritionEntryGrams')).toBeFocused();
  await page.locator('#nutritionEntryGrams').fill('200');
  await page.locator('#saveNutritionEntryEditBtn').click();
  let stored=await page.evaluate(()=>window.NUTRITION_STORE.entries()[0]);
  expect(stored.grams).toBe(200);expect(stored.calories).toBe(240);expect(stored.nutrients.fiber).toBe(6);

  await page.locator('.nutritionFoodMenu summary').click();
  await page.getByRole('menuitem',{name:'Mover de comida'}).click();
  await expect(page.locator('#nutritionEntryMeal')).toBeFocused();
  await page.locator('#nutritionEntryMeal').selectOption('Cena');
  await page.locator('#saveNutritionEntryEditBtn').click();
  await expect(page.locator('.nutritionMealGroup')).toContainText('Cena');

  await page.locator('.nutritionFoodMenu summary').click();
  await page.getByRole('menuitem',{name:'Eliminar'}).click();
  await expect(page.locator('#nutritionDayList')).not.toContainText('Alimento editable');
  await page.locator('#undoLastFoodBtn').click();
  await expect(page.locator('#nutritionDayList')).toContainText('Alimento editable');
  stored=await page.evaluate(()=>window.NUTRITION_STORE.entries()[0]);
  expect(stored.meal).toBe('Cena');expect(stored.grams).toBe(200);
});

test('El menu permite duplicar, copiar a otra fecha y guardar frecuente',async({page})=>{
  await resetNutrition(page);
  const date=await page.locator('#nutritionDate').inputValue();
  await page.evaluate(date=>{window.NUTRITION_STORE.saveEntries([{id:'food-source',foodId:'test-food',date,meal:'Desayuno',name:'Avena de prueba',grams:100,calories:360,protein:12,carbs:60,fat:7,nutrients:{fiber:9},savedAt:new Date().toISOString()}]);window.renderNutrition();},date);

  await page.locator('.nutritionFoodMenu summary').click();
  await page.getByRole('menuitem',{name:'Duplicar'}).click();
  expect(await page.evaluate(()=>window.NUTRITION_STORE.entries().length)).toBe(2);

  await page.locator('.nutritionFoodMenu summary').first().click();
  await page.getByRole('menuitem',{name:'Copiar a otra fecha'}).click();
  await page.locator('#nutritionEntryDate').fill('2026-07-01');
  await page.locator('#saveNutritionEntryEditBtn').click();
  expect(await page.evaluate(()=>window.NUTRITION_STORE.entries().filter(entry=>entry.date==='2026-07-01').length)).toBe(1);

  await page.locator('.nutritionFoodMenu summary').first().click();
  await page.getByRole('menuitem',{name:'Guardar como frecuente'}).click();
  expect(await page.evaluate(()=>window.NUTRITION_STORE.savedMeals().some(meal=>meal.name==='Avena de prueba'&&meal.items.length===1))).toBe(true);
});

test('La cobertura no interpreta nutrientes desconocidos como cero',async({page})=>{
  await resetNutrition(page);
  const date=await page.locator('#nutritionDate').inputValue();
  await page.evaluate(date=>{window.NUTRITION_STORE.saveEntries([{id:'unknown-food',foodId:'missing-definition',date,meal:'Almuerzo',name:'Alimento sin ficha',grams:100,calories:200,protein:5,carbs:20,fat:10,nutrients:{},nutrientStatus:{iron:'unknown'},savedAt:new Date().toISOString()}]);window.renderNutrition();},date);
  await expect(page.locator('#nutritionScoreSummary .quickStat').filter({hasText:'Fibra'})).toContainText('Sin datos');
  await page.getByRole('button',{name:'Ver cobertura estimada'}).click();
  await expect(page.locator('#nutritionCoverageSummary')).toContainText('ConfianzaInsuficiente');
  await expect(page.locator('#nutritionCoverageSummary')).toContainText('No se calcula un score');
  const iron=page.locator('#nutritionCoverageGrid .coverageRow').filter({hasText:'Hierro'});
  await expect(iron).toContainText('No evaluable');
  await expect(iron).toContainText('No se interpreta como cero');
  await expect(page.locator('#nutritionDiagnosis')).not.toContainText('Hierro parece bajo');
});

test('Un cero informado se muestra como cero confirmado',async({page})=>{
  await resetNutrition(page);
  const date=await page.locator('#nutritionDate').inputValue();
  await page.evaluate(date=>{const food=window.NUTRITION_DB.find(item=>item.id==='orange'),entry=window.NUTRITION_MODEL.buildEntry(food,140,'Merienda',date,{id:'orange-entry',definitions:window.NUTRIENT_DEFINITIONS});window.NUTRITION_STORE.saveEntries([entry]);window.renderNutrition();},date);
  await page.getByRole('button',{name:'Ver cobertura estimada'}).click();
  const sodium=page.locator('#nutritionCoverageGrid .coverageRow').filter({hasText:'Sodio'});
  await expect(sodium).toContainText('cero(s) confirmado(s)');
  await expect(sodium).not.toContainText('No evaluable');
});

test('Cobertura baja muestra rango y reserva el score exacto',async({page})=>{
  await resetNutrition(page);
  const date=await page.locator('#nutritionDate').inputValue();
  await page.evaluate(date=>{const food={id:'partial-food',name:'Alimento parcial',aliases:[],category:'personalizados',portionGrams:100,calories:200,protein:10,carbs:20,fat:8,nutrients:{fiber:4,iron:2,calcium:100,potassium:200,magnesium:40},reportedNutrients:['fiber','iron','calcium','potassium','magnesium'],confidence:'alto',source:'prueba'},entry=window.NUTRITION_MODEL.buildEntry(food,100,'Cena',date,{id:'partial-entry',definitions:window.NUTRIENT_DEFINITIONS});window.NUTRITION_STORE.saveCustomFoods([food]);window.NUTRITION_STORE.saveEntries([entry]);window.renderNutrition();},date);
  await page.getByRole('button',{name:'Ver cobertura estimada'}).click();
  await expect(page.locator('#nutritionCoverageSummary')).toContainText('ConfianzaBaja');
  await expect(page.locator('#nutritionCoverageSummary')).toContainText('Rango orientativo');
  await expect(page.locator('#nutritionCoverageSummary')).toContainText('no se muestra una cifra exacta');
});
