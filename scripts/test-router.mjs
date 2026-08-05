import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../ui/router.js',import.meta.url),'utf8');
const listeners={};
const location={
  href:'https://app.test/index.html?module=gym-party',
  pathname:'/index.html',
  search:'?module=gym-party',
  hash:''
};
let state=null;
let backCalls=0;
function applyUrl(value){
  const url=new URL(value,location.href);
  location.href=url.href;
  location.pathname=url.pathname;
  location.search=url.search;
  location.hash=url.hash;
}
const history={
  get state(){return state;},
  replaceState(next,_title,url){state=next;applyUrl(url);},
  pushState(next,_title,url){state=next;applyUrl(url);},
  back(){backCalls+=1;}
};
const window={
  addEventListener(type,handler){listeners[type]=handler;},
  dispatchEvent(){}
};
const context=vm.createContext({window,location,history,URL,URLSearchParams,Set,console});
vm.runInContext(source,context,{filename:'ui/router.js'});
const router=window.APP_ROUTER;
const seen=[];
router.start((route,meta)=>seen.push({route,meta}),{module:'home',view:'register'});
assert.deepEqual({...seen[0].route},{module:'gym',view:'group',quickLog:false,inviteCode:''});
assert.equal(location.search,'?module=gym&view=group');
router.navigate({module:'more',view:'settings'});
assert.equal(location.search,'?module=more&view=settings');
assert.deepEqual({...router.current()},{module:'more',view:'settings'});
assert.deepEqual({...router.parentFor()},{module:'more',view:'root'});
router.back();
assert.equal(backCalls,1);
state={appRoute:true,index:1,route:{module:'nutrition',view:'meals'}};
applyUrl('/index.html?module=nutrition&view=meals');
listeners.popstate({state});
assert.deepEqual({...router.current()},{module:'nutrition',view:'meals'});
assert.deepEqual({...router.normalize({module:'nutricion',view:'invalid'})},{module:'nutrition',view:'meals'});
assert.deepEqual({...router.normalize({module:'more',view:'experimental'})},{module:'more',view:'experimental'});
console.log('Router correcto: aliases legacy, URL canonica, historial, Atrás y popstate.');

