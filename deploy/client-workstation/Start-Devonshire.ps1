[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$opervixNode = Get-Command node -CommandType Application -ErrorAction SilentlyContinue
if (-not $opervixNode) { throw 'Node.js 22 is required. Use the existing official installation; this script installs nothing.' }
$opervixVersion = & $opervixNode.Source --version
if ($LASTEXITCODE -ne 0 -or $opervixVersion -notmatch '^v22\.') { throw 'Use Node.js 22 for this package.' }
& $opervixNode.Source (Join-Path $PSScriptRoot 'pipeline.test.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Synthetic acceptance failed; activation remains held.' }
& $opervixNode.Source (Join-Path $PSScriptRoot 'preflight.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Preflight needs attention; read the local report.' }
Write-Host ''
Write-Host 'Preflight finished. No client task, model, timer, deployment or activation was started.'
Write-Host 'Open NEXT-ACTION.txt in ChatGPT/Codex on this computer to continue the verified connection work.'
