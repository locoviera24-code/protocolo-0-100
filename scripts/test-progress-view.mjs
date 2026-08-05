import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const progress=await readFile(new URL('../progress/progress-view.js',import.meta.url),'utf8');
const router=await readFile(new URL('../ui/router.js',import.meta.url),'utf8');
const precache=await readFile(new URL('../precache-manifest.js',import.meta.url),'utf8');

for(const view of ['overview','habits','gym','nutrition','history','achievements']){
  assert.match(html,new RegExp(`data-progress-view="${view}"`));
  assert.match(router,new RegExp(`['"]${view}['"]`));
}
for(const contract of ['progressPeriod','progressArea','renderOverview','renderGym','renderNutrition','analyticsBars','percentChange','previousWindow'])assert.match(html+progress,new RegExp(contract));
for(const contract of ['viewState','markDirty','renderView','renderEmptyState','comparableGymSessions','progressEmptyGate'])assert.match(html+progress,new RegExp(contract));
assert.match(progress,/workout:\['overview','gym','history'\]/);
assert.match(progress,/nutrition:\['overview','nutrition','history'\]/);
assert.match(progress,/import:\[\.\.\.views\]/);
assert.doesNotMatch(html,/function renderProtocol\(\)\{[^}]*renderPeriodMetrics/);
assert.match(progress,/WORKOUT_METRICS/);
assert.match(progress,/APP_SCHEMA_REGISTRY/);
assert.match(progress,/getByName\('nutrition','entries'\)/);
assert.doesNotMatch(progress,/localStorage/);
assert.match(precache,/progress\/progress-view\.js/);
assert.match(precache,/progress\/muscle-taxonomy\.js/);
assert.doesNotMatch(progress,/style\.textContent|createElement\(['"]style/);
console.log('Progreso consolidado: períodos, áreas, hábitos, Gym, Nutrición, historial y logros.');
