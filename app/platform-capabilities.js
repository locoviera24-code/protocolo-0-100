(function(global){
  'use strict';

  const STATE_LABELS=Object.freeze({
    available:'Disponible',
    'requires-permission':'Requiere permiso',
    'apk-only':'Solo APK',
    'not-compatible':'No compatible',
    unknown:'No se puede comprobar'
  });
  const COMPARISON_ROWS=Object.freeze([
    Object.freeze({key:'dailyProtocol',label:'Registro diario',webState:'available',androidState:'available'}),
    Object.freeze({key:'gym',label:'Gym',webState:'available',androidState:'available'}),
    Object.freeze({key:'nutrition',label:'Nutrición',webState:'available',androidState:'available'}),
    Object.freeze({key:'progress',label:'Progreso',webState:'available',androidState:'available'}),
    Object.freeze({key:'offline',label:'Offline',webState:'available',androidState:'available'}),
    Object.freeze({key:'shortcuts',label:'Shortcuts',webState:'available',androidState:'available'}),
    Object.freeze({key:'automaticPhoneUsage',label:'Uso automático del teléfono',webState:'apk-only',androidState:'requires-permission'}),
    Object.freeze({key:'voice',label:'Reconocimiento de voz',webState:'requires-permission',androidState:'requires-permission'}),
    Object.freeze({key:'workoutWidget',label:'Widget',webState:'apk-only',androidState:'available'}),
    Object.freeze({key:'workoutNotification',label:'Notificación de entrenamiento',webState:'apk-only',androidState:'requires-permission',androidLabel:'Disponible · puede requerir permiso'}),
    Object.freeze({key:'lockScreenControls',label:'Pantalla bloqueada',webState:'apk-only',androidState:'available',androidLabel:'Disponible mediante notificación · depende del sistema'})
  ]);

  function stateLabel(state){
    return STATE_LABELS[state]||STATE_LABELS.unknown;
  }
  function comparisonRows(){
    return COMPARISON_ROWS.map(row=>({
      ...row,
      webLabel:row.webLabel||stateLabel(row.webState),
      androidLabel:row.androidLabel||stateLabel(row.androidState)
    }));
  }
  function capabilityState(key,mode){
    const definition=COMPARISON_ROWS.find(row=>row.key===key);
    if(!definition)return'unknown';
    return mode==='android-apk'?definition.androidState:definition.webState;
  }

  function hasTrustedAndroidBridge(){
    return typeof global.AndroidBridge?.getAppInfo==='function';
  }
  function runtimeMode(){
    if(hasTrustedAndroidBridge())return'android-apk';
    if(global.matchMedia?.('(display-mode: standalone)').matches||global.navigator?.standalone===true)return'standalone-pwa';
    return'browser';
  }

  function detect({installPromptAvailable=false}={}){
    const mode=runtimeMode();
    return {
      runtimeMode:mode,
      installPromptAvailable:!!installPromptAvailable,
      installationStatus:mode==='standalone-pwa'||mode==='android-apk'?'running-installed':installPromptAvailable?'install-available':'unknown',
      offline:'serviceWorker' in (global.navigator||{}),
      shortcuts:mode==='standalone-pwa'||mode==='browser',
      automaticPhoneUsage:mode==='android-apk'?'requires-permission':'apk-only',
      voice:'SpeechRecognition' in global||'webkitSpeechRecognition' in global?'requires-permission':'not-compatible',
      workoutWidget:capabilityState('workoutWidget',mode),
      workoutNotification:capabilityState('workoutNotification',mode),
      lockScreenControls:capabilityState('lockScreenControls',mode)
    };
  }

  global.APP_PLATFORM_CAPABILITIES=Object.freeze({hasTrustedAndroidBridge,runtimeMode,detect,stateLabel,comparisonRows});
})(window);
