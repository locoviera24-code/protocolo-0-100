(function(){
  'use strict';
  const runtimes=new Map();
  function hasConfig(config){return !!(config?.apiKey&&config?.authDomain&&config?.projectId&&config?.appId);}
  function configSource(local,bundled){return hasConfig(local)?'local':hasConfig(bundled)?'bundled':'missing';}
  function moduleUrls(version){const base=`https://www.gstatic.com/firebasejs/${version}`;return {app:`${base}/firebase-app.js`,auth:`${base}/firebase-auth.js`,firestore:`${base}/firebase-firestore.js`};}
  async function load({version,config,name='gym-party'}={}){
    if(!hasConfig(config))throw new Error('FIREBASE_NOT_CONFIGURED');if(runtimes.has(name))return runtimes.get(name);
    const urls=moduleUrls(version),[appMod,authMod,firestoreMod]=await Promise.all([import(urls.app),import(urls.auth),import(urls.firestore)]);
    const app=appMod.getApps().find(item=>item.name===name)||appMod.initializeApp(config,name),auth=authMod.getAuth(app),db=firestoreMod.getFirestore(app);
    const runtime={app,auth,db,appMod,authMod,firestoreMod};runtimes.set(name,runtime);return runtime;
  }
  function clear(name='gym-party'){runtimes.delete(name);}
  window.FIREBASE_SERVICE={hasConfig,configSource,moduleUrls,load,clear};
})();
