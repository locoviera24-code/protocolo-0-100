(function(global){
  'use strict';

  const DESTINATIONS=Object.freeze(['all-active-parties','selected-parties','private-only']);
  function safeArray(value){return Array.isArray(value)?value:[];}
  function cleanId(value){return String(value||'').trim().replace(/[^A-Za-z0-9_-]/g,'_').slice(0,180);}
  function privacySnapshot(value={}){
    return {
      shareGymData:value.shareGymData!==false,
      shareAggregateOnly:!!value.shareAggregateOnly,
      shareSetDetails:value.shareSetDetails!==false,
      hideAbsoluteWeights:!!value.hideAbsoluteWeights,
      anonymousAlias:!!value.anonymousAlias,
      shareGeneralScore:!!value.shareGeneralScore
    };
  }
  function destination(value){return DESTINATIONS.includes(value)?value:'all-active-parties';}
  function destinationMemberships(memberships,settings={}){
    const mode=destination(settings.sharingDestination);
    if(mode==='private-only')return[];
    const selected=new Set(safeArray(settings.selectedSharePartyIds).map(cleanId));
    return safeArray(memberships)
      .filter(item=>item?.active&&item.backendMode!=='demo'&&item.privacy?.shareGymData!==false)
      .filter(item=>mode!=='selected-parties'||selected.has(cleanId(item.partyId)));
  }
  function targetId(partyId,userId,originSetId){return `${cleanId(partyId)}_${cleanId(userId)}_${cleanId(originSetId)}`;}
  function sessionId(partyId,userId,originSessionId){return `${cleanId(partyId)}_${cleanId(userId)}_${cleanId(originSessionId)}`;}
  function targets(memberships,{originSessionId='',originSetId='',sharingDestination='all-active-parties',selectedSharePartyIds=[]}={}){
    return destinationMemberships(memberships,{sharingDestination,selectedSharePartyIds}).map(item=>({
      id:targetId(item.partyId,item.userId,originSetId||'pending'),
      partyId:cleanId(item.partyId),
      userId:cleanId(item.userId),
      backendMode:item.backendMode||'local',
      originSessionId:cleanId(originSessionId),
      originSetId:cleanId(originSetId),
      privacySnapshot:privacySnapshot(item.privacy),
      syncState:item.syncState||(item.backendMode==='firebase'?'pending':'synced'),
      attempts:0,
      lastError:''
    }));
  }
  function normalizeTargets(values,{originSessionId='',originSetId=''}={}){
    const map=new Map();
    safeArray(values).forEach(value=>{
      if(!value||typeof value!=='object')return;
      const partyId=cleanId(value.partyId),userId=cleanId(value.userId),session=cleanId(value.originSessionId||originSessionId),set=cleanId(value.originSetId||originSetId);
      if(!partyId||!userId||!session||!set)return;
      const item={...value,id:targetId(partyId,userId,set),partyId,userId,originSessionId:session,originSetId:set,privacySnapshot:privacySnapshot(value.privacySnapshot||value.privacy),syncState:value.syncState||'pending',attempts:Math.max(0,Number(value.attempts)||0),lastError:String(value.lastError||'').slice(0,300)};
      map.set(`${partyId}\u0000${userId}`,item);
    });
    return [...map.values()];
  }
  function stricterPrivacy(snapshot,current){
    const before=privacySnapshot(snapshot),now=privacySnapshot(current);
    return {
      shareGymData:before.shareGymData&&now.shareGymData,
      shareAggregateOnly:before.shareAggregateOnly||now.shareAggregateOnly,
      shareSetDetails:before.shareSetDetails&&now.shareSetDetails,
      hideAbsoluteWeights:before.hideAbsoluteWeights||now.hideAbsoluteWeights,
      anonymousAlias:before.anonymousAlias||now.anonymousAlias,
      shareGeneralScore:before.shareGeneralScore&&now.shareGeneralScore
    };
  }
  function status(targetsValue,queue=[]){
    const rows=safeArray(targetsValue),operations=safeArray(queue);
    let synced=0,pending=0,errors=0;
    rows.forEach(target=>{
      const targetOps=operations.filter(op=>op?.payload?.partyId===target.partyId&&(!target.originSetId||op?.payload?.localSetId===target.originSetId));
      if(targetOps.some(op=>op.lastError)){errors+=1;return;}
      if(targetOps.length||target.syncState==='pending'||target.syncState==='syncing'){pending+=1;return;}
      if(target.syncState==='error'){errors+=1;return;}
      synced+=1;
    });
    return{total:rows.length,synced,pending,errors};
  }

  global.GYM_PARTY_FANOUT=Object.freeze({DESTINATIONS,cleanId,privacySnapshot,destination,destinationMemberships,targetId,sessionId,targets,normalizeTargets,stricterPrivacy,status});
})(window);
