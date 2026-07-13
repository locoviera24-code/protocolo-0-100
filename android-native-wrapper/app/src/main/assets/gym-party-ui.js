(function(){
  'use strict';
  function escape(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function helpButton(id){return `<button type="button" class="gymPartyHelp" data-party-help="${escape(id)}" aria-label="Ayuda sobre ${escape(id)}">?</button>`;}
  function statCard(label,value,helpId=''){return `<div class="quickStat"><span>${escape(label)} ${helpId?helpButton(helpId):''}</span><strong>${escape(value)}</strong></div>`;}
  function renderRoot(root,html,bind){if(!root)return;root.innerHTML=html;if(typeof bind==='function')bind(root);window.applyAccessibilityEnhancements?.(root);}
  function syncState({backendMode='local',pending=0,conflicts=0,error='',syncing=false,lastSyncAt='',online=true,requiresAccess=false}={}){
    const count=Math.max(0,Number(pending)||0),last=lastSyncAt?`Última sincronización: ${new Intl.DateTimeFormat('es-PY',{dateStyle:'short',timeStyle:'short'}).format(new Date(lastSyncAt))}`:'Todavía no se sincronizó.';
    if(backendMode==='demo')return{id:'demo',label:'Modo demo',detail:'Los datos visibles son ficticios.',tone:'info',pending:0,last};
    if(backendMode!=='firebase')return{id:'local',label:'Guardado localmente',detail:'Esta sala solo existe en este dispositivo.',tone:'info',pending:0,last};
    if(requiresAccess)return{id:'requires-access',label:'Requiere acceso',detail:'Volvé a vincular tu acceso para sincronizar esta sala.',tone:'warning',pending:count,last};
    if(syncing)return{id:'syncing',label:'Sincronizando',detail:`Procesando ${count} cambio(s) pendiente(s).`,tone:'info',pending:count,last};
    if(conflicts)return{id:'conflict',label:'Conflicto resuelto',detail:`Se conservaron los datos remotos más nuevos en ${conflicts} registro(s).`,tone:'warning',pending:count,last};
    if(error)return{id:'error',label:'Error recuperable',detail:'Tus datos siguen guardados localmente. Podés reintentar.',tone:'error',pending:count,last};
    if(count)return{id:'pending',label:'Pendiente de sincronización',detail:online?`${count} cambio(s) listo(s) para subir.`:`${count} cambio(s) se subirán cuando vuelva la conexión.`,tone:'warning',pending:count,last};
    if(lastSyncAt)return{id:'synced',label:'Sincronizado',detail:'No hay cambios pendientes.',tone:'success',pending:0,last};
    return{id:'local',label:'Guardado localmente',detail:'Sincronizá para crear la primera copia compartida.',tone:'info',pending:0,last};
  }
  function syncLabel(options={}){return syncState(options).label;}
  window.GYM_PARTY_UI={escape,helpButton,statCard,renderRoot,syncState,syncLabel};
})();
