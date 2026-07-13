(function(global){
  'use strict';

  const VERSION=1;
  const definitions=Object.freeze([
    {id:'warmup',label:'Calentamiento',shortLabel:'Calentamiento',mainVolume:false,records:false,progression:false},
    {id:'working',label:'Serie efectiva',shortLabel:'Efectiva',mainVolume:true,records:true,progression:true},
    {id:'backoff',label:'Backoff',shortLabel:'Backoff',mainVolume:false,records:true,progression:false},
    {id:'drop',label:'Drop set',shortLabel:'Drop',mainVolume:false,records:false,progression:false},
    {id:'technique',label:'Tecnica',shortLabel:'Tecnica',mainVolume:false,records:false,progression:false},
    {id:'failure',label:'Al fallo',shortLabel:'Fallo',mainVolume:false,records:false,progression:false},
    {id:'assisted',label:'Asistida',shortLabel:'Asistida',mainVolume:false,records:false,progression:false}
  ]);
  const byId=new Map(definitions.map(item=>[item.id,item]));
  const aliases=new Map([
    ['warm-up','warmup'],['calentamiento','warmup'],['aproximacion','warmup'],
    ['effective','working'],['work','working'],['efectiva','working'],['normal','working'],
    ['back-off','backoff'],['descarga','backoff'],['drop-set','drop'],['dropset','drop'],
    ['tecnica','technique'],['fallo','failure'],['assistance','assisted'],['asistida','assisted']
  ]);

  function type(value){
    const raw=String(value||'working').trim().toLowerCase();
    return byId.has(raw)?raw:(aliases.get(raw)||'working');
  }
  function definition(value){return byId.get(type(value))||byId.get('working');}
  function normalize(set={}){
    const setType=type(set.setType);
    return {
      ...set,
      setType,
      completed:set.completed!==false,
      note:String(set.note??set.notes??''),
      excludeFromRecords:!!set.excludeFromRecords,
      excludeFromProgression:!!set.excludeFromProgression
    };
  }
  function isCompleted(set){return normalize(set).completed;}
  function countsMainVolume(set){const row=normalize(set);return row.completed&&definition(row.setType).mainVolume;}
  function countsForRecords(set){const row=normalize(set);return row.completed&&!row.excludeFromRecords&&definition(row.setType).records;}
  function countsForProgression(set){const row=normalize(set);return row.completed&&!row.excludeFromProgression&&definition(row.setType).progression;}
  function label(value,{short=false}={}){const item=definition(value);return short?item.shortLabel:item.label;}
  function options(){return definitions.map(item=>({...item}));}
  function counts(sets=[]){
    const result={total:0,completed:0,working:0,warmup:0,supplementary:0};
    for(const raw of Array.isArray(sets)?sets:[]){
      const set=normalize(raw);result.total+=1;if(!set.completed)continue;result.completed+=1;
      if(set.setType==='working')result.working+=1;
      else if(set.setType==='warmup')result.warmup+=1;
      else result.supplementary+=1;
    }
    return result;
  }

  global.WORKOUT_SET_MODEL=Object.freeze({VERSION,definitions:options,type,definition,label,normalize,isCompleted,countsMainVolume,countsForRecords,countsForProgression,counts});
})(window);
