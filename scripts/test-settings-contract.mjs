import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const tokens=await readFile(new URL('../styles/tokens.css',import.meta.url),'utf8');
const modules=await readFile(new URL('../styles/modules.css',import.meta.url),'utf8');
const party=await readFile(new URL('../gym-party.js',import.meta.url),'utf8');
const workout=await readFile(new URL('../workout-features.js',import.meta.url),'utf8');

for(const contract of ['prefers-color-scheme: light','resolvedTheme','applyResolvedTheme','data-theme','theme-color','systemThemeQuery'])assert.match(html+tokens,new RegExp(contract));
for(const contract of ['data-density="compact"','--space-4','data-experience-mode="compact"','preferenceHidden'])assert.match(modules,new RegExp(contract));
assert.match(html,/nutritionDiagnosisCard[^\n]+preferenceHidden|classList\.toggle\('preferenceHidden'/);
assert.match(html,/maybeShowInternalReminder/);
assert.match(html,/La web no puede garantizar avisos en segundo plano/);
assert.match(party,/function autoSyncEnabled/);
assert.match(party,/function firebaseMemberships/);
assert.match(party,/autoSyncEnabled\(\) && firebaseMemberships\(\)\.length/);
assert.doesNotMatch(party,/autoSyncEnabled\(\) && m\?\.backendMode/);
for(const contract of ['LB_PER_KG','canonicalWeight','displayWeight','displayVolume','weightCanonical'])assert.match(workout,new RegExp(contract));
console.log('Ajustes funcionales: tema del sistema, densidad, experiencia, orientación, recordatorio interno y autosync.');
