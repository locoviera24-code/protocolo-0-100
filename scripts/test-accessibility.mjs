import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const workout=await readFile(new URL('../workout-features.js',import.meta.url),'utf8');
const party=await readFile(new URL('../gym-party.js',import.meta.url),'utf8');

assert.match(html,/<html lang="es">/);
assert.match(html,/name="viewport" content="width=device-width, initial-scale=1"/);
assert.match(html,/class="skipLink" href="#mainContent"/);
assert.match(html,/id="globalLiveRegion" role="status" aria-live="polite"/);
assert.match(html,/:focus-visible/);
assert.match(html,/@media\(pointer:coarse\)/);
assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
assert.match(html,/env\(safe-area-inset-bottom\)/);
assert.match(html,/applyAccessibilityEnhancements/);
assert.match(html,/label\.htmlFor=control\.id/);
assert.match(html,/MutationObserver/);
assert.match(html,/trapOverlayFocus/);
assert.match(html,/aria-expanded="false"/);
assert.match(html,/preferredMotionBehavior/);
assert.match(workout,/aria-label="Editar serie/);
assert.match(workout,/aria-label="Eliminar serie/);
assert.match(workout,/preferredMotionBehavior/);
assert.match(party,/aria-label="Editar serie/);
assert.match(party,/aria-label="Eliminar serie/);
assert.match(party,/safe-area-inset-bottom/);

console.log('Accesibilidad correcta: labels asociados, foco visible, live region, tactil, movimiento reducido y safe-area iOS.');
