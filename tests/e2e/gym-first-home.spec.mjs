import {test,expect} from '@playwright/test';
import {waitForAppReady} from './helpers/app-ready.mjs';

const STATE={active:'ACTIVE_SESSION',completed:'COMPLETED_TODAY',planned:'PLANNED_TODAY',rest:'REST_DAY',setup:'SETUP_REQUIRED'};

async function seed(page,kind,{draft=false}={}){
  await page.goto('/index.html?module=home&view=register');
  await waitForAppReady(page,{features:['WORKOUT_FEATURES']});
  await page.evaluate(async({kind,draft})=>{
    await window.APP_DATA.clearAllData();
    const date=window.APP_DATES.today(),dayKey=window.WORKOUT_FEATURES.dayKeyForDate(date);
    const plan=structuredClone(window.WORKOUT_FEATURES.defaultWeeklyPlan);
    plan[dayKey]={...plan[dayKey],dayKey,type:'workout',name:'Push de prueba',weekday:'Hoy',muscles:['Pecho','Tríceps'],exercises:[
      {id:'press-home',exerciseId:'press-banca',name:'Press de banca',muscle:'Pecho',targetSets:3},
      {id:'triceps-home',exerciseId:'extension-triceps-polea',name:'Extensión de tríceps',muscle:'Tríceps',targetSets:3}
    ]};
    if(kind==='rest')plan[dayKey]={dayKey,type:'rest',name:'Descanso',description:'Recuperación planificada.',exercises:[]};
    if(kind==='setup')Object.keys(plan).forEach(key=>delete plan[key]);
    const exercises=[
      {id:'press-home',exerciseId:'press-banca',name:'Press de banca',muscle:'Pecho',completed:false,sets:[{id:'set-home',setNumber:1,reps:8,weight:60,completed:true,setType:'working'}]},
      {id:'triceps-home',exerciseId:'extension-triceps-polea',name:'Extensión de tríceps',muscle:'Tríceps',completed:false,sets:[]}
    ];
    const sessions=[];
    if(kind==='active')sessions.push({id:'active-home',date,status:'en progreso',startedAt:new Date().toISOString(),currentExerciseIndex:0,routine:{name:'Push de prueba'},exercises});
    if(kind==='completed')sessions.push({id:'completed-home',date,status:'finalizado',startedAt:new Date(Date.now()-3600000).toISOString(),finishedAt:new Date().toISOString(),currentExerciseIndex:1,routine:{name:'Push de prueba'},exercises:exercises.map(item=>({...item,completed:true}))});
    window.APP_REPOSITORIES.workout.set(window.WORKOUT_FEATURES.keys.weeklyWorkoutPlan,plan);
    window.APP_REPOSITORIES.workout.set(window.WORKOUT_FEATURES.keys.workoutSessions,sessions);
    if(draft){window.APP_DRAFTS.schedule({id:'gym-set:home',domain:'gym-set',payload:{date,exerciseId:'press-home',reps:8,weight:60}},{debounceMs:0});window.APP_DRAFTS.flushAll();}
    await window.APP_DATA.flush();
  },{kind,draft});
  await page.reload();
  await waitForAppReady(page,{features:['WORKOUT_FEATURES']});
  await expect(page.locator('#gymHomeHero')).toHaveAttribute('data-gym-home-state',STATE[kind]);
}

test('ACTIVE retoma el logger existente en un toque, conserva draft y no duplica sesión',async({page})=>{
  await seed(page,'active',{draft:true});
  await expect(page.locator('#gymHomePrimaryAction')).toHaveText('Continuar entrenamiento');
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_workout_sessions_v1')).map(session=>session.id));
  await page.locator('#gymHomePrimaryAction').click();
  await expect(page.locator('body')).toHaveAttribute('data-module','gym');
  await expect(page.locator('#quickSetLoggerPanel')).toBeVisible();
  await expect(page.locator('#quickExerciseSelect')).toHaveValue('press-home');
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_workout_sessions_v1')).map(session=>session.id));
  expect(after).toEqual(before);
  await page.goBack();await expect(page.locator('body')).toHaveAttribute('data-module','protocolo');await expect(page).toHaveURL(/module=home&view=register/);
  await page.reload();await waitForAppReady(page,{features:['WORKOUT_FEATURES']});
  await expect(page.locator('#gymHomeHero')).toHaveAttribute('data-gym-home-state',STATE.active);
  await page.goForward();await expect(page.locator('body')).toHaveAttribute('data-module','gym');
});

test('PLANNED inicia la sesión mediante el flujo existente en dos toques',async({page})=>{
  await seed(page,'planned');
  await expect(page.locator('#gymHomeTitle')).toHaveText('Hoy te toca Push de prueba');
  await page.locator('#gymHomePrimaryAction').click();
  await expect(page.locator('body')).toHaveAttribute('data-module','gym');
  await page.locator('#startTodayWorkoutBtn').click();
  const sessions=await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_workout_sessions_v1'))||[]);
  expect(sessions).toHaveLength(1);expect(sessions[0].status).toBe('en progreso');
});

test('COMPLETED abre el Progreso Gym existente y no ofrece empezar de nuevo',async({page})=>{
  await seed(page,'completed');
  await expect(page.locator('#gymHomePrimaryAction')).toHaveText('Ver progreso');
  await expect(page.locator('#gymHomeHero')).toContainText('1 serie efectiva');
  await page.locator('#gymHomePrimaryAction').click();
  await expect(page.locator('body')).toHaveAttribute('data-module','progreso');
  await expect(page).toHaveURL(/module=progress&view=gym/);
});

test('REST y SETUP usan la configuración de rutina sin crear sesiones',async({page})=>{
  await seed(page,'rest');
  await expect(page.locator('#gymHomeTitle')).toHaveText('Hoy toca descanso');
  await page.locator('#gymHomePrimaryAction').click();
  await expect(page).toHaveURL(/module=gym&view=routine/);
  await seed(page,'setup');
  await expect(page.locator('#gymHomePrimaryAction')).toHaveText('Configurar entrenamiento');
  await page.locator('#gymHomePrimaryAction').click();
  await expect(page).toHaveURL(/module=gym&view=routine/);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_workout_sessions_v1'))||[])).toEqual([]);
});

test('un borrador de serie conserva PLANNED y comunica valores preparados',async({page})=>{
  await seed(page,'planned',{draft:true});
  await expect(page.locator('#gymHomeHero')).toHaveAttribute('data-gym-home-state',STATE.planned);
  await expect(page.locator('#gymHomeDescription')).toContainText('valores preparados');
});

test('el registro diario permanece operativo debajo del hero Gym',async({page})=>{
  await seed(page,'planned');
  await expect(page.locator('#gymHomePrimaryAction')).toBeVisible();
  await page.locator('#nonEssential').fill('2');
  await page.locator('#sleepHours').fill('8');
  await page.locator('#readingMins').fill('20');
  await page.locator('#offlineMins').fill('15');
  await expect(page.locator('#homeCompactActionBtn')).toHaveText('Guardar día');
  const compactSave=page.locator('#homeCompactActionBtn');
  await (await compactSave.isVisible()?compactSave:page.locator('#saveBtn')).click();
  await expect(page.locator('#homeCompactState')).toHaveText('Día guardado');
  await expect(page.locator('#gymHomeHero')).toHaveAttribute('data-gym-home-state',STATE.planned);
});

test('el CTA Gym permanece accesible en anchos móviles, zoom y movimiento reducido',async({page})=>{
  for(const width of [320,360,390,412,768,1280]){
    await page.setViewportSize({width,height:844});
    await seed(page,'planned');
    await page.emulateMedia({reducedMotion:'reduce'});
    if(width===320)await page.evaluate(()=>{document.documentElement.style.fontSize='125%';});
    const button=page.locator('#gymHomePrimaryAction');await expect(button).toBeVisible();
    const box=await button.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);expect(box.y+box.height).toBeLessThanOrEqual(844);
    await button.focus();await expect(button).toBeFocused();
  }
});
