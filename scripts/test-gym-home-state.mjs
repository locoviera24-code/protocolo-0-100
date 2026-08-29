import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../app/gym-home-state.js',import.meta.url),'utf8');
const context={window:null};context.window=context;
vm.runInContext(source,vm.createContext(context),{filename:'app/gym-home-state.js'});
const {select,KINDS,ACTIONS}=context.GYM_HOME_STATE;

const TODAY='2026-08-28';
const workout=(name='Torso A')=>({type:'workout',name,muscles:['Pecho','Espalda'],exercises:[{id:'press',name:'Press'},{id:'remo',name:'Remo'}]});
const rest=(name='Descanso')=>({type:'rest',name,description:'Recuperación planificada.'});
const plan={monday:workout(),tuesday:workout('Pierna A'),wednesday:workout(),thursday:workout(),friday:workout(),saturday:rest(),sunday:rest()};
const exercise=(id='press',options={})=>({id,exerciseId:id,name:id==='press'?'Press':'Remo',completed:false,sets:[],...options});
const session=(options={})=>({id:'session-1',date:TODAY,status:'en progreso',startedAt:'2026-08-28T12:00:00.000Z',currentExerciseIndex:0,routine:{name:'Torso A'},exercises:[exercise()],...options});
function plain(value){return JSON.parse(JSON.stringify(value));}
function evaluate(input){const before=plain(input),result=plain(select(input));assert.deepEqual(plain(input),before,'El selector no debe mutar sus entradas');return result;}

{
  const input=Object.freeze({today:TODAY,sessions:Object.freeze([Object.freeze(session())]),weeklyPlan:Object.freeze(plan)});
  const state=evaluate(input);assert.equal(state.kind,KINDS.ACTIVE_SESSION);assert.equal(state.action.id,ACTIONS.CONTINUE_WORKOUT);assert.equal(state.exerciseId,'press');
}

{
  const state=evaluate({today:TODAY,sessions:[session({status:'finalizado',finishedAt:'2026-08-28T13:00:00.000Z',exercises:[exercise('press',{completed:true,sets:[{id:'set-1',completed:true,setType:'working'}]})]})],weeklyPlan:plan});
  assert.equal(state.kind,KINDS.COMPLETED_TODAY);assert.equal(state.action.id,ACTIONS.VIEW_PROGRESS);assert.deepEqual(state.facts,['1 ejercicio','1 serie efectiva']);
}

{
  const state=evaluate({today:TODAY,sessions:[],weeklyPlan:plan});assert.equal(state.kind,KINDS.PLANNED_TODAY);assert.equal(state.action.id,ACTIONS.START_WORKOUT);
}

{
  const state=evaluate({today:'2026-08-29',sessions:[],weeklyPlan:plan});assert.equal(state.kind,KINDS.REST_DAY);assert.equal(state.nextWorkout.name,'Torso A');
}

{
  const state=evaluate({today:TODAY,sessions:[],weeklyPlan:{}});assert.equal(state.kind,KINDS.SETUP_REQUIRED);assert.equal(state.action.id,ACTIONS.CONFIGURE_WORKOUT);
}

{
  const state=evaluate({today:TODAY,sessions:[],weeklyPlan:plan,hasWorkoutDraft:true});assert.equal(state.kind,KINDS.PLANNED_TODAY);assert.equal(state.hasWorkoutDraft,true);assert.match(state.description,/valores preparados/);
}

{
  const active=session(),completed=session({id:'done',status:'finalizado',finishedAt:'2026-08-28T11:00:00.000Z'});
  assert.equal(evaluate({today:TODAY,sessions:[completed,active],weeklyPlan:plan}).kind,KINDS.ACTIVE_SESSION,'ACTIVE debe ganar a COMPLETED y PLANNED');
}

{
  const completed=session({status:'finalizado',finishedAt:'2026-08-28T13:00:00.000Z'});
  assert.equal(evaluate({today:TODAY,sessions:[completed],weeklyPlan:plan}).kind,KINDS.COMPLETED_TODAY,'COMPLETED debe ganar a PLANNED');
}

{
  const reopened=session({finishedAt:'2026-08-28T11:00:00.000Z',status:'en progreso'});
  assert.equal(evaluate({today:TODAY,sessions:[reopened],weeklyPlan:plan}).kind,KINDS.ACTIVE_SESSION,'Una sesión reabierta sigue activa');
}

{
  const legacy={id:'legacy',date:TODAY,status:'finalizado',savedAt:'2026-08-28T09:00:00.000Z',routineName:'Importado',exercises:[exercise('press',{sets:[{id:'legacy-set',reps:8,weight:30}]})]};
  assert.equal(evaluate({today:TODAY,sessions:[legacy],weeklyPlan:plan}).kind,KINDS.COMPLETED_TODAY,'Una sesión legacy importada se reconoce');
}

{
  const malformed={...plan,friday:{type:'workout',name:'Vacío',exercises:[]}};
  assert.equal(evaluate({today:TODAY,sessions:[],weeklyPlan:malformed}).kind,KINDS.SETUP_REQUIRED,'Una rutina inutilizable requiere configuración');
}

{
  const corrupt=session({exercises:[null,{id:'remo',name:null,sets:null}],currentExerciseIndex:99});
  const state=evaluate({today:TODAY,sessions:[corrupt],weeklyPlan:plan});assert.equal(state.kind,KINDS.ACTIVE_SESSION);assert.equal(state.exerciseId,'remo');
}

{
  const beforeMidnight=evaluate({today:'2026-08-28',sessions:[session()],weeklyPlan:plan});
  const afterMidnight=evaluate({today:'2026-08-29',sessions:[session()],weeklyPlan:plan});
  assert.equal(beforeMidnight.kind,KINDS.ACTIVE_SESSION);assert.equal(afterMidnight.kind,KINDS.REST_DAY,'Las sesiones del día anterior no deben cruzar medianoche local');
}

{
  const defaultRoutineState=evaluate({today:TODAY,sessions:[],weeklyPlan:plan,setupRequired:false});
  assert.equal(defaultRoutineState.kind,KINDS.PLANNED_TODAY,'La rutina factory se degrada al flujo funcional; no prueba intención ni fuerza SETUP');
}

console.log('Home Gym-first correcto: cinco estados, precedencia, fechas locales, legacy y cero mutaciones.');
