import {test,expect} from '@playwright/test';

async function seed(page){
  await page.goto('/index.html');
  await page.evaluate(async()=>{
    localStorage.clear();sessionStorage.clear();await window.APP_DATA.clearAllData();
    const date=window.APP_DATES.today();
    const sets=[60,60,62.5,62.5].map((weight,index)=>({id:`baseline-${index}`,setNumber:index+1,reps:8,weight,weightKg:weight,originalWeight:weight,originalUnit:'kg',measurementMode:'reps',loadMode:'total',equipmentId:'barbell-20',laterality:'bilateral',setType:'working',completed:true}));
    window.APP_REPOSITORIES.workout.set(window.WORKOUT_FEATURES.keys.workoutSessions,[{id:'anomaly-session',date,status:'en progreso',currentExerciseIndex:0,routine:{name:'Prueba',muscles:['Pecho'],exercises:[]},startedAt:new Date().toISOString(),exercises:[{id:'press-current',exerciseId:'press-banca',name:'Press de banca',muscle:'Pecho',sets,completed:false}]}]);
    await window.APP_DATA.flush();
  });
  await page.goto('/index.html?module=gym&view=train');
}

test('Gym revisa un salto anomalo antes de guardarlo como record',async({page})=>{
  await seed(page);
  await page.locator('#quickWeight').fill('140');
  await page.locator('#quickReps').fill('8');
  await page.locator('#saveQuickSetBtn').click();

  await expect(page.locator('#appConfirmationBackdrop')).toBeVisible();
  await expect(page.locator('#appConfirmationTitle')).toHaveText('Revisar este registro');
  await expect(page.locator('#appConfirmationMessage')).toContainText('supera ampliamente tu historial');
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions))[0].exercises[0].sets.length);
  expect(before).toBe(4);

  await page.locator('[data-confirmation-choice="exclude-progression"]').click();
  await expect(page.locator('#appConfirmationBackdrop')).toBeHidden();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions))[0].exercises[0].sets.at(-1));
  expect(stored).toMatchObject({excludeFromRecords:true,excludeFromProgression:true,anomalyReview:{decision:'exclude-progression',status:'excluded'}});
  await expect(page.locator('#quickLoggedSets')).toContainText('Revisado');

  await page.goto('/index.html?module=progress&view=gym&progressScope=records');
  await expect(page.locator('#progressSuspiciousList')).toContainText('Press de banca');
  await expect(page.locator('#progressSuspiciousList')).toContainText('Fuera de record y progresion');
});

test('Editar cancela la revision y conserva el formulario sin guardar',async({page})=>{
  await seed(page);
  await page.locator('#quickWeight').fill('140');
  await page.locator('#saveQuickSetBtn').click();
  await page.locator('#appConfirmationCancel').click();
  await expect(page.locator('#appConfirmationBackdrop')).toBeHidden();
  await expect(page.locator('#quickWeight')).toHaveValue('140');
  const count=await page.evaluate(()=>JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions))[0].exercises[0].sets.length);
  expect(count).toBe(4);
});

test('Gym Party usa la misma revision antes de compartir una serie anomala',async({page})=>{
  await seed(page);
  await page.goto('/index.html?module=gym&view=group');
  await page.locator('#gymPartyCreateAlias').fill('Yo');
  await page.locator('#gymPartyCreateName').fill('Revision segura');
  await page.locator('[data-gym-party-action="create"]').click();
  await page.locator('#partyQuickWeight').fill('140');
  await page.locator('#partyQuickReps').fill('8');
  await page.locator('[data-gym-party-action="party-save-set"]').click();
  await expect(page.locator('#appConfirmationTitle')).toHaveText('Revisar este registro');
  await page.locator('[data-confirmation-choice="exclude-record"]').click();

  await expect.poll(()=>page.evaluate(()=>{
    const sessions=JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions)||'[]');
    const localSet=sessions[0]?.exercises[0]?.sets.at(-1);
    const shared=JSON.parse(localStorage.getItem('protocolo_0_100_shared_workout_sets_v1')||'[]').find(set=>set.localSetId===localSet?.id);
    return{
      localReady:localSet?.id!=='baseline-3'&&localSet?.excludeFromRecords===true&&localSet?.anomalyReview?.decision==='exclude-record',
      sharedReady:shared?.excludeFromRecords===true&&shared?.excludeFromProgression===false
    };
  })).toEqual({localReady:true,sharedReady:true});

  const stored=await page.evaluate(()=>{
    const sessions=JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions)||'[]');
    const localSet=sessions[0].exercises[0].sets.at(-1);
    const shared=JSON.parse(localStorage.getItem('protocolo_0_100_shared_workout_sets_v1')||'[]').find(set=>set.localSetId===localSet.id);
    return{localSet,shared};
  });
  expect(stored.localSet).toMatchObject({excludeFromRecords:true,anomalyReview:{decision:'exclude-record'}});
  expect(stored.shared).toMatchObject({excludeFromRecords:true,excludeFromProgression:false});
});
