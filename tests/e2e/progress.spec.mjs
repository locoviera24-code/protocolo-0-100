import {test,expect} from '@playwright/test';

async function seed(page){
  await page.goto('/index.html');
  await page.evaluate(()=>{
    localStorage.clear();
    const iso=offset=>{const date=new Date();date.setDate(date.getDate()+offset);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;};
    localStorage.setItem('protocolo_0_100_tracker_v1',JSON.stringify([
      {date:iso(-8),day:1,score:60,parts:[['Sueño',15],['Noche',12],['Pantalla',12],['Lectura',12],['Offline',6]]},
      {date:iso(-2),day:2,score:75,parts:[['Sueño',20],['Noche',15],['Pantalla',15],['Lectura',18],['Offline',7]]},
      {date:iso(0),day:3,score:82,parts:[['Sueño',22],['Noche',16],['Pantalla',16],['Lectura',20],['Offline',8]]}
    ]));
    localStorage.setItem('protocolo_0_100_workout_sessions_v1',JSON.stringify([
      {id:'gym-1',date:iso(-1),exercises:[{exerciseId:'press',name:'Press banca',sets:[{reps:8,weight:60},{reps:8,weight:60},{reps:7,weight:60}]}]},
      {id:'gym-2',date:iso(-8),exercises:[{exerciseId:'press',name:'Press banca',sets:[{reps:8,weight:57.5},{reps:8,weight:57.5},{reps:8,weight:57.5}]}]}
    ]));
    localStorage.setItem('protocolo_0_100_nutrition_entries_v1',JSON.stringify([{id:'meal-1',date:iso(0),name:'Arroz',calories:400,protein:8},{id:'meal-2',date:iso(-1),name:'Huevos',calories:300,protein:24},{id:'meal-3',date:iso(-2),name:'Avena',calories:250,protein:9}]));
  });
}

test.beforeEach(async ({page})=>{await seed(page);});

test('Progreso consolida tendencias y permite deep links internos',async ({page})=>{
  await page.goto('/index.html?module=progress&view=overview');
  await expect(page.locator('#progressSummaryMetrics')).toContainText('Tendencia hábitos 7 días');
  await expect(page.locator('#progressSummaryMetrics')).toContainText('Cantidad de datos');
  await expect(page.locator('#progressOverviewSummary')).toContainText('cobertura de registro');
  await expect(page.locator('#progressOverviewSummary')).toContainText('No compara resultados');
  await expect(page.locator('#progressStrongestArea')).not.toContainText('Área más débil');
  await expect(page.locator('#progressOverviewChart progress')).toHaveCount(3);
  await page.locator('[data-progress-view="gym"]').click();
  await expect(page).toHaveURL(/module=progress&view=gym/);
  await expect(page.locator('#progressGymSummary .progressKpi').filter({hasText:/Sesiones/}).locator('strong')).toHaveText('2');
  await expect(page.locator('#progressGymChartSummary')).toContainText('Más volumen no siempre significa mejor');
  await page.reload();
  await expect(page.locator('[data-progress-panel="gym"]')).toBeVisible();
});

test('Progreso filtra período y expone resumen nutricional accesible',async ({page})=>{
  await page.goto('/index.html?module=progress&view=nutrition');
  await expect(page.locator('#progressNutritionSummary .progressKpi').first().locator('strong')).toHaveText('3');
  await expect(page.locator('#progressNutritionChart [role="img"]')).toHaveAttribute('aria-label',/Gráfico de barras/);
  await page.locator('#progressPeriod').selectOption('7');
  await expect(page.locator('#progressNutritionChartSummary')).toContainText('Resumen textual');
});

test('Todo usa intervalo observado y Gym respeta el plan semanal real',async({page})=>{
  await page.goto('/index.html?module=progress&view=overview');
  await page.locator('#progressPeriod').selectOption('all');
  await expect(page.locator('#progressSummaryMetrics')).toContainText('3/9');
  await expect(page.locator('#progressOverviewChart')).toContainText('2 de 6 sesión(es) planificadas');
  await expect(page.locator('#progressOverviewChart')).toContainText('3 de 9 día(s) con comidas');
});

test('Progreso renderiza solamente la subsección visible y conserva una caché invalidable',async({page})=>{
  await page.goto('/index.html?module=progress&view=overview');
  let state=await page.evaluate(()=>window.PROGRESS_VIEW.state());
  expect(state.overview.rendered).toBe(true);
  expect(state.gym.rendered).toBe(false);
  expect(state.nutrition.rendered).toBe(false);
  await page.locator('[data-progress-view="gym"]').click();
  state=await page.evaluate(()=>window.PROGRESS_VIEW.state());
  expect(state.gym.rendered).toBe(true);
  expect(state.nutrition.rendered).toBe(false);
  const dirtyAfterInvalidation=await page.evaluate(()=>{
    window.PROGRESS_VIEW.markDirty(['gym']);
    return window.PROGRESS_VIEW.state().gym.dirty;
  });
  expect(dirtyAfterInvalidation).toBe(true);
});

test('Gym exige dos sesiones comparables y no mezcla equipos incompatibles',async({page})=>{
  await page.goto('/index.html');
  await page.evaluate(async()=>{
    const date=value=>{const d=new Date();d.setDate(d.getDate()+value);return d.toISOString().slice(0,10);};
    const sessions=[
      {id:'bar',date:date(-2),exercises:[{exerciseId:'press',name:'Press',sets:[{reps:8,weight:60,equipmentId:'barbell-20'}]}]},
      {id:'smith',date:date(-1),exercises:[{exerciseId:'press',name:'Press',sets:[{reps:8,weight:60,equipmentId:'smith'}]}]}
    ];
    window.APP_REPOSITORIES.workout.set(window.WORKOUT_FEATURES.keys.workoutSessions,sessions);await window.APP_DATA.flush();
  });
  await page.goto('/index.html?module=progress&view=gym');
  await expect(page.locator('[data-progress-empty="gym"]')).toContainText('Guardá al menos 2 sesiones del mismo ejercicio');
  await expect(page.locator('[data-progress-empty-action]')).toHaveText('Empezar entrenamiento');
  await expect(page.locator('#progressGymChart')).toBeHidden();
});
