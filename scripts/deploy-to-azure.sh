# ====================================================================
# CAPS360 Azure Deployment Script (Windows PowerShell)
# Deploys backend to App Service and frontend to Static Web App
# Includes automatic staticwebapp.config.json deployment
# ====================================================================

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment,

    [Parameter(Mandatory = $true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory = $false)]
    [string]$SubscriptionId,

    [Parameter(Mandatory = $false)]
    [string]$Location = 'southafricanorth',
    
    [Parameter(Mandatory = $false)]
    [string]$FrontendLocation = 'westeurope',

    [Parameter(Mandatory = $false)]
    [bool]$SkipBuild = $false,

    [Parameter(Mandatory = $false)]
    [bool]$SkipFrontend = $false,

    [Parameter(Mandatory = $false)]
    [bool]$SkipBackend = $false
)

# ====================================================================
# Setup
# ====================================================================

$ErrorActionPreference = "Stop"

# Set subscription if provided
if ($SubscriptionId) {
    Write-Host "INFO: Setting Azure subscription to $SubscriptionId..." -ForegroundColor Cyan
    az account set --subscription $SubscriptionId
    Write-Host "SUCCESS: Subscription set" -ForegroundColor Green
}

# Determine project root
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Write-Host "INFO: Project root: $projectRoot" -ForegroundColor Cyan
Write-Host "INFO: Environment: $Environment" -ForegroundColor Cyan
Write-Host "INFO: Resource Group: $ResourceGroup" -ForegroundColor Cyan
Write-Host "INFO: Location: $Location" -ForegroundColor Cyan

# ====================================================================
# Step 1: Resource Group
# ====================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 1: Creating/Verifying Resource Group" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$rgExists = az group exists --name $ResourceGroup | ConvertFrom-Json
if (-not $rgExists) {
    Write-Host "Creating resource group '$ResourceGroup'..." -ForegroundColor Cyan
    az group create --name $ResourceGroup --location $Location | Out-Null
    Write-Host "SUCCESS: Resource group created" -ForegroundColor Green
} else {
    Write-Host "SUCCESS: Resource group '$ResourceGroup' already exists" -ForegroundColor Green
}

# ====================================================================
# Step 2: Backend Deployment
# ====================================================================

if (-not $SkipBackend) {

    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Step 2: Deploying Backend" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    $backendAppName = "caps360-backend-$Environment"
    $backendPlanName = "caps360-plan"
    
    # Create App Service Plan
    Write-Host "Creating App Service Plan '$backendPlanName'..." -ForegroundColor Cyan
    az appservice plan create `
        --resource-group $ResourceGroup `
        --name $backendPlanName `
        --location $Location `
        --sku B1 `
        --is-linux `
        --number-of-workers 1 | Out-Null
    Write-Host "SUCCESS: App Service Plan created" -ForegroundColor Green

    # Create Web App
    Write-Host "Creating Web App '$backendAppName'..." -ForegroundColor Cyan
    az webapp create `
        --resource-group $ResourceGroup `
        --plan $backendPlanName `
        --name $backendAppName `
        --runtime "NODE|20-lts" | Out-Null
    Write-Host "SUCCESS: Web App created" -ForegroundColor Green

    # Load environment variables
    $settings = @(
        "NODE_ENV=$Environment"
        "DEPLOYMENT_ENVIRONMENT=$Environment"
    )
    $envFile = "$projectRoot\.env.$Environment"
    if (Test-Path $envFile) {
        Write-Host "Loading environment variables from $envFile..." -ForegroundColor Cyan
        $envContent = Get-Content $envFile
        foreach ($line in $envContent) {
            if ($line -and -not $line.StartsWith('#')) { $settings += $line }
        }
    }

    az webapp config appsettings set `
        --resource-group $ResourceGroup `
        --name $backendAppName `
        --settings $settings | Out-Null
    Write-Host "SUCCESS: Application settings configured" -ForegroundColor Green

    # Enable Always On
    az webapp config set `
        --resource-group $ResourceGroup `
        --name $backendAppName `
        --always-on true | Out-Null
    Write-Host "SUCCESS: Always On enabled" -ForegroundColor Green

    # Build backend
    if (-not $SkipBuild) {
        Write-Host "Building backend..." -ForegroundColor Cyan
        Push-Location "$projectRoot\backend"

        if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }

        npm ci
        npm run build

        Pop-Location
        Write-Host "SUCCESS: Backend built" -ForegroundColor Green
    }

    # Deploy backend using PowerShell zip
    Write-Host "Deploying backend code..." -ForegroundColor Cyan
    $distPath = "$projectRoot\backend\dist"
    $zipPath = "$projectRoot\backend-deploy.zip"

    if (Test-Path $zipPath) { Remove-Item $zipPath }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($distPath, $zipPath)

    az webapp deployment source config-zip `
        --resource-group $ResourceGroup `
        --name $backendAppName `
        --src $zipPath | Out-Null

    Remove-Item $zipPath
    Write-Host "SUCCESS: Backend deployed to Azure App Service" -ForegroundColor Green
    $backendUrl = "https://$backendAppName.azurewebsites.net"
    Write-Host "Backend URL: $backendUrl" -ForegroundColor Green
}

# ====================================================================
# Step 3: Frontend Deployment
# ====================================================================

if (-not $SkipFrontend) {

    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Step 3: Deploying Frontend" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    $staticWebAppName = "caps360-web-$Environment"
    $frontendPath = "$projectRoot\frontend-web"

    # Validate staticwebapp.config.json
    $configFile = "$frontendPath\staticwebapp.config.json"
    if (Test-Path $configFile) {
        try {
            $configJson = Get-Content $configFile -Raw | ConvertFrom-Json
            Write-Host "SUCCESS: staticwebapp.config.json is valid JSON" -ForegroundColor Green
        } catch {
            Write-Host "ERROR: staticwebapp.config.json is not valid JSON. Fix errors before deployment." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "WARNING: staticwebapp.config.json not found in frontend folder" -ForegroundColor Yellow
    }

    # Create Static Web App
    Write-Host "Creating Static Web App '$staticWebAppName'..." -ForegroundColor Cyan
    az staticwebapp create `
        --name $staticWebAppName `
        --resource-group $ResourceGroup `
        --location $FrontendLocation | Out-Null
    Write-Host "SUCCESS: Static Web App created" -ForegroundColor Green

    # Build frontend
    if (-not $SkipBuild) {
        Write-Host "Building frontend..." -ForegroundColor Cyan
        Push-Location $frontendPath

        if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }

        npm ci
        npm run build

        Pop-Location
        Write-Host "SUCCESS: Frontend built" -ForegroundColor Green
    }

    # Deploy frontend using SWA CLI
    Push-Location $frontendPath
    $deployToken = az staticwebapp secrets list `
        --name $staticWebAppName `
        --resource-group $ResourceGroup `
        --query "properties.apiKey" `
        -o tsv

    if ($deployToken) {
        npm install -g @azure/static-web-apps-cli
        swa deploy --deployment-token $deployToken --env production
        Write-Host "SUCCESS: Frontend deployed to Static Web App" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Could not retrieve deployment token" -ForegroundColor Yellow
    }
    Pop-Location

    $frontendUrl = "https://$staticWebAppName.azurestaticapps.net"
    Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Green
}

# ====================================================================
# Step 4: Database Check (Existing PostgreSQL)
# ====================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 4: Verifying Database" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$dbServerName = "caps360-pg"

$dbExists = az postgres flexible-server show `
    --resource-group $ResourceGroup `
    --name $dbServerName `
    --query "name" -o tsv 2>$null

if ($dbExists) {
    Write-Host "SUCCESS: PostgreSQL server found: $dbServerName" -ForegroundColor Green
} else {
    Write-Host "WARNING: PostgreSQL server '$dbServerName' not found!" -ForegroundColor Yellow
    Write-Host "Ensure you have an existing instance (caps360-pg) in the resource group."
}

# ====================================================================
# Step 5: Deployment Summary
# ====================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "Backend URL: $backendUrl" -ForegroundColor Green
Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Green
