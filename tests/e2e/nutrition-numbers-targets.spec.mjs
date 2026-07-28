import {test,expect} from '@playwright/test';

async function reset(page,path='/index.html?module=nutrition&view=meals'){
  await page.goto('/index.html');
  await page.evaluate(async()=>{localStorage.clear();await window.APP_DATA.clearAllData();});
  await page.goto(path);
  await expect.poll(()=>page.evaluate(()=>Boolean(window.APP_NUMBERS&&window.NUTRITION_STORE))).toBe(true);
}

test('alimento personalizado usa campos basicos y acepta coma decimal',async({page})=>{
  await reset(page);
  await page.getByRole('button',{name:'Agregar',exact:true}).click();
  await page.getByRole('button',{name:'No encuentro este alimento'}).click();
  await expect(page.locator('#nutritionRecipesCard')).toBeVisible();
  await expect(page.locator('#foodFiber')).toBeHidden();
  await page.locator('#customFoodName').fill('Yogur decimal de prueba');
  await page.locator('#foodPortionGrams').fill('125,5');
  await page.locator('#foodCalories').fill('80,5');
  await page.locator('#foodProtein').fill('7,5');
  await page.locator('#foodCarbs').fill('10,2');
  await page.locator('#foodFat').fill('2,1');
  await page.locator('#useCustomFoodBtn').click();
  await expect(page.locator('#foodQuantity')).toHaveValue('125.5');
  await page.locator('#foodAmountNextBtn').click();
  await page.locator('#nutritionMeal').selectOption('Merienda');
  await page.locator('#foodMealNextBtn').click();
  await page.locator('#addFoodBtn').click();
  const stored=await page.evaluate(()=>({food:window.NUTRITION_STORE.customFoods()[0],entry:window.NUTRITION_STORE.entries()[0]}));
  expect(stored.food.portionGrams).toBe(125.5);
  expect(stored.food.protein).toBe(7.5);
  expect(stored.entry.grams).toBe(125.5);

  await page.getByRole('button',{name:'Agregar',exact:true}).click();
  await page.getByRole('button',{name:'No encuentro este alimento'}).click();
  await page.locator('#customFoodName').fill('Yogur decimal de prueba');
  await page.locator('#useCustomFoodBtn').click();
  await expect(page.locator('#customFoodName')).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('#customFoodDetails')).toContainText('Ya existe');
});

test('objetivos son manuales, localizados y conservan procedencia',async({page})=>{
  await reset(page,'/index.html?module=more&view=settings');
  await page.evaluate(()=>localStorage.setItem('protocolo_0_100_nutrition_profile_v1',JSON.stringify({age:35,sex:'male',height:180,goal:'performance'})));
  await page.reload();
  await expect(page.locator('#nutritionTargetsCard')).toContainText('Objetivos diarios manuales');
  await expect(page.locator('#nutritionAge')).toHaveCount(0);
  await expect(page.locator('#nutritionSex')).toHaveCount(0);
  await page.locator('#targetProtein').fill('137,5');
  await page.locator('#targetB12').fill('2,4');
  await page.locator('#saveNutritionTargetsBtn').click();
  const targets=await page.evaluate(()=>window.NUTRITION_STORE.targets());
  expect(targets.protein).toBe(137.5);
  expect(targets.b12).toBe(2.4);
  expect(targets._meta.protein.source).toBe('manual');
  expect(targets._meta.protein.calculationVersion).toBe('manual-v1');
  await expect(page.locator('#nutritionTargetsMeta')).toContainText('Última actualización');
  await page.reload();
  await expect(page.locator('#targetProtein')).toHaveValue('137,5');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_nutrition_profile_v1')).age)).toBe(35);
});

test('alimentos propios se duplican, archivan, fusionan y eliminan con Deshacer',async({page})=>{
  await reset(page,'/index.html?module=more&view=settings');
  await page.getByRole('button',{name:'Mis alimentos y recetas'}).click();
  await expect(page.locator('#nutritionRecipesCard')).toBeVisible();
  await page.evaluate(()=>{
    window.NUTRITION_STORE.saveCustomFoods([
      {id:'custom-a',name:'Alimento A',aliases:['Alimento A'],portionGrams:100,calories:100,protein:5,carbs:15,fat:2,reportedNutrients:[],custom:true},
      {id:'custom-b',name:'Alimento B',aliases:['Alimento B'],portionGrams:100,calories:120,protein:6,carbs:17,fat:3,reportedNutrients:[],custom:true}
    ]);
    window.renderAdvancedNutrition();
  });
  await expect(page.locator('#customFoodsList .entryRow')).toHaveCount(2);
  const first=page.locator('#customFoodsList .entryRow').filter({hasText:'Alimento A'}).first();
  await first.locator('summary').click();
  await first.getByRole('menuitem',{name:'Duplicar / usar como plantilla'}).click();
  await expect(page.locator('#customFoodsList .entryRow')).toHaveCount(3);

  let copy=page.locator('#customFoodsList .entryRow').filter({hasText:'Alimento A (copia)'});
  await copy.locator('summary').click();
  await copy.getByRole('menuitem',{name:'Archivar'}).click();
  expect(await page.evaluate(()=>window.NUTRITION_STORE.customFoods().find(food=>food.name.includes('(copia)')).archived)).toBe(true);
  copy=page.locator('#customFoodsList .entryRow').filter({hasText:'Alimento A (copia)'});
  await copy.locator('summary').click();
  await copy.getByRole('menuitem',{name:'Restaurar'}).click();

  copy=page.locator('#customFoodsList .entryRow').filter({hasText:'Alimento A (copia)'});
  await copy.locator('summary').click();
  await copy.getByRole('menuitem',{name:'Fusionar duplicado'}).click();
  await page.locator('#appFormField-targetId').selectOption('custom-a');
  await page.locator('#appFormDialogSubmit').click();
  await page.locator('#appConfirmationConfirm').click();
  await expect(page.locator('#customFoodsList .entryRow')).toHaveCount(2);
  expect(await page.evaluate(()=>window.NUTRITION_STORE.customFoods().find(food=>food.id==='custom-a').aliases.some(alias=>alias.includes('(copia)')))).toBe(true);

  const second=page.locator('#customFoodsList .entryRow').filter({hasText:'Alimento B'});
  await second.locator('summary').click();
  await second.getByRole('menuitem',{name:'Eliminar'}).click();
  await page.locator('#appConfirmationConfirm').click();
  await expect(page.locator('#customFoodsList .entryRow')).toHaveCount(1);
  await page.locator('#appSnackbarAction').click();
  await expect(page.locator('#customFoodsList .entryRow')).toHaveCount(2);
});

test('Gym Party guarda pesos con coma como kg canonicos',async({page})=>{
  await reset(page,'/index.html?module=gym&view=group');
  await page.locator('#gymPartyCreateAlias').fill('Yo');
  await page.locator('#gymPartyCreateName').fill('Sala decimal');
  await page.locator('[data-gym-party-action="create"]').click();
  await page.locator('#partyWorkoutDateInput').fill('2026-07-13');
  await page.locator('#partyWorkoutDateInput').dispatchEvent('change');
  await page.locator('#partyQuickReps').fill('8');
  await page.locator('#partyQuickWeight').fill('20,5');
  await page.locator('[data-gym-party-action="party-save-set"]').click();
  const weight=await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_workout_sessions_v1'))[0].exercises[0].sets[0].weight);
  expect(weight).toBe(20.5);
});
