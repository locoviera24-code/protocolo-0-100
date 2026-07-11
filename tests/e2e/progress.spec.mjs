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
    localStorage.setItem('protocolo_0_100_workout_sessions_v1',JSON.stringify([{id:'gym-1',date:iso(-1),exercises:[{exerciseId:'press',name:'Press banca',sets:[{reps:8,weight:60},{reps:8,weight:60},{reps:7,weight:60}]}]}]));
    localStorage.setItem('protocolo_0_100_nutrition_entries_v1',JSON.stringify([{id:'meal-1',date:iso(0),name:'Arroz',calories:400,protein:8},{id:'meal-2',date:iso(-1),name:'Huevos',calories:300,protein:24}]));
  });
}

test.beforeEach(async ({page})=>{await seed(page);});

test('Progreso consolida tendencias y permite deep links internos',async ({page})=>{
  await page.goto('/index.html?module=progress&view=overview');
  await expect(page.locator('#progressSummaryMetrics')).toContainText('Tendencia 7 días');
  await expect(page.locator('#progressOverviewChart progress')).toHaveCount(3);
  await page.locator('[data-progress-view="gym"]').click();
  await expect(page).toHaveURL(/module=progress&view=gym/);
  await expect(page.locator('#progressGymSummary')).toContainText('3');
  await expect(page.locator('#progressGymChartSummary')).toContainText('Más volumen no siempre significa mejor');
  await page.reload();
  await expect(page.locator('[data-progress-panel="gym"]')).toBeVisible();
});

test('Progreso filtra período y expone resumen nutricional accesible',async ({page})=>{
  await page.goto('/index.html?module=progress&view=nutrition');
  await expect(page.locator('#progressNutritionSummary')).toContainText('2');
  await expect(page.locator('#progressNutritionChart [role="img"]')).toHaveAttribute('aria-label',/Gráfico de barras/);
  await page.locator('#progressPeriod').selectOption('7');
  await expect(page.locator('#progressNutritionChartSummary')).toContainText('Resumen textual');
});
