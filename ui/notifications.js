(function(global){
  'use strict';
  const tones=new Set(['info','success','warning','error']),banners=new Map();
  let snackbarTimer=0;
  function elements(){return{snackbar:document.getElementById('appSnackbar'),message:document.getElementById('appSnackbarMessage'),action:document.getElementById('appSnackbarAction'),banner:document.getElementById('appBanner'),bannerTitle:document.getElementById('appBannerTitle'),bannerMessage:document.getElementById('appBannerMessage'),bannerAction:document.getElementById('appBannerAction')};}
  function announce(message){const live=document.getElementById('globalLiveRegion');if(!live)return;live.textContent='';requestAnimationFrame(()=>{live.textContent=String(message||'');});}
  function hideSnackbar(){const {snackbar,action}=elements();clearTimeout(snackbarTimer);snackbarTimer=0;snackbar?.classList.add('hidden');if(action){action.classList.add('hidden');action.onclick=null;}}
  function showSnackbar(message,{tone='info',duration=2600,actionLabel='',onAction=null}={}){
    const {snackbar,message:label,action}=elements();if(!snackbar||!label)return null;hideSnackbar();
    snackbar.dataset.tone=tones.has(tone)?tone:'info';label.textContent=String(message||'');
    if(actionLabel&&typeof onAction==='function'){action.textContent=actionLabel;action.classList.remove('hidden');action.onclick=()=>{hideSnackbar();onAction();};}
    snackbar.classList.remove('hidden');announce(message);window.dispatchEvent(new Event('layout-refresh'));
    if(duration>0)snackbarTimer=setTimeout(hideSnackbar,duration);return snackbar;
  }
  function selectedBanner(){return[...banners.values()].sort((a,b)=>(b.priority||0)-(a.priority||0)||(b.updatedAt||0)-(a.updatedAt||0))[0]||null;}
  function renderBanner(){
    const {banner,bannerTitle,bannerMessage,bannerAction}=elements(),item=selectedBanner();if(!banner||!bannerTitle||!bannerMessage||!bannerAction)return;
    if(!item){banner.classList.add('hidden');banner.removeAttribute('data-tone');bannerAction.onclick=null;window.dispatchEvent(new Event('layout-refresh'));return;}
    banner.dataset.tone=tones.has(item.tone)?item.tone:'info';bannerTitle.textContent=item.title||'';bannerMessage.textContent=item.message||'';
    if(item.actionLabel&&typeof item.onAction==='function'){bannerAction.textContent=item.actionLabel;bannerAction.classList.remove('hidden');bannerAction.disabled=false;bannerAction.onclick=event=>item.onAction(event.currentTarget);}else{bannerAction.classList.add('hidden');bannerAction.onclick=null;}
    banner.classList.remove('hidden');window.dispatchEvent(new Event('layout-refresh'));
  }
  function showBanner({id='global',title='',message='',tone='info',priority=0,actionLabel='',onAction=null}={}){banners.set(id,{id,title,message,tone,priority,actionLabel,onAction,updatedAt:Date.now()});renderBanner();return id;}
  function hideBanner(id='global'){banners.delete(id);renderBanner();}
  function setOffline(offline=!navigator.onLine){if(offline)showBanner({id:'offline',title:'Sin conexion',message:'Podes seguir registrando. Los datos pendientes se sincronizaran al volver la conexion.',tone:'warning',priority:100});else hideBanner('offline');}
  global.APP_NOTIFICATIONS=Object.freeze({showSnackbar,hideSnackbar,showBanner,hideBanner,setOffline,announce});
  global.addEventListener('offline',()=>setOffline(true));global.addEventListener('online',()=>setOffline(false));
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setOffline(),{once:true}):setOffline();
})(window);
