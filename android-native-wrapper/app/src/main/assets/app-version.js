(function(root){
  'use strict';
  const info={version:'2.7.0',versionCode:42,build:98,updatedAt:'2026-08-30'};
  info.cacheLabel=`${info.version}+${info.build}`;
  info.cacheName=`protocolo-0-100-pwa-${info.version}-b${info.build}`;
  info.apkName=`protocolo-0-100-v${info.version}-release.apk`;
  root.APP_VERSION_INFO=Object.freeze(info);
})(globalThis);
