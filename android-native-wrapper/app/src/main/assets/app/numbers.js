(function(global){
  'use strict';

  const LOCALE='es-PY';

  function parse(value,{integer=false}={}){
    if(typeof value==='number')return Number.isFinite(value)?(integer?Math.trunc(value):value):null;
    let source=String(value??'').trim().replace(/[\s\u00a0']/g,'');
    if(!source)return null;
    if(!/^[+-]?[\d.,]+$/.test(source))return null;
    const sign=source.startsWith('-')?-1:1;
    source=source.replace(/^[+-]/,'');
    if(!source||!/[0-9]/.test(source))return null;
    const comma=source.lastIndexOf(','),dot=source.lastIndexOf('.');
    let normalized=source;
    if(comma>=0&&dot>=0){
      const decimal=comma>dot?',':'.',grouping=decimal===','?'.':',';
      normalized=source.split(grouping).join('');
      const decimalIndex=normalized.lastIndexOf(decimal);
      normalized=`${normalized.slice(0,decimalIndex).split(decimal).join('')}.${normalized.slice(decimalIndex+1)}`;
    }else if(comma>=0||dot>=0){
      const separator=comma>=0?',':'.',parts=source.split(separator);
      if(parts.some(part=>part===''))return null;
      const grouped=parts.length>2&&parts.slice(1).every(part=>part.length===3);
      const singleThousands=parts.length===2&&parts[1].length===3&&parts[0]!==''&&parts[0]!=='0';
      if(grouped||singleThousands)normalized=parts.join('');
      else normalized=`${parts.slice(0,-1).join('')||'0'}.${parts.at(-1)}`;
    }
    if(!/^\d+(?:\.\d+)?$/.test(normalized))return null;
    const result=Number(normalized)*sign;
    if(!Number.isFinite(result))return null;
    return integer?Math.trunc(result):result;
  }

  function parseOr(value,fallback=0,options={}){const result=parse(value,options);return result===null?fallback:result;}
  function read(input,{fallback=0,...options}={}){return parseOr(input?.value,fallback,options);}
  function format(value,options={}){
    const numeric=typeof value==='number'?value:parse(value);
    if(numeric===null||!Number.isFinite(numeric))return'';
    return new Intl.NumberFormat(LOCALE,{maximumFractionDigits:3,...options}).format(numeric);
  }
  function neutral(value){const numeric=parse(value);return numeric===null?'':String(numeric);}

  global.APP_NUMBERS=Object.freeze({LOCALE,parse,parseOr,read,format,neutral});
})(window);
