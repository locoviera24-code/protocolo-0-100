(function(global){
  'use strict';
  let sequence=0;
  function clear(input){if(!input)return;const id=input.dataset.validationId;if(id)document.getElementById(id)?.remove();input.removeAttribute('aria-invalid');input.removeAttribute('aria-errormessage');delete input.dataset.validationId;}
  function show(input,message,{focus=true}={}){if(!input)return false;clear(input);const id=`field-error-${++sequence}`,error=document.createElement('span');error.id=id;error.className='inlineValidation';error.setAttribute('role','alert');error.textContent=String(message||'Revisa este campo.');input.insertAdjacentElement('afterend',error);input.dataset.validationId=id;input.setAttribute('aria-invalid','true');input.setAttribute('aria-errormessage',id);if(focus)input.focus();return false;}
  function require(input,message,validate=value=>String(value||'').trim()!==''){if(validate(input?.value))return true;return show(input,message);}
  document.addEventListener('input',event=>{if(event.target?.dataset?.validationId)clear(event.target);});
  global.APP_INLINE_VALIDATION=Object.freeze({show,clear,require});
})(window);
