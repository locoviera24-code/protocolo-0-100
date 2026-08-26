import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createReleaseIdentity,validateReleaseRef} from './release-identity.mjs';

const debug=await readFile(new URL('../.github/workflows/build-debug-apk.yml',import.meta.url),'utf8');
const release=await readFile(new URL('../.github/workflows/build-release-apk.yml',import.meta.url),'utf8');
const gate=await readFile(new URL('../.github/workflows/quality-gate.yml',import.meta.url),'utf8');
const gradle=await readFile(new URL('../android-native-wrapper/app/build.gradle',import.meta.url),'utf8');
const properties=await readFile(new URL('../android-native-wrapper/gradle.properties',import.meta.url),'utf8');
const ignore=await readFile(new URL('../.gitignore',import.meta.url),'utf8');
const version=JSON.parse(await readFile(new URL('../app-version.json',import.meta.url),'utf8'));
const widget=await readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetUpdateService.java',import.meta.url),'utf8');

assert.match(debug,/uses: \.\/\.github\/workflows\/quality-gate\.yml/);
assert.match(gate,/assembleDebug/);
assert.match(gate,/actions\/upload-artifact@v7/);
assert.doesNotMatch(debug,/gh release/);
assert.doesNotMatch(debug,/contents: write/);
assert.match(release,/assembleRelease/);
assert.match(release,/android-actions\/setup-android@v4/);
assert.match(release,/gradle\/actions\/setup-gradle@v6/);
assert.match(release,/ANDROID_KEYSTORE_BASE64/);
assert.match(release,/ANDROID_KEYSTORE_PASSWORD/);
assert.match(release,/ANDROID_KEY_ALIAS/);
assert.match(release,/ANDROID_KEY_PASSWORD/);
assert.match(release,/sha256sum/);
assert.match(release,/workflow_dispatch:/);
assert.doesNotMatch(release,/\n  push:/);
assert.match(release,/node \.\/scripts\/release-identity\.mjs/);
assert.match(release,/gh release create/);
assert.match(release,/gh release create[^\n]+--target "\$GITHUB_SHA"/);
assert.doesNotMatch(release,/--clobber/);
assert.doesNotMatch(release,/\bgh release upload\b/);
assert.doesNotMatch(release,/\.github\/stable-release\.json/);
assert.doesNotMatch(release,/actions\/deploy-pages|pages\/deploy|deploy-pages\.yml/);

const releaseExistsCheck=release.indexOf('if gh release view "$TAG"');
const tagExistsCheck=release.indexOf('if gh api "repos/$GITHUB_REPOSITORY/git/ref/tags/$TAG"');
const releaseCreate=release.indexOf('gh release create "$TAG"');
assert.ok(releaseExistsCheck>=0&&releaseExistsCheck<releaseCreate,'La release existente debe rechazarse antes de crear');
assert.ok(tagExistsCheck>=0&&tagExistsCheck<releaseCreate,'El tag existente debe rechazarse antes de crear');
assert.match(release,/if gh release view "\$TAG"[\s\S]*?La release \$TAG ya existe[\s\S]*?exit 1[\s\S]*?fi/);
assert.match(release,/if gh api "repos\/\$GITHUB_REPOSITORY\/git\/ref\/tags\/\$TAG"[\s\S]*?El tag \$TAG ya existe[\s\S]*?exit 1[\s\S]*?fi/);
assert.match(gradle,/signingConfigs/);
assert.match(gradle,/releaseSigningConfigured/);
assert.match(gradle,/groovy\.json\.JsonSlurper/);
assert.match(gradle,/versionCode appVersion\.versionCode/);
assert.match(gradle,/versionName appVersion\.version/);
assert.doesNotMatch(gradle,/versionName\s+['"]\d/);
assert.match(version.version,/^\d+\.\d+\.\d+$/);
assert.match(widget,/canonicalWeight\(state, displayWeight\)/);
assert.match(widget,/2\.2046226218/);
assert.match(widget,/muscleClassificationSnapshot/);
assert.match(widget,/classificationStatus", "official"/);
assert.match(widget,/taxonomyVersion", 3/);
assert.match(properties,/android\.useAndroidX=true/);
assert.match(ignore,/\*\.jks/);
assert.match(ignore,/\*\.keystore/);

const stable=createReleaseIdentity(version);
assert.equal(stable.tag,`v${version.version}-build.${version.build}`);
assert.equal(stable.apk,`protocolo-0-100-${stable.tag}-android.${version.versionCode}-release.apk`);
assert.equal(stable.checksum,`${stable.apk}.sha256`);
assert.equal(stable.prerelease,false);
assert.equal(validateReleaseRef('refs/heads/main',stable),true);
assert.throws(()=>validateReleaseRef('refs/heads/feature',stable),/RELEASE_STABLE_REQUIRES_MAIN/);
assert.throws(()=>createReleaseIdentity(version,{requestedTag:`v${version.version}`}),/RELEASE_STABLE_TAG_INVALID/);
assert.throws(()=>createReleaseIdentity(version,{prerelease:true}),/RELEASE_PRERELEASE_TAG_INVALID/);

const candidate={version:'2.7.0',build:96,versionCode:40};
const candidateIdentity=createReleaseIdentity(candidate,{requestedTag:''});
assert.deepEqual({
  tag:candidateIdentity.tag,
  apk:candidateIdentity.apk,
  checksum:candidateIdentity.checksum
},{
  tag:'v2.7.0-build.96',
  apk:'protocolo-0-100-v2.7.0-build.96-android.40-release.apk',
  checksum:'protocolo-0-100-v2.7.0-build.96-android.40-release.apk.sha256'
});
assert.throws(()=>createReleaseIdentity({...candidate,version:'2.7'}),/RELEASE_VERSION_INVALID/);
assert.throws(()=>createReleaseIdentity({...candidate,version:'2.7.0-beta.1'}),/RELEASE_VERSION_INVALID/);
assert.throws(()=>createReleaseIdentity({...candidate,build:0}),/RELEASE_BUILD_INVALID/);
assert.throws(()=>createReleaseIdentity({version:candidate.version,versionCode:candidate.versionCode}),/RELEASE_BUILD_INVALID/);
assert.throws(()=>createReleaseIdentity({...candidate,versionCode:0}),/RELEASE_VERSION_CODE_INVALID/);
assert.throws(()=>createReleaseIdentity({version:candidate.version,build:candidate.build}),/RELEASE_VERSION_CODE_INVALID/);

const betaTag=`${stable.tag}-rc.1`;
const beta=createReleaseIdentity(version,{requestedTag:betaTag,prerelease:true});
assert.equal(beta.tag,betaTag);
assert.equal(beta.prerelease,true);
assert.equal(validateReleaseRef('refs/heads/codex/release-candidate',beta),true);
assert.throws(()=>createReleaseIdentity(version,{requestedTag:`${stable.tag}-bad_suffix!`,prerelease:true}),/RELEASE_PRERELEASE_TAG_INVALID/);

console.log('Release Android separado: firma por Secrets, identidad build-qualified inmutable y checksum SHA-256.');
