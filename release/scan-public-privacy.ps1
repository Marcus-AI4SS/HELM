[CmdletBinding()]
param(
  [string]$Root = '',
  [string]$OutPath = ''
)

$ErrorActionPreference = 'Stop'

$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $Root) {
  $Root = (Resolve-Path -LiteralPath (Join-Path $scriptRoot '..')).Path
}
if (-not $OutPath) {
  $OutPath = Join-Path $scriptRoot 'privacy-report.json'
}

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$textExtensions = @(
  '.css', '.html', '.js', '.json', '.lock', '.md', '.mjs', '.ps1', '.py', '.rs',
  '.schema', '.toml', '.ts', '.tsx', '.txt', '.yaml', '.yml'
)

$tokenSpecs = @(
  @{ id = 'local_windows_user_path'; value = ('C:\' + 'Users\17666') },
  @{ id = 'local_posix_user_path'; value = ('C:/' + 'Users/17666') },
  @{ id = 'local_workspace_name'; value = ('AI environment' + '-configuration') },
  @{ id = 'source_repo_name'; value = ('skills-' + 'app-own') },
  @{ id = 'local_environment_repo_name'; value = ('skills-' + 'environment-local') },
  @{ id = 'release_environment_repo_name'; value = ('skills-' + 'environment-release') },
  @{ id = 'mirror_repo_name'; value = ('skills-' + 'app-github') },
  @{ id = 'old_bridge_filename'; value = ('private_' + 'app_bridge.py') },
  @{ id = 'personal_private_lane'; value = ('private+' + 'macos') },
  @{ id = 'obsidian_vault_name'; value = ('Obsidian' + ' Vault') },
  @{ id = 'zotero_database'; value = ('zotero' + '.sqlite') },
  @{ id = 'browser_profile_dash'; value = ('browser' + '-state') },
  @{ id = 'browser_profile_under'; value = ('browser' + '_state') },
  @{ id = 'credential_a_marker'; value = ('access_' + 'token') },
  @{ id = 'credential_r_marker'; value = ('refresh_' + 'token') }
)

$findings = New-Object System.Collections.Generic.List[object]
$scannedFiles = 0
$rootPrefix = ($rootPath -replace '[\\/]+$', '') + [IO.Path]::DirectorySeparatorChar
$rootPrefixLower = $rootPrefix.ToLowerInvariant()

Get-ChildItem -LiteralPath $rootPath -Recurse -File -Force | Where-Object {
  $candidatePath = $_.FullName
  $relativeProbe = if ($candidatePath.ToLowerInvariant().StartsWith($rootPrefixLower)) {
    $candidatePath.Substring($rootPrefix.Length)
  } else {
    $candidatePath
  }
  $relativeProbe = $relativeProbe.Replace('\', '/')
  -not ($relativeProbe -match '(^|/)(\.git|node_modules|dist|target|runtime-resources|ui-smoke|artifacts)(/|$)')
} | ForEach-Object {
  $file = $_
  $fullPath = $file.FullName

  $relativePath = if ($fullPath.ToLowerInvariant().StartsWith($rootPrefixLower)) {
    $fullPath.Substring($rootPrefix.Length)
  } else {
    $fullPath
  }
  if ($relativePath -in @('release\privacy-report.json', 'release/public-release-check-report.json')) {
    return
  }

  $leaf = $file.Name.ToLowerInvariant()
  if ($leaf -eq '.env' -or $leaf.StartsWith('.env.')) {
    $findings.Add([ordered]@{
      id = 'env_file'
      path = $relativePath
      line = 1
      excerpt = 'Environment file must not be committed.'
    })
    return
  }

  if (-not $textExtensions.Contains($file.Extension.ToLowerInvariant())) {
    return
  }

  $scannedFiles += 1
  $content = Get-Content -LiteralPath $fullPath -Raw -ErrorAction Stop
  if ($null -eq $content) {
    $content = ''
  }
  foreach ($spec in $tokenSpecs) {
    if ($content.Contains($spec.value)) {
      $lines = $content -split "`r?`n"
      for ($index = 0; $index -lt $lines.Length; $index += 1) {
        if ($lines[$index].Contains($spec.value)) {
          $findings.Add([ordered]@{
            id = $spec.id
            path = $relativePath
            line = $index + 1
            excerpt = $lines[$index].Trim()
          })
        }
      }
    }
  }
}

$report = [ordered]@{
  ok = ($findings.Count -eq 0)
  generated_at_utc = (Get-Date).ToUniversalTime().ToString('o')
  root = '<repository-root>'
  scanned_files = $scannedFiles
  finding_count = $findings.Count
  findings = $findings.ToArray()
}

$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutPath -Encoding UTF8

if ($findings.Count -gt 0) {
  Write-Error "Public privacy scan failed with $($findings.Count) finding(s). See $OutPath"
}

Write-Host "Public privacy scan passed: $scannedFiles files scanned."
