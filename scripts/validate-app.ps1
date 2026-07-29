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
$appVersionText = Read-Utf8 'app-version.json'
$appVersionScript = Read-Utf8 'app-version.js'
$buildInfo = Read-Utf8 'build-info.json'
$buildInfoScript = Read-Utf8 'app/build-info.js'
$buildGuard = Read-Utf8 'app/build-guard.js'
$appNumbers = Read-Utf8 'app/numbers.js'
$nutrition = Read-Utf8 'nutrition-data.js'
$nutritionRecipes = Read-Utf8 'nutrition/recipes.js'
$nutritionPortions = Read-Utf8 'nutrition/portions.js'
$nutritionFoodProvider = Read-Utf8 'nutrition/food-provider.js'
$nutritionSearchService = Read-Utf8 'nutrition/food-search-service.js'
$fdc = Read-Utf8 'fdc-client.js'
$workoutStore = Read-Utf8 'workout-store.js'
$workoutPlan = Read-Utf8 'workout-plan.js'
$workoutEquipment = Read-Utf8 'gym/equipment.js'
$anomalyDetector = Read-Utf8 'gym/anomaly-detector.js'
$progressionEngine = Read-Utf8 'gym/progression-engine.js'
$workoutMetrics = Read-Utf8 'workout-metrics.js'
$workoutRanking = Read-Utf8 'workout-ranking.js'
$workoutUi = Read-Utf8 'workout-ui.js'
$appRouter = Read-Utf8 'ui/router.js'
$appNavigation = Read-Utf8 'ui/navigation.js'
$progressView = Read-Utf8 'progress/progress-view.js'
$muscleTaxonomy = Read-Utf8 'progress/muscle-taxonomy.js'
$progressDataModel = Read-Utf8 'progress/progress-data-model.js'
$gymProgressModel = Read-Utf8 'progress/gym-progress-model.js'
$muscleProgress = Read-Utf8 'progress/muscle-progress.js'
$exerciseProgress = Read-Utf8 'progress/exercise-progress.js'
$personalRecords = Read-Utf8 'progress/personal-records.js'
$schemaRegistry = Read-Utf8 'data/schema-registry.js'
$indexedData = Read-Utf8 'data/indexeddb.js'
$repositories = Read-Utf8 'data/repositories.js'
$backupService = Read-Utf8 'data/backup-service.js'
$workout = Read-Utf8 'workout-features.js'
$firebaseConfig = Read-Utf8 'firebase-config.js'
$firebaseService = Read-Utf8 'firebase-service.js'
$gymPartySync = Read-Utf8 'gym-party-sync.js'
$gymPartyMetrics = Read-Utf8 'gym-party-metrics.js'
$gymPartyUi = Read-Utf8 'gym-party-ui.js'
$gymParty = Read-Utf8 'gym-party.js'
$advanced = Read-Utf8 'advanced-features.js'
$serviceWorker = Read-Utf8 'sw.js'
$precacheManifest = Read-Utf8 'precache-manifest.js'
$styleTokens = Read-Utf8 'styles/tokens.css'
$styleBase = Read-Utf8 'styles/base.css'
$styleComponents = Read-Utf8 'styles/components.css'
$styleFeatures = Read-Utf8 'styles/features.css'
$styleGym = Read-Utf8 'styles/gym.css'
$styleGymParty = Read-Utf8 'styles/gym-party.css'
$styleModules = Read-Utf8 'styles/modules.css'
$styleResponsive = Read-Utf8 'styles/responsive.css'
$manifestText = Read-Utf8 'manifest.webmanifest'
$androidBuild = Read-Utf8 'android-native-wrapper/app/build.gradle'
$androidProperties = Read-Utf8 'android-native-wrapper/gradle.properties'
$androidManifest = Read-Utf8 'android-native-wrapper/app/src/main/AndroidManifest.xml'
$mainActivity = Read-Utf8 'android-native-wrapper/app/src/main/java/com/protocolo/cien/MainActivity.java'
$widgetProvider = Read-Utf8 'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetProvider.java'
$widgetUpdater = Read-Utf8 'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetUpdateService.java'
$nativeWorkoutRepository = Read-Utf8 'android-native-wrapper/app/src/main/java/com/protocolo/cien/NativeWorkoutControlRepository.java'
$workoutMutationQueue = Read-Utf8 'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutMutationQueue.java'
$workoutNativeState = Read-Utf8 'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutNativeRepository.java'
$workoutQuickReducer = Read-Utf8 'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutQuickActionReducer.java'
$deployWorkflow = Read-Utf8 '.github/workflows/deploy-pages.yml'
$apkWorkflow = Read-Utf8 '.github/workflows/build-debug-apk.yml'
$validationWorkflow = Read-Utf8 '.github/workflows/validate-app.yml'
$releaseWorkflow = Read-Utf8 '.github/workflows/build-release-apk.yml'
$qualityWorkflow = Read-Utf8 '.github/workflows/quality-gate.yml'
$qualityGateTest = Read-Utf8 'scripts/test-quality-gate.mjs'
$serviceWorkerTest = Read-Utf8 'scripts/test-service-worker.mjs'
$workoutTest = Read-Utf8 'scripts/test-workout-features.mjs'
$gymPartyTest = Read-Utf8 'scripts/test-gym-party.mjs'
$workoutMetricsTest = Read-Utf8 'scripts/test-workout-metrics.mjs'
$workoutEquipmentTest = Read-Utf8 'scripts/test-workout-equipment.mjs'
$anomalyDetectorTest = Read-Utf8 'scripts/test-workout-anomalies.mjs'
$progressionEngineTest = Read-Utf8 'scripts/test-progression-engine.mjs'
$setModel = Read-Utf8 'gym/set-model.js'
$firestoreRules = Read-Utf8 'firebase/firestore.rules'
$firestoreRulesTest = Read-Utf8 'firebase/rules.test.mjs'
$gymPartySyncTest = Read-Utf8 'scripts/test-gym-party-sync.mjs'
$androidSecurityTest = Read-Utf8 'scripts/test-android-webview-security.mjs'
$androidReleaseTest = Read-Utf8 'scripts/test-android-release.mjs'
$accessibilityTest = Read-Utf8 'scripts/test-accessibility.mjs'
$moduleBoundaryTest = Read-Utf8 'scripts/test-module-boundaries.mjs'
$designSystemTest = Read-Utf8 'scripts/test-design-system.mjs'
$playwrightConfig = Read-Utf8 'playwright.config.mjs'
$webDistBuilder = Read-Utf8 'scripts/build-web-dist.mjs'
$precacheBuilder = Read-Utf8 'scripts/precache-manifest.mjs'
$precacheGenerator = Read-Utf8 'scripts/generate-precache-manifest.mjs'
$webDistTest = Read-Utf8 'scripts/test-web-dist.mjs'
$webDistPlaywright = Read-Utf8 'tests/web-dist/web-dist.spec.mjs'
$playwrightGymTest = Read-Utf8 'tests/e2e/gym-flow.spec.mjs'
$playwrightVisualTest = Read-Utf8 'tests/e2e/visual-navigation.spec.mjs'
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
    'nutrition/nutrition-store.js', 'nutrition/nutrition-model.js', 'nutrition/recipes.js', 'nutrition/portions.js', 'nutrition/food-search.js', 'nutrition/food-provider.js', 'nutrition/food-search-service.js', 'nutrition/food-entry-flow.js', 'nutrition/meal-history.js', 'nutrition/nutrition-confidence.js', 'nutrition/nutrition-view.js', 'scripts/test-nutrition-modules.mjs', 'scripts/test-food-search-service.mjs', 'scripts/test-fdc-confidence.mjs', 'tests/e2e/nutrition-domain.spec.mjs', 'tests/e2e/nutrition-today.spec.mjs', 'tests/e2e/nutrition-recipes-portions.spec.mjs', 'tests/e2e/nutrition-numbers-targets.spec.mjs', 'tests/e2e/nutrition-unified-search.spec.mjs',
    'data/schema-registry.js', 'data/backup-service.js', 'scripts/test-schema-registry.mjs', 'scripts/test-data-integrity.mjs', 'scripts/test-backup-service.mjs', 'tests/e2e/backup-import.spec.mjs', 'tests/e2e/data-integrity.spec.mjs', 'tests/e2e/data-compatibility.spec.mjs', 'tests/e2e/indexeddb-primary.spec.mjs',
    'ui/confirmation-dialog.js',
    'build-info.json', 'app/build-info.js', 'scripts/build-info.mjs', 'scripts/generate-build-info.mjs',
    'app-version.json', 'app-version.js', 'app/build-guard.js', 'precache-manifest.js', 'offline.html', 'scripts/precache-manifest.mjs', 'scripts/generate-precache-manifest.mjs', 'scripts/test-build-guard.mjs', 'scripts/test-quality-gate.mjs', 'scripts/test-manifest.mjs', 'scripts/generate-pwa-icons.ps1', 'scripts/capture-pwa-screenshots.mjs', '.github/workflows/quality-gate.yml', 'app/numbers.js', 'app/feature-flags.js', 'scripts/test-numbers.mjs', 'scripts/test-feature-flags.mjs', 'data/indexeddb.js', 'data/repositories.js', 'nutrition-data.js', 'fdc-client.js', 'workout-store.js', 'workout-plan.js', 'gym/equipment.js', 'gym/set-model.js', 'gym/workout-load-guidance.js', 'gym/native-workout-importer.js', 'gym/anomaly-detector.js', 'gym/progression-engine.js', 'workout-metrics.js', 'workout-ranking.js', 'workout-ui.js', 'workout-features.js', 'advanced-features.js', 'ui/router.js', 'ui/navigation.js', 'ui/notifications.js', 'ui/form-dialog.js', 'ui/error-boundary.js', 'ui/recovery-view.js', 'progress/muscle-taxonomy.js', 'progress/progress-data-model.js', 'progress/gym-progress-model.js', 'progress/muscle-progress.js', 'progress/exercise-progress.js', 'progress/personal-records.js', 'progress/progress-view.js',
    'firebase-config.js', 'firebase-service.js', 'gym-party-sync.js', 'gym-party-metrics.js', 'gym-party-ui.js', 'gym-party.js',
    'scripts/test-android-webview-security.mjs',
    'scripts/test-android-release.mjs',
    'scripts/test-accessibility.mjs',
    'scripts/test-module-boundaries.mjs', 'scripts/test-design-system.mjs', 'scripts/design-token-allowlist.json', 'scripts/test-router.mjs', 'scripts/test-layout-coordinator.mjs', 'scripts/test-home-settings.mjs', 'scripts/test-progress-view.mjs', 'scripts/test-workout-equipment.mjs', 'scripts/test-workout-anomalies.mjs', 'scripts/test-progression-engine.mjs', 'scripts/sync-app-version.mjs', 'scripts/test-version-alignment.mjs', 'scripts/test-settings-contract.mjs', 'scripts/test-data-layer.mjs',
    'scripts/serve-static.mjs', 'scripts/build-web-dist.mjs', 'scripts/test-web-dist.mjs', 'playwright.config.mjs', 'playwright.web-dist.config.mjs', 'tests/web-dist/web-dist.spec.mjs', 'tests/e2e/gym-flow.spec.mjs', 'tests/e2e/gym-canonical.spec.mjs', 'tests/e2e/gym-set-types.spec.mjs', 'tests/e2e/visual-navigation.spec.mjs', 'tests/e2e/router.spec.mjs', 'tests/e2e/layout-sticky.spec.mjs', 'tests/e2e/home-settings.spec.mjs', 'tests/e2e/notifications-recovery.spec.mjs', 'tests/e2e/progress.spec.mjs', 'tests/e2e/progress-muscle.spec.mjs', 'tests/e2e/progress-exercise.spec.mjs', 'tests/e2e/data-layer.spec.mjs', 'scripts/test-muscle-progress.mjs', 'scripts/test-exercise-progress.mjs',
    'manifest.webmanifest', 'sw.js',
    'styles/tokens.css', 'styles/base.css', 'styles/components.css', 'styles/features.css', 'styles/gym.css', 'styles/gym-party.css', 'styles/modules.css', 'styles/responsive.css',
    'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetProvider.java',
    'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetUpdateService.java',
  'android-native-wrapper/app/src/main/java/com/protocolo/cien/NativeWorkoutControlRepository.java',
  'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutMutationQueue.java',
  'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutNativeRepository.java',
  'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutQuickActionReducer.java',
  'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutTimerController.java',
  'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutControlNotificationManager.java',
  'android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutControlReceiver.java',
    'android-native-wrapper/app/src/main/res/xml/workout_widget_info.xml',
    'android-native-wrapper/app/src/main/res/layout/widget_workout_compact.xml',
    'android-native-wrapper/app/src/main/res/layout/widget_workout_standard.xml',
    'android-native-wrapper/app/src/main/res/layout/widget_workout_expanded.xml',
    'android-native-wrapper/app/src/main/res/values/widget_layout_aliases.xml',
    'android-native-wrapper/app/src/main/res/drawable/widget_background.xml',
    'android-native-wrapper/app/src/main/res/drawable/widget_button.xml',
    'android-native-wrapper/app/src/main/res/drawable/widget_button_secondary.xml'
)
foreach ($file in $requiredFiles) {
    Assert-True (Test-Path -LiteralPath (Join-Path $repoRoot $file) -PathType Leaf) "Falta $file"
}

foreach ($script in @('nutrition-data.js', 'fdc-client.js', 'workout-store.js', 'workout-plan.js', 'workout-metrics.js', 'workout-ranking.js', 'workout-ui.js', 'workout-features.js', 'firebase-service.js', 'gym-party-sync.js', 'gym-party-metrics.js', 'gym-party-ui.js', 'gym-party.js', 'advanced-features.js')) {
    Assert-True ($html.Contains("<script src=`"$script`"></script>")) "index.html no carga $script"
    Assert-True ($precacheManifest.Contains('"url": "./' + $script + '"')) "precache-manifest.js no cachea $script"
}
foreach ($script in @('data/schema-registry.js', 'data/indexeddb.js', 'data/repositories.js', 'data/backup-service.js')) {
    Assert-True ($html.Contains("<script src=`"$script`"></script>")) "index.html no carga $script"
    Assert-True ($precacheManifest.Contains('"url": "./' + $script + '"')) "precache-manifest.js no cachea $script"
}
Assert-True ($html.Contains('<script src="app/numbers.js"></script>')) 'index.html no carga app/numbers.js'
Assert-True ($html.Contains('<script src="app/feature-flags.js"></script>')) 'index.html no carga app/feature-flags.js'
Assert-True ($html.IndexOf('<script src="data/repositories.js"></script>') -lt $html.IndexOf('<script src="app/feature-flags.js"></script>')) 'Feature flags debe usar la capa de repositorios ya cargada'
Assert-True ($html.IndexOf('<script src="app-version.js"></script>') -lt $html.IndexOf('<script src="app/build-guard.js"></script>')) 'El guard de build debe cargar despues de la version'
Assert-True ($html.IndexOf('<script src="app/build-info.js"></script>') -lt $html.IndexOf('<script src="app/numbers.js"></script>')) 'Los metadatos de build deben cargar antes de los modulos'
Assert-True ($html.IndexOf('<script src="app/build-guard.js"></script>') -lt $html.IndexOf('<script src="app/numbers.js"></script>')) 'El guard de build debe cargar antes de los modulos'
foreach ($contract in @('APP_BUILD_INFO','__pwa_update_check','unsafeReasons','serviceWorkerState')) { Assert-True ($buildInfoScript.Contains($contract)) "Falta contrato de metadatos de build: $contract" }
foreach ($contract in @('__PWA_BUILD_MISMATCH','expectedBuild','SKIP_WAITING','root.stop')) { Assert-True ($buildGuard.Contains($contract)) "Falta contrato del guard de build: $contract" }
Assert-True ($precacheManifest.Contains('"url": "./app/numbers.js"')) 'precache-manifest.js no cachea app/numbers.js'
foreach ($contract in @('Intl.NumberFormat', 'parseOr', 'neutral', 'es-PY')) {
    Assert-True ($appNumbers.Contains($contract)) "Falta contrato numerico localizado: $contract"
}
foreach ($script in @('nutrition/nutrition-store.js', 'nutrition/nutrition-model.js', 'nutrition/recipes.js', 'nutrition/portions.js', 'nutrition/food-search.js', 'nutrition/food-entry-flow.js', 'nutrition/meal-history.js', 'nutrition/nutrition-confidence.js', 'nutrition/nutrition-view.js', 'nutrition/food-provider.js', 'nutrition/food-search-service.js')) {
    Assert-True ($html.Contains("<script src=`"$script`"></script>")) "index.html no carga $script"
    Assert-True ($precacheManifest.Contains('"url": "./' + $script + '"')) "precache-manifest.js no cachea $script"
}
foreach ($contract in @('ingredients','nutritionPerServing','recipeSnapshot','duplicate')) {
    Assert-True ($nutritionRecipes.Contains($contract)) "Falta contrato de recetas: $contract"
}
foreach ($contract in @('lastAmount','lastUnit','lastMeal','combinations','favorites','frequent')) {
    Assert-True ($nutritionPortions.Contains($contract)) "Falta contrato de porciones habituales: $contract"
}
Assert-True ($html.IndexOf('<script src="nutrition/nutrition-store.js"></script>') -lt $html.IndexOf('<script src="fdc-client.js"></script>')) 'El dominio Nutricion debe cargar antes del cliente FDC'
Assert-True ($html.IndexOf('<script src="fdc-client.js"></script>') -lt $html.IndexOf('<script src="nutrition/food-provider.js"></script>')) 'El proveedor nutricional debe adaptar al cliente despues de cargarlo'
Assert-True ($html.IndexOf('<script src="nutrition/food-provider.js"></script>') -lt $html.IndexOf('<script src="nutrition/food-search-service.js"></script>')) 'El servicio de busqueda debe cargar despues del proveedor'
foreach ($contract in @('isAvailable','search(query','getFood','normalize(rawFood)','health()')) { Assert-True ($nutritionFoodProvider.Contains($contract)) "Falta contrato de proveedor nutricional: $contract" }
foreach ($contract in @('needsExternal','dedupe','createController','AbortController','externalState')) { Assert-True ($nutritionSearchService.Contains($contract)) "Falta contrato de busqueda nutricional: $contract" }
Assert-True ($html.IndexOf('<script src="data/schema-registry.js"></script>') -lt $html.IndexOf('<script src="data/indexeddb.js"></script>')) 'El registro de schemas debe cargar antes de IndexedDB'
Assert-True ($html.IndexOf('<script src="data/indexeddb.js"></script>') -lt $html.IndexOf('<script src="fdc-client.js"></script>')) 'La capa IndexedDB debe cargar antes de FDC y los modulos de datos'
foreach ($contract in @('compatibilityAudit','verifyCompatibility','clearCompatibilityAudit','compatibilityAuditExport','MAX_COMPATIBILITY_AUDIT_EVENTS')) {
    Assert-True ($indexedData.Contains($contract)) "Falta contrato de auditoria de compatibilidad: $contract"
}
foreach ($contract in @('compatibilityAuditCard','compatibilityAuditSummary','verifyCompatibilityBtn','exportCompatibilityAuditBtn','clearCompatibilityAuditBtn')) {
    Assert-True ($html.Contains($contract)) "Falta UI de auditoria de compatibilidad: $contract"
}
foreach ($contract in @('equipmentProfiles','backupField','sensitive','mirrorEnabled','legacyKeys','fdcSearchCache')) {
    Assert-True ($schemaRegistry.Contains($contract)) "Falta contrato del registro de schemas: $contract"
}
foreach ($contract in @('ProtocolRepository','WorkoutRepository','NutritionRepository','GymPartyLocalRepository','SettingsRepository','BackupRepository')) {
    Assert-True ($repositories.Contains($contract)) "Falta repositorio de datos: $contract"
}
foreach ($contract in @('createRecoverySnapshot','restoreRecovery','replaceMany','BroadcastChannel','QuotaExceededError')) {
    Assert-True ($indexedData.Contains($contract)) "Falta contrato IndexedDB: $contract"
}
foreach ($contract in @('MAX_FILE_BYTES','sanitize','prepareFile','prepareText','createPlan','IMPORT_MODES','CONFLICT_POLICIES','removed','duplicates','replaceMany','undo')) {
    Assert-True ($backupService.Contains($contract)) "Falta contrato de importacion segura: $contract"
}
foreach ($contract in @('importDomainChoices','importPreviewRemoved','importPreviewDuplicates','importReplaceWarning','data-import-mode','data-import-conflict-policy','data-import-conflict-decision')) {
    Assert-True ($html.Contains($contract)) "Falta UI de importacion por areas: $contract"
}
Assert-True ($html.Contains('<script src="ui/router.js"></script>')) 'index.html no carga ui/router.js'
Assert-True ($precacheManifest.Contains('"url": "./ui/router.js"')) 'precache-manifest.js no cachea ui/router.js'
Assert-True ($html.Contains('<script src="ui/navigation.js"></script>')) 'index.html no carga ui/navigation.js'
Assert-True ($precacheManifest.Contains('"url": "./ui/navigation.js"')) 'precache-manifest.js no cachea ui/navigation.js'
foreach ($uiModule in @('notifications', 'inline-validation', 'confirmation-dialog', 'form-dialog', 'error-boundary', 'recovery-view')) {
    Assert-True ($html.Contains('<script src="ui/' + $uiModule + '.js"></script>')) "index.html no carga ui/$uiModule.js"
    Assert-True ($precacheManifest.Contains('"url": "./ui/' + $uiModule + '.js"')) "precache-manifest.js no cachea ui/$uiModule.js"
}
$nativeDialogPattern = '(?<![\w.])(alert|confirm|prompt)\s*\('
foreach ($sourcePath in @('index.html', 'advanced-features.js', 'workout-features.js', 'gym-party.js', 'fdc-client.js')) {
    $sourceText = Get-Content -LiteralPath (Join-Path $repoRoot $sourcePath) -Raw
    Assert-True (-not ($sourceText -match $nativeDialogPattern)) "Queda un dialogo nativo en $sourcePath"
}
Assert-True ($html.Contains('<script src="app-version.js"></script>')) 'index.html no carga app-version.js'
Assert-True ($precacheManifest.Contains('"url": "./app-version.js"')) 'precache-manifest.js no cachea app-version.js'
Assert-True ($html.Contains('<script src="progress/progress-view.js"></script>')) 'index.html no carga progress/progress-view.js'
Assert-True ($precacheManifest.Contains('"url": "./progress/progress-view.js"')) 'precache-manifest.js no cachea progress/progress-view.js'
foreach ($script in @('progress/muscle-taxonomy.js','progress/progress-data-model.js','progress/gym-progress-model.js','progress/muscle-progress.js','progress/exercise-progress.js','progress/personal-records.js')) {
    Assert-True ($html.Contains("<script src=`"$script`"></script>")) "index.html no carga $script"
    Assert-True ($precacheManifest.Contains('"url": "./' + $script + '"')) "precache-manifest.js no cachea $script"
}
foreach ($contract in @('chest','lats','upper-back','front-delts','side-delts','rear-delts','brachialis','lower-back','hamstrings','abductors','tibialis','resolveExercise')) {
    Assert-True ($muscleTaxonomy.Contains($contract)) "Falta contrato de taxonomia muscular: $contract"
}
foreach ($contract in @('progressPeriod','progressArea','progressSummaryMetrics','progressGymSummary','progressNutritionSummary','data-progress-view','data-progress-panel')) {
    Assert-True (($html + $progressView).Contains($contract)) "Falta contrato de Progreso: $contract"
}
foreach ($contract in @('pushState','replaceState','popstate','parentFor','moduleAliases','gym-party','current')) {
    Assert-True ($appRouter.Contains($contract)) "Falta contrato del router: $contract"
}
foreach ($contract in @('visualViewport','focusin','ResizeObserver','layoutStickyAction','layoutContextNav','layout-refresh','keyboardOpen')) {
    Assert-True ($appNavigation.Contains($contract)) "Falta coordinador de layout: $contract"
}
foreach ($contract in @('homeStatusCard','renderHomeStatus','settingsExperienceMode','saveUiSettings','renderSettingsData','resetDataScope','resetAllAppData','BACKUP_META_KEY')) {
    Assert-True ($html.Contains($contract)) "Falta Inicio/Ajustes: $contract"
}
Assert-True ($advanced.Contains("uiPreferences:getLocalData('protocolo_0_100_ui_preferences_v1'")) 'El backup completo no incluye preferencias UI'
Assert-True ($mainActivity.Contains('getAppInfo()')) 'AndroidBridge no expone versión para Acerca de'
foreach ($contract in @('routeBackBtn','applyAppRoute','APP_VIEW_META','data-more-view="settings"','id="tab-data"','id="tab-privacy"','id="tab-about"')) {
    Assert-True ($html.Contains($contract)) "Falta navegación jerárquica: $contract"
}
Assert-True (-not $html.Contains("addEventListener('touchstart'")) 'No debe reactivarse el drawer oculto con gesto lateral'
foreach ($style in @('styles/tokens.css', 'styles/base.css', 'styles/components.css', 'styles/features.css', 'styles/gym.css', 'styles/gym-party.css', 'styles/modules.css', 'styles/responsive.css')) {
    Assert-True ($html.Contains("<link rel=`"stylesheet`" href=`"$style`"")) "index.html no carga $style"
    Assert-True ($precacheManifest.Contains('"url": "./' + $style + '"')) "precache-manifest.js no cachea $style"
    Assert-True ($qualityWorkflow.Contains('npm run test:design')) 'El quality gate debe validar el sistema visual'
}
Assert-True (-not $html.Contains('<style')) 'index.html no debe contener CSS inline en bloques <style>'
Assert-True (-not ($workout + $gymParty).Contains('style.textContent')) 'Gym y Gym Party no deben inyectar hojas CSS'
Assert-True ($styleGym.Contains('.quickLogger')) 'styles/gym.css no contiene el registro rapido'
Assert-True ($styleGymParty.Contains('.partyWorkoutLogger')) 'styles/gym-party.css no contiene el registrador compartido'
Assert-True ($designSystemTest.Contains('design-token-allowlist.json')) 'Falta validacion de presupuestos visuales'
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
foreach ($contract in @('quickStickyActions','data-quick-adjust="reps:1"','data-quick-adjust="weight:0.5"','data-quick-adjust="weight:2.5"','data-quick-adjust="weight:5"','undoDeleteQuickSetPayload','restTimerEnabled','hapticEnabled','quickDrafts','Finalizar entrenamiento')) {
    Assert-True ($workout.Contains($contract)) "Falta UX de registro rapido Gym: $contract"
}
foreach ($contract in @('partyStickySave','data-party-adjust="reps:1"','data-party-adjust="weight:0.5"','data-party-adjust="weight:2.5"','data-party-adjust="weight:5"','partyQuickDrafts','party-undo-delete-set','Finalizar entrenamiento')) {
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
Assert-True ($manifest.orientation -eq 'any') 'El manifest no debe forzar una orientacion'
Assert-True (($manifest.display_override -contains 'standalone')) 'El manifest debe declarar display_override'
Assert-True (($manifest.shortcuts.url -contains './index.html?module=home&view=register')) 'Falta shortcut PWA a Inicio'
Assert-True (($manifest.shortcuts.url -contains './index.html?module=gym&view=train')) 'Falta shortcut PWA a Gym'
Assert-True (($manifest.shortcuts.url -contains './index.html?module=gym&view=group')) 'Falta shortcut PWA a Gym Party'
Assert-True (($manifest.shortcuts.url -contains './index.html?module=gym&view=train&quickLog=1')) 'Falta shortcut PWA a registro rapido'
Assert-True (($manifest.shortcuts.url -contains './index.html?module=nutrition&view=meals')) 'Falta shortcut PWA a Nutricion'
foreach ($icon in @('icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png')) {
    Assert-True (($manifest.icons.src -contains $icon)) "El manifest no declara $icon"
    Assert-True ($precacheManifest.Contains('"url": "./' + $icon + '"')) "precache-manifest.js no cachea $icon"
}
foreach ($screenshot in @('screenshots/mobile-home-390x844.png', 'screenshots/desktop-gym-1440x900.png')) {
    Assert-True (($manifest.screenshots.src -contains $screenshot)) "El manifest no declara $screenshot"
    Assert-True ($precacheManifest.Contains('"url": "./' + $screenshot + '"')) "precache-manifest.js no cachea $screenshot"
}

try { $appVersionManifest = $appVersionText | ConvertFrom-Json } catch { throw 'app-version.json no contiene JSON valido' }
try { $buildInfoManifest = $buildInfo | ConvertFrom-Json } catch { throw 'build-info.json no contiene JSON valido' }
$appVersion = [string]$appVersionManifest.version
$cacheName = "protocolo-0-100-pwa-$appVersion-b$($appVersionManifest.build)"
Assert-True ($appVersionScript.Contains("version:'$appVersion'")) 'app-version.js no coincide con app-version.json'
Assert-True ([string]$buildInfoManifest.version -eq $appVersion) 'build-info.json no coincide en version'
Assert-True ([int]$buildInfoManifest.build -eq [int]$appVersionManifest.build) 'build-info.json no coincide en build'
Assert-True ($advanced.Contains('window.APP_VERSION_INFO')) 'advanced-features.js no consume la fuente unica de version'
Assert-True ($androidBuild.Contains("new groovy.json.JsonSlurper().parse(rootProject.file('../app-version.json'))")) 'Gradle no consume app-version.json'
Assert-True ($serviceWorker.Contains('CACHE_NAME=APP_VERSION_INFO.cacheName')) 'El cache PWA no deriva de app-version.json'
Assert-True ($releaseWorkflow.Contains('VERSION_NAME')) 'El workflow release debe obtener versionName dinamicamente'
Assert-True ($releaseWorkflow.Contains("require('./app-version.json').version")) 'El workflow release no consume app-version.json'
Assert-True ($releaseWorkflow.Contains('protocolo-0-100-v${VERSION_NAME}-release.apk')) 'El APK release debe llevar la version en el nombre'
Assert-True ($readme.Contains("v$appVersion")) "README.md no menciona v$appVersion"
Assert-True ($handoff.Contains($appVersion)) "CODEX_HANDOFF.md no menciona la version $appVersion"
Assert-True ($handoff.Contains($cacheName)) "CODEX_HANDOFF.md no menciona el cache PWA $cacheName"

$pwaSafetyContracts = @(
    'key.startsWith(CACHE_PREFIX)',
    'url.origin!==self.location.origin',
    "event.request.mode==='navigate'",
    'PRECACHE_BY_URL.get(canonicalUrl(event.request.url))',
    'responseFingerprint',
    'STAGING_CACHE_NAME',
    'validateRequiredCache',
    'cachedShellNavigation'
)
foreach ($contract in $pwaSafetyContracts) {
    Assert-True ($serviceWorker.Contains($contract)) "Falta contrato seguro del service worker: $contract"
}
foreach ($contract in @("event.data?.type==='SKIP_WAITING'",'firebaseConfigResponse',"cache:'no-store'",'GYM_PARTY_FIREBASE_CONFIG=window.GYM_PARTY_FIREBASE_CONFIG||{}','PWA_CACHE_DIAGNOSTIC')) {
    Assert-True ($serviceWorker.Contains($contract)) "Falta contrato de actualizacion/config PWA: $contract"
}
Assert-True (-not $serviceWorker.Contains('then(() => self.skipWaiting())')) 'El service worker no debe activarse antes de que el usuario acepte'
foreach ($contract in @('Nueva versi','Actualizar ahora','protocolo_pwa_update_accepted',"postMessage({type:'SKIP_WAITING'})")) {
    Assert-True (($advanced + $html + $buildInfoScript).Contains($contract)) "Falta UX de actualizacion PWA: $contract"
}
foreach ($contract in @('initialRouteParams','initialRouteParams.quickLog','window.openQuickSetLogger?.()')) {
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
    'validPartyCounterMutation',
    'partyMutationAfterIs',
    'membershipRevision',
    'deactivationReason',
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
foreach ($contract in @('assertFails','role:''owner''','EVIL10','wrong_document_id','negative_set','getDoc(doc(outsiderDb','deactivationReason:''removed''','operation:''remove''','Promise.allSettled')) {
    Assert-True ($firestoreRulesTest.Contains($contract)) "Falta prueba negativa de Firestore Rules: $contract"
}
Assert-True ($qualityWorkflow.Contains('npm run test:rules')) 'El quality gate debe ejecutar Firebase Emulator'

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
    'Grupo e invitaciones',
    'partyTrainSection',
    'partyGroupSection',
    'partyProgressSection',
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
    Assert-True (($gymParty + $styleGymParty).Contains($contract)) "Falta contrato Gym Party: $contract"
}
foreach ($contract in @('prepareLocalRows','mergeRemoteRows','markRowsSynced','markRowsError','backoffDelay','latestRemoteTimestamp','timeContext','syncState','remote-newer')) {
    Assert-True ($gymPartySync.Contains($contract)) "Falta contrato de sync incremental: $contract"
}
Assert-True ($gymParty.Contains('batch.set(firestoreMod.doc(db,op.collection,op.payload.id),{...firestorePayload(op.payload,op.collection),updatedAt:timestamp})')) 'El sync debe reemplazar documentos propios para limpiar campos legacy'
Assert-True (-not $gymParty.Contains('firestorePayload(op.payload,op.collection),updatedAt:timestamp},{merge:true}')) 'El sync no debe conservar campos legacy con merge:true'
foreach ($contract in @('firestoreFieldAllowlist','isolatedFailures','firestoreMod.setDoc','detailedError')) {
    Assert-True ($gymParty.Contains($contract)) "Falta aislamiento de payloads Firestore legacy: $contract"
}
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
$accessibilitySource = $html + $styleBase + $styleResponsive + $styleGym + $styleGymParty
foreach ($contract in @('globalLiveRegion',':focus-visible','prefers-reduced-motion','safe-area-inset-bottom','applyAccessibilityEnhancements','label.htmlFor=control.id','trapOverlayFocus','preferredMotionBehavior')) {
    Assert-True ($accessibilitySource.Contains($contract)) "Falta contrato de accesibilidad: $contract"
}
Assert-True ($accessibilityTest.Contains('Accesibilidad correcta')) 'Falta prueba automatica de accesibilidad'
Assert-True ($qualityWorkflow.Contains('node ./scripts/test-accessibility.mjs')) 'El quality gate debe probar accesibilidad web'
foreach ($contract in @('android-chromium','iphone-webkit','Pixel 7','iPhone 13','browserName','serviceWorkers')) {
    Assert-True ($playwrightConfig.Contains($contract)) "Falta configuracion Playwright: $contract"
}
foreach ($contract in @('desktop-chromium','1440','900')) {
    Assert-True ($playwrightConfig.Contains($contract)) "Falta configuracion Playwright escritorio: $contract"
}
foreach ($contract in @('320,360,390,412,430','bottomNav','expectNoHorizontalOverflow','reducedMotion','gymPartyCode','mobile-more.png','desktop-gym.png')) {
    Assert-True ($playwrightVisualTest.Contains($contract)) "Falta cobertura visual E2E: $contract"
}
foreach ($contract in @('Face pull','partyManualRememberWeekday','2026-07-13','Editar serie 1 de Face pull','Eliminar serie 1 de Face pull','party-undo-delete-set','setOffline(true)','gymPartyCode','not.toHaveURL','memberCount','manifest.webmanifest')) {
    Assert-True ($playwrightGymTest.Contains($contract)) "Falta cobertura E2E: $contract"
}
foreach ($contract in @('npm run test:e2e','playwright install --with-deps chromium webkit',':app:assembleRelease','test-release.jks','ANDROID_KEYSTORE_PATH')) {
    Assert-True ($qualityWorkflow.Contains($contract)) "Falta validacion real en el quality gate: $contract"
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
Assert-True ($html.Contains("'gym-party':{module:'gym',view:'group'}")) 'setModule debe conservar compatibilidad con Gym Party'
Assert-True ($html.Contains('id="tab-gym-party"')) 'Falta pestaña Gym Party'
Assert-True ($html.Contains('<script src="gym-party.js"></script>')) 'index.html no carga gym-party.js'
Assert-True ($html.Contains('id="openGymPartyTopBtn" hidden')) 'El acceso superior legacy de Gym Party debe quedar oculto'
Assert-True ($html.Contains('data-open-gym-party')) 'Faltan tarjetas/accesos rapidos a Gym Party'
foreach ($contract in @('data-gym-section="train"','data-gym-section="routine"','data-gym-section="progress"','gymLegacyDetails')) {
    Assert-True ($html.Contains($contract)) "Falta jerarquia Gym: $contract"
}
foreach ($contract in @('id="nutritionTodayCard"','id="nutritionScoreSummary"','id="nutritionWaterAdd250"','data-open-nutrition-view="registrar"','nutritionAssistantDetails','id="nutritionFoodSearchStatus"','id="nutritionFoodVoiceBtn"','progressRewardsDetails','progressSecondaryDetails')) {
    Assert-True ($html.Contains($contract)) "Falta jerarquia progresiva: $contract"
}
Assert-True ($html.Contains('function maybeAutoShowActionModal(){ renderActionCard(); }')) 'La accion diaria no debe abrir un modal automatico'
Assert-True (-not $workout.Contains('setLocalData(GYM_SESSIONS_KEY')) 'Workout nuevo no debe escribir en gymSessions legacy'
Assert-True (-not $progressView.Contains('protocolo_0_100_gym_sessions_v1')) 'Progreso debe leer solo workoutSessions canonico'

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
    'data-plan-field="targetRirMin"',
    'data-plan-field="targetRirMax"',
    'data-plan-field="progressionMode"',
    'data-plan-field="incrementKg"',
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
foreach ($contract in @('widgetNextButton', 'widgetSetStats', 'widgetWeightFastPlusButton', 'WEIGHT_STEP = 0.5', 'WEIGHT_FAST_STEP = 5.0', 'currentExerciseSets', 'currentMuscleSets')) {
    Assert-True ($widgetUpdater.Contains($contract)) "Falta contrato de widget directo: $contract"
}

foreach ($contract in @('native_mutation_queue_v1', 'pending', 'imported', 'rejected', 'undone', 'acknowledgeImported')) {
    Assert-True ($workoutMutationQueue.Contains($contract)) "Falta contrato de cola nativa: $contract"
}
foreach ($contract in @('privateImportState', 'DOUBLE_TAP_WINDOW_MS = 650L', 'expectedRevision', 'revision-conflict')) {
    Assert-True ($nativeWorkoutRepository.Contains($contract)) "Falta contrato de repositorio nativo: $contract"
}
foreach ($contract in @('UUID.randomUUID', 'claimDelivery', 'nativeRevision')) {
    Assert-True ($workoutNativeState.Contains($contract)) "Falta contrato de estado nativo: $contract"
}
foreach ($contract in @('ADJUST_REPS', 'ADJUST_WEIGHT', 'SAVE_SET', 'UNDO_LAST_SET', 'COMPLETE_TIME_SET')) {
    Assert-True ($workoutQuickReducer.Contains($contract)) "Falta reducer nativo comun: $contract"
}

foreach ($contract in @(
    'saveWorkoutWidgetData',
    'getWorkoutWidgetData',
    'updateWorkoutWidget',
    'getNativeWorkoutControlData',
    'getPendingWorkoutMutations',
    'acknowledgeWorkoutMutations',
    'getWorkoutQuickAccessCapabilities',
    'requestPinWorkoutWidget',
    'startWorkoutNotification',
    'stopWorkoutNotification',
    'acknowledgeNativeWorkoutMutation',
    'handleAndroidWidgetIntent'
)) {
    Assert-True ($mainActivity.Contains($contract)) "Falta puente Android/WebView: $contract"
}

foreach ($contract in @('BACKUP_SERVICE.prepareText', 'BACKUP_SERVICE.apply')) {
    Assert-True ($advanced.Contains($contract)) "La importacion debe pasar por el servicio transaccional: $contract"
}
foreach ($recordName in @('activeModule', 'coinLedger', 'monthlyRankings', 'rewards', 'userReferral')) {
    Assert-True ($schemaRegistry.Contains("entry('$recordName'")) "El registro de schemas no cubre la importacion de: $recordName"
}
Assert-True ($backupService.Contains('registry.backupFieldMap()')) 'La importacion debe derivar sus campos del registro de schemas'

foreach ($safetyText in @('no diagnostica deficiencias', 'no son dinero', 'pagos reales requieren backend')) {
    Assert-True ($html.Contains($safetyText)) "Falta aviso de seguridad/legal: $safetyText"
}

foreach ($fdcContract in @('cachedFdcFoods', 'hybridSearch', 'searchFoods', 'getFoodDetails', 'normalizeFood', 'importDataset', 'sourceCitation')) {
    Assert-True ($fdc.Contains($fdcContract)) "Falta contrato FoodData Central: $fdcContract"
}
$demoToken = 'DEMO' + '_KEY'
Assert-True (-not $fdc.Contains($demoToken)) 'No se debe publicar una API key de demostracion ni otra API key en fdc-client.js'
Assert-True ($html.Contains('Fuente: USDA FoodData Central')) 'Falta atribucion de USDA FoodData Central en diagnostico avanzado'
$nutritionEveryday = [regex]::Match($html, '<div class="moduleCard" id="nutritionBuilderCard"[\s\S]*?<div class="moduleCard" id="nutritionDiagnosisCard"').Value
Assert-True ($nutritionEveryday.Length -gt 0) 'No se pudo aislar el flujo cotidiano de Nutricion'
foreach ($technicalTerm in @('USDA','FoodData Central','FDC','API key','dataset','base local','base externa','Importar detalle')) {
    Assert-True (-not $nutritionEveryday.Contains($technicalTerm)) "El flujo cotidiano de Nutricion expone un termino tecnico: $technicalTerm"
}

foreach ($workflow in @($deployWorkflow,$apkWorkflow,$validationWorkflow,$releaseWorkflow)) {
    Assert-True ($workflow.Contains('uses: ./.github/workflows/quality-gate.yml')) 'Todo canal debe depender del quality gate unico'
}
Assert-True ($qualityWorkflow.Contains('./scripts/validate-app.ps1 -CheckAndroidAssets')) 'El gate debe validar paridad web/Android'
Assert-True ($qualityWorkflow.Contains('write-firebase-config.ps1')) 'El gate debe generar Firebase desde secrets si existen'
Assert-True ($qualityWorkflow.Contains('npm run build:web')) 'El gate debe construir el artifact unico'
Assert-True ($qualityWorkflow.Contains('npm run test:web-dist')) 'El gate debe validar recursos y hashes'
Assert-True ($qualityWorkflow.Contains('npm run test:web-dist:e2e')) 'El gate debe abrir el artifact sin errores'
Assert-True ($qualityWorkflow.Contains('npm run test:quality-gate')) 'El gate debe validar su propio contrato'
Assert-True ($deployWorkflow.Contains("if: github.event_name == 'push' || inputs.channel == 'stable'")) 'Pages solo debe publicar el canal estable'
Assert-True ($deployWorkflow.Contains("- '.github/stable-release.json'")) 'Pages debe exigir una solicitud estable versionada'
Assert-True ($deployWorkflow.Contains('    paths:')) 'Pages estable no debe sobrescribirse por cada commit'
Assert-True ($validationWorkflow.Contains('channel: beta')) 'main y PR deben producir artifacts beta'
Assert-True (-not $deployWorkflow.Contains('cp index.html')) 'Pages no debe mantener una lista manual paralela de archivos'
foreach ($contract in @('discoverWebAssets','asset-manifest.json','sha256','WEB_FIREBASE_CONFIG_PATH','app-version.json')) {
    Assert-True ($webDistBuilder.Contains($contract)) "Falta contrato del constructor web: $contract"
}
foreach ($contract in @('createPrecacheManifest','required','optional','cacheName','sha256')) {
    Assert-True (($precacheBuilder + $precacheGenerator).Contains($contract)) "Falta contrato de precache generado: $contract"
}
foreach ($contract in @('app/numbers.js','app/drafts.js','app/dates.js','asset-ausente.js','debe responder 200')) {
    Assert-True ($webDistTest.Contains($contract)) "Falta cobertura HTTP del artifact: $contract"
}
foreach ($contract in @('requestfailed','pageerror','serviceWorker.ready','module=nutrition','module=progress','module=more')) {
    Assert-True ($webDistPlaywright.Contains($contract)) "Falta cobertura navegador del artifact: $contract"
}
Assert-True ($qualityWorkflow.Contains('node ./scripts/test-service-worker.mjs')) 'El gate debe probar la estrategia del service worker'
Assert-True ($qualityGateTest.Contains('Quality gate unico correcto')) 'Falta prueba estructural del quality gate'
Assert-True ($serviceWorkerTest.Contains('api.nal.usda.gov')) 'La prueba del service worker debe cubrir llamadas FDC'
Assert-True ($serviceWorkerTest.Contains('otra-app-cache')) 'La prueba del service worker debe proteger caches ajenos'
Assert-True ($serviceWorkerTest.Contains('SKIP_WAITING')) 'La prueba del service worker debe cubrir activacion consentida'
Assert-True ($serviceWorkerTest.Contains('firebase-config.js')) 'La prueba del service worker debe cubrir configuracion Firebase online/offline'
foreach ($contract in @('failUrls','corruptUrls','missingOptional','deploy incompleto','version anterior')) {
    Assert-True ($serviceWorkerTest.Contains($contract)) "Falta cobertura atomica del service worker: $contract"
}
foreach ($contract in @('32 reps de peso corporal','addedLoadVolume','percentChange(100,0),null','estimatedOneRepMax')) {
    Assert-True ($workoutMetricsTest.Contains($contract)) "Falta prueba de metricas de gym: $contract"
}
foreach ($contract in @('warmup','working','backoff','drop','technique','failure','assisted','countsMainVolume','countsForRecords','countsForProgression')) {
    Assert-True ($setModel.Contains($contract)) "Falta contrato de tipo de serie: $contract"
}
Assert-True ($html.Contains('gym/set-model.js')) 'La app debe cargar el modelo de tipos de serie antes de las metricas'
Assert-True ($html.Contains('gym/equipment.js')) 'La app debe cargar el modelo de equipo antes de tipos de serie'
Assert-True ($html.Contains('gym/anomaly-detector.js')) 'La app debe cargar el detector de anomalias'
Assert-True ($html.Contains('gym/progression-engine.js')) 'La app debe cargar el motor de progresion'
Assert-True ($html.IndexOf('gym/equipment.js') -lt $html.IndexOf('gym/set-model.js')) 'El modelo de equipo debe cargar antes del modelo de serie'
Assert-True ($html.IndexOf('workout-metrics.js') -lt $html.IndexOf('gym/anomaly-detector.js')) 'Las metricas deben cargar antes del detector de anomalias'
Assert-True ($html.IndexOf('gym/anomaly-detector.js') -lt $html.IndexOf('gym/progression-engine.js')) 'El detector de anomalias debe cargar antes del motor de progresion'
Assert-True ($html.IndexOf('workout-metrics.js') -lt $html.IndexOf('gym/progression-engine.js')) 'Las metricas deben cargar antes del motor de progresion'
Assert-True ($precacheManifest.Contains('./gym/set-model.js')) 'El precache debe incluir el modelo de tipos de serie'
Assert-True ($precacheManifest.Contains('./gym/equipment.js')) 'El precache debe incluir el modelo de equipo'
Assert-True ($precacheManifest.Contains('./gym/anomaly-detector.js')) 'El precache debe incluir el detector de anomalias'
Assert-True ($precacheManifest.Contains('./gym/progression-engine.js')) 'El precache debe incluir el motor de progresion'
foreach ($term in @('perHand','perSide','addedLoad','assistance','durationSeconds','distanceMeters','normalizedTotalKg')) {
    Assert-True ($workoutEquipment.Contains($term)) "Falta semantica de equipo/modalidad: $term"
    Assert-True ($workoutEquipmentTest.Contains($term)) "Falta prueba de equipo/modalidad: $term"
}
foreach ($term in @('doubleProgression','loadProgression','repProgression','timeProgression','distanceProgression','assistanceReduction','maintainTechnique','targetRirMin','sessionsCompared','confidence')) {
    Assert-True ($progressionEngine.Contains($term)) "Falta contrato del motor de progresion: $term"
    Assert-True ($progressionEngineTest.Contains($term)) "Falta prueba del motor de progresion: $term"
}
foreach ($term in @('possible-unit-error','load-jump','reps-improbable','load-mode-change','assistance-load-change','exclude-record','exclude-progression')) {
    Assert-True ($anomalyDetector.Contains($term)) "Falta contrato del detector de anomalias: $term"
    Assert-True ($anomalyDetectorTest.Contains($term)) "Falta prueba del detector de anomalias: $term"
}
Assert-True ($html.Contains('progressSuspiciousList')) 'Progreso debe mostrar registros inusuales revisados'
Assert-True ($html.Contains('appConfirmationChoices')) 'El dialogo interno debe admitir decisiones de anomalias'
foreach ($contract in @('node ./scripts/test-workout-features.mjs','node ./scripts/test-workout-metrics.mjs','node ./scripts/test-workout-equipment.mjs','node ./scripts/test-progression-engine.mjs','node ./scripts/test-workout-anomalies.mjs','node ./scripts/test-gym-party.mjs','node ./scripts/test-gym-party-sync.mjs','node ./scripts/test-android-webview-security.mjs','node ./scripts/test-android-release.mjs','node ./scripts/test-accessibility.mjs','npm run test:modules','npm run test:version')) {
    Assert-True ($qualityWorkflow.Contains($contract)) "El quality gate omite: $contract"
}
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

Write-Host "Validacion correcta: version $appVersion, cache PWA $cacheName, $foodCount alimentos, $nutrientCount nutrientes y $($staticIds.Count) IDs estaticos unicos."
