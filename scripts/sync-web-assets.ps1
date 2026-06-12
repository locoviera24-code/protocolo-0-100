param(
    [switch]$Check
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $repoRoot 'android-native-wrapper/app/src/main/assets'
$relativeFiles = @(
    'index.html',
    'nutrition-data.js',
    'advanced-features.js',
    'manifest.webmanifest',
    'sw.js',
    'icons/icon-192.png',
    'icons/icon-512.png'
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
