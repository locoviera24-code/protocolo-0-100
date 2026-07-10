import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {Timestamp,doc,getDoc,runTransaction,setDoc,updateDoc,writeBatch} from 'firebase/firestore';

const projectId='demo-protocolo-0100';
const rules=await readFile(new URL('./firestore.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({projectId,firestore:{rules}});
const now=Timestamp.fromDate(new Date('2026-07-10T12:00:00.000Z'));
const privacy={shareGymData:true,shareAggregateOnly:false,shareSetDetails:true,hideAbsoluteWeights:false,anonymousAlias:false,shareGeneralScore:false};

function partyData(partyId,ownerId,code){
  return {id:partyId,name:'Sala segura',inviteCode:code,createdBy:ownerId,createdAt:now,updatedAt:now,active:true,privacyMode:'gym-only',membersCount:1,maxMembers:10};
}
function memberData(partyId,userId,code,role='member'){
  return {id:`${partyId}_${userId}`,partyId,inviteCode:code,userId,aliasInParty:userId,role,joinedAt:now,updatedAt:now,active:true,...privacy};
}
function inviteData(partyId,ownerId,code){
  return {inviteCode:code,partyId,partyName:'Sala segura',createdBy:ownerId,createdAt:now,updatedAt:now,active:true,membersCount:1,maxMembers:10,uses:0};
}
async function createParty(ownerId='owner',partyId='party_secure',code='SAFE10'){
  const db=env.authenticatedContext(ownerId).firestore();
  const batch=writeBatch(db);
  batch.set(doc(db,'gym_parties',partyId),partyData(partyId,ownerId,code));
  batch.set(doc(db,'gym_party_members',`${partyId}_${ownerId}`),memberData(partyId,ownerId,code,'owner'));
  batch.set(doc(db,'gym_party_invites',code),inviteData(partyId,ownerId,code));
  await assertSucceeds(batch.commit());
  return {partyId,code,ownerId};
}
async function joinParty({partyId,code,userId}){
  const db=env.authenticatedContext(userId).firestore();
  const partyRef=doc(db,'gym_parties',partyId);
  const inviteRef=doc(db,'gym_party_invites',code);
  const memberRef=doc(db,'gym_party_members',`${partyId}_${userId}`);
  return runTransaction(db,async transaction=>{
    const inviteSnap=await transaction.get(inviteRef);
    transaction.set(memberRef,memberData(partyId,userId,code,'member'));
    transaction.update(partyRef,{membersCount:inviteSnap.data().membersCount+1,updatedAt:now});
    transaction.update(inviteRef,{membersCount:inviteSnap.data().membersCount+1,uses:inviteSnap.data().uses+1,updatedAt:now});
  });
}

try{
  await env.clearFirestore();
  const base=await createParty();
  await assertSucceeds(joinParty({...base,userId:'member'}));

  const ownerDb=env.authenticatedContext('owner').firestore();
  const memberDb=env.authenticatedContext('member').firestore();
  const outsiderDb=env.authenticatedContext('outsider').firestore();

  await assertFails(updateDoc(doc(memberDb,'gym_party_members','party_secure_member'),{role:'owner',updatedAt:now}));
  await assertFails(setDoc(doc(memberDb,'gym_party_invites','EVIL10'),inviteData('party_secure','member','EVIL10')));
  await assertFails(getDoc(doc(outsiderDb,'gym_parties','party_secure')));

  const ownerSet={id:'set_owner',partyId:'party_secure',sessionId:'session_owner',userId:'owner',localExerciseId:'press-row',localSetId:'set-local',exerciseId:'press-banca',exerciseName:'Press de banca',muscleGroup:'Pecho',setNumber:1,reps:8,weightKg:60,rir:2,rpe:8,isBodyweight:false,date:'2026-07-10',createdAt:now,updatedAt:now,deleted:false};
  await assertSucceeds(setDoc(doc(ownerDb,'workout_sets_shared','set_owner'),ownerSet));
  await assertFails(updateDoc(doc(memberDb,'workout_sets_shared','set_owner'),{reps:99,updatedAt:now}));
  await assertSucceeds(updateDoc(doc(ownerDb,'workout_sets_shared','set_owner'),{reps:9,updatedAt:now}));

  const wrongIdBatch=writeBatch(outsiderDb);
  wrongIdBatch.set(doc(outsiderDb,'gym_party_members','wrong_document_id'),memberData('party_secure','outsider','SAFE10','member'));
  wrongIdBatch.update(doc(outsiderDb,'gym_parties','party_secure'),{membersCount:3,updatedAt:now});
  wrongIdBatch.update(doc(outsiderDb,'gym_party_invites','SAFE10'),{membersCount:3,uses:2,updatedAt:now});
  await assertFails(wrongIdBatch.commit());

  const ownerRoleBatch=writeBatch(outsiderDb);
  ownerRoleBatch.set(doc(outsiderDb,'gym_party_members','party_secure_outsider'),memberData('party_secure','outsider','SAFE10','owner'));
  ownerRoleBatch.update(doc(outsiderDb,'gym_parties','party_secure'),{membersCount:3,updatedAt:now});
  ownerRoleBatch.update(doc(outsiderDb,'gym_party_invites','SAFE10'),{membersCount:3,uses:2,updatedAt:now});
  await assertFails(ownerRoleBatch.commit());

  await assertSucceeds(setDoc(doc(ownerDb,'gym_party_invites','NEXT10'),inviteData('party_secure','owner','NEXT10')));
  await assertFails(setDoc(doc(memberDb,'workout_sets_shared','negative_set'),{...ownerSet,id:'negative_set',userId:'member',reps:-1}));
  const joined=await getDoc(doc(memberDb,'gym_party_members','party_secure_member'));
  assert.equal(joined.data().role,'member');
  console.log('Firestore Rules correctas: owner atomico, union valida y seis negativas criticas denegadas.');
}finally{
  await env.cleanup();
}
