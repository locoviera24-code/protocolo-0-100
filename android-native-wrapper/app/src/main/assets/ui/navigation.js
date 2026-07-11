(function(){
  'use strict';

  const CONTEXT_SELECTOR='.gymSectionNav,.partySectionNav,.nutritionNav,.progressSectionNav';
  const ACTION_SELECTOR='.dailySaveBar,.quickStickyActions,.partyStickySave';
  const EDITABLE_SELECTOR='input,select,textarea,[contenteditable="true"]';
  let frame=0;
  let started=false;
  let resizeObserver=null;
  let lastScrollY=0;
  let keyboardGraceUntil=0;

  function visible(element){
    if(!element||element.hidden||element.closest('.hidden'))return false;
    const style=getComputedStyle(element);
    if(style.display==='none'||style.visibility==='hidden')return false;
    const rect=element.getBoundingClientRect();
    return rect.width>0&&rect.height>0;
  }
  function height(element){return visible(element)?Math.round(element.getBoundingClientRect().height):0;}
  function setLength(name,value){document.documentElement.style.setProperty(name,`${Math.max(0,Number(value)||0)}px`);}
  function editableFocused(){return !!document.activeElement?.matches?.(EDITABLE_SELECTOR);}
  function keyboardInset(){
    const viewport=window.visualViewport;
    if(!viewport)return 0;
    return Math.max(0,Math.round(window.innerHeight-(viewport.height+viewport.offsetTop)));
  }
  function keyboardOpen(){
    const viewportReduced=keyboardInset()>80;
    const mobile=matchMedia('(max-width: 1023px)').matches;
    return (editableFocused()&&(viewportReduced||mobile))||(mobile&&Date.now()<keyboardGraceUntil);
  }
  function activateSingle(elements,className){
    const visibleElements=elements.filter(visible);
    elements.forEach(element=>element.classList.toggle(className,element===visibleElements[0]));
    return visibleElements[0]||null;
  }
  function observeActive(elements){
    if(!resizeObserver)return;
    resizeObserver.disconnect();
    elements.filter(Boolean).forEach(element=>resizeObserver.observe(element));
  }
  function sync(){
    frame=0;
    const topbar=document.querySelector('.moduleTopbar');
    const bottomNav=document.querySelector('.bottomNav');
    const contexts=[...document.querySelectorAll(CONTEXT_SELECTOR)];
    const actions=[...document.querySelectorAll(ACTION_SELECTOR)];
    actions.forEach(element=>element.classList.add('layoutStickyAction'));
    contexts.forEach(element=>element.classList.add('layoutContextNav'));
    const context=activateSingle(contexts,'layoutActive');
    const action=activateSingle(actions,'layoutActive');
    const banner=activateSingle([...document.querySelectorAll('.updateBanner,.appBanner')],'layoutActive');
    const isKeyboardOpen=keyboardOpen();
    document.body.classList.toggle('keyboardOpen',isKeyboardOpen);
    const mobile=matchMedia('(max-width: 1023px)').matches;
    const bottomHeight=mobile&&!isKeyboardOpen?height(bottomNav):0;
    const inset=isKeyboardOpen?keyboardInset():0;
    setLength('--layout-topbar-height',height(topbar));
    setLength('--layout-context-height',height(context));
    setLength('--layout-bottom-nav-height',bottomHeight);
    setLength('--layout-action-height',height(action));
    setLength('--layout-banner-height',height(banner));
    setLength('--layout-keyboard-inset',inset);
    document.body.dataset.layoutContext=context?.classList.contains('partySectionNav')?'party':context?.classList.contains('gymSectionNav')?'gym':context?.classList.contains('nutritionNav')?'nutrition':context?.classList.contains('progressSectionNav')?'progress':'none';
    document.body.dataset.layoutAction=action?.classList.contains('partyStickySave')?'party':action?.classList.contains('quickStickyActions')?'gym':action?.classList.contains('dailySaveBar')?'daily':'none';
    const compact=mobile&&window.scrollY>56&&!isKeyboardOpen&&window.scrollY>=lastScrollY;
    document.body.classList.toggle('topbarCondensed',compact);
    lastScrollY=window.scrollY;
    observeActive([topbar,bottomNav,context,action,banner]);
  }
  function schedule(){
    if(frame)return;
    frame=requestAnimationFrame(sync);
  }
  function start(){
    if(started)return;
    started=true;
    if('ResizeObserver'in window)resizeObserver=new ResizeObserver(schedule);
    ['resize','orientationchange','online','offline','app-route-change','layout-refresh'].forEach(type=>window.addEventListener(type,schedule,{passive:true}));
    window.addEventListener('scroll',schedule,{passive:true});
    document.addEventListener('focusin',schedule);
    document.addEventListener('focusout',event=>{
      if(event.target?.matches?.(EDITABLE_SELECTOR))keyboardGraceUntil=Date.now()+450;
      setTimeout(schedule,80);
      setTimeout(schedule,480);
    });
    if(window.visualViewport){
      window.visualViewport.addEventListener('resize',schedule,{passive:true});
      window.visualViewport.addEventListener('scroll',schedule,{passive:true});
    }
    schedule();
  }

  window.LAYOUT_COORDINATOR={start,sync,schedule,visible};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
