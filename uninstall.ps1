[CmdletBinding()]
param()

# Removes what install.ps1 copied, then lists the profile and settings lines that still point at
# Harmonia. It does not edit $PROFILE or Windows Terminal's settings.

$ErrorActionPreference = 'Stop'

# Run without a clone (irm ...): fetch the latest release into a temporary folder
$root = $PSScriptRoot
$repoTmp = $null
if (-not $root -or -not (Test-Path (Join-Path $root 'dist'))) {
  $tag = (Invoke-RestMethod -Uri 'https://api.github.com/repos/AgusRdz/harmonia-terminal/releases/latest' -UseBasicParsing).tag_name
  $repoTmp = Join-Path ([IO.Path]::GetTempPath()) "harmonia-$([guid]::NewGuid())"
  New-Item -ItemType Directory -Path $repoTmp | Out-Null
  Write-Host "Downloading Harmonia $tag from GitHub..."
  $zip = Join-Path $repoTmp 'harmonia.zip'
  $ProgressPreference = 'SilentlyContinue'
  Invoke-WebRequest -Uri "https://github.com/AgusRdz/harmonia-terminal/archive/refs/tags/$tag.zip" -OutFile $zip -UseBasicParsing
  Expand-Archive -Path $zip -DestinationPath $repoTmp
  $root = (Get-ChildItem -Path $repoTmp -Directory)[0].FullName
}

function Remove-Installed([string]$Path) {
  if (Test-Path $Path) {
    Remove-Item -Path $Path -Recurse -Force
    Write-Host "Removed $Path"
  }
}

# Reports non-comment lines that mention Harmonia, since they break or fall back once the files are gone
function Show-References([string]$File, [string]$Hint) {
  if (-not (Test-Path $File)) { return }
  $lines = Select-String -Path $File -Pattern 'harmonia' | Where-Object { $_.Line -notmatch '^\s*(#|//)' }
  foreach ($match in $lines) {
    Write-Host "  $File line $($match.LineNumber): $($match.Line.Trim())" -ForegroundColor Yellow
    Write-Host "    $Hint"
  }
}

Remove-Installed (Join-Path $env:LOCALAPPDATA 'Microsoft\Windows Terminal\Fragments\Harmonia')

$configDir = Join-Path $HOME '.config\harmonia'
foreach ($file in 'harmonia.ps1', 'harmonia.format.ps1xml', 'harmonia.omp.json') {
  Remove-Installed (Join-Path $configDir $file)
}
if ((Test-Path $configDir) -and -not (Get-ChildItem -Path $configDir -Force)) {
  Remove-Item -Path $configDir
  Write-Host "Removed $configDir"
}

# Only the files this repo ships, so other Herdr themes stay
$herdrThemes = Join-Path $HOME '.config\herdr-app\themes'
if (Test-Path $herdrThemes) {
  foreach ($theme in Get-ChildItem -Path (Join-Path $root 'dist\herdr') -Filter '*.json') {
    Remove-Installed (Join-Path $herdrThemes $theme.Name)
  }
}

Write-Host ''
Write-Host 'Lines that still point at Harmonia (remove or change them):'

$documents = [Environment]::GetFolderPath('MyDocuments')
foreach ($shell in 'PowerShell', 'WindowsPowerShell') {
  foreach ($name in 'profile.ps1', 'Microsoft.PowerShell_profile.ps1') {
    Show-References (Join-Path $documents "$shell\$name") 'PowerShell shows an error at startup until this line is removed.'
  }
}

foreach ($settings in @(
    (Join-Path $env:LOCALAPPDATA 'Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json'),
    (Join-Path $env:LOCALAPPDATA 'Packages\Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe\LocalState\settings.json'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Windows Terminal\settings.json'))) {
  Show-References $settings 'Windows Terminal falls back to its default scheme; pick another in Settings > Profiles > Appearance.'
}

Write-Host ''
Write-Host 'Done. Restart Windows Terminal and PowerShell.'

if ($repoTmp) { Remove-Item -Path $repoTmp -Recurse -Force }
