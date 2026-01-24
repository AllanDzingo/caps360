# =====================================================
# CAPS360 Backend Deployment Script
# =====================================================
# This script deploys the Node.js backend API to Azure App Service
# Prerequisites:
#   - Azure CLI installed and authenticated (az login)
#   - Database already deployed (run deploy-database.ps1 first)
# Usage: .\deploy-backend.ps1 -Environment prod -ResourceGroup caps360-prod

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment,

    [Parameter(Mandatory = $true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory = $false)]
    [string]$Location = 'southafricanorth',

    [Parameter(Mandatory = $true)]
    [string]$DatabaseConnectionString,

    [Parameter(Mandatory = $true)]
    [string]$JwtSecret,

    [Parameter(Mandatory = $false)]
    [string]$GeminiApiKey,

    [Parameter(Mandatory = $false)]
    [string]$OpenAIApiKey,

    [Parameter(Mandatory = $false)]
    [string]$PaystackSecretKey,

    [Parameter(Mandatory = $false)]
    [string]$PayfastMerchantId,

    [Parameter(Mandatory = $false)]
    [string]$PayfastMerchantKey,

    [Parameter(Mandatory = $false)]
    [string]$SupabaseUrl,

    [Parameter(Mandatory = $false)]
    [string]$SupabaseAnonKey,

    [Parameter(Mandatory = $false)]
    [string]$SupabaseServiceRoleKey,

    [Parameter(Mandatory = $false)]
    [bool]$SkipBuild = $false,

    [Parameter(Mandatory = $false)]
    [bool]$UseDocker = $false
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
}
catch { 
    Write-Error-Custom "Azure CLI not installed"
    exit 1 
}

if ($UseDocker) {
    try { 
        docker --version | Out-Null
        Write-Success "Docker found" 
    }
    catch { 
        Write-Error-Custom "Docker not installed but UseDocker = true"
        exit 1 
    }
}

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$backendDir = Join-Path $projectRoot "backend"

if (-not (Test-Path $backendDir)) {
    Write-Error-Custom "Backend directory not found at: $backendDir"
    exit 1
}
Write-Success "Backend directory found"

# ---------------------------
# Step 1: Build Backend
# ---------------------------
if (-not $SkipBuild) {
    Write-Step "Step 1: Building Backend"
    Set-Location $backendDir
    
    Write-Info "Installing dependencies..."
    npm install --production=false
    
    Write-Info "Building TypeScript..."
    npm run build
    
    Write-Success "Backend built successfully"
    Set-Location $projectRoot
}
else {
    Write-Info "Skipping build (SkipBuild = true)"
}

# ---------------------------
# Step 2: Create App Service Plan
# ---------------------------
Write-Step "Step 2: Creating App Service Plan"
$appServicePlanName = "caps360-plan-$Environment"
Write-Info "App Service Plan name: $appServicePlanName"

$planExists = az appservice plan list --resource-group $ResourceGroup --query "[?name=='$appServicePlanName']" | ConvertFrom-Json
if ($planExists.Count -eq 0) {
    Write-Info "Creating App Service Plan (Linux, B1 tier)..."
    az appservice plan create `
        --name $appServicePlanName `
        --resource-group $ResourceGroup `
        --location $Location `
        --is-linux `
        --sku B1 | Out-Null
    Write-Success "App Service Plan created"
}
else {
    Write-Success "App Service Plan already exists"
}

# ---------------------------
# Step 3: Create Web App
# ---------------------------
Write-Step "Step 3: Creating Web App"
$webAppName = "caps360-backend-$Environment"
Write-Info "Web App name: $webAppName"

$webAppExists = az webapp list --resource-group $ResourceGroup --query "[?name=='$webAppName']" | ConvertFrom-Json
if ($webAppExists.Count -eq 0) {
    Write-Info "Creating Web App..."
    az webapp create `
        --resource-group $ResourceGroup `
        --plan $appServicePlanName `
        --name $webAppName `
        --runtime 'NODE|20-lts' | Out-Null
    Write-Success "Web App created"
}
else {
    Write-Success "Web App already exists"
}

# ---------------------------
# Step 4: Configure Application Settings
# ---------------------------
Write-Step "Step 4: Configuring Application Settings"

$appSettings = @{
    "NODE_ENV"                       = "production"
    "PORT"                           = "8080"
    "DATABASE_URL"                   = $DatabaseConnectionString
    "JWT_SECRET"                     = $JwtSecret

    # Azure OpenAI Config (Hardcoded for stability)
    "AZURE_OPENAI_ENDPOINT"          = "https://caps360-ai.openai.azure.com/"
    "AZURE_OPENAI_API_KEY"           = "1EjKx2SsKZlASrjtJl7WbgWLYXn6YgUsoVBdyxbKZpbEuvn297eamJQQJ99CAACrIdLPXJ3w3AAABACOG643a"
    "AZURE_OPENAI_DEPLOYMENT"        = "gpt-4o-mini"
    "AZURE_OPENAI_API_VERSION"       = "2024-12-01-preview"

    # Business Logic
    "STUDY_HELP_PRICE"               = "3900"
    "STANDARD_PRICE"                 = "9900"
    "PREMIUM_PRICE"                  = "14900"
    "TRIAL_DURATION_DAYS"            = "14"
    "WELCOME_PREMIUM_DAYS"           = "14"

    # Paystack
    "VITE_PAYSTACK_PUBLIC_KEY"       = "pk_test_3587a53505a00ddc9e83a70031d8b04cc29228cb"
    "PAYSTACK_SECRET_KEY"            = "sk_test_66adb4c5bab09c5be7d2cbd1e75cbe0a53707ac0"

    # System
    "WEBSITE_NODE_DEFAULT_VERSION"   = "~20"
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "true"
}

Write-Info "Setting application settings..."
$settingsArray = @()
foreach ($key in $appSettings.Keys) {
    $value = $appSettings[$key]
    if ($value) {
        $settingsArray += "$key=$value"
    }
}

az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $webAppName `
    --settings $settingsArray | Out-Null
Write-Success "Application settings configured"

# ---------------------------
# Step 5: Configure CORS
# ---------------------------
Write-Step "Step 5: Configuring CORS"
$frontendUrl = "https://caps360-web-$Environment.azurestaticapps.net"
Write-Info "Allowing CORS for: $frontendUrl"

az webapp cors add `
    --resource-group $ResourceGroup `
    --name $webAppName `
    --allowed-origins $frontendUrl "http://localhost:3000" | Out-Null
Write-Success "CORS configured"

# ---------------------------
# Step 6: Configure Health Check
# ---------------------------
Write-Step "Step 6: Configuring Health Check"
az webapp config set `
    --resource-group $ResourceGroup `
    --name $webAppName `
    --health-check-path "/health" | Out-Null
Write-Success "Health check configured at /health"

# ---------------------------
# Step 7: Enable Application Insights
# ---------------------------
Write-Step "Step 7: Configuring Application Insights"
$appInsightsName = "caps360-insights-$Environment"

$insightsExists = az monitor app-insights component show `
    --app $appInsightsName `
    --resource-group $ResourceGroup 2>$null

if (-not $insightsExists) {
    Write-Info "Creating Application Insights..."
    az monitor app-insights component create `
        --app $appInsightsName `
        --location $Location `
        --resource-group $ResourceGroup `
        --application-type Node.JS | Out-Null
    Write-Success "Application Insights created"
}
else {
    Write-Success "Application Insights already exists"
}

$instrumentationKey = az monitor app-insights component show `
    --app $appInsightsName `
    --resource-group $ResourceGroup `
    --query "instrumentationKey" `
    --output tsv

az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $webAppName `
    --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$instrumentationKey" | Out-Null
Write-Success "Application Insights linked"

# ---------------------------
# Step 8: Deploy Backend Code
# ---------------------------
Write-Step "Step 8: Deploying Backend Code"
Set-Location $backendDir

if ($UseDocker) {
    Write-Info "Building Docker image..."
    docker build -t $webAppName .
    
    Write-Info "Pushing to Azure Container Registry..."
    # This requires ACR setup - add if needed
    Write-Error-Custom "Docker deployment not yet implemented. Use zip deployment instead."
    exit 1
}
else {
    # Create deployment artifact with package.json
    Write-Info "Creating deployment package..."
    $publishPath = Join-Path $projectRoot "backend_publish_temp"
    if (Test-Path $publishPath) { Remove-Item -Recurse -Force $publishPath }
    New-Item -ItemType Directory -Path $publishPath | Out-Null
    
    # Copy necessary files
    Copy-Item (Join-Path $backendDir "package.json") -Destination $publishPath
    Copy-Item (Join-Path $backendDir "package-lock.json") -Destination $publishPath -ErrorAction SilentlyContinue
    Copy-Item -Recurse (Join-Path $backendDir "dist") -Destination $publishPath

    $zipFile = Join-Path $projectRoot "backend-deploy.zip"
    if (Test-Path $zipFile) { Remove-Item $zipFile -Force }

    # Zip the publish folder
    Compress-Archive -Path "$publishPath\*" -DestinationPath $zipFile -Force

    # Clean up temp folder
    Remove-Item -Recurse -Force $publishPath

    Write-Info "Deploying to Azure (this may take 3-5 minutes)..."
    az webapp deployment source config-zip `
        --resource-group $ResourceGroup `
        --name $webAppName `
        --src $zipFile | Out-Null

    Write-Success "Backend deployed successfully"

    # Clean up
    Remove-Item $zipFile -Force
}

Set-Location $projectRoot

# ---------------------------
# Step 9: Restart Web App
# ---------------------------
Write-Step "Step 9: Restarting Web App"
az webapp restart `
    --resource-group $ResourceGroup `
    --name $webAppName | Out-Null
Write-Success "Web App restarted"

# ---------------------------
# Step 10: Verify Deployment
# ---------------------------
Write-Step "Step 10: Verifying Deployment"
$webAppUrl = az webapp show `
    --resource-group $ResourceGroup `
    --name $webAppName `
    --query "defaultHostName" `
    --output tsv

$healthUrl = "https://$webAppUrl/health"
Write-Info "Testing health endpoint: $healthUrl"
Write-Info "Waiting for app to start (30 seconds)..."
Start-Sleep -Seconds 30

try {
    $response = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 10
    if ($response.status -eq "healthy") {
        Write-Success "Backend is healthy and responding!"
    }
    else {
        Write-Error-Custom "Backend responded but status is: $($response.status)"
    }
}
catch {
    Write-Error-Custom "Health check failed: $_"
    Write-Info "Check logs with: az webapp log tail --name $webAppName --resource-group $ResourceGroup"
}

# ---------------------------
# Step 11: Output Summary
# ---------------------------
Write-Step "Deployment Summary"
Write-Host ""
Write-Host "✓ Web App: $webAppName" -ForegroundColor Green
Write-Host "✓ URL: https://$webAppUrl" -ForegroundColor Green
Write-Host "✓ Health: $healthUrl" -ForegroundColor Green
Write-Host "✓ App Service Plan: $appServicePlanName" -ForegroundColor Green
Write-Host "✓ Application Insights: $appInsightsName" -ForegroundColor Green
Write-Host ""
Write-Host "Environment Variables Configured:" -ForegroundColor Cyan
Write-Host "  ✓ NODE_ENV=production" -ForegroundColor White
Write-Host "  ✓ DATABASE_URL (configured)" -ForegroundColor White
Write-Host "  ✓ JWT_SECRET (configured)" -ForegroundColor White
Write-Host "  ✓ AZURE_OPENAI (configured)" -ForegroundColor White
Write-Host "  ✓ PAYSTACK (configured)" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test API endpoints: curl https://$webAppUrl/api/health" -ForegroundColor White
Write-Host "2. Check logs: az webapp log tail --name $webAppName --resource-group $ResourceGroup" -ForegroundColor White
Write-Host "3. Deploy frontend using: .\deploy-frontend.ps1" -ForegroundColor White
Write-Host "4. Configure custom domain (optional)" -ForegroundColor White
Write-Host "5. Set up SSL certificate (optional)" -ForegroundColor White
Write-Host ""
Write-Success "Backend deployment completed successfully!"
