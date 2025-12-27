# PowerShell script to set frontend build-time environment variables on Fly.io
# Run this before deploying the frontend

# Robustly determine script directory
$scriptPath = $MyInvocation.MyCommand.Path
if (-not $scriptPath) {
  # Fallback/Assumption
  $scriptDir = Join-Path (Get-Location) "scripts"
}
else {
  $scriptDir = Split-Path $scriptPath
}

# Locate .env file
$possiblePaths = @(
  (Join-Path $scriptDir "..\frontend-web\.env"),
  (Join-Path (Get-Location) "frontend-web\.env")
)

$envFile = $null
foreach ($path in $possiblePaths) {
  if (Test-Path $path) {
    $envFile = Resolve-Path $path
    break
  }
}

if (-not $envFile) {
  Write-Error "Could not find .env file. looked in: $($possiblePaths -join ', ')"
  exit 1
}

Write-Host "Using .env file: $envFile" -ForegroundColor Cyan

$app = "caps360-frontend"
$secrets = @()

# Read and parse .env
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  # Regex to match KEY=VALUE
  if ($line -match "^\s*([A-Z0-9_]+)=(.*)$") {
    $key = $matches[1]
    $val = $matches[2].Trim()
        
    # Remove surrounding quotes
    if ($val.StartsWith('"') -and $val.EndsWith('"')) { 
      $val = $val.Substring(1, $val.Length - 2) 
    }
    elseif ($val.StartsWith("'") -and $val.EndsWith("'")) {
      $val = $val.Substring(1, $val.Length - 2)
    }
        
    if (-not [string]::IsNullOrWhiteSpace($key)) {
      $secrets += "$key=$val"
    }
  }
}

if ($secrets.Count -eq 0) {
  Write-Warning "No secrets found in $envFile"
  exit 0
}

Write-Host "Found $($secrets.Count) secrets. Applying to $app..." -ForegroundColor Cyan

# Execute flyctl
# Using direct invocation with array of arguments
$flyArgs = @("secrets", "set", "-a", $app) + $secrets

try {
  # Simple execution with call operator
  & flyctl $flyArgs
    
  if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ valid frontend secrets configured successfully!" -ForegroundColor Green
  }
  else {
    Write-Error "`n❌ Failed to set secrets. Exit code: $LASTEXITCODE"
    exit $LASTEXITCODE
  }
}
catch {
  Write-Error "Error executing flyctl: $_"
  exit 1
}
