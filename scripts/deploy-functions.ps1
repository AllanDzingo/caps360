# =====================================================
# CAPS360 Azure Functions Deployment Script
# =====================================================
# This script deploys Azure Functions for serverless tasks
# Prerequisites:
#   - Azure CLI installed and authenticated (az login)
#   - Database already deployed (run deploy-database.ps1 first)
# Usage: .\deploy-functions.ps1 -Environment prod -ResourceGroup caps360-prod

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

    [Parameter(Mandatory = $false)]
    [string]$CommunicationServicesConnectionString,

    [Parameter(Mandatory = $false)]
    [string]$OpenAIApiKey,

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
}
catch { 
    Write-Error-Custom "Azure CLI not installed"
    exit 1 
}

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$functionsDir = Join-Path $projectRoot "functions"

if (-not (Test-Path $functionsDir)) {
    Write-Error-Custom "Functions directory not found at: $functionsDir"
    exit 1
}
Write-Success "Functions directory found"

# ---------------------------
# Step 1: Build Functions
# ---------------------------
if (-not $SkipBuild) {
    Write-Step "Step 1: Building Azure Functions"
    Set-Location $functionsDir
    
    Write-Info "Installing dependencies..."
    npm install
    
    Write-Info "Building TypeScript..."
    npm run build
    
    Write-Success "Functions built successfully"
    Set-Location $projectRoot
}
else {
    Write-Info "Skipping build (SkipBuild = true)"
}

# ---------------------------
# Step 2: Create Storage Account
# ---------------------------
Write-Step "Step 2: Creating Storage Account"
$storageAccountName = "caps360func$Environment".ToLower() -replace '[^a-z0-9]', ''
# Storage account names must be 3-24 lowercase letters and numbers
if ($storageAccountName.Length -gt 24) {
    $storageAccountName = $storageAccountName.Substring(0, 24)
}

Write-Info "Storage account name: $storageAccountName"

$storageExists = az storage account list --resource-group $ResourceGroup | ConvertFrom-Json | Where-Object { $_.name -eq $storageAccountName }
if ($storageExists.Count -eq 0) {
    Write-Info "Creating storage account..."
    az storage account create `
        --name $storageAccountName `
        --resource-group $ResourceGroup `
        --location $Location `
        --sku Standard_LRS `
        --kind StorageV2 | Out-Null
    Write-Success "Storage account created"
}
else {
    Write-Success "Storage account already exists"
}

# ---------------------------
# Step 3: Create Function App
# ---------------------------
Write-Step "Step 3: Creating Function App"
$functionAppName = "caps360-functions-$Environment"
Write-Info "Function app name: $functionAppName"

$functionExists = az functionapp list --resource-group $ResourceGroup | ConvertFrom-Json | Where-Object { $_.name -eq $functionAppName }
if ($functionExists.Count -eq 0) {
    Write-Info "Creating Function App..."
    az functionapp create `
        --resource-group $ResourceGroup `
        --consumption-plan-location $Location `
        --runtime node `
        --runtime-version 20 `
        --functions-version 4 `
        --name $functionAppName `
        --storage-account $storageAccountName `
        --os-type Linux | Out-Null
    Write-Success "Function App created"
}
else {
    Write-Success "Function App already exists"
}

# ---------------------------
# Step 4: Configure Application Settings
# ---------------------------
Write-Step "Step 4: Configuring Application Settings"

$appSettings = @{
    "NODE_ENV"                                 = "production"
    "DATABASE_URL"                             = $DatabaseConnectionString
    "COMMUNICATION_SERVICES_CONNECTION_STRING" = if ($CommunicationServicesConnectionString) { $CommunicationServicesConnectionString } else { "" }
    "OPENAI_API_KEY"                           = if ($OpenAIApiKey) { $OpenAIApiKey } else { "" }
    "FUNCTIONS_WORKER_RUNTIME"                 = "node"
    "WEBSITE_NODE_DEFAULT_VERSION"             = "~20"
    "FUNCTIONS_EXTENSION_VERSION"              = "~4"
}

Write-Info "Setting application settings..."
foreach ($key in $appSettings.Keys) {
    $value = $appSettings[$key]
    if ($value) {
        az functionapp config appsettings set `
            --resource-group $ResourceGroup `
            --name $functionAppName `
            --settings "$key=$value" | Out-Null
    }
}
Write-Success "Application settings configured"

# ---------------------------
# Step 5: Enable Application Insights
# ---------------------------
Write-Step "Step 5: Configuring Application Insights"
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
        --application-type web | Out-Null
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

az functionapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $functionAppName `
    --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$instrumentationKey" | Out-Null
Write-Success "Application Insights linked"

# ---------------------------
# Step 6: Deploy Functions Code
# ---------------------------
Write-Step "Step 6: Deploying Functions Code"
Set-Location $functionsDir

Write-Info "Creating deployment package..."
$zipFile = Join-Path $projectRoot "functions-deploy.zip"
if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

# Create temporary publish directory
$publishPath = Join-Path $projectRoot "functions_publish_temp"
if (Test-Path $publishPath) { Remove-Item -Recurse -Force $publishPath }
New-Item -ItemType Directory -Path $publishPath | Out-Null

# Copy necessary contents
Copy-Item (Join-Path $functionsDir "host.json") -Destination $publishPath
Copy-Item (Join-Path $functionsDir "package.json") -Destination $publishPath
Copy-Item (Join-Path $functionsDir "package-lock.json") -Destination $publishPath -ErrorAction SilentlyContinue
Copy-Item -Recurse (Join-Path $functionsDir "dist") -Destination $publishPath

# Zip the publish contents
Compress-Archive -Path "$publishPath\*" -DestinationPath $zipFile -Force
    
# Clean up temp folder
Remove-Item -Recurse -Force $publishPath

Write-Info "Deploying to Azure (this may take 2-3 minutes)..."
az functionapp deployment source config-zip `
    --resource-group $ResourceGroup `
    --name $functionAppName `
    --src $zipFile | Out-Null

Write-Success "Functions deployed successfully"

# Clean up
Remove-Item $zipFile -Force
Set-Location $projectRoot

# ---------------------------
# Step 7: Verify Deployment
# ---------------------------
Write-Step "Step 7: Verifying Deployment"
Write-Info "Waiting for functions to start (30 seconds)..."
Start-Sleep -Seconds 30

$functions = az functionapp function list `
    --name $functionAppName `
    --resource-group $ResourceGroup `
    --query "[].name" `
    --output tsv

if ($functions) {
    Write-Success "Functions deployed:"
    foreach ($func in $functions) {
        Write-Host "  - $func" -ForegroundColor White
    }
}
else {
    Write-Error-Custom "No functions found. Check deployment logs."
}

# ---------------------------
# Step 8: Get Function URLs
# ---------------------------
Write-Step "Step 8: Getting Function URLs"
$functionUrls = @{}

foreach ($func in $functions) {
    $url = az functionapp function show `
        --name $functionAppName `
        --resource-group $ResourceGroup `
        --function-name $func `
        --query "invokeUrlTemplate" `
        --output tsv
    
    if ($url) {
        $functionUrls[$func] = $url
    }
}

# ---------------------------
# Step 9: Test Health (if applicable)
# ---------------------------
Write-Step "Step 9: Testing Function Availability"
foreach ($func in $functionUrls.Keys) {
    $url = $functionUrls[$func]
    Write-Info "Testing $func..."
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 10 2>$null
        Write-Success "$func is responding (Status: $($response.StatusCode))"
    }
    catch {
        Write-Info "$func may require HTTP POST or parameters"
    }
}

# ---------------------------
# Step 10: Output Summary
# ---------------------------
Write-Step "Deployment Summary"
Write-Host ""
Write-Host "✓ Function App: $functionAppName" -ForegroundColor Green
Write-Host "✓ Storage Account: $storageAccountName" -ForegroundColor Green
Write-Host "✓ Application Insights: $appInsightsName" -ForegroundColor Green
Write-Host ""
Write-Host "Deployed Functions:" -ForegroundColor Cyan
foreach ($func in $functionUrls.Keys) {
    Write-Host "  - $func" -ForegroundColor White
    Write-Host "    URL: $($functionUrls[$func])" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Configure function keys for secure access" -ForegroundColor White
Write-Host "2. Set up HTTP triggers or timer triggers as needed" -ForegroundColor White
Write-Host "3. Test each function with sample payloads" -ForegroundColor White
Write-Host "4. Configure Azure Communication Services if needed" -ForegroundColor White
Write-Host "5. Monitor function logs in Application Insights" -ForegroundColor White
Write-Host ""
Write-Host "View logs:" -ForegroundColor Cyan
Write-Host "az functionapp log tail --name $functionAppName --resource-group $ResourceGroup" -ForegroundColor White
Write-Host ""
Write-Success "Azure Functions deployment completed successfully!"
