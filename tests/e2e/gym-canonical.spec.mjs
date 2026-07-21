import {test,expect} from '@playwright/test';

test('migra gymSessions una vez y conserva workoutSessions como fuente nueva',async({page})=>{
  await page.goto('/index.html');
  await page.evaluate(async()=>{localStorage.clear();await window.APP_DATA.clearAllData();localStorage.setItem('protocolo_0_100_gym_sessions_v1',JSON.stringify([{id:'legacy-one',date:'2026-07-01',routine:'Legacy torso',items:[{id:'old-press',name:'Press antiguo',muscle:'Pecho',sets:2,reps:8,weight:50,rir:2}],notes:'importado',savedAt:'2026-07-01T12:00:00.000Z'}]));});
  await page.reload();
  await expect.poll(()=>page.evaluate(()=>Boolean(window.WORKOUT_FEATURES))).toBe(true);
  await page.evaluate(()=>window.WORKOUT_FEATURES.ready());
  const migrated=await page.evaluate(()=>({canonical:JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions)||'[]'),legacy:JSON.parse(localStorage.getItem('protocolo_0_100_gym_sessions_v1')||'[]')}));
  expect(migrated.canonical).toHaveLength(1);expect(migrated.canonical[0].exercises[0].sets).toHaveLength(2);expect(migrated.legacy).toHaveLength(1);
  await page.evaluate(()=>window.WORKOUT_FEATURES.migrateLegacyGymSessions());
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions)||'[]').length)).toBe(1);
  await page.evaluate(()=>{const session={id:'canonical-new',date:'2026-07-02',routine:{name:'Nueva',muscles:['Pecho'],exercises:[]},status:'finalizado',exercises:[{id:'new',exerciseId:'press-banca',name:'Press de banca',muscle:'Pecho',sets:[{id:'set',reps:8,weight:60}]}]};window.WORKOUT_FEATURES.replaceSessionPayload(session);});
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_gym_sessions_v1')||'[]').length)).toBe(1);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions)||'[]').length)).toBe(2);
});
