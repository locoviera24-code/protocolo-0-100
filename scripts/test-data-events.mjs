import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../app/data-events.js',import.meta.url),'utf8');
const emitted=[];
class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}
const window={dispatchEvent:event=>emitted.push(event)};
vm.runInContext(source,vm.createContext({window,CustomEvent,Date,TypeError,Object,Array,String}),{filename:'app/data-events.js'});
const events=window.APP_DATA_EVENTS;
const fixed=()=> '2026-08-03T12:00:00.000Z';

for(const domain of events.DOMAINS){
  const change=events.create({domain,operation:'update',entityId:null},{now:fixed});
  assert.deepEqual({...change},{domain,operation:'update',entityId:null,occurredAt:fixed()});
}
for(const operation of events.OPERATIONS)assert.equal(events.validate(events.create({domain:'workout',operation,entityId:'set-1'},{now:fixed})).ok,true);
assert.equal(events.validate({domain:'health',operation:'update',entityId:null,occurredAt:fixed()}).ok,false);
assert.equal(events.validate({domain:'workout',operation:'write',entityId:null,occurredAt:fixed()}).ok,false);
assert.equal(events.validate({domain:'workout',operation:'update',entityId:'',occurredAt:fixed()}).ok,false);
assert.equal(events.validate({domain:'workout',operation:'update',entityId:null,occurredAt:'2026-08-03'}).ok,false);
assert.equal(events.validate({domain:'workout',operation:'update',entityId:null,occurredAt:fixed(),payload:{private:true}}).ok,false);
const emittedChange=events.emit({domain:'nutrition',operation:'create',entityId:'meal-1'},{now:fixed});
assert.equal(emitted.length,1);assert.equal(emitted[0].type,'app-data-change');assert.deepEqual({...emitted[0].detail},{...emittedChange});
assert.deepEqual(Object.keys(emittedChange),['domain','operation','entityId','occurredAt']);

console.log('Eventos de datos correctos: contrato minimo, UTC y sin contenido personal.');
