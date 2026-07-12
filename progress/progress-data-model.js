(function(global){
  'use strict';
  function number(value){return Number.isFinite(Number(value))?Number(value):0;}
  function date(value){const [year,month,day]=String(value||'').split('-').map(Number);return new Date(year,Math.max(0,(month||1)-1),day||1);}
  function format(value){return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;}
  function shift(value,days){const result=date(value);result.setDate(result.getDate()+days);return format(result);}
  function monday(value){const result=date(value),weekday=(result.getDay()+6)%7;result.setDate(result.getDate()-weekday);return format(result);}
  function inRange(value,start,end){return String(value||'')>=start&&String(value||'')<=end;}
  function windows(dates,{days=30,today=format(new Date())}={}){
    const clean=(dates||[]).filter(Boolean).map(String).sort(),all=days==='all'||number(days)>10000;
    const currentStart=all?(clean[0]||today):shift(today,-Math.max(0,number(days)-1));
    const currentEnd=today;
    const previousEnd=all?'':shift(currentStart,-1);
    const previousStart=all?'':shift(previousEnd,-Math.max(0,number(days)-1));
    return{all,currentStart,currentEnd,previousStart,previousEnd,days:all?Math.max(1,Math.round((date(today)-date(currentStart))/86400000)+1):number(days)};
  }
  function percentChange(current,previous){const before=number(previous);return before?Math.round((((number(current)-before)/before)*100)*10)/10:null;}
  global.PROGRESS_DATA_MODEL=Object.freeze({number,date,format,shift,monday,inRange,windows,percentChange});
})(window);
