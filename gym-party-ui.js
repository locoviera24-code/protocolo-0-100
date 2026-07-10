(function(){
  'use strict';
  function escape(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function helpButton(id){return `<button type="button" class="gymPartyHelp" data-party-help="${escape(id)}" aria-label="Ayuda sobre ${escape(id)}">?</button>`;}
  function statCard(label,value,helpId=''){return `<div class="quickStat"><span>${escape(label)} ${helpId?helpButton(helpId):''}</span><strong>${escape(value)}</strong></div>`;}
  function renderRoot(root,html,bind){if(!root)return;root.innerHTML=html;if(typeof bind==='function')bind(root);window.applyAccessibilityEnhancements?.(root);}
  function syncLabel({backendMode,pending=0,conflicts=0}={}){return backendMode==='demo'?'Demo':`${backendMode==='firebase'?'Online':'Local'} - ${pending} pendiente(s)${conflicts?` - ${conflicts} conflicto(s) resuelto(s)`:''}`;}
  window.GYM_PARTY_UI={escape,helpButton,statCard,renderRoot,syncLabel};
})();
