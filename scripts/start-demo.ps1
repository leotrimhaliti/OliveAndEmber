# Convenience launcher for this Windows workspace. Run from the repository root.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$portablePhp = Join-Path $projectRoot '.tools/php/php.exe'
$mailpitCommand = Join-Path $projectRoot '.tools/mailpit/mailpit.exe'
$phpCommand = if (Test-Path $portablePhp) { $portablePhp } else { (Get-Command php).Source }
$nodeCommand = (Get-Command node).Source
$logDirectory = Join-Path $projectRoot '.tools'
New-Item -ItemType Directory -Force $logDirectory | Out-Null
if (-not (Test-Path $mailpitCommand)) {
    throw 'Mailpit is missing. Run ./scripts/install-mailpit.ps1 first.'
}
foreach ($port in @(8000, 5173, 1025, 8025)) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $port is already in use. The demo may already be running."
    }
}
$mailpitProcess = Start-Process -FilePath $mailpitCommand -ArgumentList @('--smtp', '127.0.0.1:1025', '--listen', '127.0.0.1:8025', '--database', (Join-Path $logDirectory 'mailpit.db'), '--disable-version-check') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'mailpit.log') -RedirectStandardError (Join-Path $logDirectory 'mailpit-error.log')
$apiProcess = Start-Process -FilePath $phpCommand -ArgumentList @('artisan', 'serve', '--host=127.0.0.1', '--port=8000') -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'backend.log') -RedirectStandardError (Join-Path $logDirectory 'backend-error.log')
$webProcess = Start-Process -FilePath $nodeCommand -ArgumentList @('node_modules/vite/bin/vite.js', '--host', '127.0.0.1') -WorkingDirectory (Join-Path $projectRoot 'frontend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'frontend.log') -RedirectStandardError (Join-Path $logDirectory 'frontend-error.log')
Write-Output "Demo starting at http://127.0.0.1:5173. Mailpit inbox: http://127.0.0.1:8025. Mailpit process: $($mailpitProcess.Id); API process: $($apiProcess.Id); frontend process: $($webProcess.Id). Logs: $logDirectory"
