[CmdletBinding()]
param(
  [switch]$SkipUiSmoke,
  [string]$Root = '',
  [string]$OutPath = ''
)

$ErrorActionPreference = 'Stop'
$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $Root) {
  $Root = (Resolve-Path -LiteralPath (Join-Path $scriptRoot '..')).Path
}
if (-not $OutPath) {
  $OutPath = Join-Path $scriptRoot 'public-release-check-report.json'
}
$repoRoot = (Resolve-Path -LiteralPath $Root).Path
$steps = New-Object System.Collections.Generic.List[object]

function Invoke-ReleaseStep {
  param(
    [string]$Name,
    [scriptblock]$Command
  )

  $started = Get-Date
  Write-Host "==> $Name"
  try {
    $global:LASTEXITCODE = 0
    & $Command
    if ($global:LASTEXITCODE -ne 0) {
      throw "$Name exited with code $global:LASTEXITCODE"
    }
    $steps.Add([ordered]@{
      name = $Name
      status = 'passed'
      duration_seconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 2)
    })
  } catch {
    $steps.Add([ordered]@{
      name = $Name
      status = 'failed'
      duration_seconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 2)
      error = $_.Exception.Message
    })
    throw
  }
}

function Get-SigningReadiness {
  return [ordered]@{
    windows_signing = if ($env:WINDOWS_CODESIGN_CERT) { 'configured' } else { 'not_configured' }
    macos_developer_id = if ($env:APPLE_DEVELOPER_ID_APPLICATION) { 'configured' } else { 'not_configured' }
    macos_notarization = if ($env:APPLE_NOTARIZATION_PROFILE) { 'configured' } else { 'not_configured' }
    note = 'not_configured is allowed for source public candidates; tagged binary releases should configure signing.'
  }
}

$report = [ordered]@{
  ok = $false
  generated_at_utc = (Get-Date).ToUniversalTime().ToString('o')
  repository = 'HELM'
  release_lane = 'public-candidate'
  version = $null
  steps = @()
  signing_readiness = Get-SigningReadiness
  privacy_report = 'release/privacy-report.json'
  ui_smoke_report = if ($SkipUiSmoke) { $null } else { 'release/ui-smoke/ui-smoke-report.json' }
}

try {
  Push-Location -LiteralPath $repoRoot

  $packageJson = Get-Content -LiteralPath 'apps/desktop/package.json' -Raw | ConvertFrom-Json
  $report.version = $packageJson.version

  Invoke-ReleaseStep 'privacy_scan' {
    powershell -ExecutionPolicy Bypass -File (Join-Path $repoRoot 'release/scan-public-privacy.ps1')
  }

  Invoke-ReleaseStep 'python_compile' {
    python -m py_compile `
      (Join-Path $repoRoot 'skills/scripts/helm_app_bridge.py') `
      (Join-Path $repoRoot 'skills/manager/research_env.py')
  }

  Invoke-ReleaseStep 'npm_install_if_missing' {
    Push-Location -LiteralPath (Join-Path $repoRoot 'apps/desktop')
    try {
      if (-not (Test-Path -LiteralPath 'node_modules')) {
        npm ci
      }
    } finally {
      Pop-Location
    }
  }

  Invoke-ReleaseStep 'frontend_build' {
    Push-Location -LiteralPath (Join-Path $repoRoot 'apps/desktop')
    try {
      npm run build
    } finally {
      Pop-Location
    }
  }

  Invoke-ReleaseStep 'tauri_cargo_check' {
    Push-Location -LiteralPath (Join-Path $repoRoot 'apps/desktop/src-tauri')
    try {
      cargo check
    } finally {
      Pop-Location
    }
  }

  if (-not $SkipUiSmoke) {
    Invoke-ReleaseStep 'ui_smoke' {
      Push-Location -LiteralPath (Join-Path $repoRoot 'apps/desktop')
      try {
        npm run verify:ui
      } finally {
        Pop-Location
      }
    }
  }

  $report.ok = $true
} catch {
  $report.ok = $false
  $report.error = $_.Exception.Message
  throw
} finally {
  $report.steps = $steps.ToArray()
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutPath -Encoding UTF8
  Pop-Location
}

Write-Host "Public release check report: $OutPath"
