param(
    [switch]$CheckAndroidAssets
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

function Read-Utf8([string]$relativePath) {
    return Get-Content -LiteralPath (Join-Path $repoRoot $relativePath) -Raw -Encoding UTF8
}

function Assert-True([bool]$condition, [string]$message) {
    if (-not $condition) {
        throw $message
    }
}

$html = Read-Utf8 'index.html'
$nutrition = Read-Utf8 'nutrition-data.js'
$fdc = Read-Utf8 'fdc-client.js'
$workoutStore = Read-Utf8 'workout-store.js'
$workoutPlan = Read-Utf8 'workout-plan.js'
$workoutMetrics = Read-Utf8 'workout-metrics.js'
$workoutRanking = Read-Utf8 'workout-ranking.js'
$workoutUi = Read-Utf8 'workout-ui.js'
$workout = Read-Utf8 'workout-features.js'
$firebaseConfig = Read-Utf8 'firebase-config.js'
$firebaseService = Read-Utf8 'firebase-service.js'
$gymPartySync = Read-Utf8 'gym-party-sync.js'
$gymPartyMetrics = Read-Utf8 'gym-party-metrics.js'
$gymPartyUi = Read-Utf8 'gym-party-ui.js'
$gymParty = Read-Utf8 'gym-party.js'
$advanced = Read-Utf8 'advanced-features.js'
$serviceWorker = Read-Utf8 'sw.js'
$styleTokens = Read-Utf8 'styles/tokens.css'
$styleBase = Read-Utf8 'styles/base.css'
$styleComponents = Read-Utf8 'styles/components.css'
$styleModules = Read-Utf8 'styles/modules.css'
$styleResponsive = Read-Utf8 'styles/responsive.css'
$manifestText = Read-Utf8 'manifest.webmanifest'
$androidBuild = Read-Utf8 'android-native-wrapper/app/build.gradle'
$androidProperties = Read-Utf8 'android-native-wrapper/gradle.properties'
$androidManifest = Read-Utf8 'android-native-wrapper/app/src/main/AndroidManifest.xml'
$mainActivity = Read-Utf8 'android-native-wrapper/app/src/main/java/com/protocolo/cien/MainActivity.java'
$widgetProvider = Read-Utf8 'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetProvider.java'
$widgetUpdater = Read-Utf8 'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetUpdateService.java'
$deployWorkflow = Read-Utf8 '.github/workflows/deploy-pages.yml'
$apkWorkflow = Read-Utf8 '.github/workflows/build-debug-apk.yml'
$validationWorkflow = Read-Utf8 '.github/workflows/validate-app.yml'
$releaseWorkflow = Read-Utf8 '.github/workflows/build-release-apk.yml'
$serviceWorkerTest = Read-Utf8 'scripts/test-service-worker.mjs'
$workoutTest = Read-Utf8 'scripts/test-workout-features.mjs'
$gymPartyTest = Read-Utf8 'scripts/test-gym-party.mjs'
$workoutMetricsTest = Read-Utf8 'scripts/test-workout-metrics.mjs'
$firestoreRules = Read-Utf8 'firebase/firestore.rules'
$firestoreRulesTest = Read-Utf8 'firebase/rules.test.mjs'
$gymPartySyncTest = Read-Utf8 'scripts/test-gym-party-sync.mjs'
$androidSecurityTest = Read-Utf8 'scripts/test-android-webview-security.mjs'
$androidReleaseTest = Read-Utf8 'scripts/test-android-release.mjs'
$accessibilityTest = Read-Utf8 'scripts/test-accessibility.mjs'
$moduleBoundaryTest = Read-Utf8 'scripts/test-module-boundaries.mjs'
$playwrightConfig = Read-Utf8 'playwright.config.mjs'
$playwrightGymTest = Read-Utf8 'tests/e2e/gym-flow.spec.mjs'
$readme = Read-Utf8 'README.md'
$handoff = Read-Utf8 'CODEX_HANDOFF.md'

try {
    $manifest = $manifestText | ConvertFrom-Json
} catch {
    throw "manifest.webmanifest no contiene JSON valido: $($_.Exception.Message)"
}

$staticIds = [regex]::Matches($html, '\bid="([^"$]+)"') | ForEach-Object { $_.Groups[1].Value }
$duplicates = $staticIds | Group-Object | Where-Object Count -gt 1 | Select-Object -ExpandProperty Name
Assert-True ($duplicates.Count -eq 0) "Hay IDs HTML duplicados: $($duplicates -join ', ')"

$requiredFiles = @(
    'nutrition-data.js', 'fdc-client.js', 'workout-store.js', 'workout-plan.js', 'workout-metrics.js', 'workout-ranking.js', 'workout-ui.js', 'workout-features.js', 'advanced-features.js',
    'firebase-config.js', 'firebase-service.js', 'gym-party-sync.js', 'gym-party-metrics.js', 'gym-party-ui.js', 'gym-party.js',
    'scripts/test-android-webview-security.mjs',
    'scripts/test-android-release.mjs',
    'scripts/test-accessibility.mjs',
    'scripts/test-module-boundaries.mjs',
    'scripts/serve-static.mjs', 'playwright.config.mjs', 'tests/e2e/gym-flow.spec.mjs',
    'manifest.webmanifest', 'sw.js',
    'styles/tokens.css', 'styles/base.css', 'styles/components.css', 'styles/modules.css', 'styles/responsive.css',
    'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetProvider.java',
    'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetUpdateService.java',
    'android-native-wrapper/app/src/main/res/xml/workout_widget_info.xml',
    'android-native-wrapper/app/src/main/res/layout/widget_workout_small.xml',
    'android-native-wrapper/app/src/main/res/layout/widget_workout_medium.xml',
    'android-native-wrapper/app/src/main/res/drawable/widget_background.xml',
    'android-native-wrapper/app/src/main/res/drawable/widget_button.xml',
    'android-native-wrapper/app/src/main/res/drawable/widget_button_secondary.xml'
)
foreach ($file in $requiredFiles) {
    Assert-True (Test-Path -LiteralPath (Join-Path $repoRoot $file) -PathType Leaf) "Falta $file"
}

foreach ($script in @('nutrition-data.js', 'fdc-client.js', 'workout-store.js', 'workout-plan.js', 'workout-metrics.js', 'workout-ranking.js', 'workout-ui.js', 'workout-features.js', 'firebase-service.js', 'gym-party-sync.js', 'gym-party-metrics.js', 'gym-party-ui.js', 'gym-party.js', 'advanced-features.js')) {
    Assert-True ($html.Contains("<script src=`"$script`"></script>")) "index.html no carga $script"
    Assert-True ($serviceWorker.Contains("'./$script'")) "sw.js no cachea $script"
}
foreach ($style in @('styles/tokens.css', 'styles/base.css', 'styles/components.css', 'styles/modules.css', 'styles/responsive.css')) {
    Assert-True ($html.Contains("<link rel=`"stylesheet`" href=`"$style`"")) "index.html no carga $style"
    Assert-True ($serviceWorker.Contains("'./$style'")) "sw.js no cachea $style"
    Assert-True ($deployWorkflow.Contains($style.Split('/')[0] + '/**')) "Pages no observa cambios de estilos"
}
foreach ($contract in @('.bottomNav', 'grid-template-columns: repeat(5', 'data-module')) {
    Assert-True (($styleModules + $html).Contains($contract)) "Falta navegación principal: $contract"
}
foreach ($contract in @('safe-bottom', 'keyboardOpen', '@media (min-width: 1024px)', '@media (max-width: 380px)')) {
    Assert-True ($styleResponsive.Contains($contract) -or $styleTokens.Contains($contract)) "Falta contrato responsive: $contract"
}
foreach ($contract in @('--color-bg', '--color-primary', '--space-4', '--radius-control', '--touch-target')) {
    Assert-True ($styleTokens.Contains($contract)) "Falta token visual: $contract"
}
foreach ($contract in @(':focus-visible', 'prefers-reduced-motion', 'overflow-x: hidden', '.icon')) {
    Assert-True ($styleBase.Contains($contract)) "Falta contrato visual base: $contract"
}
foreach ($contract in @('.btn-primary', '.btn-secondary', '.btn-text', '.btn-danger', 'min-height: var(--touch-target)')) {
    Assert-True ($styleComponents.Contains($contract)) "Falta componente visual: $contract"
}
foreach ($order in @(
    @('workout-store.js','workout-features.js'),
    @('workout-plan.js','workout-features.js'),
    @('workout-ui.js','workout-features.js'),
    @('firebase-service.js','gym-party.js'),
    @('gym-party-metrics.js','gym-party.js'),
    @('gym-party-ui.js','gym-party.js')
)) {
    Assert-True ($html.IndexOf("<script src=`"$($order[0])`"></script>") -lt $html.IndexOf("<script src=`"$($order[1])`"></script>")) "$($order[0]) debe cargarse antes de $($order[1])"
}
foreach ($contract in @('WORKOUT_STORE','WORKOUT_PLAN','WORKOUT_UI')) {
    Assert-True ($workout.Contains($contract)) "workout-features.js no integra $contract"
}
foreach ($contract in @('FIREBASE_SERVICE','GYM_PARTY_METRICS','GYM_PARTY_UI')) {
    Assert-True ($gymParty.Contains($contract)) "gym-party.js no integra $contract"
}
foreach ($contract in @('read','write','update','ensure','migrate')) { Assert-True ($workoutStore.Contains($contract)) "Falta API de almacenamiento modular: $contract" }
foreach ($contract in @('sameExercise','dedupe','insert','dayKeyForDate','copyDay')) { Assert-True ($workoutPlan.Contains($contract)) "Falta API de plan modular: $contract" }
foreach ($contract in @('groupedOptions','statCard','announce')) { Assert-True ($workoutUi.Contains($contract)) "Falta API UI de Gym: $contract" }
foreach ($contract in @('hasConfig','configSource','moduleUrls','load')) { Assert-True ($firebaseService.Contains($contract)) "Falta API modular Firebase: $contract" }
foreach ($contract in @('percentChange','aggregateSets','changes')) { Assert-True ($gymPartyMetrics.Contains($contract)) "Falta API de metricas Gym Party: $contract" }
foreach ($contract in @('helpButton','statCard','renderRoot','syncLabel')) { Assert-True ($gymPartyUi.Contains($contract)) "Falta API UI de Gym Party: $contract" }

foreach ($contract in @('calculateSetMetrics','calculateSetsMetrics','bodyweightReps','addedLoadVolume','estimatedOneRepMax','Sin series registradas')) {
    Assert-True ($workoutMetrics.Contains($contract)) "Falta contrato de metricas de gym: $contract"
}
foreach ($contract in @('quickStickyActions','data-quick-adjust="reps:1"','data-quick-adjust="weight:0.5"','data-quick-adjust="weight:2.5"','data-quick-adjust="weight:5"','undoDeleteQuickSetPayload','restTimerEnabled','hapticEnabled','quickDrafts','Finalizar el entrenamiento de hoy?')) {
    Assert-True ($workout.Contains($contract)) "Falta UX de registro rapido Gym: $contract"
}
foreach ($contract in @('partyStickySave','data-party-adjust="reps:1"','data-party-adjust="weight:0.5"','data-party-adjust="weight:2.5"','data-party-adjust="weight:5"','partyQuickDrafts','party-undo-delete-set','Finalizar este entrenamiento?')) {
    Assert-True ($gymParty.Contains($contract)) "Falta UX de registro rapido Gym Party: $contract"
}
Assert-True ($html.Contains('<script src="firebase-config.js"></script>')) 'index.html no carga firebase-config.js'
Assert-True ($html.IndexOf('<script src="firebase-config.js"></script>') -lt $html.IndexOf('<script src="gym-party.js"></script>')) 'firebase-config.js debe cargarse antes de gym-party.js'
Assert-True ($html.IndexOf('<script src="gym-party-sync.js"></script>') -lt $html.IndexOf('<script src="gym-party.js"></script>')) 'gym-party-sync.js debe cargarse antes de gym-party.js'
Assert-True ($firebaseConfig.Contains('window.GYM_PARTY_FIREBASE_CONFIG')) 'firebase-config.js debe definir window.GYM_PARTY_FIREBASE_CONFIG'
foreach ($forbidden in @('service_account', 'private_key', '-----BEGIN PRIVATE KEY-----')) {
    Assert-True (-not $firebaseConfig.Contains($forbidden)) "firebase-config.js no debe contener $forbidden"
}

Assert-True ($manifest.start_url -eq './index.html') 'El manifest debe conservar start_url relativo para GitHub Pages'
Assert-True ($manifest.scope -eq './') 'El manifest debe conservar scope relativo para GitHub Pages'
Assert-True ($manifest.display -eq 'standalone') 'El manifest debe mantener display standalone'
Assert-True ($manifest.id -eq './') 'El manifest debe declarar un id estable y relativo'
Assert-True (($manifest.display_override -contains 'standalone')) 'El manifest debe declarar display_override'
Assert-True (($manifest.shortcuts.url -contains './index.html?module=gym')) 'Falta shortcut PWA a Gym'
Assert-True (($manifest.shortcuts.url -contains './index.html?module=gym-party')) 'Falta shortcut PWA a Gym Party'
Assert-True (($manifest.shortcuts.url -contains './index.html?module=gym&quickLog=1')) 'Falta shortcut PWA a registro rapido'
foreach ($icon in @('icons/icon-192.png', 'icons/icon-512.png')) {
    Assert-True (($manifest.icons.src -contains $icon)) "El manifest no declara $icon"
    Assert-True ($serviceWorker.Contains("'./$icon'")) "sw.js no cachea $icon"
}

$appVersionMatch = [regex]::Match($advanced, "const APP_VERSION='([^']+)';")
$androidVersionMatch = [regex]::Match($androidBuild, "versionName\s+'([^']+)'")
$cacheVersionMatch = [regex]::Match($serviceWorker, '\$\{CACHE_PREFIX\}v(\d+)')
Assert-True $appVersionMatch.Success 'No se encontro APP_VERSION en advanced-features.js'
Assert-True $androidVersionMatch.Success 'No se encontro versionName Android'
Assert-True $cacheVersionMatch.Success 'No se encontro la version del cache PWA'
$appVersion = $appVersionMatch.Groups[1].Value
$androidVersion = $androidVersionMatch.Groups[1].Value
$cacheVersion = $cacheVersionMatch.Groups[1].Value
Assert-True ($appVersion -eq $androidVersion) "Version web $appVersion y Android $androidVersion no coinciden"
Assert-True ($releaseWorkflow.Contains('VERSION_NAME')) 'El workflow release debe obtener versionName dinamicamente'
Assert-True ($releaseWorkflow.Contains('protocolo-0-100-v${VERSION_NAME}-release.apk')) 'El APK release debe llevar la version en el nombre'
Assert-True ($readme.Contains("v$appVersion")) "README.md no menciona v$appVersion"
Assert-True ($handoff.Contains($appVersion)) "CODEX_HANDOFF.md no menciona la version $appVersion"
Assert-True ($handoff.Contains("protocolo-0-100-pwa-v$cacheVersion")) "CODEX_HANDOFF.md no menciona el cache PWA v$cacheVersion"

$pwaSafetyContracts = @(
    'key.startsWith(CACHE_PREFIX)',
    'url.origin !== self.location.origin',
    "event.request.mode === 'navigate'",
    'CORE_URLS.has(canonicalUrl(event.request.url))',
    'response.ok'
)
foreach ($contract in $pwaSafetyContracts) {
    Assert-True ($serviceWorker.Contains($contract)) "Falta contrato seguro del service worker: $contract"
}
foreach ($contract in @("event.data?.type === 'SKIP_WAITING'",'firebaseConfigResponse',"cache: 'no-store'",'GYM_PARTY_FIREBASE_CONFIG=window.GYM_PARTY_FIREBASE_CONFIG||{}')) {
    Assert-True ($serviceWorker.Contains($contract)) "Falta contrato de actualizacion/config PWA: $contract"
}
Assert-True (-not $serviceWorker.Contains('then(() => self.skipWaiting())')) 'El service worker no debe activarse antes de que el usuario acepte'
foreach ($contract in @('Nueva versi','Actualizar ahora','protocolo_pwa_update_accepted',"postMessage({type:'SKIP_WAITING'})")) {
    Assert-True (($advanced + $html).Contains($contract)) "Falta UX de actualizacion PWA: $contract"
}
foreach ($contract in @("launchParams.get('module')","launchParams.get('quickLog')","window.openQuickSetLogger?.()")) {
    Assert-True ($html.Contains($contract)) "Falta manejo de shortcuts PWA: $contract"
}
Assert-True (-not $serviceWorker.Contains('keys.filter(k => k !== CACHE_NAME)')) 'sw.js no debe borrar caches ajenos a la app'
Assert-True (-not $serviceWorker.Contains('cache.put(event.request')) 'sw.js no debe cachear cualquier GET sin limite'

$nutritionLower = $nutrition.ToLowerInvariant()
$requiredFoodTerms = @(
    'arroz blanco', 'arroz integral', 'mandioca', 'rabadilla',
    'pechuga', 'pollo pechuga', 'muslo', 'pollo muslo', 'queso paraguay',
    'sopa paraguaya', 'chipa', 'mbeju', 'vori vori', 'terere'
)
foreach ($term in $requiredFoodTerms) {
    Assert-True ($nutritionLower.Contains($term)) "Falta alimento o alias requerido: $term"
}

$foodCount = [regex]::Matches($nutrition, "\bF\('").Count
$nutrientCount = [regex]::Matches($nutrition, "^\s{4}[A-Za-z0-9]+:\{label:", 'Multiline').Count
Assert-True ($foodCount -ge 60) "La base nutricional tiene pocos alimentos: $foodCount"
Assert-True ($nutrientCount -ge 28) "La base nutricional tiene pocos nutrientes: $nutrientCount"

foreach ($contract in @('schemaVersion:3', 'coinLedger:', 'monthlyRankings:', 'referralCodes:', 'nutritionTargets:', 'savedMeals:', 'cachedFdcFoods:')) {
    Assert-True ($advanced.Contains($contract)) "Falta contrato versionado: $contract"
}

foreach ($contract in @(
    'weeklyWorkoutPlan:',
    'workoutSessions:',
    'exerciseHistory:',
    'exerciseLibrary:',
    'gymSettings:',
    'workoutWidgetState:',
    'exercisePreferences:',
    'exerciseLibraryMeta:'
)) {
    Assert-True ($advanced.Contains($contract)) "Falta contrato de backup gym/widget: $contract"
}

foreach ($contract in @(
    'affectedKeys().hasOnly',
    'isOwnerAfter',
    'joiningSelf',
    'docId == memberId(data.partyId, data.userId)',
    'request.resource.data.role == resource.data.role',
    'request.resource.data.userId == resource.data.userId',
    'request.resource.data.partyId == resource.data.partyId',
    'data.maxMembers <= 10',
    'data.reps <= 10000',
    '"weightKg"',
    'validWeeklyStat'
)) {
    Assert-True ($firestoreRules.Contains($contract)) "Falta contrato critico de Firestore Rules: $contract"
}
foreach ($contract in @('assertFails','role:''owner''','EVIL10','wrong_document_id','negative_set','getDoc(doc(outsiderDb')) {
    Assert-True ($firestoreRulesTest.Contains($contract)) "Falta prueba negativa de Firestore Rules: $contract"
}
Assert-True ($validationWorkflow.Contains('npm run test:rules')) 'El workflow de validacion debe ejecutar Firebase Emulator'

foreach ($contract in @(
    'protocolo_0_100_exercise_preferences_v1',
    'recordExerciseUse',
    'rankExercisesForContext',
    'usesByWeekday',
    'usesByRoutine',
    'lastUsedAt',
    'favorite',
    'hidden',
    'Rutina de hoy',
    'Frecuentes de este dia',
    'Todos los ejercicios'
)) {
    Assert-True ($workoutRanking.Contains($contract)) "Falta contrato de ranking de ejercicios: $contract"
}

foreach ($contract in @(
    'gymPartySettings',
    'gymPartyMembership',
    'sharedWorkoutSessions',
    'sharedWorkoutSets',
    'syncQueue',
    'lastGymPartySyncAt',
    'lastGymPartyRemoteSyncAt',
    'gymPartyDemoData'
)) {
    Assert-True ($advanced.Contains($contract)) "Falta contrato de backup Gym Party: $contract"
}

foreach ($contract in @(
    'MAX_GYM_PARTY_MEMBERS = 10',
    'window.GYM_PARTY_FEATURES',
    'buildDemoData',
    'calculatePartyStats',
    'syncFromLocalWorkouts',
    'localSetTombstones',
    'normalizeSessionsFromSets',
    'exportableSettings',
    'delete value.firebaseConfig',
    'delete value.portableAccessEmail',
    'delete value.pendingInviteCode',
    'delete next.portableAccessEmail',
    '!s.deleted',
    'deleted: false',
    'Crear sala nueva',
    'Crear sala y generar',
    'noRoomHtmlSimple',
    'dashboardHtmlSimple',
    'partyFocusHint',
    'Invitar amigo y administrar sala',
    'partyPrimaryAction',
    'workoutQuickLoggerHtml',
    'data-gym-party-action="party-save-set"',
    'data-gym-party-action="party-edit-set"',
    'data-gym-party-action="party-delete-set"',
    'data-gym-party-action="party-cancel-edit-set"',
    'data-gym-party-action="party-add-exercise"',
    'partySetRowsHtml',
    'partyEditingSetId',
    'selectedWorkoutDate',
    'partyDateControlsHtml',
    'partyWorkoutDateInput',
    'weeklySetEditorHtml',
    'Editar series de la semana',
    'localExerciseId',
    'localSetId',
    'partySetRow',
    'partyManualExerciseName',
    'gymPartyGameHtml',
    'dailyWorkoutStreak',
    'muscleInsightModel',
    'muscleMapHtml',
    'partyHumanSvg',
    'weekBarHtml',
    'exerciseSummaryRows',
    'strengthSetText',
    'data-gym-party-action="party-select-muscle"',
    'data-gym-party-action="party-compare-exercise"',
    'partyExerciseCompareCard',
    'partyWeekBars',
    'partyMuscleMapCard',
    'data-gym-party-weight="${value}"',
    'Entrar con',
    'data-gym-party-action="share-code"',
    'bindGymPartyActionButtons',
    'runGymPartyAction',
    'gymPartyCode',
    'Firebase',
    'browserLocalPersistence',
    'waitForInitialAuth',
    'resumeFirebaseMembership',
    'assertFirebaseSessionMatchesMembership',
    'EmailAuthProvider',
    'linkWithCredential',
    'signInWithEmailAndPassword',
    'restoreFirebaseMembershipForCurrentUser',
    'history?.replaceState',
    "searchParams.delete('gymPartyCode')",
    'pendingInviteCode',
    'regenerateInvite',
    'revokeInvite',
    'deactivateFirebaseMembership',
    'deleteSharedDataAndLeave',
    'tombstoneOwnSharedCollection',
    'Salir solo de este dispositivo',
    'Eliminar mis datos compartidos y salir',
    'link-access',
    'restore-access',
    'gym_parties',
    'workout_sessions_shared',
    'workout_sets_shared',
    'Solo se compartir',
    'Modo demo'
)) {
    Assert-True ($gymParty.Contains($contract)) "Falta contrato Gym Party: $contract"
}
foreach ($contract in @('prepareLocalRows','mergeRemoteRows','markRowsSynced','markRowsError','backoffDelay','latestRemoteTimestamp','timeContext','syncState','remote-newer')) {
    Assert-True ($gymPartySync.Contains($contract)) "Falta contrato de sync incremental: $contract"
}
Assert-True ($gymParty.Contains('batch.set(firestoreMod.doc(db,op.collection,op.payload.id),{...firestorePayload(op.payload),updatedAt:timestamp})')) 'El sync debe reemplazar documentos propios para limpiar campos legacy'
Assert-True (-not $gymParty.Contains('firestorePayload(op.payload),updatedAt:timestamp},{merge:true}')) 'El sync no debe conservar campos legacy con merge:true'
Assert-True ($gymParty.Contains('Math.min(2880, Math.max(0, measuredDuration))')) 'La duracion compartida debe respetar el rango permitido por Rules'
foreach ($contract in @('uploadSyncQueue','fetchRemoteCollection','lastRemoteSyncAt','serverTimestamp','writeBatch','startAfter','sync-full','revision','localDate','timeZone','utcOffset','deletedAt')) {
    Assert-True ($gymParty.Contains($contract)) "Falta integracion de sync incremental: $contract"
}
foreach ($contract in @('dirty flags','conflicto LWW','tombstones','backoff','timeContext')) {
    Assert-True ($gymPartySyncTest.Contains($contract)) "Falta prueba de sync incremental: $contract"
}
Assert-True (Test-Path -LiteralPath (Join-Path $repoRoot 'firebase/firestore.indexes.json') -PathType Leaf) 'Faltan indices Firestore para sync incremental'
foreach ($contract in @('WebViewAssetLoader','appassets.androidplatform.net','setAllowFileAccess(false)','setAllowContentAccess(false)','setAllowUniversalAccessFromFileURLs(false)','MIXED_CONTENT_NEVER_ALLOW','handleNavigation','www.gstatic.com','.googleapis.com','.firebaseapp.com','api.nal.usda.gov','AndroidBridge','AndroidUsageBridge','AndroidSpeechBridge')) {
    Assert-True ($mainActivity.Contains($contract)) "Falta endurecimiento Android WebView: $contract"
}
Assert-True (-not $mainActivity.Contains('loadUrl("file:')) 'MainActivity no debe cargar la app mediante file://'
Assert-True ($androidBuild.Contains("androidx.webkit:webkit:1.15.0")) 'Falta dependencia AndroidX WebKit compatible con minSdk 23'
Assert-True ($androidProperties.Contains('android.useAndroidX=true')) 'AndroidX WebKit requiere android.useAndroidX=true'
Assert-True ($androidManifest.Contains('android.webkit.WebView.EnableSafeBrowsing')) 'Falta Safe Browsing en AndroidManifest'
foreach ($contract in @('assembleRelease','ANDROID_KEYSTORE_BASE64','ANDROID_KEYSTORE_PASSWORD','ANDROID_KEY_ALIAS','ANDROID_KEY_PASSWORD','sha256sum','gh release create','workflow_dispatch')) {
    Assert-True ($releaseWorkflow.Contains($contract)) "Falta contrato de APK release: $contract"
}
Assert-True (-not $apkWorkflow.Contains('gh release')) 'El workflow debug no debe publicar GitHub Releases'
Assert-True ($androidReleaseTest.Contains('Release Android separado')) 'Falta prueba de separacion debug/release'
foreach ($contract in @('globalLiveRegion',':focus-visible','prefers-reduced-motion','safe-area-inset-bottom','applyAccessibilityEnhancements','label.htmlFor=control.id','trapOverlayFocus','preferredMotionBehavior')) {
    Assert-True ($html.Contains($contract)) "Falta contrato de accesibilidad: $contract"
}
Assert-True ($accessibilityTest.Contains('Accesibilidad correcta')) 'Falta prueba automatica de accesibilidad'
Assert-True ($releaseWorkflow.Contains('node ./scripts/test-accessibility.mjs')) 'El release Android debe probar accesibilidad web'
foreach ($contract in @('android-chromium','iphone-webkit','Pixel 7','iPhone 13','browserName','serviceWorkers')) {
    Assert-True ($playwrightConfig.Contains($contract)) "Falta configuracion Playwright: $contract"
}
foreach ($contract in @('Face pull','partyManualRememberWeekday','2026-07-13','Editar serie 1 de Face pull','Eliminar serie 1 de Face pull','party-undo-delete-set','setOffline(true)','gymPartyCode','not.toHaveURL','memberCount','manifest.webmanifest')) {
    Assert-True ($playwrightGymTest.Contains($contract)) "Falta cobertura E2E: $contract"
}
foreach ($contract in @('npm run test:e2e','playwright install --with-deps chromium webkit',':app:assembleRelease','test-release.jks','ANDROID_KEYSTORE_PATH')) {
    Assert-True ($validationWorkflow.Contains($contract)) "Falta validacion real en CI: $contract"
}
Assert-True (-not $gymParty.Contains('members: undefined')) 'Gym Party no debe enviar members: undefined a Firestore'
Assert-True ($gymParty.Contains('delete partyDoc.members')) 'Gym Party debe eliminar members antes de crear gym_parties en Firestore'
foreach ($removedAction in @(
    'data-gym-party-action="party-prev-exercise"',
    'data-gym-party-action="party-next-exercise"',
    'data-gym-party-action="party-complete-exercise"',
    'data-gym-party-action="party-prev-day"',
    'data-gym-party-action="party-next-day"',
    'data-gym-party-action="party-today"',
    'partyWorkoutNav'
)) {
    Assert-True (-not $gymParty.Contains($removedAction)) "Gym Party no debe mostrar control removido: $removedAction"
}
Assert-True (-not $html.Contains('data-module-target="gym-party"')) 'Gym Party no debe duplicarse en la navegacion principal'
Assert-True ($html.Contains("'gym-party':['Gym Party'")) 'setModule debe conservar compatibilidad con Gym Party'
Assert-True ($html.Contains('id="tab-gym-party"')) 'Falta pestaña Gym Party'
Assert-True ($html.Contains('<script src="gym-party.js"></script>')) 'index.html no carga gym-party.js'
Assert-True ($html.Contains('id="openGymPartyTopBtn" hidden')) 'El acceso superior legacy de Gym Party debe quedar oculto'
Assert-True ($html.Contains('data-open-gym-party')) 'Faltan tarjetas/accesos rapidos a Gym Party'
Assert-True ($html.Contains('function maybeAutoShowActionModal(){ renderActionCard(); }')) 'La accion diaria no debe abrir un modal automatico'

$workoutLower = $workout.ToLowerInvariant()
foreach ($term in @(
    'peck deck',
    'press de banca',
    'dominadas',
    'jalon al pecho',
    'laterales',
    'press militar',
    'curl martillo',
    'barra z',
    'triceps',
    'prensa',
    'cuadriceps',
    'aductores',
    'pantorrillas',
    'tibial anterior',
    'actividad suave',
    'revisar entrenamientos'
)) {
    Assert-True ($workoutLower.Contains($term)) "Falta rutina/ejercicio obligatorio en workout-features.js: $term"
}

foreach ($contract in @(
    'window.openGymToday',
    'window.openQuickSetLogger',
    'window.handleAndroidWidgetIntent',
    'saveWorkoutWidgetData',
    'buildWorkoutWidgetState',
    'getQuickWorkoutState',
    'addManualExercisePayload',
    'saveQuickSetPayload',
    'updateQuickSetPayload',
    'deleteQuickSetPayload',
    'currentSets',
    'completeQuickExercisePayload',
    'finishWorkoutPayload',
    'importWidgetStateFromAndroid',
    'android-widget-direct',
    'protocolo_0_100_weekly_workout_plan_v1',
    'protocolo_0_100_workout_sessions_v1',
    'protocolo_0_100_exercise_history_v1',
    'Restablecer rutina predeterminada',
    'advancedPlanTextEditor',
    'planExerciseEditorCard',
    'data-plan-field="targetSets"',
    'data-plan-field="repsMin"',
    'data-plan-field="repsMax"',
    'data-plan-field="restSeconds"',
    'undoPlanExerciseDelete',
    'addPlanLibraryExercise',
    'createPlanCustomExercise',
    'EXERCISE_LIBRARY_VERSION',
    'migrateExerciseLibrary',
    'exerciseLibraryEditor',
    'handleExerciseLibraryAction',
    'Registro r'
)) {
    Assert-True ($workout.Contains($contract)) "Falta contrato web gym/widget: $contract"
}

foreach ($contract in @(
    'WorkoutWidgetProvider',
    'android.appwidget.action.APPWIDGET_UPDATE',
    '@xml/workout_widget_info',
    'com.protocolo.cien.ACTION_REFRESH_WORKOUT_WIDGET'
)) {
    Assert-True ($androidManifest.Contains($contract)) "Falta contrato AndroidManifest de widget: $contract"
}

foreach ($contract in @(
    'AppWidgetProvider',
    'AppWidgetManager',
    'ACTION_OPEN_TODAY_WORKOUT',
    'ACTION_QUICK_LOG_SET',
    'ACTION_COMPLETE_CURRENT_EXERCISE',
    'ACTION_REFRESH_WORKOUT_WIDGET',
    'ACTION_WIDGET_SAVE_SET',
    'ACTION_WIDGET_REPS_UP',
    'ACTION_WIDGET_WEIGHT_UP',
    'ACTION_WIDGET_WEIGHT_FAST_UP',
    'ACTION_WIDGET_PREVIOUS_EXERCISE',
    'handleWidgetAction'
)) {
    Assert-True (($widgetProvider + $widgetUpdater + $mainActivity).Contains($contract)) "Falta contrato nativo de widget: $contract"
}
foreach ($contract in @('widgetPreviousButton', 'widgetSetStats', 'widgetWeightFastPlusButton', 'WEIGHT_STEP = 0.5', 'WEIGHT_FAST_STEP = 5.0', 'currentExerciseSets', 'currentMuscleSets')) {
    Assert-True ($widgetUpdater.Contains($contract) -or ($contract -eq 'widgetPreviousButton' -and (($widgetUpdater + (Read-Utf8 'android-native-wrapper/app/src/main/res/layout/widget_workout_medium.xml') + (Read-Utf8 'android-native-wrapper/app/src/main/res/layout/widget_workout_small.xml')).Contains($contract)))) "Falta contrato de widget directo: $contract"
}

foreach ($contract in @(
    'saveWorkoutWidgetData',
    'getWorkoutWidgetData',
    'updateWorkoutWidget',
    'handleAndroidWidgetIntent'
)) {
    Assert-True ($mainActivity.Contains($contract)) "Falta puente Android/WebView: $contract"
}

foreach ($contract in @(
    'localStorage.setItem(ACTIVE_MODULE_KEY,state.settings.activeModule)',
    'setLocalData(COIN_LEDGER_KEY,state.coinLedger)',
    'setLocalData(MONTHLY_RANKINGS_KEY,state.monthlyRankings)',
    'setLocalData(REWARDS_KEY,state.rewards)',
    "Object.prototype.hasOwnProperty.call(state,'userReferral')"
)) {
    Assert-True ($advanced.Contains($contract)) "La importacion v3 no restaura: $contract"
}

foreach ($safetyText in @('no diagnostica deficiencias', 'no son dinero', 'pagos reales requieren backend')) {
    Assert-True ($html.Contains($safetyText)) "Falta aviso de seguridad/legal: $safetyText"
}

foreach ($fdcContract in @('cachedFdcFoods', 'hybridSearch', 'searchFoods', 'getFoodDetails', 'normalizeFood', 'importDataset', 'sourceCitation')) {
    Assert-True ($fdc.Contains($fdcContract)) "Falta contrato FoodData Central: $fdcContract"
}
$demoToken = 'DEMO' + '_KEY'
Assert-True (-not $fdc.Contains($demoToken)) 'No se debe publicar una API key de demostracion ni otra API key en fdc-client.js'
Assert-True ($html.Contains('Datos nutricionales ampliados basados en USDA FoodData Central')) 'Falta atribucion visible de USDA FoodData Central'

Assert-True ($deployWorkflow.Contains('./scripts/validate-app.ps1')) 'El despliegue Pages debe validar la app antes de publicar'
Assert-True ($deployWorkflow.Contains('gym-party.js')) 'El despliegue Pages debe publicar gym-party.js'
Assert-True ($deployWorkflow.Contains('firebase-config.js')) 'El despliegue Pages debe publicar firebase-config.js'
Assert-True ($deployWorkflow.Contains('write-firebase-config.ps1')) 'El despliegue Pages debe generar firebase-config.js desde secrets si existen'
Assert-True ($deployWorkflow.Contains('workout-features.js')) 'El despliegue Pages debe publicar workout-features.js'
foreach ($module in @('workout-store.js','workout-plan.js','workout-ui.js','firebase-service.js','gym-party-metrics.js','gym-party-ui.js')) {
    Assert-True ($deployWorkflow.Contains($module)) "El despliegue Pages debe publicar $module"
}
Assert-True ($apkWorkflow.Contains('write-firebase-config.ps1')) 'El build APK debe generar firebase-config.js desde secrets si existen'
Assert-True ($apkWorkflow.Contains('./scripts/validate-app.ps1 -CheckAndroidAssets')) 'El build APK debe validar los assets sincronizados'
Assert-True ($validationWorkflow.Contains('./scripts/validate-app.ps1 -CheckAndroidAssets')) 'Falta validacion automatica de web y Android'
foreach ($workflow in @($deployWorkflow, $apkWorkflow, $validationWorkflow)) {
    Assert-True ($workflow.Contains('node ./scripts/test-service-worker.mjs')) 'Cada workflow debe probar la estrategia del service worker'
}
Assert-True ($serviceWorkerTest.Contains('api.nal.usda.gov')) 'La prueba del service worker debe cubrir llamadas FDC'
Assert-True ($serviceWorkerTest.Contains('otra-app-cache')) 'La prueba del service worker debe proteger caches ajenos'
Assert-True ($serviceWorkerTest.Contains('SKIP_WAITING')) 'La prueba del service worker debe cubrir activacion consentida'
Assert-True ($serviceWorkerTest.Contains('firebase-config.js')) 'La prueba del service worker debe cubrir configuracion Firebase online/offline'
foreach ($contract in @('32 reps de peso corporal','addedLoadVolume','percentChange(100,0),null','estimatedOneRepMax')) {
    Assert-True ($workoutMetricsTest.Contains($contract)) "Falta prueba de metricas de gym: $contract"
}
foreach ($workflow in @($deployWorkflow, $apkWorkflow, $validationWorkflow)) {
    Assert-True ($workflow.Contains('node ./scripts/test-workout-features.mjs')) 'Cada workflow debe probar rutina semanal y estado widget'
    Assert-True ($workflow.Contains('node ./scripts/test-workout-metrics.mjs')) 'Cada workflow debe probar metricas de gimnasio'
    Assert-True ($workflow.Contains('node ./scripts/test-gym-party.mjs')) 'Cada workflow debe probar Gym Party'
    Assert-True ($workflow.Contains('node ./scripts/test-gym-party-sync.mjs')) 'Cada workflow debe probar sync incremental'
    Assert-True ($workflow.Contains('node ./scripts/test-android-webview-security.mjs')) 'Cada workflow debe probar seguridad WebView Android'
    Assert-True ($workflow.Contains('node ./scripts/test-android-release.mjs')) 'Cada workflow debe probar contratos de release Android'
    Assert-True ($workflow.Contains('node ./scripts/test-accessibility.mjs')) 'Cada workflow debe probar accesibilidad web y movil'
    Assert-True ($workflow.Contains('npm run test:modules')) 'Cada workflow debe probar limites modulares'
}
Assert-True ($releaseWorkflow.Contains('npm run test:modules')) 'El release Android debe probar limites modulares'
foreach ($contract in @('WORKOUT_STORE','WORKOUT_PLAN','WORKOUT_UI','FIREBASE_SERVICE','GYM_PARTY_METRICS','GYM_PARTY_UI','aggregate.bodyweightReps','aggregate.addedLoadVolume')) {
    Assert-True ($moduleBoundaryTest.Contains($contract)) "Falta cobertura modular: $contract"
}
foreach ($contract in @('Torso A', 'Pierna A', 'Torso B', 'Pierna B', 'Torso C', 'Rutina propia', 'buildWorkoutWidgetState', 'updateQuickSetPayload', 'deleteQuickSetPayload')) {
    Assert-True ($workoutTest.Contains($contract)) "Falta prueba workout: $contract"
}
foreach ($contract in @('MAX_GYM_PARTY_MEMBERS', 'buildDemoData(2)', 'buildDemoData(5)', 'calculatePartyStats', 'muscleInsightModel', 'exportState', 'set_deleted', 'payload.deleted', 'totalSets: 2', 'current.totalSets, 1')) {
    Assert-True ($gymPartyTest.Contains($contract)) "Falta prueba Gym Party: $contract"
}

if ($CheckAndroidAssets) {
    & (Join-Path $PSScriptRoot 'sync-web-assets.ps1') -Check
}

Write-Host "Validacion correcta: version $appVersion, cache PWA v$cacheVersion, $foodCount alimentos, $nutrientCount nutrientes y $($staticIds.Count) IDs estaticos unicos."
