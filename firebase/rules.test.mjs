import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {Timestamp,collection,doc,documentId,getDoc,getDocs,limit,orderBy,query,runTransaction,setDoc,updateDoc,where,writeBatch} from 'firebase/firestore';

const projectId='demo-protocolo-0100';
const rules=await readFile(new URL('./firestore.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({projectId,firestore:{rules}});
const now=Timestamp.fromDate(new Date('2026-07-10T12:00:00.000Z'));
const privacy={shareGymData:true,shareAggregateOnly:false,shareSetDetails:true,hideAbsoluteWeights:false,anonymousAlias:false,shareGeneralScore:false};

function partyData(partyId,ownerId,code,{maxMembers=10}={}){
  return {id:partyId,name:'Sala segura',inviteCode:code,createdBy:ownerId,createdAt:now,updatedAt:now,active:true,privacyMode:'gym-only',membersCount:1,maxMembers};
}

function memberData(partyId,userId,code,role='member'){
  return {id:`${partyId}_${userId}`,partyId,inviteCode:code,userId,aliasInParty:userId,role,joinedAt:now,updatedAt:now,active:true,...privacy};
}

function inviteData(partyId,ownerId,code,{maxMembers=10,maxUses=null}={}){
  const invite={inviteCode:code,partyId,partyName:'Sala segura',createdBy:ownerId,createdAt:now,updatedAt:now,active:true,membersCount:1,maxMembers,uses:0,membershipRevision:0};
  if(maxUses!==null) invite.maxUses=maxUses;
  return invite;
}

async function createParty({ownerId='owner',partyId='party_secure',code='SAFE10',maxMembers=10,maxUses=null}={}){
  const db=env.authenticatedContext(ownerId).firestore();
  const batch=writeBatch(db);
  batch.set(doc(db,'gym_parties',partyId),partyData(partyId,ownerId,code,{maxMembers}));
  batch.set(doc(db,'gym_party_members',`${partyId}_${ownerId}`),memberData(partyId,ownerId,code,'owner'));
  batch.set(doc(db,'gym_party_invites',code),inviteData(partyId,ownerId,code,{maxMembers,maxUses}));
  await assertSucceeds(batch.commit());
  return {partyId,code,ownerId};
}

async function membershipTransaction({partyId,code,userId,operation,actorId=userId}){
  const db=env.authenticatedContext(actorId).firestore();
  const partyRef=doc(db,'gym_parties',partyId);
  const inviteRef=doc(db,'gym_party_invites',code);
  const memberRef=doc(db,'gym_party_members',`${partyId}_${userId}`);
  return runTransaction(db,async transaction=>{
    const [inviteSnap,memberSnap]=await Promise.all([
      transaction.get(inviteRef),transaction.get(memberRef)
    ]);
    const invite=inviteSnap.data();
    const activating=operation==='join'||operation==='reactivate';
    const nextCount=invite.membersCount+(activating?1:-1);
    const revision=Number(invite.membershipRevision||0)+1;
    const mutation={userId,actorId,operation,inviteCode:code,at:now};
    if(operation==='join') transaction.set(memberRef,memberData(partyId,userId,code,'member'));
    if(operation==='reactivate') transaction.update(memberRef,{active:true,reactivatedAt:now,reactivationCount:Number(memberSnap.data()?.reactivationCount||0)+1,updatedAt:now});
    if(operation==='leave') transaction.update(memberRef,{active:false,deactivationReason:'left',deactivatedBy:actorId,deactivatedAt:now,updatedAt:now});
    if(operation==='remove') transaction.update(memberRef,{active:false,deactivationReason:'removed',deactivatedBy:actorId,deactivatedAt:now,updatedAt:now});
    transaction.update(partyRef,{membersCount:nextCount,membershipRevision:revision,lastMembershipMutation:mutation,updatedAt:now});
    transaction.update(inviteRef,{membersCount:nextCount,uses:invite.uses+(activating?1:0),membershipRevision:revision,updatedAt:now});
  });
}

async function joinParty(args){
  return membershipTransaction({...args,operation:'join'});
}

const ownerSet={id:'set_owner',partyId:'party_secure',sessionId:'session_owner',userId:'owner',localExerciseId:'press-row',localSetId:'set-local',exerciseId:'press-banca',exerciseName:'Press de banca',muscleGroup:'Pecho',setNumber:1,reps:8,weightKg:60,rir:2,rpe:8,isBodyweight:false,setType:'working',completed:true,excludeFromRecords:false,excludeFromProgression:false,date:'2026-07-10',createdAt:now,updatedAt:now,deleted:false};
const ownerSession={id:'session_owner',partyId:'party_secure',userId:'owner',localSessionId:'local_session_owner',date:'2026-07-10',localDate:'2026-07-10',weekday:'Viernes',routineName:'Torso C',startedAt:now,finishedAt:now,durationMinutes:60,exercisesCompleted:1,totalSets:1,totalReps:8,totalVolume:480,externalLoadVolume:480,bodyweightReps:0,addedLoadVolume:0,bestWeight:60,bestSetVolume:480,maxReps:8,timeZone:'America/Asuncion',utcOffset:-240,revision:1,createdAt:now,updatedAt:now};

async function testCoreAccessAndWorkoutRules(){
  await env.clearFirestore();
  const base=await createParty();
  await assertSucceeds(joinParty({...base,userId:'member'}));
  const ownerDb=env.authenticatedContext('owner').firestore();
  const memberDb=env.authenticatedContext('member').firestore();
  const outsiderDb=env.authenticatedContext('outsider').firestore();

  await assertFails(joinParty({...base,userId:'member'}));
  await assertFails(updateDoc(doc(memberDb,'gym_party_members','party_secure_member'),{role:'owner',updatedAt:now}));
  await assertFails(setDoc(doc(memberDb,'gym_party_invites','EVIL10'),inviteData('party_secure','member','EVIL10')));
  await assertFails(getDoc(doc(outsiderDb,'gym_parties','party_secure')));
  await assertFails(updateDoc(doc(memberDb,'gym_parties','party_secure'),{membersCount:8,updatedAt:now}));
  await assertFails(updateDoc(doc(ownerDb,'gym_parties','party_secure'),{membersCount:8,updatedAt:now}));
  await assertFails(updateDoc(doc(ownerDb,'gym_party_invites','SAFE10'),{uses:8,updatedAt:now}));
  await assertFails(updateDoc(doc(ownerDb,'gym_party_members','party_secure_member'),{role:'owner',updatedAt:now}));
  await assertFails(updateDoc(doc(ownerDb,'gym_party_members','party_secure_member'),{partyId:'other',updatedAt:now}));

  const wrongIdBatch=writeBatch(outsiderDb);
  const wrongMutation={userId:'outsider',actorId:'outsider',operation:'join',inviteCode:'SAFE10',at:now};
  wrongIdBatch.set(doc(outsiderDb,'gym_party_members','wrong_document_id'),memberData('party_secure','outsider','SAFE10','member'));
  wrongIdBatch.update(doc(outsiderDb,'gym_parties','party_secure'),{membersCount:3,membershipRevision:2,lastMembershipMutation:wrongMutation,updatedAt:now});
  wrongIdBatch.update(doc(outsiderDb,'gym_party_invites','SAFE10'),{membersCount:3,uses:2,membershipRevision:2,updatedAt:now});
  await assertFails(wrongIdBatch.commit());

  await assertSucceeds(setDoc(doc(ownerDb,'workout_sessions_shared','session_owner'),ownerSession));
  await assertSucceeds(setDoc(doc(ownerDb,'workout_sets_shared','set_owner'),ownerSet));
  await assertFails(updateDoc(doc(memberDb,'workout_sets_shared','set_owner'),{reps:99,updatedAt:now}));
  await assertSucceeds(updateDoc(doc(ownerDb,'workout_sets_shared','set_owner'),{reps:9,updatedAt:now}));
  await assertFails(setDoc(doc(memberDb,'workout_sets_shared','negative_set'),{...ownerSet,id:'negative_set',userId:'member',reps:-1}));
  await assertFails(setDoc(doc(ownerDb,'workout_sets_shared','invalid_set_type'),{...ownerSet,id:'invalid_set_type',setType:'max-effort'}));
  await assertSucceeds(setDoc(doc(ownerDb,'workout_sets_shared','equipment_set'),{...ownerSet,id:'equipment_set',weightKg:30,barWeightKg:20,assistanceKg:0,measurementMode:'reps',loadMode:'perSide',equipmentId:'barbell-20',equipmentName:'Barra olimpica 20 kg',laterality:'bilateral',durationSeconds:0,distanceMeters:0}));
  await assertSucceeds(setDoc(doc(ownerDb,'workout_sets_shared','timed_set'),{...ownerSet,id:'timed_set',reps:0,weightKg:0,measurementMode:'time',loadMode:'bodyweight',durationSeconds:60,distanceMeters:0}));
  await assertFails(setDoc(doc(ownerDb,'workout_sets_shared','invalid_load_mode'),{...ownerSet,id:'invalid_load_mode',loadMode:'negative-assistance'}));
  await assertFails(setDoc(doc(ownerDb,'workout_sets_shared','invalid_measurement_mode'),{...ownerSet,id:'invalid_measurement_mode',measurementMode:'watts'}));

  await env.withSecurityRulesDisabled(async context=>{
    await setDoc(doc(context.firestore(),'workout_sets_shared','set_legacy'),{...ownerSet,id:'set_legacy',source:'local',pendingSync:false});
    const legacySession={...ownerSession,source:'local',pendingSync:false};
    delete legacySession.id;
    delete legacySession.localSessionId;
    await setDoc(doc(context.firestore(),'workout_sessions_shared','session_legacy'),legacySession);
  });
  await assertSucceeds(setDoc(doc(ownerDb,'workout_sets_shared','set_legacy'),{...ownerSet,id:'set_legacy'}));
  await assertSucceeds(setDoc(doc(ownerDb,'workout_sessions_shared','session_legacy'),{...ownerSession,id:'session_legacy',localSessionId:'local_session_legacy'}));
  await assertFails(setDoc(doc(ownerDb,'workout_sessions_shared','session_legacy'),{...ownerSession,id:'session_legacy',localSessionId:'local_session_legacy',totalSets:-1}));
  await assertFails(setDoc(doc(memberDb,'workout_sessions_shared','session_legacy'),{...ownerSession,id:'session_legacy',userId:'member',localSessionId:'stolen'}));

  await assertSucceeds(getDocs(query(collection(ownerDb,'gym_party_members'),where('partyId','==','party_secure'),where('active','==',true),limit(11))));
  await assertSucceeds(getDocs(query(collection(ownerDb,'workout_sessions_shared'),where('partyId','==','party_secure'),orderBy('updatedAt','asc'),orderBy(documentId(),'asc'),limit(120))));
  await assertSucceeds(getDocs(query(collection(ownerDb,'workout_sets_shared'),where('partyId','==','party_secure'),orderBy('updatedAt','asc'),orderBy(documentId(),'asc'),limit(300))));
}

async function testLeaveAndControlledReactivation(){
  await env.clearFirestore();
  const base=await createParty();
  await assertSucceeds(joinParty({...base,userId:'member'}));
  await assertSucceeds(membershipTransaction({...base,userId:'member',operation:'leave'}));
  await assertFails(membershipTransaction({...base,userId:'member',operation:'leave'}));
  await assertFails(updateDoc(doc(env.authenticatedContext('member').firestore(),'gym_party_members','party_secure_member'),{active:true,updatedAt:now}));
  await assertSucceeds(membershipTransaction({...base,userId:'member',operation:'reactivate'}));
  const party=await getDoc(doc(env.authenticatedContext('owner').firestore(),'gym_parties','party_secure'));
  const invite=await getDoc(doc(env.authenticatedContext('owner').firestore(),'gym_party_invites','SAFE10'));
  assert.equal(party.data().membersCount,2);
  assert.equal(invite.data().membersCount,2);
  assert.equal(invite.data().uses,2);
}

async function testExpelledMemberCannotReactivateOrRead(){
  await env.clearFirestore();
  const base=await createParty();
  await assertSucceeds(joinParty({...base,userId:'member'}));
  const ownerDb=env.authenticatedContext('owner').firestore();
  await assertSucceeds(setDoc(doc(ownerDb,'workout_sessions_shared','session_owner'),ownerSession));
  await assertSucceeds(membershipTransaction({...base,userId:'member',actorId:'owner',operation:'remove'}));
  const memberDb=env.authenticatedContext('member').firestore();
  await assertFails(updateDoc(doc(memberDb,'gym_party_members','party_secure_member'),{active:true,updatedAt:now}));
  await assertFails(membershipTransaction({...base,userId:'member',operation:'reactivate'}));
  await assertFails(getDoc(doc(memberDb,'workout_sessions_shared','session_owner')));
  await assertFails(getDocs(query(collection(memberDb,'workout_sessions_shared'),where('partyId','==','party_secure'),limit(10))));

  await env.withSecurityRulesDisabled(async context=>{
    await setDoc(doc(context.firestore(),'gym_party_members','party_secure_legacy'),{
      ...memberData('party_secure','legacy','SAFE10','member'),active:false
    });
  });
  await assertFails(membershipTransaction({...base,userId:'legacy',operation:'reactivate'}));
}

async function testInviteReuseAndConcurrentCapacity(){
  await env.clearFirestore();
  const singleUse=await createParty({partyId:'single_use',code:'ONCE10',maxUses:1});
  await assertSucceeds(joinParty({...singleUse,userId:'first'}));
  await assertFails(joinParty({...singleUse,userId:'second'}));

  await env.clearFirestore();
  const capacity=await createParty({partyId:'capacity',code:'CAP210',maxMembers:2});
  const results=await Promise.allSettled([
    joinParty({...capacity,userId:'alpha'}),
    joinParty({...capacity,userId:'beta'})
  ]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(results.filter(result=>result.status==='rejected').length,1);
  const party=await getDoc(doc(env.authenticatedContext('owner').firestore(),'gym_parties','capacity'));
  const invite=await getDoc(doc(env.authenticatedContext('owner').firestore(),'gym_party_invites','CAP210'));
  assert.equal(party.data().membersCount,2);
  assert.equal(invite.data().membersCount,2);
  assert.equal(invite.data().uses,1);
}

async function testOwnerInviteRotationAndArchive(){
  await env.clearFirestore();
  const base=await createParty();
  const ownerDb=env.authenticatedContext('owner').firestore();
  const partyRef=doc(ownerDb,'gym_parties',base.partyId);
  const ownerMemberRef=doc(ownerDb,'gym_party_members',`${base.partyId}_owner`);
  const oldInviteRef=doc(ownerDb,'gym_party_invites',base.code);
  const nextInviteRef=doc(ownerDb,'gym_party_invites','NEXT10');
  const rotate=writeBatch(ownerDb);
  rotate.set(nextInviteRef,inviteData(base.partyId,'owner','NEXT10'));
  rotate.update(oldInviteRef,{active:false,updatedAt:now});
  rotate.update(partyRef,{inviteCode:'NEXT10',updatedAt:now});
  await assertSucceeds(rotate.commit());

  const archive=writeBatch(ownerDb);
  archive.update(ownerMemberRef,{active:false,deactivationReason:'archived',deactivatedBy:'owner',deactivatedAt:now,updatedAt:now});
  archive.update(partyRef,{active:false,updatedAt:now});
  archive.update(nextInviteRef,{active:false,updatedAt:now});
  await assertSucceeds(archive.commit());
}

try{
  await testCoreAccessAndWorkoutRules();
  await testLeaveAndControlledReactivation();
  await testExpelledMemberCannotReactivateOrRead();
  await testInviteReuseAndConcurrentCapacity();
  await testOwnerInviteRotationAndArchive();
  console.log('Firestore Rules correctas: contadores atomicos, reactivacion controlada, expulsados aislados, invitaciones limitadas y capacidad concurrente verificadas.');
}finally{
  await env.cleanup();
}
