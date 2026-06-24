param(
    [string]$OutputPath = ''
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $repoRoot 'firebase-config.js'
}

if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    $targetPath = [System.IO.Path]::GetFullPath($OutputPath)
} else {
    $targetPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
}

$parent = Split-Path -Parent $targetPath
if (-not [string]::IsNullOrWhiteSpace($parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

$required = @(
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_APP_ID'
)

$hasRequired = $true
foreach ($name in $required) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
        $hasRequired = $false
    }
}

if (-not $hasRequired) {
    $stub = Join-Path $repoRoot 'firebase-config.js'
    $stubPath = [System.IO.Path]::GetFullPath($stub)
    if ((Test-Path -LiteralPath $stubPath -PathType Leaf) -and ($targetPath -ne $stubPath)) {
        Copy-Item -LiteralPath $stubPath -Destination $targetPath -Force
    } elseif (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
        Set-Content -LiteralPath $targetPath -Encoding UTF8 -Value @'
// Configuracion publica opcional para Gym Party Firebase.
window.GYM_PARTY_FIREBASE_CONFIG = window.GYM_PARTY_FIREBASE_CONFIG || {};
'@
    }
    Write-Host 'Firebase config no generada: faltan secrets FIREBASE_* requeridos. Se usa stub seguro.'
    exit 0
}

$config = [ordered]@{
    apiKey = [Environment]::GetEnvironmentVariable('FIREBASE_API_KEY')
    authDomain = [Environment]::GetEnvironmentVariable('FIREBASE_AUTH_DOMAIN')
    projectId = [Environment]::GetEnvironmentVariable('FIREBASE_PROJECT_ID')
    appId = [Environment]::GetEnvironmentVariable('FIREBASE_APP_ID')
}

$messagingSenderId = [Environment]::GetEnvironmentVariable('FIREBASE_MESSAGING_SENDER_ID')
if (-not [string]::IsNullOrWhiteSpace($messagingSenderId)) {
    $config.messagingSenderId = $messagingSenderId
}

$storageBucket = [Environment]::GetEnvironmentVariable('FIREBASE_STORAGE_BUCKET')
if (-not [string]::IsNullOrWhiteSpace($storageBucket)) {
    $config.storageBucket = $storageBucket
}

$json = $config | ConvertTo-Json -Depth 4
$content = @"
// Generado por scripts/write-firebase-config.ps1.
// La API key web de Firebase es publica; no incluir service accounts ni claves privadas.
window.GYM_PARTY_FIREBASE_CONFIG = $json;
"@

Set-Content -LiteralPath $targetPath -Encoding UTF8 -Value $content
Write-Host "Firebase config escrita en $targetPath"
