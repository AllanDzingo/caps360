param(
  [string] $BackendApp = "caps360-backend",
  [string] $FrontendApp = "caps360-frontend"
)

Write-Host "=== CAPS360 Fly.io Deployment ===" -ForegroundColor Cyan

# ----------------------------
# Resolve paths safely
# ----------------------------
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$Root = Resolve-Path (Join-Path $ScriptDir "..")

$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend-web"

if (!(Test-Path $BackendDir)) {
  Write-Error "Backend directory not found: $BackendDir"
  exit 1
}

if (!(Test-Path $FrontendDir)) {
  Write-Error "Frontend directory not found: $FrontendDir"
  exit 1
}

# ----------------------------
# Check Fly CLI exists
# ----------------------------
Write-Host "`nChecking Fly.io CLI..."
$fly = Get-Command flyctl -ErrorAction SilentlyContinue
if (-not $fly) {
  Write-Error "flyctl not found. Install from https://fly.io/docs/flyctl/"
  exit 1
}

# ----------------------------
# FIXED AUTH CHECK
# ----------------------------
Write-Host "Checking Fly.io authentication..."
$whoami = flyctl auth whoami 2>$null

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($whoami)) {
  Write-Error "Not authenticated. Run: flyctl auth login"
  exit 1
}

Write-Host "Authenticated as $whoami" -ForegroundColor Green

# ----------------------------
# Deploy Backend
# ----------------------------
Write-Host "`nDeploying BACKEND..." -ForegroundColor Yellow
Set-Location $BackendDir

flyctl deploy `
  --app $BackendApp `
  --config "$Root\fly-backend.toml" `
  --remote-only

if ($LASTEXITCODE -ne 0) {
  Write-Error "Backend deployment failed"
  exit 1
}

# ----------------------------
# Deploy Frontend
# ----------------------------
Write-Host "`nDeploying FRONTEND..." -ForegroundColor Yellow
Set-Location $FrontendDir

flyctl deploy `
  --app $FrontendApp `
  --config "$Root\fly-frontend.toml" `
  --remote-only

if ($LASTEXITCODE -ne 0) {
  Write-Error "Frontend deployment failed"
  exit 1
}

# ----------------------------
# Done
# ----------------------------
Set-Location $Root
Write-Host "`nCAPS360 deployment completed successfully." -ForegroundColor Green
