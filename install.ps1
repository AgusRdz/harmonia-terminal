[CmdletBinding()]
param(
  [string]$Variant = 'harmonia-dark'
)

$ErrorActionPreference = 'Stop'

# Run without a clone (irm ...): fetch the repo into a temporary folder
$root = $PSScriptRoot
$repoTmp = $null
if (-not $root -or -not (Test-Path (Join-Path $root 'dist'))) {
  $repoTmp = Join-Path ([IO.Path]::GetTempPath()) "harmonia-$([guid]::NewGuid())"
  New-Item -ItemType Directory -Path $repoTmp | Out-Null
  Write-Host 'Downloading Harmonia from GitHub...'
  $zip = Join-Path $repoTmp 'harmonia.zip'
  $ProgressPreference = 'SilentlyContinue'
  Invoke-WebRequest -Uri 'https://github.com/AgusRdz/harmonia-terminal/archive/refs/heads/main.zip' -OutFile $zip -UseBasicParsing
  Expand-Archive -Path $zip -DestinationPath $repoTmp
  $root = Join-Path $repoTmp 'harmonia-terminal-main'
}

$powershellDir = Join-Path $root 'dist\powershell'
$variants = Get-ChildItem -Path $powershellDir -Filter 'harmonia-*.ps1' | ForEach-Object { $_.BaseName }

if ($variants -notcontains $Variant) {
  throw "Unknown variant '$Variant'. Available: $($variants -join ', ')"
}

$fragmentDir = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows Terminal\Fragments\Harmonia'
New-Item -ItemType Directory -Path $fragmentDir -Force | Out-Null
Copy-Item -Path (Join-Path $root 'dist\windows-terminal\harmonia.json') -Destination $fragmentDir -Force

$configDir = Join-Path $HOME '.config\harmonia'
New-Item -ItemType Directory -Path $configDir -Force | Out-Null
Copy-Item -Path (Join-Path $powershellDir "$Variant.ps1") -Destination (Join-Path $configDir 'harmonia.ps1') -Force
Copy-Item -Path (Join-Path $powershellDir "$Variant.format.ps1xml") -Destination (Join-Path $configDir 'harmonia.format.ps1xml') -Force
Copy-Item -Path (Join-Path $root 'oh-my-posh\harmonia.omp.json') -Destination $configDir -Force

Write-Host "Installed Windows Terminal fragment to $fragmentDir"
Write-Host "Installed $Variant to $configDir\harmonia.ps1"
Write-Host "Installed $Variant file listing format to $configDir\harmonia.format.ps1xml"
Write-Host "Installed oh-my-posh theme to $configDir\harmonia.omp.json"

$herdrDir = Join-Path $HOME '.config\herdr-app'
if (Test-Path $herdrDir) {
  $herdrThemes = Join-Path $herdrDir 'themes'
  New-Item -ItemType Directory -Path $herdrThemes -Force | Out-Null
  Copy-Item -Path (Join-Path $root 'dist\herdr\*.json') -Destination $herdrThemes -Force
  Write-Host "Installed Herdr themes to $herdrThemes"
}
Write-Host ''
Write-Host 'Add this line to your PowerShell profile ($PROFILE):'
Write-Host '  . "$HOME\.config\harmonia\harmonia.ps1"'
Write-Host ''
Write-Host 'If you use oh-my-posh, point it at the theme:'
Write-Host '  oh-my-posh init pwsh --config "$HOME\.config\harmonia\harmonia.omp.json" | Invoke-Expression'
Write-Host ''
Write-Host 'Then restart Windows Terminal and pick a Harmonia color scheme in Settings > Profiles > Appearance.'
if (Test-Path $herdrDir) {
  Write-Host 'In Herdr, pick a harmonia-* theme in Settings, or pair them in a layout: "theme": { "light": "harmonia-light", "dark": "harmonia-dark" }'
}

if ($repoTmp) { Remove-Item -Path $repoTmp -Recurse -Force }
