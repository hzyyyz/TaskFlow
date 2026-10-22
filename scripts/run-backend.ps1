$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
Write-Host 'TaskFlow backend: http://127.0.0.1:8000/docs' -ForegroundColor Cyan
Write-Host 'Press Ctrl+C to stop.'
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend exited with code $LASTEXITCODE." -ForegroundColor Red
}
