#Requires -Version 7
<#
.SYNOPSIS
  Fixes "Cannot load PSReadline module" in PowerShell 7 when PSReadLine's Microsoft signing
  certificate is in Cert:\CurrentUser\Disallowed. Run .\check-psreadline.ps1 first.

.DESCRIPTION
  Backs the certificate up to a .cer file, removes it from CurrentUser\Disallowed, and
  verifies PSReadLine loads. Refuses to act unless the signer is distrusted at user level
  only; machine-level or Group Policy entries are IT decisions.

  -Undo re-adds the certificate to CurrentUser\Disallowed from the backup.

.EXAMPLE
  .\fix-psreadline.ps1
.EXAMPLE
  .\fix-psreadline.ps1 -Undo
#>
[CmdletBinding(SupportsShouldProcess)]
param(
  [switch] $Undo,
  [string] $BackupPath = (Join-Path $HOME 'psreadline-disallowed-backup.cer')
)

$ErrorActionPreference = 'Stop'

if ($Undo) {
  if (-not (Test-Path $BackupPath)) { throw "Backup not found: $BackupPath" }
  if ($PSCmdlet.ShouldProcess('Cert:\CurrentUser\Disallowed', "Re-add certificate from $BackupPath")) {
    Import-Certificate -FilePath $BackupPath -CertStoreLocation Cert:\CurrentUser\Disallowed | Out-Null
    Write-Host 'Restored: certificate is back in CurrentUser\Disallowed.' -ForegroundColor Yellow
  }
  return
}

$formatFile = Join-Path $PSHOME 'Modules\PSReadLine\PSReadLine.format.ps1xml'
if (-not (Test-Path $formatFile)) { throw "PSReadLine format file not found: $formatFile" }

$sig = Get-AuthenticodeSignature $formatFile
$thumb = $sig.SignerCertificate.Thumbprint
$inUser = Test-Path "Cert:\CurrentUser\Disallowed\$thumb"
$inMachine = Test-Path "Cert:\LocalMachine\Disallowed\$thumb"
$byPolicy = (Test-Path "HKCU:\Software\Policies\Microsoft\SystemCertificates\Disallowed\Certificates\$thumb") -or
            (Test-Path "HKLM:\Software\Policies\Microsoft\SystemCertificates\Disallowed\Certificates\$thumb")

if ($sig.Status -eq 'Valid' -or -not $inUser) {
  Write-Host 'Nothing to fix: the signer is not distrusted in CurrentUser\Disallowed. Run .\check-psreadline.ps1 for details.' -ForegroundColor Green
  return
}
if ($inMachine -or $byPolicy) {
  Write-Host 'Blocked at machine or Group Policy level. Ask IT; not changing it.' -ForegroundColor Red
  return
}

if ($PSCmdlet.ShouldProcess("Cert:\CurrentUser\Disallowed\$thumb", 'Back up and remove')) {
  $cert = Get-Item "Cert:\CurrentUser\Disallowed\$thumb"
  [IO.File]::WriteAllBytes($BackupPath, $cert.Export('Cert'))
  $check = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($BackupPath)
  if ($check.Thumbprint -ne $thumb) { throw "Backup verification failed: $BackupPath" }
  Write-Host "Backup saved        : $BackupPath"

  Remove-Item "Cert:\CurrentUser\Disallowed\$thumb"
  Write-Host "Signature status    : $((Get-AuthenticodeSignature $formatFile).Status)"

  pwsh -NoProfile -Command "Import-Module PSReadLine -ErrorAction Stop; 'PSReadLine ' + (Get-Module PSReadLine).Version + ' loads OK'"
  if ($LASTEXITCODE -ne 0) { Write-Host 'Still failing. Undo with: .\fix-psreadline.ps1 -Undo' -ForegroundColor Red; return }
  Write-Host 'Fixed. Open a new PowerShell window.' -ForegroundColor Green
  Write-Host 'Undo anytime with: .\fix-psreadline.ps1 -Undo'
}
