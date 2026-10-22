$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $repoRoot 'frontend'

function Test-RequiredFile([string]$path, [string]$hint) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "$hint (missing: $path)"
    }
}

function Test-Backend {
    try {
        $response = Invoke-RestMethod 'http://127.0.0.1:8000/health' -TimeoutSec 2
        return $response.status -eq 'ok'
    } catch {
        return $false
    }
}

function Test-Frontend {
    try {
        $response = Invoke-WebRequest 'http://localhost:5173/' -TimeoutSec 2 -UseBasicParsing
        return $response.StatusCode -eq 200 -and $response.Content -match '<title>TaskFlow'
    } catch {
        return $false
    }
}

function Start-ServerWindow([string]$scriptPath, [string]$workingDirectory) {
    $arguments = @('-NoExit', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$scriptPath`"")
    Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -WorkingDirectory $workingDirectory -WindowStyle Normal | Out-Null
}

try {
    Test-RequiredFile (Join-Path $repoRoot '.env') 'Configure the backend .env first.'
    Test-RequiredFile (Join-Path $frontendRoot '.env.local') 'Configure frontend/.env.local first.'
    Test-RequiredFile (Join-Path $frontendRoot 'node_modules') 'Run npm install in frontend first.'
    $python = (Get-Command python -ErrorAction Stop).Source
    Get-Command npm.cmd -ErrorAction Stop | Out-Null

    & (Join-Path $repoRoot '.mysql-test/start.ps1')

    Push-Location $repoRoot
    try {
        & $python -m alembic upgrade head
        if ($LASTEXITCODE -ne 0) {
            throw 'Database migration failed.'
        }
    } finally {
        Pop-Location
    }

    $backendReady = Test-Backend
    if (-not $backendReady) {
        Start-ServerWindow (Join-Path $PSScriptRoot 'run-backend.ps1') $repoRoot
    }
    $frontendReady = Test-Frontend
    if (-not $frontendReady) {
        Start-ServerWindow (Join-Path $PSScriptRoot 'run-frontend.ps1') $frontendRoot
    }

    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if (-not $backendReady) { $backendReady = Test-Backend }
        if (-not $frontendReady) { $frontendReady = Test-Frontend }
        if ($backendReady -and $frontendReady) { break }
        Start-Sleep -Seconds 1
    }
    if (-not ($backendReady -and $frontendReady)) {
        throw 'Backend or frontend did not become ready. Check the server windows for errors.'
    }

    Write-Host 'TaskFlow is ready at http://localhost:5173/' -ForegroundColor Green
    try {
        Start-Process 'http://localhost:5173/' | Out-Null
    } catch {
        Write-Warning 'The browser could not be opened automatically. Open http://localhost:5173/ manually.'
    }
} catch {
    Write-Host "TaskFlow startup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
