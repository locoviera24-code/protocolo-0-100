import {test,expect} from '@playwright/test';

const externalFood={
  fdcId:98123,description:'Tempeh zeta',dataType:'Foundation',foodCategory:'Legumbres',servingSize:100,servingSizeUnit:'g',
  foodNutrients:[
    {nutrient:{id:1008,name:'Energy',unitName:'kcal'},amount:190},
    {nutrient:{id:1003,name:'Protein',unitName:'g'},amount:20},
    {nutrient:{id:1005,name:'Carbohydrate, by difference',unitName:'g'},amount:8},
    {nutrient:{id:1004,name:'Total lipid (fat)',unitName:'g'},amount:10}
  ]
};
async function reset(page){
  await page.goto('/index.html');await page.evaluate(async()=>{localStorage.clear();await window.APP_DATA.clearAllData();});
  await page.goto('/index.html?module=nutrition&view=meals');await page.getByRole('button',{name:'Agregar',exact:true}).click();
}
async function installProviderMock(page,{empty=false}={}){
  await page.evaluate(({raw,empty})=>{
    window.__nutritionExternalQueries=[];window.__nutritionExternalDetails=0;
    const real=window.FDC_CLIENT,client={
      hasRemoteAccess:()=>true,
      config:()=>({backendUrl:'mock://nutrition'}),
      searchFoods:async query=>{window.__nutritionExternalQueries.push(query);return{foods:empty?[]:[raw],totalHits:empty?0:1,currentPage:1,totalPages:empty?0:1};},
      normalizeFood:value=>real.normalizeFood(value),
      importFood:async value=>{window.__nutritionExternalDetails+=1;return real.normalizeFood(value);},
      upsertCachedFood:food=>real.upsertCachedFood(food)
    };
    window.NUTRITION_EXTERNAL_PROVIDER=window.NutritionExternalProvider({client});window.__nutritionUnifiedSearch=null;
  },{raw:externalFood,empty});
}

test('la experiencia cotidiana muestra una sola busqueda sin terminos tecnicos',async({page})=>{
  await reset(page);const card=page.locator('#nutritionBuilderCard');
  await expect(card.getByRole('heading',{name:'Registrar alimento'})).toBeVisible();
  await expect(page.locator('#nutritionFoodSearch')).toHaveAttribute('placeholder',/pollo, mandioca/);
  const text=await card.innerText();for(const term of ['USDA','FoodData Central','FDC','API key','dataset','Base de datos local','Base de datos externa'])expect(text).not.toContain(term);
  await expect(page.locator('#nutritionFoodVoiceBtn')).toBeVisible();
});

test('una coincidencia interna exacta no consulta el proveedor',async({page})=>{
  await reset(page);await installProviderMock(page);
  await page.locator('#nutritionFoodSearch').fill('mandioca');await page.waitForTimeout(650);
  expect(await page.evaluate(()=>window.__nutritionExternalQueries.length)).toBe(0);await expect(page.locator('[data-food-flow-select]').first()).toContainText(/mandioca/i);
});

test('fallback automatico envia solo el alimento, guarda el resultado y reutiliza cache',async({page})=>{
  await reset(page);await installProviderMock(page);
  await page.locator('#nutritionFoodSearch').fill('200 g de tempeh zeta');
  await expect(page.locator('#nutritionFoodSearchStatus')).toContainText('Encontramos más opciones');
  expect(await page.evaluate(()=>window.__nutritionExternalQueries)).toEqual(['tempeh zeta']);
  await page.locator('[data-food-flow-external]').click();await expect(page.locator('[data-food-flow-step="amount"]')).toBeVisible();
  await expect(page.locator('#foodQuantity')).toHaveValue('200');await expect(page.locator('#foodUnit')).toHaveValue('g');expect(await page.evaluate(()=>window.__nutritionExternalDetails)).toBe(1);
  const cached=await page.evaluate(()=>window.FDC_CLIENT.cachedFoods().find(food=>food.fdcId===98123));expect(cached.provider).toBe('usda-fdc');expect(cached.nutritionSnapshot.calories).toBe(190);
  await page.locator('#cancelFoodFlowBtn').click();await page.getByRole('button',{name:'Agregar',exact:true}).click();await page.locator('#nutritionFoodSearch').fill('tempeh zeta');await page.waitForTimeout(650);
  expect(await page.evaluate(()=>window.__nutritionExternalQueries)).toEqual(['tempeh zeta']);await expect(page.locator('[data-food-flow-select]').first()).toContainText('Tempeh zeta');
});

test('cancela consultas obsoletas y conserva fallback offline',async({page,context})=>{
  await reset(page);await installProviderMock(page,{empty:true});
  await page.locator('#nutritionFoodSearch').fill('alimento alfa inusual');await page.waitForTimeout(100);await page.locator('#nutritionFoodSearch').fill('alimento beta inusual');
  await expect(page.locator('#nutritionFoodSearchStatus')).toContainText('No encontramos más coincidencias');expect((await page.evaluate(()=>window.__nutritionExternalQueries)).at(-1)).toBe('alimento beta inusual');
  await context.setOffline(true);await page.locator('#nutritionFoodSearch').fill('alimento gamma inusual');await expect(page.locator('#nutritionFoodSearchStatus')).toContainText('Sin conexión');await expect(page.locator('#customFoodDetails')).toBeVisible();await context.setOffline(false);
});
