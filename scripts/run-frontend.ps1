$ErrorActionPreference = 'Stop'
Set-Location (Join-Path (Split-Path -Parent $PSScriptRoot) 'frontend')
Write-Host 'TaskFlow frontend: http://localhost:5173/' -ForegroundColor Cyan
Write-Host 'Press Ctrl+C to stop.'
npm.cmd run dev -- --host localhost --port 5173 --strictPort
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend exited with code $LASTEXITCODE." -ForegroundColor Red
}
