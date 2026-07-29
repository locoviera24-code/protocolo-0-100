param(
    [switch]$Check
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $repoRoot 'android-native-wrapper/app/src/main/assets'
$relativeFiles = @(
    'index.html',
    'offline.html',
    'app-version.js',
    'build-info.json',
    'precache-manifest.js',
    'app/build-guard.js',
    'app/build-info.js',
    'app/numbers.js',
    'app/drafts.js',
    'app/dates.js',
    'app/feature-flags.js',
    'data/schema-registry.js',
    'data/indexeddb.js',
    'data/repositories.js',
    'data/backup-service.js',
    'nutrition-data.js',
    'nutrition/nutrition-store.js',
    'nutrition/nutrition-model.js',
    'nutrition/recipes.js',
    'nutrition/portions.js',
    'nutrition/food-search.js',
    'nutrition/food-provider.js',
    'nutrition/food-search-service.js',
    'nutrition/food-entry-flow.js',
    'nutrition/meal-history.js',
    'nutrition/nutrition-confidence.js',
    'nutrition/nutrition-view.js',
    'fdc-client.js',
    'workout-store.js',
    'workout-plan.js',
    'gym/equipment.js',
    'gym/set-model.js',
    'gym/anomaly-detector.js',
    'gym/progression-engine.js',
    'workout-metrics.js',
    'gym/workout-load-guidance.js',
    'gym/native-workout-importer.js',
    'workout-ranking.js',
    'workout-ui.js',
    'workout-features.js',
    'firebase-config.js',
    'firebase-service.js',
    'gym-party-sync.js',
    'gym-party-metrics.js',
    'gym-party-ui.js',
    'gym-party.js',
    'advanced-features.js',
    'manifest.webmanifest',
    'sw.js',
    'ui/router.js',
    'ui/navigation.js',
    'ui/notifications.js',
    'ui/inline-validation.js',
    'ui/confirmation-dialog.js',
    'ui/form-dialog.js',
    'ui/error-boundary.js',
    'ui/recovery-view.js',
    'progress/progress-data-model.js',
    'progress/muscle-taxonomy.js',
    'progress/gym-progress-model.js',
    'progress/muscle-progress.js',
    'progress/exercise-progress.js',
    'progress/personal-records.js',
    'progress/progress-view.js',
    'styles/tokens.css',
    'styles/base.css',
    'styles/components.css',
    'styles/features.css',
    'styles/gym.css',
    'styles/gym-party.css',
    'styles/modules.css',
    'styles/responsive.css',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/icon-maskable-192.png',
    'icons/icon-maskable-512.png',
    'icons/shortcut-home-96.png',
    'icons/shortcut-gym-96.png',
    'icons/shortcut-set-96.png',
    'icons/shortcut-nutrition-96.png',
    'icons/shortcut-party-96.png',
    'screenshots/mobile-home-390x844.png',
    'screenshots/desktop-gym-1440x900.png'
)

$mismatches = @()

foreach ($relativeFile in $relativeFiles) {
    $source = Join-Path $repoRoot $relativeFile
    $destination = Join-Path $assetRoot $relativeFile

    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Falta el archivo web fuente: $relativeFile"
    }

    if ($Check) {
        if (-not (Test-Path -LiteralPath $destination -PathType Leaf)) {
            $mismatches += $relativeFile
            continue
        }

        $sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
        $destinationHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
        if ($sourceHash -ne $destinationHash) {
            $mismatches += $relativeFile
        }
        continue
    }

    $destinationDirectory = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination -Force
    Write-Host "Sincronizado: $relativeFile"
}

if ($Check -and $mismatches.Count -gt 0) {
    Write-Error "Los assets Android no estan sincronizados: $($mismatches -join ', ')"
    exit 1
}

if ($Check) {
    Write-Host 'Los assets web y Android estan sincronizados.'
}
