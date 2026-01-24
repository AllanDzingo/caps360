# =====================================================
# CAPS360 Frontend Deployment Script
# =====================================================
# This script deploys the React frontend to Azure Static Web Apps
# Prerequisites:
#   - Azure CLI installed and authenticated (az login)
#   - Backend already deployed (run deploy-backend.ps1 first)
# Usage: .\deploy-frontend.ps1 -Environment prod -ResourceGroup caps360-prod

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment,

    [Parameter(Mandatory = $true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory = $false)]
    [string]$Location = 'westeurope',

    [Parameter(Mandatory = $true)]
    [string]$BackendUrl,

    [Parameter(Mandatory = $false)]
    [string]$SupabaseUrl,

    [Parameter(Mandatory = $false)]
    [string]$SupabaseAnonKey,

    [Parameter(Mandatory = $false)]
    [bool]$SkipBuild = $false
)

$ErrorActionPreference = "Stop"

# ---------------------------
# Helper Functions
# ---------------------------
function Write-Step {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "→ $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# ---------------------------
# Prerequisites Check
# ---------------------------
Write-Step "Checking Prerequisites"
try { 
    az version | Out-Null
    Write-Success "Azure CLI found" 
} catch { 
    Write-Error-Custom "Azure CLI not installed"
    exit 1 
}

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$frontendDir = Join-Path $projectRoot "frontend-web"

if (-not (Test-Path $frontendDir)) {
    Write-Error-Custom "Frontend directory not found at: $frontendDir"
    exit 1
}
Write-Success "Frontend directory found"

# ---------------------------
# Step 1: Create Environment File
# ---------------------------
Write-Step "Step 1: Creating Environment Configuration"
Set-Location $frontendDir

$envContent = @"
VITE_API_URL=$BackendUrl
VITE_SUPABASE_URL=$SupabaseUrl
VITE_SUPABASE_ANON_KEY=$SupabaseAnonKey
VITE_ENVIRONMENT=$Environment
"@

$envFile = Join-Path $frontendDir ".env.production"
$envContent | Out-File -FilePath $envFile -Encoding utf8 -Force
Write-Success "Environment file created"

# ---------------------------
# Step 2: Build Frontend
# ---------------------------
if (-not $SkipBuild) {
    Write-Step "Step 2: Building Frontend"
    
    Write-Info "Installing dependencies..."
    npm install
    
    Write-Info "Building production bundle..."
    npm run build
    
    if (-not (Test-Path (Join-Path $frontendDir "dist"))) {
        Write-Error-Custom "Build failed - dist directory not found"
        exit 1
    }
    
    Write-Success "Frontend built successfully"
} else {
    Write-Info "Skipping build (SkipBuild = true)"
}

Set-Location $projectRoot

# ---------------------------
# Step 3: Create Static Web App
# ---------------------------
Write-Step "Step 3: Creating Azure Static Web App"
$staticWebAppName = "caps360-web-$Environment"
Write-Info "Static Web App name: $staticWebAppName"

$swaExists = az staticwebapp show `
    --name $staticWebAppName `
    --resource-group $ResourceGroup 2>$null

if (-not $swaExists) {
    Write-Info "Creating Static Web App..."
    az staticwebapp create `
        --name $staticWebAppName `
        --resource-group $ResourceGroup `
        --location $Location `
        --sku Free `
        --source "." | Out-Null
    Write-Success "Static Web App created"
} else {
    Write-Success "Static Web App already exists"
}

# ---------------------------
# Step 4: Get Deployment Token
# ---------------------------
Write-Step "Step 4: Getting Deployment Token"
$deploymentToken = az staticwebapp secrets list `
    --name $staticWebAppName `
    --resource-group $ResourceGroup `
    --query "properties.apiKey" `
    --output tsv

if (-not $deploymentToken) {
    Write-Error-Custom "Failed to get deployment token"
    exit 1
}
Write-Success "Deployment token retrieved"

# ---------------------------
# Step 5: Install SWA CLI (if needed)
# ---------------------------
Write-Step "Step 5: Checking SWA CLI"
try {
    swa --version | Out-Null
    Write-Success "SWA CLI found"
} catch {
    Write-Info "Installing SWA CLI globally..."
    npm install -g @azure/static-web-apps-cli
    Write-Success "SWA CLI installed"
}

# ---------------------------
# Step 6: Deploy to Static Web Apps
# ---------------------------
Write-Step "Step 6: Deploying Frontend"
Set-Location $frontendDir

Write-Info "Deploying to Azure Static Web Apps (this may take 3-5 minutes)..."

# Deploy using SWA CLI
$env:SWA_CLI_DEPLOYMENT_TOKEN = $deploymentToken
try {
    swa deploy ./dist `
        --deployment-token $deploymentToken `
        --env production | Out-Null
    Write-Success "Frontend deployed successfully"
} catch {
    Write-Error-Custom "Deployment failed: $_"
    exit 1
} finally {
    Remove-Item Env:\SWA_CLI_DEPLOYMENT_TOKEN
}

Set-Location $projectRoot

# ---------------------------
# Step 7: Configure Static Web App
# ---------------------------
Write-Step "Step 7: Configuring Static Web App"

# Create staticwebapp.config.json if it doesn't exist
$configFile = Join-Path $frontendDir "staticwebapp.config.json"
if (-not (Test-Path $configFile)) {
    $configContent = @"
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/images/*", "*.{css,scss,js,png,gif,ico,jpg,svg}"]
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous", "authenticated"]
    }
  ],
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' $BackendUrl $SupabaseUrl"
  },
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  }
}
"@
    $configContent | Out-File -FilePath $configFile -Encoding utf8 -Force
    Write-Success "Configuration file created"
}

# ---------------------------
# Step 8: Get Frontend URL
# ---------------------------
Write-Step "Step 8: Getting Frontend URL"
$frontendUrl = az staticwebapp show `
    --name $staticWebAppName `
    --resource-group $ResourceGroup `
    --query "defaultHostname" `
    --output tsv

if ($frontendUrl) {
    $frontendUrl = "https://$frontendUrl"
    Write-Success "Frontend URL: $frontendUrl"
} else {
    Write-Error-Custom "Failed to get frontend URL"
}

# ---------------------------
# Step 9: Verify Deployment
# ---------------------------
Write-Step "Step 9: Verifying Deployment"
Write-Info "Waiting for deployment to complete (30 seconds)..."
Start-Sleep -Seconds 30

try {
    $response = Invoke-WebRequest -Uri $frontendUrl -Method Get -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Success "Frontend is accessible and responding!"
    } else {
        Write-Error-Custom "Frontend responded with status: $($response.StatusCode)"
    }
} catch {
    Write-Error-Custom "Failed to access frontend: $_"
}

# ---------------------------
# Step 10: Update Backend CORS
# ---------------------------
Write-Step "Step 10: Updating Backend CORS"
$backendAppName = "caps360-backend-$Environment"
Write-Info "Adding frontend URL to backend CORS: $frontendUrl"

try {
    az webapp cors add `
        --resource-group $ResourceGroup `
        --name $backendAppName `
        --allowed-origins $frontendUrl | Out-Null
    Write-Success "Backend CORS updated"
} catch {
    Write-Info "Could not update backend CORS automatically - add manually if needed"
}

# ---------------------------
# Step 11: Output Summary
# ---------------------------
Write-Step "Deployment Summary"
Write-Host ""
Write-Host "✓ Static Web App: $staticWebAppName" -ForegroundColor Green
Write-Host "✓ Frontend URL: $frontendUrl" -ForegroundColor Green
Write-Host "✓ Backend URL: $BackendUrl" -ForegroundColor Green
Write-Host ""
Write-Host "Environment Variables Configured:" -ForegroundColor Cyan
Write-Host "  ✓ VITE_API_URL=$BackendUrl" -ForegroundColor White
if ($SupabaseUrl) { Write-Host "  ✓ VITE_SUPABASE_URL=$SupabaseUrl" -ForegroundColor White }
Write-Host "  ✓ VITE_ENVIRONMENT=$Environment" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Visit your frontend: $frontendUrl" -ForegroundColor White
Write-Host "2. Test authentication flow" -ForegroundColor White
Write-Host "3. Test API connectivity to backend" -ForegroundColor White
Write-Host "4. Configure custom domain (optional)" -ForegroundColor White
Write-Host "5. Set up SSL certificate (optional)" -ForegroundColor White
Write-Host "6. Run end-to-end tests: .\test-deployment.ps1" -ForegroundColor White
Write-Host ""
Write-Success "Frontend deployment completed successfully!"
