#Requires -Version 7
<#
.SYNOPSIS
  Read-only check for "Cannot load PSReadline module" in PowerShell 7 caused by
  PSReadLine's Microsoft signing certificate sitting in Cert:\CurrentUser\Disallowed.

.DESCRIPTION
  Reports the signature status of PSReadLine.format.ps1xml and whether its signer is in a
  Disallowed store. Changes nothing. If it reports the same issue, run .\fix-psreadline.ps1.

.EXAMPLE
  .\check-psreadline.ps1
#>
$ErrorActionPreference = 'Stop'

$formatFile = Join-Path $PSHOME 'Modules\PSReadLine\PSReadLine.format.ps1xml'
if (-not (Test-Path $formatFile)) { throw "PSReadLine format file not found: $formatFile" }

$sig = Get-AuthenticodeSignature $formatFile
$thumb = $sig.SignerCertificate.Thumbprint
$inUser = Test-Path "Cert:\CurrentUser\Disallowed\$thumb"
$inMachine = Test-Path "Cert:\LocalMachine\Disallowed\$thumb"
$byPolicy = (Test-Path "HKCU:\Software\Policies\Microsoft\SystemCertificates\Disallowed\Certificates\$thumb") -or
            (Test-Path "HKLM:\Software\Policies\Microsoft\SystemCertificates\Disallowed\Certificates\$thumb")

Write-Host "PowerShell          : $($PSVersionTable.PSVersion)"
Write-Host "Signature status    : $($sig.Status)"
Write-Host "Signer thumbprint   : $thumb"
Write-Host "Disallowed (user)   : $inUser"
Write-Host "Disallowed (machine): $inMachine"
Write-Host "Pushed by policy    : $byPolicy"
Write-Host ''

if ($sig.Status -eq 'Valid') {
  Write-Host 'Not this issue: the signature is trusted.' -ForegroundColor Green
  Write-Host 'If PSReadLine still fails, see the real error with:'
  Write-Host '  pwsh -NoProfile -Command "Import-Module PSReadLine -Verbose"'
}
elseif ($inMachine -or $byPolicy) {
  Write-Host 'Blocked at machine or Group Policy level. Ask IT; do not run the fix script.' -ForegroundColor Red
}
elseif (-not $inUser) {
  Write-Host "Signature is $($sig.Status) but the signer is not in Disallowed. Different cause; check:" -ForegroundColor Yellow
  Write-Host '  pwsh -NoProfile -Command "Import-Module PSReadLine -Verbose"'
}
else {
  Write-Host 'Same issue: the signer is distrusted in your CurrentUser\Disallowed store.' -ForegroundColor Yellow
  Write-Host 'Fix it with: .\fix-psreadline.ps1'
}
