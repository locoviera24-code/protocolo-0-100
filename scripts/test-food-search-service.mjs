import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const window={NUTRIENT_DEFINITIONS:{},navigator:{onLine:true}};
const context=vm.createContext({window,console,structuredClone,Date,Math,JSON,Object,Array,Set,Map,String,Number,RegExp,Intl,AbortController,DOMException,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync('app/numbers.js','utf8'),context);
vm.runInContext(fs.readFileSync('nutrition/nutrition-model.js','utf8'),context);
vm.runInContext(fs.readFileSync('nutrition/food-search.js','utf8'),context);
vm.runInContext(fs.readFileSync('nutrition/food-search-service.js','utf8'),context);

const foods=[{id:'mandioca',name:'Mandioca hervida',aliases:['mandioca'],calories:125},{id:'pollo',name:'Pechuga de pollo',aliases:['pollo'],calories:165}];
const calls=[],provider={isAvailable:()=>true,search:async query=>{calls.push(query);return[{kind:'external',id:'external:1',food:{id:'fdc-1',name:'Kimchi',brandOwner:'',calories:30}}];}};
const service=window.NUTRITION_FOOD_SEARCH_SERVICE.create({provider,getFoods:()=>foods,online:()=>true});

const parsed=window.NUTRITION_FOOD_SEARCH_SERVICE.parseQuery('200 g de pollo');
assert.equal(parsed.query,'pollo');assert.equal(parsed.amount,200);assert.equal(parsed.unit,'g');
const exact=await service.search('mandioca');assert.equal(exact.externalState,'not-needed');assert.equal(calls.length,0);
const expanded=await service.search('kimchi');assert.equal(expanded.externalState,'loaded');assert.deepEqual(calls,['kimchi']);assert.equal(expanded.results.at(-1).food.name,'Kimchi');
const offline=await window.NUTRITION_FOOD_SEARCH_SERVICE.create({provider,getFoods:()=>foods,online:()=>false}).search('kimchi');assert.equal(offline.externalState,'offline');
const duplicate=window.NUTRITION_FOOD_SEARCH_SERVICE.dedupe([{kind:'local',food:{id:'custom-kimchi',name:'Kimchi'}}],[{kind:'external',food:{id:'fdc-1',name:'Kimchi'}}]);assert.equal(duplicate.length,1);

const scheduled=[];
const controller=window.NUTRITION_FOOD_SEARCH_SERVICE.createController({delay:350,service:{search:async value=>{scheduled.push(value);return{raw:value};}}});
controller.schedule('primera');const latest=controller.schedule('segunda');await latest;assert.deepEqual(scheduled,['segunda']);

console.log('Busqueda nutricional unificada correcta: ranking local, fallback, privacidad, deduplicacion, offline y cancelacion.');
