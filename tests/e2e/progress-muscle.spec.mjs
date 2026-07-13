import {test,expect} from '@playwright/test';

async function seed(page){
  await page.goto('/index.html');
  await page.evaluate(async()=>{
    localStorage.clear();await window.APP_DATA.clearAllData();
    const date=value=>{const d=new Date();d.setDate(d.getDate()+value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
    const sessions=[{id:'progress-now',date:date(0),status:'finalizado',routine:{name:'Prueba'},exercises:[
      {id:'press-banca-pecho',exerciseId:'press-banca',name:'Press de banca',muscle:'Pecho',sets:[{id:'p1',reps:8,weight:60},{id:'p2',reps:8,weight:60},{id:'p3',reps:7,weight:60}]},
      {id:'dominadas-espalda',exerciseId:'dominadas',name:'Dominadas',muscle:'Espalda',bodyweight:true,sets:[{id:'d1',reps:8,weight:0,isBodyweight:true},{id:'d2',reps:7,weight:0,isBodyweight:true}]}
    ]},{id:'progress-prev',date:date(-7),status:'finalizado',routine:{name:'Previa'},exercises:[{id:'press-banca-pecho',exerciseId:'press-banca',name:'Press de banca',muscle:'Pecho',sets:[{id:'old1',reps:8,weight:55},{id:'old2',reps:8,weight:55}]}]}];
    window.APP_REPOSITORIES.workout.set(window.WORKOUT_FEATURES.keys.workoutSessions,sessions);await window.APP_DATA.flush();
  });
}

test('Progreso muscular muestra mapa, series, ejercicios y periodo anterior',async({page})=>{
  await seed(page);
  await page.setViewportSize({width:320,height:568});
  await page.goto('/index.html?module=progress&view=gym&progressScope=muscle&muscle=pecho');
  await expect(page.locator('[data-progress-gym-panel="muscle"]')).toBeVisible();
  await expect(page.locator('#progressMuscleSelect')).toHaveValue('pecho');
  await expect(page.locator('#progressMuscleSummary')).toContainText('3');
  await expect(page.locator('#progressMuscleExercises')).toContainText('Press de banca');
  await expect(page.locator('#progressMuscleExercises')).not.toContainText('Dominadas');
  await expect(page.locator('#progressMuscleChartSummary')).toContainText('3 series');
  await expect(page.locator('.progressHumanSvg')).toHaveAttribute('aria-label',/Pecho: 3 series/);
  const clipped=await page.locator('#progressMuscleMap').evaluate(root=>{const bounds=root.getBoundingClientRect();return [...root.querySelectorAll('.progressMuscleButton:not([disabled])')].filter(button=>{const rect=button.getBoundingClientRect();return rect.left<bounds.left-1||rect.right>bounds.right+1;}).map(button=>button.textContent.trim());});
  expect(clipped).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('Músculo seleccionado sobrevive a URL y Atrás',async({page})=>{
  await seed(page);
  await page.goto('/index.html?module=progress&view=gym&progressScope=muscle&muscle=pecho');
  await page.locator('#progressMuscleSelect').selectOption('espalda');
  await expect(page).toHaveURL(/muscle=espalda/);
  await expect(page.locator('#progressMuscleExercises')).toContainText('Dominadas');
  await page.goBack();
  await expect(page.locator('#progressMuscleSelect')).toHaveValue('pecho');
  await expect(page.locator('#progressMuscleExercises')).toContainText('Press de banca');
});

test('Progreso muscular explica el estado sin datos',async({page})=>{
  await page.goto('/index.html');await page.evaluate(async()=>{localStorage.clear();await window.APP_DATA.clearAllData();});
  await page.goto('/index.html?module=progress&view=gym&progressScope=muscle');
  await expect(page.locator('#progressMuscleMap')).toContainText('Registrá series');
  await expect(page.locator('#progressMuscleExercises')).toContainText('Todavía no hay ejercicios');
});
