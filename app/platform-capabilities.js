(function(global){
  'use strict';

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
      workoutWidget:mode==='android-apk'?'available':'apk-only',
      workoutNotification:'pending',
      lockScreenControls:'pending'
    };
  }

  global.APP_PLATFORM_CAPABILITIES=Object.freeze({hasTrustedAndroidBridge,runtimeMode,detect});
})(window);
