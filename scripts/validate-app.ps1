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
$workout = Read-Utf8 'workout-features.js'
$firebaseConfig = Read-Utf8 'firebase-config.js'
$gymParty = Read-Utf8 'gym-party.js'
$advanced = Read-Utf8 'advanced-features.js'
$serviceWorker = Read-Utf8 'sw.js'
$manifestText = Read-Utf8 'manifest.webmanifest'
$androidBuild = Read-Utf8 'android-native-wrapper/app/build.gradle'
$androidManifest = Read-Utf8 'android-native-wrapper/app/src/main/AndroidManifest.xml'
$mainActivity = Read-Utf8 'android-native-wrapper/app/src/main/java/com/protocolo/cien/MainActivity.java'
$widgetProvider = Read-Utf8 'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetProvider.java'
$widgetUpdater = Read-Utf8 'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetUpdateService.java'
$deployWorkflow = Read-Utf8 '.github/workflows/deploy-pages.yml'
$apkWorkflow = Read-Utf8 '.github/workflows/build-debug-apk.yml'
$validationWorkflow = Read-Utf8 '.github/workflows/validate-app.yml'
$serviceWorkerTest = Read-Utf8 'scripts/test-service-worker.mjs'
$workoutTest = Read-Utf8 'scripts/test-workout-features.mjs'
$gymPartyTest = Read-Utf8 'scripts/test-gym-party.mjs'
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
    'nutrition-data.js', 'fdc-client.js', 'workout-features.js', 'advanced-features.js',
    'firebase-config.js', 'gym-party.js',
    'manifest.webmanifest', 'sw.js',
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

foreach ($script in @('nutrition-data.js', 'fdc-client.js', 'workout-features.js', 'gym-party.js', 'advanced-features.js')) {
    Assert-True ($html.Contains("<script src=`"$script`"></script>")) "index.html no carga $script"
    Assert-True ($serviceWorker.Contains("'./$script'")) "sw.js no cachea $script"
}
Assert-True ($html.Contains('<script src="firebase-config.js"></script>')) 'index.html no carga firebase-config.js'
Assert-True ($html.IndexOf('<script src="firebase-config.js"></script>') -lt $html.IndexOf('<script src="gym-party.js"></script>')) 'firebase-config.js debe cargarse antes de gym-party.js'
Assert-True ($firebaseConfig.Contains('window.GYM_PARTY_FIREBASE_CONFIG')) 'firebase-config.js debe definir window.GYM_PARTY_FIREBASE_CONFIG'
foreach ($forbidden in @('service_account', 'private_key', '-----BEGIN PRIVATE KEY-----')) {
    Assert-True (-not $firebaseConfig.Contains($forbidden)) "firebase-config.js no debe contener $forbidden"
}

Assert-True ($manifest.start_url -eq './index.html') 'El manifest debe conservar start_url relativo para GitHub Pages'
Assert-True ($manifest.scope -eq './') 'El manifest debe conservar scope relativo para GitHub Pages'
Assert-True ($manifest.display -eq 'standalone') 'El manifest debe mantener display standalone'
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
Assert-True ($apkWorkflow.Contains("v$appVersion")) "El workflow APK no publica v$appVersion"
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
    'workoutWidgetState:'
)) {
    Assert-True ($advanced.Contains($contract)) "Falta contrato de backup gym/widget: $contract"
}

foreach ($contract in @(
    'gymPartySettings',
    'gymPartyMembership',
    'sharedWorkoutSessions',
    'sharedWorkoutSets',
    'syncQueue',
    'lastGymPartySyncAt',
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
    'exportableSettings',
    'delete value.firebaseConfig',
    'para mi amigo',
    'Entrar con',
    'data-gym-party-action="share-code"',
    'gymPartyCode',
    'Firebase',
    'gym_parties',
    'workout_sessions_shared',
    'workout_sets_shared',
    'Solo se compartir',
    'Modo demo'
)) {
    Assert-True ($gymParty.Contains($contract)) "Falta contrato Gym Party: $contract"
}
Assert-True ($html.Contains('data-module-target="gym-party"')) 'Falta entrada de navegacion Gym Party'
Assert-True ($html.Contains('id="tab-gym-party"')) 'Falta pestaña Gym Party'
Assert-True ($html.Contains('<script src="gym-party.js"></script>')) 'index.html no carga gym-party.js'
Assert-True ($html.Contains('id="openGymPartyTopBtn"')) 'Falta boton superior visible de Gym Party'
Assert-True ($html.Contains('data-open-gym-party')) 'Faltan tarjetas/accesos rapidos a Gym Party'

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
    'importWidgetStateFromAndroid',
    'android-widget-direct',
    'protocolo_0_100_weekly_workout_plan_v1',
    'protocolo_0_100_workout_sessions_v1',
    'protocolo_0_100_exercise_history_v1',
    'Restablecer rutina predeterminada',
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
Assert-True ($apkWorkflow.Contains('write-firebase-config.ps1')) 'El build APK debe generar firebase-config.js desde secrets si existen'
Assert-True ($apkWorkflow.Contains('./scripts/validate-app.ps1 -CheckAndroidAssets')) 'El build APK debe validar los assets sincronizados'
Assert-True ($validationWorkflow.Contains('./scripts/validate-app.ps1 -CheckAndroidAssets')) 'Falta validacion automatica de web y Android'
foreach ($workflow in @($deployWorkflow, $apkWorkflow, $validationWorkflow)) {
    Assert-True ($workflow.Contains('node ./scripts/test-service-worker.mjs')) 'Cada workflow debe probar la estrategia del service worker'
}
Assert-True ($serviceWorkerTest.Contains('api.nal.usda.gov')) 'La prueba del service worker debe cubrir llamadas FDC'
Assert-True ($serviceWorkerTest.Contains('otra-app-cache')) 'La prueba del service worker debe proteger caches ajenos'
foreach ($workflow in @($deployWorkflow, $apkWorkflow, $validationWorkflow)) {
    Assert-True ($workflow.Contains('node ./scripts/test-workout-features.mjs')) 'Cada workflow debe probar rutina semanal y estado widget'
    Assert-True ($workflow.Contains('node ./scripts/test-gym-party.mjs')) 'Cada workflow debe probar Gym Party'
}
foreach ($contract in @('Torso A', 'Pierna A', 'Torso B', 'Pierna B', 'Torso C', 'Rutina propia', 'buildWorkoutWidgetState')) {
    Assert-True ($workoutTest.Contains($contract)) "Falta prueba workout: $contract"
}
foreach ($contract in @('MAX_GYM_PARTY_MEMBERS', 'buildDemoData(2)', 'buildDemoData(5)', 'calculatePartyStats', 'exportState')) {
    Assert-True ($gymPartyTest.Contains($contract)) "Falta prueba Gym Party: $contract"
}

if ($CheckAndroidAssets) {
    & (Join-Path $PSScriptRoot 'sync-web-assets.ps1') -Check
}

Write-Host "Validacion correcta: version $appVersion, cache PWA v$cacheVersion, $foodCount alimentos, $nutrientCount nutrientes y $($staticIds.Count) IDs estaticos unicos."
