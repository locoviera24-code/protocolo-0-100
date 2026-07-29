(function(global){
  'use strict';

  const SCHEMA_VERSION=2;

  function safeArray(value){return Array.isArray(value)?value:[];}
  function cleanId(value){return String(value||'').trim().slice(0,160);}
  function normalizePrivacy(value={}){
    return {
      shareGymData:value.shareGymData!==false,
      shareAggregateOnly:!!value.shareAggregateOnly,
      shareSetDetails:value.shareSetDetails!==false,
      hideAbsoluteWeights:!!value.hideAbsoluteWeights,
      anonymousAlias:!!value.anonymousAlias,
      shareGeneralScore:!!value.shareGeneralScore
    };
  }
  function normalizeMembership(value){
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    const partyId=cleanId(value.partyId),userId=cleanId(value.userId);
    if(!partyId||!userId)return null;
    const backendMode=['firebase','local','demo'].includes(value.backendMode)?value.backendMode:'local';
    return {
      ...value,
      schemaVersion:SCHEMA_VERSION,
      partyId,
      userId,
      backendMode,
      role:value.role==='owner'?'owner':'member',
      active:value.active!==false,
      privacy:normalizePrivacy(value.privacy||value),
      lastSyncAt:typeof value.lastSyncAt==='string'?value.lastSyncAt:'',
      lastRemoteSyncAt:typeof value.lastRemoteSyncAt==='string'?value.lastRemoteSyncAt:'',
      syncState:typeof value.syncState==='string'?value.syncState:(backendMode==='firebase'?'pending':'local')
    };
  }
  function membershipKey(value){
    const item=normalizeMembership(value);
    return item?`${item.partyId}\u0000${item.userId}`:'';
  }
  function normalizeMemberships(values,legacy=null){
    const rows=[...safeArray(values)];
    if(legacy)rows.push(legacy);
    const map=new Map();
    rows.forEach(value=>{
      const item=normalizeMembership(value),key=membershipKey(item);
      if(!item||!key)return;
      const current=map.get(key);
      map.set(key,current?{...current,...item,privacy:{...current.privacy,...item.privacy}}:item);
    });
    return [...map.values()].sort((a,b)=>String(b.joinedAt||b.updatedAt||'').localeCompare(String(a.joinedAt||a.updatedAt||'')));
  }
  function upsert(values,value){return normalizeMemberships([...safeArray(values),value]);}
  function remove(values,partyId,userId=''){
    const cleanPartyId=cleanId(partyId),cleanUserId=cleanId(userId);
    return normalizeMemberships(values).filter(item=>item.partyId!==cleanPartyId||(cleanUserId&&item.userId!==cleanUserId));
  }
  function active(values){return normalizeMemberships(values).filter(item=>item.active);}
  function resolveSelectedPartyId(values,requested=''){
    const rows=active(values),cleanRequested=cleanId(requested);
    return rows.some(item=>item.partyId===cleanRequested)?cleanRequested:(rows[0]?.partyId||'');
  }
  function selected(values,requested='',includeInactive=false){
    const rows=normalizeMemberships(values),partyId=includeInactive?cleanId(requested):resolveSelectedPartyId(rows,requested);
    return rows.find(item=>item.partyId===partyId&&(includeInactive||item.active))||(!includeInactive?active(rows)[0]:null)||null;
  }
  function shareable(values){return active(values).filter(item=>item.privacy?.shareGymData!==false);}

  global.GYM_PARTY_MEMBERSHIPS=Object.freeze({
    SCHEMA_VERSION,
    normalizePrivacy,
    normalizeMembership,
    normalizeMemberships,
    membershipKey,
    upsert,
    remove,
    active,
    selected,
    shareable,
    resolveSelectedPartyId
  });
})(window);
