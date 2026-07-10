import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const main=await readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/MainActivity.java',import.meta.url),'utf8');
const gradle=await readFile(new URL('../android-native-wrapper/app/build.gradle',import.meta.url),'utf8');
const manifest=await readFile(new URL('../android-native-wrapper/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');

assert.match(gradle,/androidx\.webkit:webkit:1\.15\.0/);
assert.match(main,/WebViewAssetLoader/);
assert.match(main,/"https:\/\/" \+ APP_HOST \+ "\/assets\/index\.html"/);
assert.match(main,/setAllowFileAccess\(false\)/);
assert.match(main,/setAllowContentAccess\(false\)/);
assert.match(main,/setAllowUniversalAccessFromFileURLs\(false\)/);
assert.match(main,/MIXED_CONTENT_NEVER_ALLOW/);
assert.doesNotMatch(main,/loadUrl\("file:/);
assert.match(main,/handleNavigation/);
assert.match(main,/Intent\.ACTION_VIEW/);
assert.match(main,/www\.gstatic\.com/);
assert.match(main,/\.googleapis\.com/);
assert.match(main,/\.firebaseapp\.com/);
assert.match(main,/api\.nal\.usda\.gov/);
assert.match(main,/AndroidBridge/);
assert.match(main,/AndroidUsageBridge/);
assert.match(main,/AndroidSpeechBridge/);
assert.match(main,/ACTION_OPEN_TODAY_WORKOUT/);
assert.match(manifest,/android\.webkit\.WebView\.EnableSafeBrowsing/);
assert.match(manifest,/android:usesCleartextTraffic="false"/);
assert.match(manifest,/android\.permission\.INTERNET/);

console.log('WebView Android endurecido: appassets HTTPS, archivos bloqueados, Safe Browsing y enlaces externos aislados.');
