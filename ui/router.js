(function(){
  'use strict';

  const moduleAliases={
    protocolo:'home',
    home:'home',
    gym:'gym',
    'gym-party':'gym',
    nutricion:'nutrition',
    nutrition:'nutrition',
    progreso:'progress',
    progress:'progress',
    mas:'more',
    more:'more'
  };
  const defaultViews={
    home:'register',
    gym:'train',
    nutrition:'meals',
    progress:'overview',
    more:'root'
  };
  const allowedViews={
    home:new Set(['register','overview']),
    gym:new Set(['train','routine','group','progress']),
    nutrition:new Set(['meals','coverage','targets','history']),
    progress:new Set(['overview','habits','gym','nutrition','history','achievements']),
    more:new Set(['root','phone','plan','help','settings','data','privacy','about','experimental'])
  };
  let currentRoute=null;
  let routeHandler=null;
  let started=false;
  let routeIndex=0;

  function normalize(input={}){
    const rawModule=String(input.module||'home').toLowerCase();
    const legacyParty=rawModule==='gym-party';
    const module=moduleAliases[rawModule]||'home';
    const requested=legacyParty?'group':String(input.view||defaultViews[module]||'root').toLowerCase();
    const view=allowedViews[module]?.has(requested)?requested:defaultViews[module];
    return {module,view};
  }

  function fromLocation(){
    const params=new URLSearchParams(location.search);
    return {
      ...normalize({module:params.get('module')||'',view:params.get('view')||''}),
      quickLog:params.get('quickLog')==='1',
      inviteCode:params.get('gymPartyCode')||''
    };
  }

  function urlFor(route,{consume=[]}={}){
    const normalized=normalize(route);
    const url=new URL(location.href);
    consume.forEach(key=>url.searchParams.delete(key));
    url.searchParams.set('module',normalized.module);
    url.searchParams.set('view',normalized.view);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function notify(route,meta){
    currentRoute={...route};
    routeHandler?.({...route},{...meta});
  }

  function navigate(input,options={}){
    const route=normalize(typeof input==='string'?{module:input,view:options.view}:input);
    const same=currentRoute&&currentRoute.module===route.module&&currentRoute.view===route.view;
    const replace=!!options.replace||same;
    const nextIndex=replace?routeIndex:routeIndex+1;
    const state={...(history.state||{}),appRoute:true,route,index:nextIndex};
    history[replace?'replaceState':'pushState'](state,'',urlFor(route,{consume:options.consume||[]}));
    routeIndex=nextIndex;
    notify(route,{source:replace?'replace':'push',focus:options.focus!==false,announce:options.announce!==false});
    return route;
  }

  function parentFor(route=currentRoute){
    if(!route)return {module:'home',view:'register'};
    if(route.module==='more'&&route.view!=='root')return {module:'more',view:'root'};
    if(route.module==='gym'&&route.view!=='train')return {module:'gym',view:'train'};
    if(route.module==='home'&&route.view!=='register')return {module:'home',view:'register'};
    if(route.module==='nutrition'&&route.view!=='meals')return {module:'nutrition',view:'meals'};
    if(route.module==='progress'&&route.view!=='overview')return {module:'progress',view:'overview'};
    return {module:'home',view:'register'};
  }

  function back(){
    const state=history.state;
    if(state?.appRoute&&Number(state.index)>0){
      history.back();
      return;
    }
    navigate(parentFor(),{replace:true});
  }

  function consume(name){
    if(!name)return;
    const url=new URL(location.href);
    if(!url.searchParams.has(name))return;
    url.searchParams.delete(name);
    history.replaceState(history.state,'',`${url.pathname}${url.search}${url.hash}`);
  }

  function start(handler,fallback={}){
    if(started)return currentRoute;
    routeHandler=handler;
    started=true;
    const params=new URLSearchParams(location.search);
    const hasRoute=params.has('module')||params.has('view');
    const parsed=fromLocation();
    const route=normalize(hasRoute?parsed:fallback);
    routeIndex=Number(history.state?.appRoute?history.state.index:0)||0;
    history.replaceState({...(history.state||{}),appRoute:true,route,index:routeIndex},'',urlFor(route));
    window.addEventListener('popstate',event=>{
      const next=normalize(event.state?.route||fromLocation());
      routeIndex=Number(event.state?.index)||0;
      notify(next,{source:'popstate',focus:true,announce:true});
    });
    notify({...route,quickLog:parsed.quickLog,inviteCode:parsed.inviteCode},{source:'start',initial:true,focus:false,announce:false});
    return route;
  }

  window.APP_ROUTER={
    normalize,
    fromLocation,
    navigate,
    back,
    parentFor,
    consume,
    start,
    current:()=>currentRoute?{...currentRoute}:null,
    isStarted:()=>started,
    defaults:{...defaultViews}
  };
})();

