[CmdletBinding()]
param(
  [string]$Browser = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  [string]$WindowSize = '800,335'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent
$preview = Join-Path $root 'docs\preview.html'
$imagesDir = Join-Path $root 'docs\images'
if (-not (Test-Path $preview)) { throw "Run 'npm run preview' first: $preview not found" }
if (-not (Test-Path $Browser)) { throw "Browser not found: $Browser" }
New-Item -ItemType Directory -Path $imagesDir -Force | Out-Null

$slugs = Get-ChildItem (Join-Path $root 'dist\powershell') -Filter 'harmonia-*.ps1' | ForEach-Object { $_.BaseName }
$url = ([System.Uri]$preview).AbsoluteUri

# A throwaway profile keeps headless Edge from touching the user's browser profile
$profileDir = Join-Path ([System.IO.Path]::GetTempPath()) "harmonia-screenshots-$PID"
try {
  foreach ($slug in $slugs) {
    $png = Join-Path $imagesDir "$slug.png"
    & $Browser --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$profileDir" `
      --window-size=$WindowSize --screenshot="$png" "$url`?variant=$slug" 2>$null | Out-Null
    if (-not (Test-Path $png)) { throw "Screenshot failed for $slug" }
    Write-Host "Wrote $png"
  }
} finally {
  Remove-Item $profileDir -Recurse -Force -ErrorAction SilentlyContinue
}
