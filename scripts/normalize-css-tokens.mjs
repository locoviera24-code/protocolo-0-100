import {readFile,writeFile} from 'node:fs/promises';

const files=process.argv.slice(2);
if(!files.length)throw new Error('Indicá al menos una hoja CSS.');

const textColors=new Set(['#fff','#ffffff','#cdfde3','#d7ffeb','#d8e6fb','#dbffed','#dff6ff','#dffff0','#e9f7ff','#eef7ff','#f3fff9']);
const darkColors=new Set(['#06131e','#07111f','#091726','#092018','#351111','#362b06']);
const raisedColors=new Set(['#14213a','#1c304d','#21304a','#243653']);
const dangerColors=new Set(['#4a2530','#743746','#ff8b8b','#ffb3b3','#ffd3d3','#fdc']);
const warningColors=new Set(['#ffd36e','#ffe8ad','#f2dca9','#f6dea3']);
const successColors=new Set(['#8af0b5','#98f5c2']);
const primaryColors=new Set(['#72d6ff','#8bdfff']);

function colorToken(value){
  const lower=value.toLowerCase();
  if(textColors.has(lower))return 'var(--color-text)';
  if(darkColors.has(lower))return 'var(--color-bg)';
  if(raisedColors.has(lower))return 'var(--color-surface-raised)';
  if(dangerColors.has(lower))return lower==='#4a2530'?'var(--color-danger-soft)':lower==='#743746'?'var(--state-danger-border)':'var(--color-danger)';
  if(warningColors.has(lower))return lower==='#ffd36e'?'var(--color-warning)':'var(--state-warning-text)';
  if(successColors.has(lower))return 'var(--color-success)';
  if(primaryColors.has(lower))return 'var(--color-primary)';
  if(lower==='#0d1626')return 'var(--surface-input)';
  if(lower==='#000')return 'var(--print-text)';
  const match=lower.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if(!match)return value;
  const [,red,green,blue,rawAlpha]=match,alpha=Number(rawAlpha??1),rgb=`${red},${green},${blue}`;
  if(rgb==='255,255,255')return alpha>=.5?'var(--color-text-secondary)':alpha<=.035?'var(--surface-glass-soft)':alpha<=.07?'var(--surface-glass)':'var(--surface-glass-strong)';
  if(rgb==='0,0,0')return alpha>=.2?'var(--surface-ink-strong)':'var(--surface-ink-soft)';
  if(rgb==='114,214,255')return alpha>=.2?'var(--state-info-border)':'var(--state-info-soft)';
  if(['120,223,168','146,255,194','152,245,194'].includes(rgb))return alpha>=.2?'var(--state-success-border)':'var(--color-success-soft)';
  if(rgb==='255,211,110'||rgb==='233,196,106')return alpha>=.2?'var(--state-warning-border)':'var(--color-warning-soft)';
  if(rgb==='255,139,139'||rgb==='239,133,133')return alpha>=.2?'var(--state-danger-border)':'var(--color-danger-soft)';
  if(rgb==='11,18,32'||rgb==='13,21,36'||rgb==='17,26,43'||rgb==='18,27,47')return alpha>=.96?'var(--surface-navigation-strong)':'var(--surface-navigation)';
  if(rgb==='3,8,15')return 'var(--surface-overlay)';
  if(rgb==='2,6,12'||rgb==='8,18,28')return 'var(--surface-scrim)';
  if(rgb==='223,246,255'||rgb==='50,113,160')return 'var(--state-info-border)';
  return 'var(--surface-glass)';
}

function radiusToken(value){
  const clean=value.trim();
  if(clean.startsWith('var('))return clean;
  if(clean==='0')return 'var(--radius-none)';
  if(clean==='50%')return 'var(--radius-round)';
  if(clean==='999px')return 'var(--radius-pill)';
  if(clean==='12px 12px 0 0')return 'var(--radius-sheet-top)';
  const size=Number.parseFloat(clean);
  if(size<=10)return 'var(--radius-control)';
  if(size<=15)return 'var(--radius-card)';
  if(size<=18)return 'var(--radius-panel)';
  return 'var(--radius-modal)';
}

function fontToken(value){
  const clean=value.trim();
  if(clean.startsWith('var('))return clean;
  if(clean==='max(16px, 1em)'||clean==='max(16px,1em)')return 'var(--font-input)';
  const size=clean.endsWith('rem')?Number.parseFloat(clean)*16:Number.parseFloat(clean);
  if(size<=12)return 'var(--font-label)';
  if(size<=14)return 'var(--font-small)';
  if(size<=16)return 'var(--font-body)';
  if(size<=20)return 'var(--font-card)';
  if(size<=26)return 'var(--font-section)';
  return 'var(--font-screen)';
}

for(const file of files){
  let css=await readFile(file,'utf8');
  css=css.replace(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/g,colorToken);
  css=css.replace(/border-radius\s*:\s*([^;}\n]+)/g,(match,value)=>`border-radius: ${radiusToken(value)}`);
  css=css.replace(/font-size\s*:\s*([^;}\n]+)/g,(match,value)=>`font-size: ${fontToken(value)}`);
  css=css.replace(/box-shadow\s*:\s*([^;}\n]+)/g,(match,value)=>{
    const clean=value.trim();
    if(clean==='none'||clean.startsWith('var('))return `box-shadow: ${clean}`;
    return `box-shadow: ${clean.startsWith('0 0 0')?'var(--elevation-focus)':'var(--shadow-subtle)'}`;
  });
  css=css.replace(/filter\s*:\s*drop-shadow\([^;}\n]+\)/g,'filter: none');
  await writeFile(file,css,'utf8');
}
