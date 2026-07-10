import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const debug=await readFile(new URL('../.github/workflows/build-debug-apk.yml',import.meta.url),'utf8');
const release=await readFile(new URL('../.github/workflows/build-release-apk.yml',import.meta.url),'utf8');
const gradle=await readFile(new URL('../android-native-wrapper/app/build.gradle',import.meta.url),'utf8');
const ignore=await readFile(new URL('../.gitignore',import.meta.url),'utf8');

assert.match(debug,/assembleDebug/);
assert.match(debug,/actions\/upload-artifact@v4/);
assert.doesNotMatch(debug,/gh release/);
assert.doesNotMatch(debug,/contents: write/);
assert.match(release,/assembleRelease/);
assert.match(release,/ANDROID_KEYSTORE_BASE64/);
assert.match(release,/ANDROID_KEYSTORE_PASSWORD/);
assert.match(release,/ANDROID_KEY_ALIAS/);
assert.match(release,/ANDROID_KEY_PASSWORD/);
assert.match(release,/sha256sum/);
assert.match(release,/push:\s*[\s\S]*tags:/);
assert.match(release,/workflow_dispatch:/);
assert.match(release,/gh release create/);
assert.match(gradle,/signingConfigs/);
assert.match(gradle,/releaseSigningConfigured/);
assert.match(ignore,/\*\.jks/);
assert.match(ignore,/\*\.keystore/);

console.log('Release Android separado: debug temporal, firma por Secrets, APK versionado y checksum SHA-256.');
