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
}
else {
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
    if ($Environment -eq 'prod') {
        $backendPlanName = "caps360-plan-prod"
    }
    else {
        $backendPlanName = "caps360-plan"
    }
    
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
        --runtime 'NODE|20-lts' | Out-Null
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
    # Prepare backend artifact with package.json
    Write-Host "Preparing backend artifact..." -ForegroundColor Cyan
    $publishPath = "$projectRoot\backend\publish_temp"
    if (Test-Path $publishPath) { Remove-Item -Recurse -Force $publishPath }
    New-Item -ItemType Directory -Path $publishPath | Out-Null
    
    # Copy necessary files
    Copy-Item "$projectRoot\backend\package.json" -Destination $publishPath
    Copy-Item "$projectRoot\backend\package-lock.json" -Destination $publishPath -ErrorAction SilentlyContinue
    Copy-Item -Recurse "$projectRoot\backend\dist" -Destination $publishPath

    # Deploy backend using PowerShell zip
    Write-Host "Zipping backend artifact..." -ForegroundColor Cyan
    $zipPath = "$projectRoot\backend-deploy.zip"
    
    if (Test-Path $zipPath) { Remove-Item $zipPath }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($publishPath, $zipPath)

    # Clean up temp folder
    Remove-Item -Recurse -Force $publishPath

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
# Step 2.5: Azure Functions Deployment
# ====================================================================

if (-not $SkipBackend) {
    # Treating functions as part of backend logic for now, or could add separate flag

    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Step 2.5: Deploying Azure Functions" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    $funcAppName = "caps360-funcs-$Environment"
    # Storage name must be lowercase alphanumeric, max 24 chars
    $storageName = "caps360store$Environment" -replace '[^a-z0-9]', ''
    if ($storageName.Length -gt 24) { $storageName = $storageName.Substring(0, 24) }

    # Create Storage Account
    $storageExists = az storage account show --name $storageName --resource-group $ResourceGroup --query "name" -o tsv 2>$null
    if (-not $storageExists) {
        Write-Host "Creating Storage Account '$storageName'..." -ForegroundColor Cyan
        az storage account create `
            --name $storageName `
            --resource-group $ResourceGroup `
            --location $Location `
            --sku Standard_LRS | Out-Null
        Write-Host "SUCCESS: Storage Account created" -ForegroundColor Green
    }
    else {
        Write-Host "SUCCESS: Storage Account '$storageName' already exists" -ForegroundColor Green
    }

    # Create Function App
    $funcAppExists = az functionapp show --name $funcAppName --resource-group $ResourceGroup --query "name" -o tsv 2>$null
    if (-not $funcAppExists) {
        Write-Host "Creating Function App '$funcAppName'..." -ForegroundColor Cyan
        az functionapp create `
            --name $funcAppName `
            --resource-group $ResourceGroup `
            --storage-account $storageName `
            --consumption-plan-location $Location `
            --runtime node `
            --runtime-version 20 `
            --functions-version 4 `
            --os-type Linux | Out-Null
        Write-Host "SUCCESS: Function App created" -ForegroundColor Green
    }
    else {
        Write-Host "SUCCESS: Function App '$funcAppName' already exists" -ForegroundColor Green
    }

    # Configure App Settings (Copy relevant backend settings)
    $funcSettings = @(
        "NODE_ENV=$Environment"
        "FUNCTIONS_WORKER_RUNTIME=node"
    )
    # Add project specific env vars if needed, reusing $envContent from backend step if available
    if ($envContent) {
        foreach ($line in $envContent) {
            if ($line -and -not $line.StartsWith('#')) { $funcSettings += $line }
        }
    }

    az functionapp config appsettings set `
        --name $funcAppName `
        --resource-group $ResourceGroup `
        --settings $funcSettings | Out-Null
    Write-Host "SUCCESS: Function App settings configured" -ForegroundColor Green

    # Build Functions
    if (-not $SkipBuild) {
        Write-Host "Building functions..." -ForegroundColor Cyan
        Push-Location "$projectRoot\functions"

        if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }

        npm ci
        npm run build

        Pop-Location
        Write-Host "SUCCESS: Functions built" -ForegroundColor Green
    }

    # Prepare Functions Artifact
    Write-Host "Preparing functions artifact..." -ForegroundColor Cyan
    $funcPublishPath = "$projectRoot\functions\publish_temp"
    if (Test-Path $funcPublishPath) { Remove-Item -Recurse -Force $funcPublishPath }
    New-Item -ItemType Directory -Path $funcPublishPath | Out-Null

    # Copy files: host.json, package.json, dist
    Copy-Item "$projectRoot\functions\host.json" -Destination $funcPublishPath
    Copy-Item "$projectRoot\functions\package.json" -Destination $funcPublishPath
    Copy-Item "$projectRoot\functions\package-lock.json" -Destination $funcPublishPath -ErrorAction SilentlyContinue
    Copy-Item -Recurse "$projectRoot\functions\dist" -Destination $funcPublishPath

    # Zip Functions Artifact
    Write-Host "Zipping functions artifact..." -ForegroundColor Cyan
    $funcZipPath = "$projectRoot\functions-deploy.zip"
    if (Test-Path $funcZipPath) { Remove-Item $funcZipPath }
    
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($funcPublishPath, $funcZipPath)

    # Clean cleanup
    Remove-Item -Recurse -Force $funcPublishPath

    # Deploy Functions
    Write-Host "Deploying functions code..." -ForegroundColor Cyan
    az functionapp deployment source config-zip `
        --resource-group $ResourceGroup `
        --name $funcAppName `
        --src $funcZipPath `
        --build-remote true | Out-Null

    Remove-Item $funcZipPath
    Write-Host "SUCCESS: Azure Functions deployed" -ForegroundColor Green
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
        }
        catch {
            Write-Host "ERROR: staticwebapp.config.json is not valid JSON. Fix errors before deployment." -ForegroundColor Red
            exit 1
        }
    }
    else {
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
    }
    else {
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
}
else {
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
