import {test,expect} from '@playwright/test';

async function reset(page){
  await page.goto('/index.html');
  await page.evaluate(async()=>{
    localStorage.clear();
    sessionStorage.clear();
    await window.APP_DATA.clearAllData();
  });
}

test('Gym Party migra, conserva y permite seleccionar varias salas',async({page})=>{
  await reset(page);
  await page.evaluate(()=>{
    const privacy={shareGymData:true,shareSetDetails:true};
    const parties={
      party_one:{id:'party_one',name:'Sala Uno',inviteCode:'UNO100',members:[{partyId:'party_one',userId:'user_multi',aliasInParty:'Yo',active:true}]},
      party_two:{id:'party_two',name:'Sala Dos',inviteCode:'DOS200',members:[{partyId:'party_two',userId:'user_multi',aliasInParty:'Yo',active:true}]}
    };
    window.APP_FEATURE_FLAGS.set({multiPartyWorkoutSharing:true});
    window.GYM_PARTY_FEATURES.importState({
      gymPartySettings:{localUserId:'user_multi',localParties:parties},
      gymPartyMembershipsV2:[
        {partyId:'party_one',userId:'user_multi',active:true,backendMode:'local',joinedAt:'2026-07-01',privacy,party:parties.party_one},
        {partyId:'party_two',userId:'user_multi',active:true,backendMode:'local',joinedAt:'2026-07-02',privacy,party:parties.party_two}
      ],
      selectedPartyId:'party_one'
    });
  });
  await page.goto('/index.html?module=gym-party');

  const switcher=page.locator('.partyRoomSwitcher');
  await expect(switcher).toContainText('2 activo(s)');
  await expect(page.locator('.partyDashboardTop')).toContainText('Sala Uno');
  await switcher.getByRole('button',{name:'Sala Dos'}).click();
  await expect(page.locator('.partyDashboardTop')).toContainText('Sala Dos');

  const state=await page.evaluate(()=>window.GYM_PARTY_FEATURES.exportState());
  expect(state.gymPartyMembershipsV2).toHaveLength(2);
  expect(state.selectedPartyId).toBe('party_two');
  expect(state.gymPartyMembership.partyId).toBe('party_two');

  const fanout=await page.evaluate(()=>{
    const session={id:'multi-session',date:'2026-07-28',weekday:'Martes',routine:{name:'Pierna'},startedAt:'2026-07-28T10:00:00.000Z',status:'en progreso',currentExerciseIndex:0,exercises:[{id:'press-row',exerciseId:'press-banca',name:'Press de banca',muscle:'Pecho',sets:[{id:'multi-set',setNumber:1,reps:8,weight:60,weightKg:60,setType:'working',completed:true}]}]};
    window.WORKOUT_FEATURES.replaceSessionPayload(session);
    const first=window.GYM_PARTY_FEATURES.syncFromLocalWorkouts({silent:true});
    window.GYM_PARTY_FEATURES.syncFromLocalWorkouts({silent:true});
    const exported=window.GYM_PARTY_FEATURES.exportState();
    return{destinations:first.destinations,sets:exported.sharedWorkoutSets.filter(item=>item.localSetId==='multi-set')};
  });
  expect(fanout.destinations.sort()).toEqual(['party_one','party_two']);
  expect(fanout.sets).toHaveLength(2);
  expect(new Set(fanout.sets.map(item=>item.id)).size).toBe(2);

  await page.locator('.partyRoomSwitcher [data-gym-party-action="new-room"]').click();
  await expect(page.locator('#gymPartyCreateAlias')).toBeVisible();
  await expect(page.locator('.partyRoomSwitcher')).toContainText('Sala Uno');
  await page.locator('[data-gym-party-action="back-to-party"]').click();
  await expect(page.locator('.partyDashboardTop')).toContainText('Sala Dos');
});
