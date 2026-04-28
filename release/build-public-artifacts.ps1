[CmdletBinding()]
param(
  [switch]$SkipReleaseCheck,
  [switch]$SkipUiSmoke,
  [switch]$SkipTauriBuild,
  [string]$Root = '',
  [string]$OutDir = ''
)

$ErrorActionPreference = 'Stop'

$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $Root) {
  $Root = (Resolve-Path -LiteralPath (Join-Path $scriptRoot '..')).Path
}
if (-not $OutDir) {
  $OutDir = Join-Path $scriptRoot 'artifacts'
}

$repoRoot = (Resolve-Path -LiteralPath $Root).Path
$artifactRoot = Join-Path $OutDir 'public-candidate'
$bundleRoot = Join-Path $repoRoot 'apps/desktop/src-tauri/target/release/bundle'
$manifestPath = Join-Path $artifactRoot 'artifact-manifest.json'
$readinessPath = Join-Path $artifactRoot 'signing-readiness-report.json'
$checksumPath = Join-Path $artifactRoot 'SHA256SUMS.txt'

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Command
  )
  Write-Host "==> $Name"
  & $Command
  if ($global:LASTEXITCODE -ne 0) {
    throw "$Name exited with code $global:LASTEXITCODE"
  }
}

function Get-Readiness {
  return [ordered]@{
    generated_at_utc = (Get-Date).ToUniversalTime().ToString('o')
    windows_signing = if ($env:WINDOWS_CODESIGN_CERT -or $env:WINDOWS_CODESIGN_IDENTITY) { 'configured' } else { 'not_configured' }
    macos_developer_id = if ($env:APPLE_DEVELOPER_ID_APPLICATION) { 'configured' } else { 'not_configured' }
    macos_notarization = if ($env:APPLE_NOTARIZATION_PROFILE -or ($env:APPLE_ID -and $env:APPLE_TEAM_ID)) { 'configured' } else { 'not_configured' }
    policy = 'Unsigned artifacts are allowed for public-candidate checks. Tagged public releases should sign or clearly label unsigned artifacts.'
  }
}

function Copy-ArtifactFile {
  param([IO.FileInfo]$File)
  $relative = $File.FullName.Substring($bundleRoot.Length).TrimStart('\', '/')
  $target = Join-Path $artifactRoot $relative
  $targetDir = Split-Path -Parent $target
  if (-not (Test-Path -LiteralPath $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Null
  }
  Copy-Item -LiteralPath $File.FullName -Destination $target -Force
  return Get-Item -LiteralPath $target
}

Push-Location -LiteralPath $repoRoot
try {
  if (-not $SkipReleaseCheck) {
    $args = @('-ExecutionPolicy', 'Bypass', '-File', (Join-Path $repoRoot 'release/check-public-release.ps1'))
    if ($SkipUiSmoke) {
      $args += '-SkipUiSmoke'
    }
    Invoke-Step 'public_release_check' {
      powershell @args
    }
  }

  if (-not (Test-Path -LiteralPath (Join-Path $repoRoot 'apps/desktop/node_modules'))) {
    Invoke-Step 'npm_ci' {
      Push-Location -LiteralPath (Join-Path $repoRoot 'apps/desktop')
      try { npm ci } finally { Pop-Location }
    }
  }

  if (-not $SkipTauriBuild) {
    Invoke-Step 'tauri_build' {
      Push-Location -LiteralPath (Join-Path $repoRoot 'apps/desktop')
      try { npm run tauri build } finally { Pop-Location }
    }
  }

  if (Test-Path -LiteralPath $artifactRoot) {
    Remove-Item -LiteralPath $artifactRoot -Recurse -Force
  }
  New-Item -ItemType Directory -Path $artifactRoot | Out-Null

  $readiness = Get-Readiness
  $readiness | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $readinessPath -Encoding UTF8

  $artifactFiles = New-Object System.Collections.Generic.List[object]
  if ((Test-Path -LiteralPath $bundleRoot) -and -not $SkipTauriBuild) {
    $extensions = @('.exe', '.msi', '.dmg', '.appimage', '.deb', '.rpm', '.zip', '.tar.gz', '.tgz')
    Get-ChildItem -LiteralPath $bundleRoot -Recurse -File | ForEach-Object {
      $name = $_.Name.ToLowerInvariant()
      $ext = $_.Extension.ToLowerInvariant()
      if ($extensions.Contains($ext) -or $name.EndsWith('.tar.gz')) {
        $copied = Copy-ArtifactFile $_
        $artifactFiles.Add($copied) | Out-Null
      }
    }
  }

  $checksumRows = New-Object System.Collections.Generic.List[string]
  foreach ($file in $artifactFiles) {
    $hash = Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256
    $relative = $file.FullName.Substring($artifactRoot.Length).TrimStart('\', '/').Replace('\', '/')
    $checksumRows.Add("$($hash.Hash.ToLowerInvariant())  $relative") | Out-Null
  }
  if ($checksumRows.Count -eq 0) {
    $checksumRows.Add('# No binary artifacts copied. Run without -SkipTauriBuild on a supported platform.') | Out-Null
  }
  $checksumRows | Set-Content -LiteralPath $checksumPath -Encoding UTF8

  $manifest = [ordered]@{
    ok = $true
    generated_at_utc = (Get-Date).ToUniversalTime().ToString('o')
    repository = 'HELM'
    release_lane = 'public-candidate'
    source_commit = (git rev-parse HEAD)
    platform = [System.Runtime.InteropServices.RuntimeInformation]::OSDescription
    skip_tauri_build = [bool]$SkipTauriBuild
    artifact_root = 'release/artifacts/public-candidate'
    artifact_count = $artifactFiles.Count
    artifacts = @($artifactFiles | ForEach-Object {
      [ordered]@{
        path = $_.FullName.Substring($artifactRoot.Length).TrimStart('\', '/').Replace('\', '/')
        size_bytes = $_.Length
      }
    })
    checksums = 'release/artifacts/public-candidate/SHA256SUMS.txt'
    signing_readiness = 'release/artifacts/public-candidate/signing-readiness-report.json'
  }
  $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
  Write-Host "Artifact manifest: $manifestPath"
} finally {
  Pop-Location
}

