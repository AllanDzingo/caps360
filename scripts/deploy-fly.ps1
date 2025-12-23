# PowerShell script to deploy CAPS360 to Fly.io
# This script sets secrets and deploys both backend and frontend

param(
  [string]$backendApp = "caps360-backend",
  [string]$frontendApp = "caps360-frontend"
)

Write-Host "=== CAPS360 Fly.io Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Check if flyctl is installed
Write-Host "Checking Fly.io CLI..." -ForegroundColor Yellow
try {
  $flyVersion = flyctl version
  Write-Host "✓ Fly.io CLI installed: $flyVersion" -ForegroundColor Green
} catch {
  Write-Host "✗ Fly.io CLI not found. Please install it first:" -ForegroundColor Red
  Write-Host "  Run: powershell -Command `"iwr https://fly.io/install.ps1 -useb | iex`"" -ForegroundColor Yellow
  exit 1
}

# Check authentication
Write-Host "Checking authentication..." -ForegroundColor Yellow
try {
  $authStatus = flyctl auth whoami 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Not logged in to Fly.io" -ForegroundColor Red
    Write-Host "  Please run: flyctl auth login" -ForegroundColor Yellow
    exit 1
  }
  Write-Host "✓ Authenticated with Fly.io" -ForegroundColor Green
} catch {
  Write-Host "✗ Authentication check failed" -ForegroundColor Red
  Write-Host "  Please run: flyctl auth login" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "=== Step 1: Configure Backend Secrets ===" -ForegroundColor Cyan
& "$PSScriptRoot\set-backend-secrets.ps1"
if ($LASTEXITCODE -ne 0) {
  Write-Host "✗ Failed to set backend secrets" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== Step 2: Deploy Backend ===" -ForegroundColor Cyan
Write-Host "Deploying backend to: $backendApp" -ForegroundColor Yellow
flyctl deploy -a $backendApp --config fly-backend.toml
if ($LASTEXITCODE -ne 0) {
  Write-Host "✗ Backend deployment failed" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== Step 3: Verify Backend Health ===" -ForegroundColor Cyan
Start-Sleep -Seconds 5
$backendUrl = "https://$backendApp.fly.dev"
try {
  $healthCheck = Invoke-WebRequest -Uri "$backendUrl/health" -Method GET -TimeoutSec 10
  if ($healthCheck.StatusCode -eq 200) {
    Write-Host "✓ Backend is healthy!" -ForegroundColor Green
  } else {
    Write-Host "⚠ Backend returned status: $($healthCheck.StatusCode)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "⚠ Backend health check failed (this may be normal if still starting)" -ForegroundColor Yellow
  Write-Host "  Check status with: flyctl status -a $backendApp" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Step 4: Configure Frontend Secrets ===" -ForegroundColor Cyan
& "$PSScriptRoot\set-frontend-secrets.ps1" -backendUrl $backendUrl
if ($LASTEXITCODE -ne 0) {
  Write-Host "✗ Failed to set frontend secrets" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== Step 5: Deploy Frontend ===" -ForegroundColor Cyan
Write-Host "Deploying frontend to: $frontendApp" -ForegroundColor Yellow
flyctl deploy -a $frontendApp --config fly-frontend.toml
if ($LASTEXITCODE -ne 0) {
  Write-Host "✗ Frontend deployment failed" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== Step 6: Verify Frontend Health ===" -ForegroundColor Cyan
Start-Sleep -Seconds 5
$frontendUrl = "https://$frontendApp.fly.dev"
try {
  $healthCheck = Invoke-WebRequest -Uri "$frontendUrl/health" -Method GET -TimeoutSec 10
  if ($healthCheck.StatusCode -eq 200) {
    Write-Host "✓ Frontend is healthy!" -ForegroundColor Green
  } else {
    Write-Host "⚠ Frontend returned status: $($healthCheck.StatusCode)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "⚠ Frontend health check failed (this may be normal if still starting)" -ForegroundColor Yellow
  Write-Host "  Check status with: flyctl status -a $frontendApp" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Deployment Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Backend URL:  $backendUrl" -ForegroundColor Cyan
Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open $frontendUrl in your browser" -ForegroundColor White
Write-Host "  2. Test user registration and login" -ForegroundColor White
Write-Host "  3. Verify Supabase authentication" -ForegroundColor White
Write-Host "  4. Test payment integration with Paystack" -ForegroundColor White
Write-Host ""
Write-Host "Monitor apps at: https://fly.io/apps" -ForegroundColor Cyan
 
