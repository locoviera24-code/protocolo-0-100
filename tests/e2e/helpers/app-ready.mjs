const NAVIGATION_REPLACED=/execution context was destroyed|most likely because of a navigation|cannot find context with specified id/i;

export async function waitForAppReady(page,{features=[],timeout=15000}={}){
  const deadline=Date.now()+timeout;
  let lastNavigationError=null;
  while(Date.now()<deadline){
    try{
      await page.waitForLoadState('domcontentloaded');
      await page.waitForFunction(names=>Boolean(window.APP_DATA)&&names.every(name=>Boolean(window[name])),features,{timeout:Math.max(1,deadline-Date.now())});
      await page.evaluate(async names=>{
        await window.APP_DATA.ready();
        for(const name of names)await window[name].ready();
      },features);
      return;
    }catch(error){
      if(!NAVIGATION_REPLACED.test(String(error?.message||error)))throw error;
      lastNavigationError=error;
      await page.waitForTimeout(50);
    }
  }
  throw lastNavigationError||new Error('La app no termino de inicializar dentro del tiempo esperado.');
}
