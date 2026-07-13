import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const memory=new Map(),writes=[];
const nutritionRepository={get:(key,fallback)=>memory.has(key)?structuredClone(memory.get(key)):structuredClone(fallback),set:(key,value)=>{writes.push(key);memory.set(key,structuredClone(value));return value;}};
const window={APP_REPOSITORIES:{nutrition:nutritionRepository},NUTRIENT_DEFINITIONS:{fiber:{label:'Fibra'},iron:{label:'Hierro'},sodium:{label:'Sodio'}}};
const context=vm.createContext({window,console,localStorage:{getItem:()=>null,setItem:()=>{}},structuredClone,Date,Math,JSON,Object,Array,Set,Map,String,Number,RegExp});
for(const file of ['nutrition-store.js','nutrition-model.js','recipes.js','portions.js','food-search.js','food-entry-flow.js','meal-history.js','nutrition-confidence.js','nutrition-view.js'])vm.runInContext(fs.readFileSync(`nutrition/${file}`,'utf8'),context);

const {NUTRITION_STORE:store,NUTRITION_MODEL:model,NUTRITION_RECIPES:recipes,NUTRITION_PORTIONS:portions,NUTRITION_FOOD_SEARCH:search,NUTRITION_ENTRY_FLOW:flow,NUTRITION_MEAL_HISTORY:history,NUTRITION_CONFIDENCE:confidence,NUTRITION_VIEW:view}=window;
store.saveEntries([{id:'old',date:'2026-07-11',name:'Arroz'}]);
store.addEntry({id:'new',date:'2026-07-12',name:'Mandióca'});
assert.equal(store.entries().length,2);
assert.ok(writes.every(key=>key.startsWith('protocolo_0_100_')));

const food={id:'mandioca',name:'Mandioca hervida',aliases:['mandiócas'],calories:125,protein:1,carbs:30,fat:.3,fiber:1.8,iron:0,sodium:0,reportedNutrients:['fiber','sodium'],confidence:'alto',units:{taza:200}};
const entry=model.buildEntry(food,200,'Almuerzo','2026-07-12',{id:'entry',now:'2026-07-12T12:00:00.000Z',definitions:window.NUTRIENT_DEFINITIONS});
assert.equal(entry.calories,250);assert.equal(entry.nutrients.fiber,3.6);assert.equal(entry.nutrientStatus.iron,'unknown');assert.equal(entry.nutrientStatus.sodium,'known');
assert.equal(model.amountToGrams(1,'taza',food).grams,200);
assert.equal(search.findBest([food],'mandiocas',{}).food.id,'mandioca');

const controller=flow.create({date:'2026-07-12'});controller.set({food,amount:1,unit:'taza',meal:'Almuerzo'}).go('review');
assert.equal(controller.review().grams,200);assert.equal(controller.review().entry.meal,'Almuerzo');
assert.equal(history.recent([entry,{...entry,id:'entry-2',savedAt:'2026-07-13T00:00:00Z'}]).length,1);
assert.equal(history.frequent([entry,{...entry,id:'entry-2'}])[0].count,2);
const coverage=confidence.coverage([entry],['fiber','iron','sodium'],{foodResolver:()=>food});
assert.equal(coverage.rows.find(row=>row.key==='iron').unknown,1);assert.equal(coverage.rows.find(row=>row.key==='sodium').confirmedZero,1);assert.notEqual(coverage.confidence,'high');
const legacyCoverage=confidence.coverage([{name:'Sin fuente'}],['iron']);assert.equal(legacyCoverage.rows[0].notReported,1);
assert.equal(confidence.scorePresentation(60,'insufficient').kind,'none');assert.equal(JSON.stringify(confidence.scorePresentation(60,'low').range),'[50,70]');assert.equal(confidence.scorePresentation(60,'medium').score,60);
const day=view.dayModel([entry],'2026-07-12',store.targets(),{water:500});
assert.equal(day.groups.Almuerzo.length,1);assert.equal(view.progressRows(day).length,4);

const rice={id:'rice',name:'Arroz cocido',calories:130,protein:2.7,carbs:28,fat:.3,reportedNutrients:[],confidence:'alto'};
const egg={id:'egg',name:'Huevo',calories:143,protein:13,carbs:.7,fat:9.5,reportedNutrients:[],confidence:'alto'};
const recipe=recipes.build({name:'Tortilla con arroz',servings:2,totalWeightGrams:300,ingredients:[{food:rice,amount:200,unit:'g'},{food:egg,amount:100,unit:'g'}],confidence:'alto'});
assert.equal(recipes.validate(recipes.build({name:'',ingredients:[{food:rice,amount:100,unit:'g'}]})).ok,false);
assert.equal(recipe.servingWeightGrams,150);
assert.equal(recipe.totalNutrition.calories,403);
assert.equal(recipe.nutritionPerServing.calories,201.5);
const recipeFood=recipes.toFood(recipe),recipeEntry=model.buildEntry(recipeFood,recipe.servingWeightGrams,'Cena','2026-07-12',{id:'recipe-entry',definitions:window.NUTRIENT_DEFINITIONS});
assert.equal(recipeEntry.recipeId,recipe.id);assert.equal(recipeEntry.recipeSnapshot.name,'Tortilla con arroz');assert.equal(recipeEntry.calories,202);
const edited=recipes.build({...recipe,name:'Tortilla editada',ingredients:[{food:rice,amount:300,unit:'g'}]},recipe);
assert.equal(recipeEntry.recipeSnapshot.name,'Tortilla con arroz');assert.notEqual(edited.totalNutrition.calories,recipe.totalNutrition.calories);

let profiles={};profiles=portions.record(profiles,{food:rice,amount:1,unit:'taza',meal:'Almuerzo',date:'2026-07-10',usedAt:'2026-07-10T12:00:00Z'});profiles=portions.record(profiles,{food:rice,amount:150,unit:'g',meal:'Cena',date:'2026-07-11',usedAt:'2026-07-11T20:00:00Z'});profiles=portions.record(profiles,{food:rice,amount:200,unit:'g',meal:'Almuerzo',date:'2026-07-12',usedAt:'2026-07-12T12:00:00Z'});profiles=portions.record(profiles,{food:rice,amount:100,unit:'g',meal:'Desayuno',date:'2026-07-13',usedAt:'2026-07-13T08:00:00Z'});
assert.equal(portions.profileFor(profiles,rice).combinations.length,3);assert.equal(portions.suggestion(profiles,rice).amount,100);
profiles=portions.setFavorite(profiles,rice,true);assert.equal(portions.favorites(profiles)[0].foodId,'rice');
store.saveRecipes([recipe]);store.savePortions(profiles);assert.equal(store.recipes()[0].id,recipe.id);assert.equal(store.portions().rice.favorite,true);
console.log('Dominio Nutricion correcto: repositorio, recetas con snapshot, porciones habituales, flujo, historial, confianza y view.');
