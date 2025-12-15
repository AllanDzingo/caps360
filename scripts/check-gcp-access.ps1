<#
Checks GCP credentials locally and performs a simple health-check against the deployed backend.
Usage:
  ./scripts/check-gcp-access.ps1 -App caps360-backend -Project caps360 -BackendUrl https://caps360-backend.fly.dev
#>
param(
    [Parameter(Mandatory=$true)]
    [string] $App,

    [Parameter(Mandatory=$true)]
    [string] $Project,

    [Parameter(Mandatory=$true)]
    [string] $BackendUrl
)

Write-Host "Checking Application Default Credentials (ADC) with gcloud..." -ForegroundColor Cyan
try {
    $token = gcloud auth application-default print-access-token 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "ADC OK. Access token obtained." -ForegroundColor Green
    } else {
        Write-Host "ADC not available or error obtaining token:" -ForegroundColor Yellow
        Write-Host $token
    }
} catch {
    Write-Host "gcloud not available or failed to run. Error:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
}

Write-Host "`nListing Fly secrets for app '$App' (requires flyctl to be logged in)..." -ForegroundColor Cyan
try {
    flyctl secrets list -a $App 2>&1 | Write-Host
} catch {
    Write-Host "Unable to run flyctl or fetch secrets. Ensure flyctl is installed and you're logged in." -ForegroundColor Yellow
}

Write-Host "`nCalling backend health endpoint: $BackendUrl/health" -ForegroundColor Cyan
try {
    $resp = Invoke-WebRequest -Uri "$BackendUrl/health" -UseBasicParsing -Method GET -TimeoutSec 10
    Write-Host "Status: $($resp.StatusCode)" -ForegroundColor Green
    if ($resp.StatusCode -eq 200) {
        Write-Host "Health OK. Response body:" -ForegroundColor Green
        Write-Host $resp.Content
        exit 0
    } else {
        Write-Host "Health endpoint returned non-200 status" -ForegroundColor Yellow
        Write-Host $resp.Content
        exit 2
    }
} catch {
    Write-Host "Failed to call health endpoint:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
