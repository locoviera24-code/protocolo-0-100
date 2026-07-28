import {test,expect} from '@playwright/test';

async function resetNutrition(page){
  await page.goto('/index.html');
  await page.evaluate(async()=>{localStorage.clear();await window.APP_DATA.clearAllData();});
  await page.goto('/index.html?module=nutrition&view=meals');
  await expect.poll(()=>page.evaluate(()=>Boolean(window.NUTRITION_RECIPES&&window.NUTRITION_PORTIONS))).toBe(true);
}

test('una receta calcula porciones y conserva el snapshot historico al editarse',async({page})=>{
  await resetNutrition(page);
  await page.getByRole('button',{name:'Mis alimentos y recetas',exact:true}).click();
  await page.locator('#nutritionRecipesDetails > summary').click();
  await page.locator('#recipeName').fill('Tortilla de prueba');
  await page.locator('#recipeServings').fill('2');
  await page.locator('#recipeTotalWeight').fill('200');
  await page.locator('#recipeIngredientFood').selectOption({index:1});
  await page.locator('#recipeIngredientAmount').fill('200');
  await page.locator('#recipeIngredientUnit').selectOption('g');
  await page.locator('#addRecipeIngredientBtn').click();
  await expect(page.locator('#recipeIngredientList .entryRow')).toHaveCount(1);
  await page.locator('#saveRecipeBtn').click();

  const recipe=await page.evaluate(()=>window.NUTRITION_STORE.recipes()[0]);
  expect(recipe.name).toBe('Tortilla de prueba');
  expect(recipe.servingWeightGrams).toBe(100);
  expect(recipe.ingredients).toHaveLength(1);

  await page.locator('#recipeList .nutritionFoodMenu summary').click();
  await page.locator('[data-recipe-action="portion"]').click();
  await expect(page.locator('[data-food-flow-step="review"]')).toBeVisible();
  await page.locator('#addFoodBtn').click();
  const entryBeforeEdit=await page.evaluate(()=>window.NUTRITION_STORE.entries()[0]);
  expect(entryBeforeEdit.recipeSnapshot.name).toBe('Tortilla de prueba');
  const backup=await page.evaluate(()=>window.buildCompleteBackup());
  expect(backup.recipes).toHaveLength(1);
  expect(Object.keys(backup.foodPortions)).toHaveLength(1);

  await page.getByRole('button',{name:'Mis alimentos y recetas',exact:true}).click();
  await page.locator('#recipeList .nutritionFoodMenu summary').click();
  await page.getByRole('menuitem',{name:'Editar'}).click();
  await page.locator('#recipeName').fill('Tortilla actualizada');
  await page.locator('#saveRecipeBtn').click();
  const state=await page.evaluate(()=>({recipe:window.NUTRITION_STORE.recipes()[0],entry:window.NUTRITION_STORE.entries()[0]}));
  expect(state.recipe.name).toBe('Tortilla actualizada');
  expect(state.entry.recipeSnapshot.name).toBe('Tortilla de prueba');
});

test('Agregar igual reutiliza cantidad, unidad y comida sin repetir el flujo',async({page})=>{
  await resetNutrition(page);
  await page.getByRole('button',{name:'Agregar',exact:true}).click();
  await page.locator('#nutritionFoodSearch').fill('mandioca');
  await page.locator('[data-food-flow-select]').first().click();
  await page.locator('[data-food-portion="150"]').click();
  await expect(page.locator('#foodQuantity')).toHaveValue('150');
  await page.locator('#foodQuantity').fill('175');
  await page.locator('#foodUnit').selectOption('g');
  await page.locator('#foodAmountNextBtn').click();
  await page.locator('#nutritionMeal').selectOption('Cena');
  await page.locator('#foodMealNextBtn').click();
  await page.locator('#addFoodBtn').click();

  await page.getByRole('button',{name:'Agregar',exact:true}).click();
  const repeat=page.locator('[data-food-flow-repeat]');
  await expect(repeat).toContainText('175 g');
  await expect(repeat).toContainText('Cena');
  await repeat.click();
  await expect(page.locator('[data-food-flow-step="review"]')).toBeVisible();
  await expect(page.locator('#nutritionFoodReview')).toContainText('175 g');
  await expect(page.locator('#nutritionFoodReview')).toContainText('Cena');
  await page.locator('#addFoodBtn').click();
  expect(await page.evaluate(()=>window.NUTRITION_STORE.entries().length)).toBe(2);
});

test('favoritos y tres combinaciones habituales persisten al recargar',async({page})=>{
  await resetNutrition(page);
  await page.evaluate(()=>{
    const foods=window.NUTRITION_DB.filter(item=>item.id&&item.id!=='select'),food=foods[0],favoriteFood=foods[1];
    let profiles={};
    [[100,'g','Desayuno'],[150,'g','Almuerzo'],[1,'taza','Merienda'],[200,'g','Cena']].forEach(([amount,unit,meal],index)=>{profiles=window.NUTRITION_PORTIONS.record(profiles,{food,amount,unit,meal,date:`2026-07-${10+index}`,usedAt:`2026-07-${10+index}T12:00:00Z`});});
    profiles=window.NUTRITION_PORTIONS.setFavorite(profiles,favoriteFood,true);
    window.NUTRITION_STORE.savePortions(profiles);
  });
  await page.reload();
  const stored=await page.evaluate(()=>{const values=Object.values(window.NUTRITION_STORE.portions()),used=values.find(item=>item.count===4);return{count:used.combinations.length,favorite:values.some(item=>item.favorite)};});
  expect(stored).toEqual({count:3,favorite:true});
  await page.getByRole('button',{name:'Agregar',exact:true}).click();
  await expect(page.locator('#nutritionFoodSuggestions')).toContainText('Favoritos');
});
