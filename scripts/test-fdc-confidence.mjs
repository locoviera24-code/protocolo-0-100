import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const memory=new Map();
const window={APP_DATA:{read:(key,fallback)=>memory.has(key)?structuredClone(memory.get(key)):structuredClone(fallback),write:(key,value)=>{memory.set(key,structuredClone(value));return value;}}};
const context=vm.createContext({window,console,structuredClone,Date,Math,JSON,Object,Array,Set,Map,String,Number,RegExp,Promise,setTimeout,clearTimeout,fetch:async()=>{throw new Error('network disabled in test');},AbortController,URL,Blob});
vm.runInContext(fs.readFileSync('fdc-client.js','utf8'),context);

const source={fdcId:123,description:'Alimento FDC de prueba',dataType:'Foundation',foodNutrients:[
  {nutrient:{id:1003,name:'Protein',unitName:'g'},amount:12},
  {nutrient:{id:1093,name:'Sodium, Na',unitName:'mg'},amount:0}
]};
const food=window.FDC_CLIENT.normalizeFood(source);
assert.equal(food.protein,12);
assert.equal(food.iron,0,'La forma compatible conserva cero para consumidores legacy');
assert.ok(food.reportedNutrients.includes('protein'));
assert.ok(food.reportedNutrients.includes('sodium'),'Un cero presente en FDC es un dato informado');
assert.ok(!food.reportedNutrients.includes('iron'),'Un nutriente ausente no se inventa como cero confirmado');

window.FDC_CLIENT.upsertCachedFood(food);
const edited=window.FDC_CLIENT.updateCachedFood(food.id,{iron:0});
assert.ok(edited.reportedNutrients.includes('iron'),'Una edicion explicita a cero queda confirmada');
console.log('FDC conserva compatibilidad numerica y distingue ausente de cero confirmado.');
