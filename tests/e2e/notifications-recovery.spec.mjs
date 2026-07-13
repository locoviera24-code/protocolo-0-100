import {test,expect} from '@playwright/test';

async function clean(page,url='/index.html'){
  await page.goto('/index.html');
  await page.evaluate(async()=>{localStorage.clear();await window.APP_DATA.clearAllData();});
  await page.goto(url);
}

test('Snackbar mantiene un solo mensaje y ejecuta Deshacer',async({page})=>{
  await clean(page);
  await page.evaluate(()=>{window.flash('Primer mensaje');window.flash('Segundo mensaje');});
  await expect(page.locator('#appSnackbar')).toBeVisible();
  await expect(page.locator('#appSnackbar')).toContainText('Segundo mensaje');
  await expect(page.locator('.appSnackbar')).toHaveCount(1);
  await page.evaluate(()=>window.APP_NOTIFICATIONS.showSnackbar('Cambio aplicado',{duration:0,actionLabel:'Deshacer',onAction:()=>localStorage.setItem('undo-called','1')}));
  await page.locator('#appSnackbarAction').click();
  expect(await page.evaluate(()=>localStorage.getItem('undo-called'))).toBe('1');
  await expect(page.locator('#appSnackbar')).toBeHidden();
});

test('Validacion nutricional queda asociada al campo',async({page})=>{
  await clean(page,'/index.html?module=nutrition&view=meals');
  await page.getByRole('button',{name:'Agregar',exact:true}).click();
  await page.locator('#customFoodDetails > summary').click();
  await page.locator('#useCustomFoodBtn').click();
  const name=page.locator('#customFoodName');
  await expect(name).toHaveAttribute('aria-invalid','true');
  await expect(name).toBeFocused();
  const errorId=await name.getAttribute('aria-errormessage');
  await expect(page.locator(`#${errorId}`)).toContainText('nombre');
  await name.fill('Alimento valido');
  await expect(name).not.toHaveAttribute('aria-invalid','true');
});

test('Banners priorizan offline y recuperan la actualizacion pendiente',async({page})=>{
  await clean(page);
  await page.evaluate(()=>{window.APP_NOTIFICATIONS.showBanner({id:'update-test',title:'Actualizacion',message:'Lista para instalar',priority:50});window.APP_NOTIFICATIONS.setOffline(true);});
  await expect(page.locator('#appBanner')).toContainText('Sin conexion');
  await expect(page.locator('.appBanner')).toHaveCount(1);
  await page.evaluate(()=>window.APP_NOTIFICATIONS.setOffline(false));
  await expect(page.locator('#appBanner')).toContainText('Actualizacion');
  await page.evaluate(()=>window.APP_NOTIFICATIONS.hideBanner('update-test'));
  await expect(page.locator('#appBanner')).toBeHidden();
});

test('Confirmacion interna cancela y confirma sin dialogo nativo',async({page})=>{
  await clean(page,'/index.html?module=more&view=data');
  await page.evaluate(()=>localStorage.setItem('protocolo_0_100_tracker_v1','[{"date":"2026-07-12"}]'));
  const trigger=page.locator('[data-reset-scope="protocol"]');
  await trigger.click();
  await expect(page.locator('#appConfirmationBackdrop')).toBeVisible();
  await page.locator('#appConfirmationCancel').click();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(()=>localStorage.getItem('protocolo_0_100_tracker_v1'))).not.toBeNull();
  await trigger.click();
  await page.locator('#appConfirmationConfirm').click();
  await expect(page.locator('#appSnackbar')).toContainText('eliminados');
  expect(await page.evaluate(()=>localStorage.getItem('protocolo_0_100_tracker_v1'))).toBeNull();
});

test('Banner, snackbar y navegacion no se superponen en movil',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await clean(page);
  await page.evaluate(()=>{window.APP_NOTIFICATIONS.showBanner({id:'layout',title:'Estado offline',message:'Pendiente',priority:10});window.APP_NOTIFICATIONS.showSnackbar('Guardado localmente',{duration:0});});
  await expect.poll(()=>page.evaluate(()=>{const snackbar=document.getElementById('appSnackbar').getBoundingClientRect(),banner=document.getElementById('appBanner').getBoundingClientRect(),nav=document.querySelector('.bottomNav').getBoundingClientRect();return{snackbarBanner:snackbar.bottom<=banner.top+1,bannerNav:banner.bottom<=nav.top+1,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};})).toEqual({snackbarBanner:true,bannerNav:true,overflow:0});
});

test('Error boundary oculta credenciales y recupera sin borrar registros',async({page})=>{
  await clean(page);
  await page.evaluate(()=>{localStorage.setItem('protocolo_0_100_nutrition_entries_v1','[{"id":"food"}]');window.APP_ERROR_BOUNDARY.record(new Error('apiKey=SUPERSECRET correo persona@example.com'),{area:'test'});window.APP_ERROR_BOUNDARY.record(new Error('Fallo de interfaz'),{area:'render',fatal:true});});
  const logs=await page.evaluate(()=>window.APP_ERROR_BOUNDARY.logs());
  expect(JSON.stringify(logs)).not.toContain('SUPERSECRET');expect(JSON.stringify(logs)).not.toContain('persona@example.com');
  await expect(page.locator('#appRecoveryBackdrop')).toBeVisible();
  await page.locator('#appRecoveryRestart').click();
  await expect(page.locator('#appRecoveryBackdrop')).toBeHidden();
  expect(await page.evaluate(()=>localStorage.getItem('protocolo_0_100_nutrition_entries_v1'))).not.toBeNull();
});

test('Formulario interno valida campos sin dialogos nativos',async({page})=>{
  await page.goto('/index.html');
  await page.evaluate(()=>{window.__formDialogResult='pending';window.APP_FORM_DIALOG.ask({title:'Editar prueba',fieldList:[{name:'name',label:'Nombre',required:true}]}).then(value=>{window.__formDialogResult=value;});});
  const input=page.locator('#appFormField-name');
  await expect(input).toBeFocused();
  await page.locator('#appFormDialogSubmit').click();
  await expect(input).toHaveAttribute('aria-invalid','true');
  await input.fill('Registro seguro');
  await page.locator('#appFormDialogSubmit').click();
  await expect(page.locator('#appFormDialogBackdrop')).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>window.__formDialogResult?.name)).toBe('Registro seguro');
});
