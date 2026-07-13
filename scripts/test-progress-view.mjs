import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const progress=await readFile(new URL('../progress/progress-view.js',import.meta.url),'utf8');
const router=await readFile(new URL('../ui/router.js',import.meta.url),'utf8');
const serviceWorker=await readFile(new URL('../sw.js',import.meta.url),'utf8');

for(const view of ['overview','habits','gym','nutrition','history','achievements']){
  assert.match(html,new RegExp(`data-progress-view="${view}"`));
  assert.match(router,new RegExp(`['"]${view}['"]`));
}
for(const contract of ['progressPeriod','progressArea','renderOverview','renderGym','renderNutrition','analyticsBars','percentChange','previousWindow'])assert.match(html+progress,new RegExp(contract));
assert.match(progress,/WORKOUT_METRICS/);
assert.match(progress,/protocolo_0_100_nutrition_entries_v1/);
assert.match(serviceWorker,/progress\/progress-view\.js/);
assert.match(serviceWorker,/progress\/muscle-taxonomy\.js/);
assert.doesNotMatch(progress,/style\.textContent|createElement\(['"]style/);
console.log('Progreso consolidado: períodos, áreas, hábitos, Gym, Nutrición, historial y logros.');
