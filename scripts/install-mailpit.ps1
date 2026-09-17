# Installs the pinned Mailpit development binary under the ignored .tools directory.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$version = 'v1.31.1'
$expectedSha256 = '6B477B7728D09A3A24DFF349D5447ABAEFA34E47D9F32153CA543E3FC7D6CE2E'
$destination = Join-Path $projectRoot '.tools/mailpit'
$archive = Join-Path $destination "mailpit-$version.zip"
$executable = Join-Path $destination 'mailpit.exe'

New-Item -ItemType Directory -Force $destination | Out-Null
Invoke-WebRequest -Uri "https://github.com/axllent/mailpit/releases/download/$version/mailpit-windows-amd64.zip" -OutFile $archive
Expand-Archive -LiteralPath $archive -DestinationPath $destination -Force
Remove-Item -LiteralPath $archive

$actualSha256 = (Get-FileHash -Algorithm SHA256 $executable).Hash
if ($actualSha256 -ne $expectedSha256) {
    Remove-Item -LiteralPath $executable -Force
    throw "Mailpit checksum verification failed. Expected $expectedSha256 but received $actualSha256."
}

& $executable version
Write-Output "Mailpit installed at $executable"
