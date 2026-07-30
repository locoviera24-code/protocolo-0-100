(function(root){
  'use strict';
  const expectedBuild=92,currentBuild=Number(root.APP_VERSION_INFO?.build)||0;
  if(!currentBuild||currentBuild===expectedBuild)return;
  root.__PWA_BUILD_MISMATCH=Object.freeze({expectedBuild,currentBuild});
  const render=()=>{
    document.documentElement.dataset.buildMismatch='true';
    document.body.innerHTML='<main class="mainContent" aria-labelledby="buildMismatchTitle"><section class="moduleCard emptyState"><h1 id="buildMismatchTitle">Actualizacion pendiente</h1><p>Hay una version nueva, pero el navegador todavia conserva archivos anteriores. Actualiza para abrir la app de forma consistente.</p><button type="button" class="primary" id="activateCompatibleBuild" disabled>Preparando actualizacion...</button></section></main>';
    const button=document.getElementById('activateCompatibleBuild');
    if(!('serviceWorker'in navigator)){button.disabled=false;button.textContent='Recargar';button.addEventListener('click',()=>location.reload());return;}
    let waiting=null;
    navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});
    const ready=worker=>{if(!worker)return;waiting=worker;button.disabled=false;button.textContent='Actualizar ahora';};
    navigator.serviceWorker.register('./sw.js').then(async registration=>{await registration.update();if(registration.waiting)return ready(registration.waiting);const worker=registration.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed')ready(registration.waiting||worker);});}).catch(()=>{button.disabled=false;button.textContent='Reintentar';});
    button.addEventListener('click',()=>{if(waiting)waiting.postMessage({type:'SKIP_WAITING'});else location.reload();});
  };
  render();
  root.stop?.();
})(window);
