(function(){
  'use strict';
  function escape(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function groupedOptions(groups,renderItem){return (groups||[]).map(group=>`<optgroup label="${escape(group.label)}">${(group.items||[]).map(item=>renderItem(item,escape)).join('')}</optgroup>`).join('');}
  function statCard(label,value){return `<div class="quickStat"><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`;}
  function announce(message){const live=document.getElementById('globalLiveRegion');if(!live)return;live.textContent='';requestAnimationFrame(()=>{live.textContent=String(message||'');});}
  window.WORKOUT_UI={escape,groupedOptions,statCard,announce};
})();
