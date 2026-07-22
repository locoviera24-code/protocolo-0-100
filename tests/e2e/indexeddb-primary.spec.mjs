import {test,expect} from '@playwright/test';

const NUTRITION_KEY='protocolo_0_100_nutrition_entries_v1';
const WORKOUT_KEY='protocolo_0_100_workout_sessions_v1';
const FDC_FOODS_KEY='protocolo_0_100_cached_fdc_foods_v1';
const FDC_SEARCH_KEY='protocolo_0_100_fdc_search_cache_v1';
const GYM_PARTY_MEMBERSHIP_KEY='protocolo_0_100_gym_party_membership_v1';
const GYM_PARTY_QUEUE_KEY='protocolo_0_100_gym_party_sync_queue_v1';

async function clean(page){
  await page.goto('/index.html');
  await page.evaluate(async()=>{localStorage.clear();await window.APP_DATA.clearAllData();});
  await page.reload();
  await page.evaluate(()=>window.APP_DATA.ready());
}

test('promueve Nutrición y conserva localStorage como respaldo',async ({page})=>{
  await clean(page);
  const result=await page.evaluate(async key=>{
    const entries=[{id:'nutrition-primary-1',date:'2026-07-19',name:'Mandioca',grams:180}];
    localStorage.setItem(key,JSON.stringify(entries));
    await window.APP_DATA.setPrimaryDomain('nutrition',true);
    const read=window.APP_DATA.readResult(key),indexed=await window.APP_DATA.readIndexedResult(key),diagnostics=await window.APP_DATA.diagnostics();
    return{read,indexed,diagnostics,local:JSON.parse(localStorage.getItem(key)),primaryKeys:window.APP_DATA.PRIMARY_KEYS.nutrition};
  },NUTRITION_KEY);
  expect(result.read.status).toBe('valid');
  expect(result.read.source).toBe('indexeddb');
  expect(result.read.value[0].id).toBe('nutrition-primary-1');
  expect(result.indexed.value[0].id).toBe('nutrition-primary-1');
  expect(result.local[0].id).toBe('nutrition-primary-1');
  expect(result.diagnostics.domains.nutrition.storageMode).toBe('primary');
  expect(result.diagnostics.domains.nutrition.primaryStatus).toBe('ready');
  expect(result.primaryKeys).not.toContain('protocolo_0_100_cached_fdc_foods_v1');
  expect(result.primaryKeys).not.toContain('protocolo_0_100_fdc_search_cache_v1');
});

test('la cache nutricional aplica TTL y LRU antes de quedar primaria',async ({page})=>{
  await clean(page);
  const result=await page.evaluate(async ({foodsKey,searchKey})=>{
    const now=Date.now(),foods=Array.from({length:752},(_,index)=>({id:`fdc-${index+1}`,fdcId:index+1,name:`Alimento ${index+1}`}));
    localStorage.setItem(foodsKey,JSON.stringify(foods));
    localStorage.setItem(searchKey,JSON.stringify({expired:{foods:[{fdcId:1}],cachedAt:now-25*60*60*1000},fresh:{foods:[{fdcId:752}],cachedAt:now-60*1000}}));
    const status=await window.APP_DATA.setPrimaryDomain('nutritionCache',true);await window.APP_DATA.flush();
    const cached=window.APP_DATA.readResult(foodsKey),search=window.APP_DATA.readResult(searchKey),indexedFoods=await window.APP_DATA.readIndexedResult(foodsKey),indexedSearch=await window.APP_DATA.readIndexedResult(searchKey),diagnostics=await window.APP_DATA.diagnostics();
    return{cached,search,indexedFoods,indexedSearch,status,diagnostics,config:window.APP_DATA.config(),keys:window.APP_DATA.PRIMARY_KEYS.nutritionCache};
  },{foodsKey:FDC_FOODS_KEY,searchKey:FDC_SEARCH_KEY});
  expect(result.config.primaryDomains.nutritionCache).toBe(true);
  expect(result.keys).toEqual([FDC_FOODS_KEY,FDC_SEARCH_KEY]);
  expect(result.cached.source).toBe('indexeddb');
  expect(result.cached.value).toHaveLength(750);
  expect(result.cached.value[0].fdcId).toBe(3);
  expect(Object.keys(result.search.value)).toEqual(['fresh']);
  expect(result.indexedFoods.value).toHaveLength(750);
  expect(Object.keys(result.indexedSearch.value)).toEqual(['fresh']);
  expect(result.status.retentionPrunedCount).toBeGreaterThanOrEqual(3);
  expect(result.diagnostics.primaryGroups.nutritionCache.storageMode).toBe('primary');
  expect(result.diagnostics.primaryGroups.nutritionCache.status).toBe('ready');
});

test('la cache nutricional se recupera y permite rollback sin tocar historiales',async ({page})=>{
  await clean(page);
  await page.evaluate(async ({foodsKey,nutritionKey})=>{
    window.APP_DATA.write(nutritionKey,[{id:'meal-kept',date:'2026-07-20',name:'Arroz'}]);
    window.APP_DATA.write(foodsKey,[{id:'fdc-44',fdcId:44,name:'Cache recuperable',cachedAt:new Date().toISOString()}]);
    await window.APP_DATA.flush();localStorage.removeItem(foodsKey);
  },{foodsKey:FDC_FOODS_KEY,nutritionKey:NUTRITION_KEY});
  await page.reload();await page.evaluate(()=>window.APP_DATA.ready());
  const recovered=await page.evaluate(async ({foodsKey,nutritionKey})=>({foods:window.APP_DATA.readResult(foodsKey),local:JSON.parse(localStorage.getItem(foodsKey)),nutrition:window.APP_DATA.readResult(nutritionKey),status:await window.APP_DATA.primaryDomainStatus('nutritionCache')}),{foodsKey:FDC_FOODS_KEY,nutritionKey:NUTRITION_KEY});
  expect(recovered.foods.value[0].fdcId).toBe(44);
  expect(recovered.local[0].fdcId).toBe(44);
  expect(recovered.nutrition.value[0].id).toBe('meal-kept');
  expect(recovered.status.recoveredCount).toBeGreaterThanOrEqual(1);
  const rolledBack=await page.evaluate(async ({foodsKey,nutritionKey})=>{
    await window.APP_DATA.setPrimaryDomain('nutritionCache',false);
    localStorage.setItem(foodsKey,JSON.stringify([{id:'fdc-55',fdcId:55,name:'Compatible'}]));
    return{foods:window.APP_DATA.readResult(foodsKey),nutrition:window.APP_DATA.readResult(nutritionKey),config:window.APP_DATA.config()};
  },{foodsKey:FDC_FOODS_KEY,nutritionKey:NUTRITION_KEY});
  expect(rolledBack.foods.source).toBe('localStorage');
  expect(rolledBack.foods.value[0].fdcId).toBe(55);
  expect(rolledBack.nutrition.value[0].id).toBe('meal-kept');
  expect(rolledBack.config.primaryDomains.nutritionCache).toBe(false);
});

test('Workout es primario y recupera una sesión antes de inicializar valores por defecto',async ({page})=>{
  await clean(page);
  await page.evaluate(async key=>{
    window.APP_DATA.write(key,[{id:'workout-primary-1',date:'2026-07-20',status:'finalizado',routine:{name:'Torso A'},exercises:[]}]);
    await window.APP_DATA.flush();
    localStorage.removeItem(key);
  },WORKOUT_KEY);
  await page.reload();
  await page.evaluate(()=>window.APP_DATA.ready());
  const result=await page.evaluate(async key=>({
    read:window.APP_DATA.readResult(key),
    indexed:await window.APP_DATA.readIndexedResult(key),
    local:JSON.parse(localStorage.getItem(key)),
    status:await window.APP_DATA.primaryDomainStatus('workout'),
    config:window.APP_DATA.config()
  }),WORKOUT_KEY);
  expect(result.config.primaryDomains.workout).toBe(true);
  expect(result.read.source).toBe('indexeddb');
  expect(result.read.value[0].id).toBe('workout-primary-1');
  expect(result.indexed.value[0].id).toBe('workout-primary-1');
  expect(result.local[0].id).toBe('workout-primary-1');
  expect(result.status.storageMode).toBe('primary');
  expect(result.status.recoveredCount).toBeGreaterThanOrEqual(1);
});

test('Workout reconcilia una escritura compatible pendiente y permite rollback',async ({page})=>{
  await clean(page);
  await page.evaluate(async key=>{
    window.APP_DATA.write(key,[{id:'indexed-workout',date:'2026-07-19',status:'finalizado',exercises:[]}]);
    await window.APP_DATA.flush();
    localStorage.setItem(key,JSON.stringify([{id:'pending-workout',date:'2026-07-20',status:'en progreso',exercises:[]}]))
  },WORKOUT_KEY);
  await page.reload();
  await page.evaluate(()=>window.APP_DATA.ready());
  const reconciled=await page.evaluate(async key=>({read:window.APP_DATA.readResult(key),indexed:await window.APP_DATA.readIndexedResult(key),status:await window.APP_DATA.primaryDomainStatus('workout')}),WORKOUT_KEY);
  expect(reconciled.read.value[0].id).toBe('pending-workout');
  expect(reconciled.indexed.value[0].id).toBe('pending-workout');
  expect(reconciled.status.divergenceCount).toBeGreaterThanOrEqual(1);
  const rolledBack=await page.evaluate(async key=>{
    await window.APP_DATA.setPrimaryDomain('workout',false);
    localStorage.setItem(key,JSON.stringify([{id:'compatible-workout',date:'2026-07-20',status:'finalizado',exercises:[]}]))
    return{read:window.APP_DATA.readResult(key),config:window.APP_DATA.config()};
  },WORKOUT_KEY);
  expect(rolledBack.read.source).toBe('localStorage');
  expect(rolledBack.read.value[0].id).toBe('compatible-workout');
  expect(rolledBack.config.primaryDomains.workout).toBe(false);
});

test('Workout adopta escrituras legacy directas sin exigir recarga',async ({page})=>{
  await clean(page);
  const result=await page.evaluate(async key=>{
    localStorage.setItem(key,JSON.stringify([{id:'same-tab-legacy',date:'2026-07-20',status:'en progreso',exercises:[]}]))
    const read=window.APP_DATA.readResult(key);
    await window.APP_DATA.flush();
    const indexed=await window.APP_DATA.readIndexedResult(key);
    return{read,indexed};
  },WORKOUT_KEY);
  expect(result.read.source).toBe('localStorage-write-ahead');
  expect(result.read.value[0].id).toBe('same-tab-legacy');
  expect(result.indexed.value[0].id).toBe('same-tab-legacy');
});

test('Gym conserva el modo local cuando IndexedDB no esta disponible',async ({browser})=>{
  const context=await browser.newContext();
  await context.addInitScript(()=>Object.defineProperty(window,'indexedDB',{configurable:true,value:undefined}));
  const page=await context.newPage();
  await page.goto('/index.html?module=gym&view=train');
  await expect.poll(()=>page.evaluate(()=>Boolean(window.WORKOUT_FEATURES))).toBe(true);
  await page.evaluate(()=>window.WORKOUT_FEATURES.ready());
  await expect(page.locator('#todayWorkoutPanel')).toBeVisible();
  const status=await page.evaluate(()=>({indexedDB:window.APP_DATA.config().primaryDomains.workout,source:window.APP_DATA.readResult(window.WORKOUT_FEATURES.keys.workoutSessions).source}));
  expect(status.indexedDB).toBe(true);
  expect(status.source).toBe('localStorage');
  await context.close();
});

test('reconcilia una escritura local pendiente y permite rollback',async ({page})=>{
  await clean(page);
  await page.evaluate(async key=>{window.APP_DATA.write(key,[{id:'before',date:'2026-07-18',name:'Arroz'}]);await window.APP_DATA.flush();},NUTRITION_KEY);
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify([{id:'pending-local',date:'2026-07-19',name:'Pollo'}])),NUTRITION_KEY);
  await page.reload();
  await page.evaluate(()=>window.APP_DATA.ready());
  const reconciled=await page.evaluate(async key=>({read:window.APP_DATA.readResult(key),indexed:await window.APP_DATA.readIndexedResult(key),status:await window.APP_DATA.primaryDomainStatus('nutrition')}),NUTRITION_KEY);
  expect(reconciled.read.value[0].id).toBe('pending-local');
  expect(reconciled.indexed.value[0].id).toBe('pending-local');
  expect(reconciled.status.divergenceCount).toBeGreaterThanOrEqual(1);
  const rolledBack=await page.evaluate(async key=>{await window.APP_DATA.setPrimaryDomain('nutrition',false);localStorage.setItem(key,JSON.stringify([{id:'compatible-local',date:'2026-07-19',name:'Leche'}]));return{read:window.APP_DATA.readResult(key),config:window.APP_DATA.config()};},NUTRITION_KEY);
  expect(rolledBack.read.source).toBe('localStorage');
  expect(rolledBack.read.value[0].id).toBe('compatible-local');
  expect(rolledBack.config.primaryDomains.nutrition).toBe(false);
});

test('recupera desde IndexedDB cuando falta la copia compatible',async ({page})=>{
  await clean(page);
  await page.evaluate(async key=>{window.APP_DATA.write(key,[{id:'recover-me',date:'2026-07-19',name:'Banana'}]);await window.APP_DATA.flush();localStorage.removeItem(key);},NUTRITION_KEY);
  await page.reload();
  await page.evaluate(()=>window.APP_DATA.ready());
  const result=await page.evaluate(async key=>({read:window.APP_DATA.readResult(key),local:JSON.parse(localStorage.getItem(key)),status:await window.APP_DATA.primaryDomainStatus('nutrition')}),NUTRITION_KEY);
  expect(result.read.value[0].id).toBe('recover-me');
  expect(result.local[0].id).toBe('recover-me');
  expect(result.status.recoveredCount).toBeGreaterThanOrEqual(1);
});

test('coordina la lectura primaria entre dos pestañas',async ({page,context})=>{
  await clean(page);
  const second=await context.newPage();await second.goto('/index.html');await second.evaluate(()=>window.APP_DATA.ready());
  await page.evaluate(async key=>{window.APP_DATA.write(key,[{id:'cross-tab',date:'2026-07-19',name:'Yogur'}]);await window.APP_DATA.flush();},NUTRITION_KEY);
  await expect.poll(()=>second.evaluate(key=>window.APP_DATA.readResult(key).value?.[0]?.id||'',NUTRITION_KEY)).toBe('cross-tab');
  await second.close();
});

test('coordina sesiones de Workout entre dos pestañas',async ({page,context})=>{
  await clean(page);
  const second=await context.newPage();await second.goto('/index.html');await second.evaluate(()=>window.APP_DATA.ready());
  await page.evaluate(async key=>{window.APP_DATA.write(key,[{id:'cross-tab-workout',date:'2026-07-20',status:'en progreso',exercises:[]}]);await window.APP_DATA.flush();},WORKOUT_KEY);
  await expect.poll(()=>second.evaluate(key=>window.APP_DATA.readResult(key).value?.[0]?.id||'',WORKOUT_KEY)).toBe('cross-tab-workout');
  await second.close();
});

test('Gym Party recupera membresía y cola offline antes de renderizar o sincronizar',async ({page})=>{
  await clean(page);
  await page.evaluate(async ({membershipKey,queueKey})=>{
    await window.GYM_PARTY_FEATURES.ready();
    window.APP_DATA.write(membershipKey,{partyId:'party-primary',userId:'member-primary',alias:'Yo',active:true,backendMode:'local',party:{id:'party-primary',name:'Sala recuperable',members:[]}});
    window.APP_DATA.write(queueKey,[{id:'queue-primary',type:'session',payload:{id:'session-primary'},pendingSync:true,createdAt:new Date().toISOString()}]);
    await window.APP_DATA.flush();
    localStorage.removeItem(membershipKey);
    localStorage.removeItem(queueKey);
  },{membershipKey:GYM_PARTY_MEMBERSHIP_KEY,queueKey:GYM_PARTY_QUEUE_KEY});
  await page.reload();
  await page.evaluate(async()=>{await window.APP_DATA.ready();await window.GYM_PARTY_FEATURES.ready();});
  const result=await page.evaluate(async ({membershipKey,queueKey})=>({
    membership:window.APP_DATA.readResult(membershipKey),
    queue:window.APP_DATA.readResult(queueKey),
    localMembership:JSON.parse(localStorage.getItem(membershipKey)),
    localQueue:JSON.parse(localStorage.getItem(queueKey)),
    status:await window.APP_DATA.primaryDomainStatus('gymParty'),
    config:window.APP_DATA.config(),
    primaryKeys:window.APP_DATA.PRIMARY_KEYS.gymParty
  }),{membershipKey:GYM_PARTY_MEMBERSHIP_KEY,queueKey:GYM_PARTY_QUEUE_KEY});
  expect(result.config.primaryDomains.gymParty).toBe(true);
  expect(result.membership.source).toBe('indexeddb');
  expect(result.membership.value.partyId).toBe('party-primary');
  expect(result.queue.source).toBe('indexeddb');
  expect(result.queue.value[0].id).toBe('queue-primary');
  expect(result.localMembership.partyId).toBe('party-primary');
  expect(result.localQueue[0].id).toBe('queue-primary');
  expect(result.status.storageMode).toBe('primary');
  expect(result.status.recoveredCount).toBeGreaterThanOrEqual(2);
  expect(result.primaryKeys).toContain(GYM_PARTY_MEMBERSHIP_KEY);
  expect(result.primaryKeys).toContain(GYM_PARTY_QUEUE_KEY);
});

test('Gym Party permite rollback independiente sin perder la cola compatible',async ({page})=>{
  await clean(page);
  const result=await page.evaluate(async queueKey=>{
    await window.APP_DATA.setPrimaryDomain('gymParty',false);
    localStorage.setItem(queueKey,JSON.stringify([{id:'queue-compatible',type:'set',payload:{id:'set-compatible'},pendingSync:true}]));
    return{queue:window.APP_DATA.readResult(queueKey),config:window.APP_DATA.config()};
  },GYM_PARTY_QUEUE_KEY);
  expect(result.queue.source).toBe('localStorage');
  expect(result.queue.value[0].id).toBe('queue-compatible');
  expect(result.config.primaryDomains.gymParty).toBe(false);
  expect(result.config.primaryDomains.workout).toBe(true);
  expect(result.config.primaryDomains.nutrition).toBe(true);
  expect(result.config.primaryDomains.nutritionCache).toBe(true);
});

test('Gym Party conserva el modo local cuando IndexedDB no está disponible',async ({browser})=>{
  const context=await browser.newContext();
  await context.addInitScript(()=>Object.defineProperty(window,'indexedDB',{configurable:true,value:undefined}));
  const page=await context.newPage();
  await page.goto('/index.html?module=gym-party');
  await expect.poll(()=>page.evaluate(()=>Boolean(window.GYM_PARTY_FEATURES))).toBe(true);
  await page.evaluate(()=>window.GYM_PARTY_FEATURES.ready());
  await expect(page.locator('#gymPartyRoot')).toBeVisible();
  await expect(page.locator('#gymPartyCreateAlias')).toBeVisible();
  const result=await page.evaluate(key=>({enabled:window.APP_DATA.config().primaryDomains.gymParty,source:window.APP_DATA.readResult(key).source}),GYM_PARTY_QUEUE_KEY);
  expect(result.enabled).toBe(true);
  expect(result.source).toBe('localStorage');
  await context.close();
});

test('salir del dispositivo elimina también la membresía primaria',async ({page})=>{
  await clean(page);
  await page.goto('/index.html?module=gym-party');
  await page.locator('#gymPartyCreateAlias').fill('Owner');
  await page.locator('#gymPartyCreateName').fill('Sala temporal');
  await page.locator('[data-gym-party-action="create"]').click();
  await expect(page.getByRole('heading',{name:'Entrenamiento compartido',level:2,exact:true})).toBeVisible();
  await page.locator('#partyGroupSection > summary').click();
  await page.locator('#partyGroupSection details').filter({hasText:'Salir o borrar datos compartidos'}).locator('summary').click();
  await page.locator('[data-gym-party-action="leave-device"]').click();
  await page.locator('#appConfirmationConfirm').click();
  await page.evaluate(()=>window.APP_DATA.flush());
  const removed=await page.evaluate(async key=>({local:localStorage.getItem(key),read:window.APP_DATA.readResult(key),indexed:await window.APP_DATA.readIndexedResult(key)}),GYM_PARTY_MEMBERSHIP_KEY);
  expect(removed.local).toBeNull();
  expect(removed.read.status).toBe('missing');
  expect(removed.indexed.status).toBe('missing');
  await page.reload();
  await page.evaluate(async()=>{await window.APP_DATA.ready();await window.GYM_PARTY_FEATURES.ready();});
  await expect(page.locator('#gymPartyCreateAlias')).toBeVisible();
});

test('coordina la cola offline de Gym Party entre dos pestañas',async ({page,context})=>{
  await clean(page);
  const second=await context.newPage();
  await second.goto('/index.html');
  await second.evaluate(async()=>{await window.APP_DATA.ready();await window.GYM_PARTY_FEATURES.ready();});
  await page.evaluate(async queueKey=>{
    window.APP_DATA.write(queueKey,[{id:'queue-cross-tab',type:'set',payload:{id:'set-cross-tab'},pendingSync:true}]);
    await window.APP_DATA.flush();
  },GYM_PARTY_QUEUE_KEY);
  await expect.poll(()=>second.evaluate(queueKey=>window.APP_DATA.readResult(queueKey).value?.[0]?.id||'',GYM_PARTY_QUEUE_KEY)).toBe('queue-cross-tab');
  await second.close();
});

test('Datos y copias permite rollback y reactivación visibles',async ({page})=>{
  await clean(page);await page.goto('/index.html?module=more&view=data');
  await expect(page.locator('#nutritionStorageStatus')).toContainText('IndexedDB');
  await expect(page.locator('#toggleNutritionPrimaryBtn')).toHaveText('Usar modo compatible');
  await expect(page.locator('#nutritionCacheStorageStatus')).toContainText('IndexedDB');
  await expect(page.locator('#toggleNutritionCachePrimaryBtn')).toHaveText('Usar modo compatible');
  await page.locator('#toggleNutritionCachePrimaryBtn').click();
  await expect(page.locator('#nutritionCacheStorageStatus')).toContainText('Modo compatible');
  expect(await page.evaluate(()=>window.APP_DATA.config().primaryDomains.nutritionCache)).toBe(false);
  await page.locator('#toggleNutritionCachePrimaryBtn').click();
  await expect(page.locator('#nutritionCacheStorageStatus')).toContainText('IndexedDB verificada');
  expect(await page.evaluate(()=>window.APP_DATA.config().primaryDomains.nutritionCache)).toBe(true);
  await page.locator('#toggleNutritionPrimaryBtn').click();
  await expect(page.locator('#nutritionStorageStatus')).toContainText('Modo compatible');
  expect(await page.evaluate(()=>window.APP_DATA.config().primaryDomains.nutrition)).toBe(false);
  await page.reload();await page.evaluate(()=>window.APP_DATA.ready());
  await expect(page.locator('#toggleNutritionPrimaryBtn')).toHaveText('Reactivar IndexedDB');
  await page.locator('#toggleNutritionPrimaryBtn').click();
  await expect(page.locator('#nutritionStorageStatus')).toContainText('IndexedDB verificada');
  expect(await page.evaluate(()=>window.APP_DATA.config().primaryDomains.nutrition)).toBe(true);
  await expect(page.locator('#workoutStorageStatus')).toContainText('IndexedDB');
  await expect(page.locator('#toggleWorkoutPrimaryBtn')).toHaveText('Usar modo compatible');
  await page.locator('#toggleWorkoutPrimaryBtn').click();
  await expect(page.locator('#workoutStorageStatus')).toContainText('Modo compatible');
  expect(await page.evaluate(()=>window.APP_DATA.config().primaryDomains.workout)).toBe(false);
  await page.reload();await page.evaluate(()=>window.APP_DATA.ready());
  await expect(page.locator('#toggleWorkoutPrimaryBtn')).toHaveText('Reactivar IndexedDB');
  await page.locator('#toggleWorkoutPrimaryBtn').click();
  await expect(page.locator('#workoutStorageStatus')).toContainText('IndexedDB verificada');
  expect(await page.evaluate(()=>window.APP_DATA.config().primaryDomains.workout)).toBe(true);
  await expect(page.locator('#gymPartyStorageStatus')).toContainText('IndexedDB');
  await expect(page.locator('#toggleGymPartyPrimaryBtn')).toHaveText('Usar modo compatible');
  await page.locator('#toggleGymPartyPrimaryBtn').click();
  await expect(page.locator('#gymPartyStorageStatus')).toContainText('Modo compatible');
  expect(await page.evaluate(()=>window.APP_DATA.config().primaryDomains.gymParty)).toBe(false);
  await page.reload();await page.evaluate(()=>window.APP_DATA.ready());
  await expect(page.locator('#toggleGymPartyPrimaryBtn')).toHaveText('Reactivar IndexedDB');
  await page.locator('#toggleGymPartyPrimaryBtn').click();
  await expect(page.locator('#gymPartyStorageStatus')).toContainText('IndexedDB verificada');
  expect(await page.evaluate(()=>window.APP_DATA.config().primaryDomains.gymParty)).toBe(true);
});
