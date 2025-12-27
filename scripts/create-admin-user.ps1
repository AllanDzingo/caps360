# PowerShell script to create the initial admin user for CAPS360
# This script invokes the backend functionality to create the user in Supabase

param (
  [string]$email,
  [string]$password
)

try {
  Write-Host "`n=== Creating Initial Admin User ===" -ForegroundColor Cyan

  # Prompt for admin credentials if not provided
  if (-not $email) {
    if ($env:ADMIN_EMAIL) {
      $email = $env:ADMIN_EMAIL
    }
    else {
      $email = Read-Host "Enter admin email (default: admin@caps360.co.za)"
      if (-not $email) { $email = "admin@caps360.co.za" }
    }
  }
  if (-not $password) {
    if ($env:ADMIN_PASSWORD) {
      $password = $env:ADMIN_PASSWORD
    }
    else {
      $passSecure = Read-Host "Enter admin password" -AsSecureString
      $password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($passSecure))
    }
  }
  
  # Also save to file for record keeping (as per original script intent)
  $credentialsFile = "ADMIN_CREDENTIALS.txt"
  $content = "Email: $email`nPassword: $password"
  Set-Content -Path $credentialsFile -Value $content
  Write-Host "`n[INFO] Admin credentials backed up to $credentialsFile" -ForegroundColor Yellow

  # Navigate to backend to run the script
  Write-Host "`n[INFO] Invoking backend creation script..." -ForegroundColor Cyan
  
  $backendDir = Join-Path $PSScriptRoot "..\backend"
  if (-not (Test-Path $backendDir)) {
    throw "Backend directory not found at $backendDir"
  }

  Push-Location $backendDir
  
  # Set env vars for the node process
  $env:ADMIN_EMAIL = $email
  $env:ADMIN_PASSWORD = $password
  
  # Run the backend script using npx tsx
  # We assume environment variables (.env) are already set up in backend or will be picked up
  # If backend .env is missing, this might fail, but let's assume it's there as per previous context
  
  cmd /c "npx tsx create-admin-direct.ts"
  
  if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] Admin user creation process completed." -ForegroundColor Green
  }
  else {
    Write-Host "`n[ERROR] Backend script failed with exit code $LASTEXITCODE" -ForegroundColor Red
  }

}
catch {
  Write-Host "`n[ERROR] Script failed: $_" -ForegroundColor Red
}
finally {
  Pop-Location
}
