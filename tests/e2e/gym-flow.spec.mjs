import {test,expect} from '@playwright/test';

async function createLocalParty(page,{alias='Yo',name='Sala E2E'}={}){
  await page.goto('/index.html?module=gym-party');
  await expect(page.locator('#gymPartyRoot')).toBeVisible();
  await page.locator('#gymPartyCreateAlias').fill(alias);
  await page.locator('#gymPartyCreateName').fill(name);
  await page.locator('[data-gym-party-action="create"]').click();
  await expect(page.getByRole('heading',{name:'Entrenamiento compartido',level:2,exact:true})).toBeVisible();
  await expect(page.locator('.partySyncState')).toContainText('Guardado localmente');
}

async function setWorkoutDate(page,date){
  const input=page.locator('#partyWorkoutDateInput');
  await input.fill(date);
  await input.press('Tab');
  await expect(input).toHaveValue(date);
}

test.beforeEach(async ({page})=>{
  await page.goto('/index.html');
  await page.evaluate(()=>localStorage.clear());
});

test('ejercicio personalizado ambiguo exige clasificacion canonica',async ({page})=>{
  await page.goto('/index.html?module=gym&view=routine');
  const config=page.locator('#workoutConfigPanel > details');
  await config.evaluate(details=>{details.open=true;});
  await page.locator('#planCustomExerciseName').fill('Face pull personal');
  await page.locator('#planCustomExerciseMuscle').fill('Hombro');
  await page.locator('#createPlanCustomExerciseBtn').click();
  const pendingRecord=await page.evaluate(()=>({library:JSON.parse(localStorage.getItem('protocolo_0_100_exercise_library_v1')).find(exercise=>exercise.name==='Face pull personal'),pending:window.WORKOUT_FEATURES.getPendingMuscleClassifications().map(exercise=>exercise.name)}));
  expect(pendingRecord.library?.classificationStatus).toBe('needs-review');
  expect(pendingRecord.library?.classificationConfidence).toBe('unknown');
  expect(pendingRecord.pending).toContain('Face pull personal');
  const libraryPanel=page.locator('#exerciseLibraryEditor');
  await libraryPanel.locator('> summary').click();
  await expect(page.locator('#exerciseClassificationStatus')).toContainText('1 ejercicio necesita');
  await page.locator('#exerciseClassificationFilter').selectOption('pending');
  const row=page.locator('.exerciseLibraryRow').filter({hasText:'Face pull personal'});
  await expect(row).toContainText('Otro / sin clasificar');
  await row.getByRole('button',{name:'Revisar músculos'}).click();
  const primary=page.locator('[data-form-group="primaryMuscles"]');
  const secondary=page.locator('[data-form-group="secondaryMuscles"]');
  await primary.getByLabel('Deltoides lateral').check();
  await primary.getByLabel('Deltoides posterior').check();
  await secondary.getByLabel('Trapecios').check();
  await page.locator('#appFormDialogSubmit').click();
  await expect(page.locator('#appFormDialogBackdrop')).toBeHidden();
  await expect(page.locator('#exerciseClassificationStatus')).toContainText('Todas las clasificaciones');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_exercise_library_v1')).find(exercise=>exercise.name==='Face pull personal'));
  expect(saved.primaryMuscles).toEqual(['side-delts','rear-delts']);
  expect(saved.secondaryMuscles).toEqual(['traps']);
  expect(saved.classificationStatus).toBe('confirmed');
  expect(saved.classificationSource).toBe('user-confirmed');
  expect(saved.classificationConfidence).toBe('high');
  await page.reload();
  expect(await page.evaluate(()=>window.WORKOUT_FEATURES.getPendingMuscleClassifications().some(exercise=>exercise.name==='Face pull personal'))).toBe(false);
});

test('rutina semanal, registro, edicion, borrado, deshacer y offline',async ({page,context})=>{
  await createLocalParty(page);
  await setWorkoutDate(page,'2026-07-06');

  await page.locator('details.partyAddExerciseFold summary').click();
  await page.locator('#partyManualExerciseName').fill('Face pull');
  await page.locator('#partyManualExerciseMuscle').fill('Hombro');
  await expect(page.locator('#partyManualRememberWeekday')).toBeChecked();
  await page.locator('[data-gym-party-action="party-add-exercise"]').click();
  await expect(page.locator('#partyQuickExerciseSelect')).toContainText('Face pull');

  const mondayCount=await page.evaluate(()=>{
    const plan=JSON.parse(localStorage.getItem('protocolo_0_100_weekly_workout_plan_v1'));
    return plan.monday.exercises.filter(exercise=>exercise.name==='Face pull').length;
  });
  expect(mondayCount).toBe(1);

  await setWorkoutDate(page,'2026-07-13');
  await expect(page.locator('#partyQuickExerciseSelect')).toContainText('Face pull');
  await page.evaluate(()=>{
    for(const date of ['2026-06-15','2026-06-22','2026-06-29','2026-07-06','2026-07-13']) window.WORKOUT_RANKING.recordExerciseUse({exerciseId:'remo-polea',date,dayKey:'monday',routineName:'Torso A'});
    window.WORKOUT_RANKING.recordExerciseUse({exerciseId:'curl-martillo',date:'2026-07-07',dayKey:'tuesday',routineName:'Extra'});
    window.renderGymParty();
  });
  const weekdayGroup=await page.locator('#partyQuickExerciseSelect').evaluate(select=>Array.from(select.querySelectorAll('optgroup')).find(group=>group.label==='Frecuentes de este dia')?.textContent||'');
  expect(weekdayGroup).toContain('Remo en polea');
  expect(weekdayGroup).not.toContain('Curl martillo');
  await page.locator('#partyQuickExerciseSelect').selectOption({label:'Face pull'});
  await page.locator('#partyQuickReps').fill('15');
  await page.locator('#partyQuickWeight').fill('20');
  await page.locator('[data-gym-party-action="party-save-set"]').click();
  await expect(page.locator('.partyLoggedSets .partySetRow')).toHaveCount(1);

  await page.getByRole('button',{name:'Editar serie 1 de Face pull',exact:true}).click();
  await page.locator('#partyQuickWeight').fill('22.5');
  await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  await expect(page.locator('.partyLoggedSets .partySetRow')).toContainText('22.5 kg');

  await page.getByRole('button',{name:'Eliminar serie 1 de Face pull',exact:true}).click();
  await page.locator('#appConfirmationConfirm').click();
  await expect(page.locator('.partyLoggedSets .partySetRow')).toHaveCount(0);
  const undo=page.locator('[data-gym-party-action="party-undo-delete-set"]');
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect(page.locator('.partyLoggedSets .partySetRow')).toHaveCount(1);

  await page.reload();
  await expect(page.locator('.partyLoggedSets .partySetRow')).toContainText('22.5 kg');
  await context.setOffline(true);
  await page.locator('#partyQuickReps').fill('16');
  await page.locator('[data-gym-party-action="party-save-set"]').click();
  await expect(page.locator('.partyLoggedSets .partySetRow')).toHaveCount(2);
  await context.setOffline(false);
});

test('codigo de invitacion se limpia y permite unir otro miembro',async ({page})=>{
  await createLocalParty(page,{alias:'Owner',name:'Sala codigo'});
  const inviteCode=await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_gym_party_membership_v1')).inviteCode);
  expect(inviteCode).toMatch(/^[A-Z0-9]{4,10}$/);

  await page.evaluate(()=>{
    const key='protocolo_0_100_gym_party_settings_v1';
    const settings=JSON.parse(localStorage.getItem(key));
    settings.localUserId='party_friend_e2e';
    localStorage.setItem(key,JSON.stringify(settings));
    localStorage.removeItem('protocolo_0_100_gym_party_membership_v1');
  });
  const localPartiesBefore=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('protocolo_0_100_gym_party_settings_v1')).localParties||{}).map(party=>party.inviteCode));
  expect(localPartiesBefore).toContain(inviteCode);
  await page.goto(`/index.html?module=gym-party&gymPartyCode=${inviteCode}`);
  await expect(page).not.toHaveURL(/gymPartyCode=/);
  const localPartiesAfter=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('protocolo_0_100_gym_party_settings_v1')).localParties||{}).map(party=>party.inviteCode));
  expect(localPartiesAfter).toContain(inviteCode);
  await page.locator('details').filter({hasText:'Entrar desde otro dispositivo'}).locator('summary').click();
  await expect(page.locator('#gymPartyJoinCode')).toHaveValue(inviteCode);
  await page.locator('#gymPartyJoinAlias').fill('Amigo');
  await page.locator('[data-gym-party-action="join"]').click();
  await page.locator('#appConfirmationConfirm').click();
  await expect(page.getByText(/2\/10 miembro/)).toBeVisible();
  const memberCount=await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_gym_party_membership_v1')).party.members.length);
  expect(memberCount).toBe(2);
});

test('PWA controla offline, shortcuts y configuracion Firebase',async ({page,browserName,context})=>{
  test.skip(browserName==='webkit','La prueba de Service Worker se ejecuta en Chromium; WebKit cubre la UI iPhone.');
  await page.goto('/index.html?module=gym');
  await page.waitForFunction(()=>navigator.serviceWorker?.ready);
  await page.reload();
  await expect(page.getByRole('heading',{name:'Registro rápido de serie',exact:true})).toBeVisible();
  const manifest=await page.evaluate(async()=>fetch('manifest.webmanifest').then(response=>response.json()));
  expect(manifest.shortcuts.map(shortcut=>shortcut.url)).toEqual(expect.arrayContaining(['./index.html?module=gym&view=train','./index.html?module=gym&view=group','./index.html?module=gym&view=train&quickLog=1']));
  const config=await page.evaluate(async()=>fetch('firebase-config.js',{cache:'no-store'}).then(response=>response.text()));
  expect(config).toContain('GYM_PARTY_FIREBASE_CONFIG');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading',{name:'Registro rápido de serie',exact:true})).toBeVisible();
  await context.setOffline(false);
});
