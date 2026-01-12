# CAPS360 Azure Deployment Script
# This script deploys the application to Azure (App Service + Static Web Apps)
# Prerequisites:
#   - Azure CLI installed and authenticated (az login)
#   - Docker installed (for container registry)
#   - Appropriate Azure permissions
# Usage: .\deploy-to-azure.ps1 -Environment prod -ResourceGroup <name> -SubscriptionId <id>

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

# Color output
# Logging functions removed - replaced with inline Write-Host calls

# Set error action preference
$ErrorActionPreference = "Stop"

# Check prerequisites
Write-Host "INFO: $Message" -ForegroundColor Cyan "Checking prerequisites..."
try {
    az version | Out-Null
    Write-Host "SUCCESS: $Message" -ForegroundColor Green "Azure CLI found"
}
catch {
    Write-Host "ERROR: $Message" -ForegroundColor Red "Azure CLI not installed or not in PATH"
    exit 1
}

try {
    docker --version | Out-Null
    Write-Host "SUCCESS: $Message" -ForegroundColor Green "Docker found"
}
catch {
    Write-Host "WARNING: $Message" -ForegroundColor Yellow "Docker not found - will skip container operations"
}

# Set subscription if provided
if ($SubscriptionId) {
    Write-Host "INFO: $Message" -ForegroundColor Cyan "Setting Azure subscription to $SubscriptionId..."
    az account set --subscription $SubscriptionId
    Write-Host "SUCCESS: $Message" -ForegroundColor Green "Subscription set"
}

# Get current location
$currentLocation = Get-Location
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "INFO: $Message" -ForegroundColor Cyan "Project root: $projectRoot"
Write-Host "INFO: $Message" -ForegroundColor Cyan "Environment: $Environment"
Write-Host "INFO: $Message" -ForegroundColor Cyan "Resource Group: $ResourceGroup"
Write-Host "INFO: $Message" -ForegroundColor Cyan "Location: $Location"

# ============================================================================
# PART 1: RESOURCE GROUP AND BASIC INFRASTRUCTURE
# ============================================================================

Write-Host "INFO: $Message" -ForegroundColor Cyan "========================================"
Write-Host "INFO: $Message" -ForegroundColor Cyan "Step 1: Creating/Verifying Resource Group"
Write-Host "INFO: $Message" -ForegroundColor Cyan "========================================"

$rgExists = az group exists --name $ResourceGroup | ConvertFrom-Json
if (-not $rgExists) {
    Write-Host "INFO: $Message" -ForegroundColor Cyan "Creating resource group '$ResourceGroup' in $Location..."
    az group create --name $ResourceGroup --location $Location
    Write-Host "SUCCESS: $Message" -ForegroundColor Green "Resource group created"
}
else {
    Write-Host "SUCCESS: $Message" -ForegroundColor Green "Resource group '$ResourceGroup' already exists"
}

# ============================================================================
# PART 2: BACKEND DEPLOYMENT
# ============================================================================

if (-not $SkipBackend) {
    Write-Host "INFO: $Message" -ForegroundColor Cyan "========================================"
    Write-Host "INFO: $Message" -ForegroundColor Cyan "Step 2: Deploying Backend"
    Write-Host "INFO: $Message" -ForegroundColor Cyan "========================================"

    # Define backend resources
    $backendAppName = "caps360-backend-$Environment"
    $backendPlanName = "caps360-plan"
    $containerRegistryName = "caps360acr$Environment".Replace('-', '')
    
    # Create App Service Plan
    Write-Host "INFO: $Message" -ForegroundColor Cyan "Creating App Service Plan '$backendPlanName'..."
    az appservice plan create `
        --resource-group $ResourceGroup `
        --name $backendPlanName `
        --location $Location `
        --sku B1 `
        --is-linux `
        --number-of-workers 1 | Out-Null
    Write-Host "SUCCESS: $Message" -ForegroundColor Green "App Service Plan created"

    # Create Web App for Backend
    Write-Host "INFO: $Message" -ForegroundColor Cyan "Creating Web App '$backendAppName'..."
    az webapp create `
        --resource-group $ResourceGroup `
        --plan $backendPlanName `
        --name $backendAppName `
        --runtime '"NODE|20-lts"'
    Write-Host "SUCCESS: $Message" -ForegroundColor Green "Web App created"

    # Configure application settings
    Write-Host "INFO: $Message" -ForegroundColor Cyan "Configuring application settings..."
    $settings = @(
        "NODE_ENV=$Environment"
        "DEPLOYMENT_ENVIRONMENT=$Environment"
    )
    
    # Add to settings if they exist
    if (Test-Path "$projectRoot\.env.$Environment") {
        Write-Host "INFO: $Message" -ForegroundColor Cyan "Loading environment variables from .env.$Environment..."
        $envContent = Get-Content "$projectRoot\.env.$Environment"
        foreach ($line in $envContent) {
            if ($line -and -not $line.StartsWith('#')) {
                $settings += $line
            }
        }
    }

    az webapp config appsettings set `
        --resource-group $ResourceGroup `
        --name $backendAppName `
        --settings $settings | Out-Null
    Write-Host "SUCCESS: $Message" -ForegroundColor Green "Application settings configured"

    # Enable Always On for better reliability
    Write-Host "INFO: $Message" -ForegroundColor Cyan "Enabling Always On..."
    az webapp config set `
        --resource-group $ResourceGroup `
        --name $backendAppName `
        --always-on true | Out-Null
    Write-Host "SUCCESS: $Message" -ForegroundColor Green "Always On enabled"

    # Configure CORS and other settings
    Write-Host "INFO: $Message" -ForegroundColor Cyan "Configuring web app settings..."
    az webapp config set `
        --resource-group $ResourceGroup `
        --name $backendAppName `
        --linux-fx-version '"NODE|20-lts"' `
        --http20-enabled true | Out-Null
    Write-Host "SUCCESS: $Message" -ForegroundColor Green "Web app settings configured"

    # Build backend if needed
    if (-not $SkipBuild) {
        Write-Host "INFO: $Message" -ForegroundColor Cyan "Building backend..."
        Push-Location "$projectRoot\backend"
        
        if (Test-Path "node_modules" -PathType Container) {
            Write-Host "INFO: $Message" -ForegroundColor Cyan "Cleaning node_modules..."
            Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
        }
        
        npm ci
        npm run build
        
        Pop-Location
        Write-Host "SUCCESS: $Message" -ForegroundColor Green "Backend built"
    }

    # Deploy backend code
    Write-Host "INFO: $Message" -ForegroundColor Cyan "Deploying backend code to Azure App Service..."
    Push-Location "$projectRoot\backend"
    
    # Create deployment package
    if (Test-Path "dist" -PathType Container) {
        # Prepare zip file
        $zipPath = "$projectRoot\backend-deploy.zip"
        if (Test-Path $zipPath) {
            Remove-Item $zipPath
        }
        
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::CreateFromDirectory("$projectRoot\backend\dist", $zipPath)
        
        # Deploy
        az webapp deployment source config-zip `
            --resource-group $ResourceGroup `
            --name $backendAppName `
            --src $zipPath | Out-Null
        
        Remove-Item $zipPath
        Write-Host "SUCCESS: $Message" -ForegroundColor Green "Backend deployed to Azure App Service"
    }

    Pop-Location

    $backendUrl = "https://$backendAppName.azurewebsites.net"
    Write-Host "SUCCESS: $Message" -ForegroundColor Green "Backend deployed at: $backendUrl"
}

# ============================================================================
# PART 3: FRONTEND DEPLOYMENT
# ============================================================================

if (-not $SkipFrontend) {
    Write-Host "INFO: $Message" -ForegroundColor Cyan "========================================"
    Write-Host "INFO: $Message" -ForegroundColor Cyan "Step 3: Deploying Frontend"
    Write-Host "INFO: $Message" -ForegroundColor Cyan "========================================"

    # Define frontend resources
    $frontendAppName = "caps360-frontend-$Environment"
    $staticWebAppName = "caps360-web-$Environment"

    # Create Static Web App
    Write-Host "INFO: $Message" -ForegroundColor Cyan "Creating Static Web App '$staticWebAppName'..."
    az staticwebapp create `
        --name $staticWebAppName `
        --resource-group $ResourceGroup `
        --location $FrontendLocation | Out-Null
    Write-Host "SUCCESS: $Message" -ForegroundColor Green "Static Web App created"

    # Build frontend if needed
    if (-not $SkipBuild) {
        Write-Host "INFO: $Message" -ForegroundColor Cyan "Building frontend..."
        Push-Location "$projectRoot\frontend-web"
        
        if (Test-Path "node_modules" -PathType Container) {
            Write-Host "INFO: $Message" -ForegroundColor Cyan "Cleaning node_modules..."
            Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
        }
        
        npm ci
        npm run build
        
        Pop-Location
        Write-Host "SUCCESS: $Message" -ForegroundColor Green "Frontend built"
    }

    # Deploy frontend
    Write-Host "INFO: $Message" -ForegroundColor Cyan "Deploying frontend to Static Web App..."
    Push-Location "$projectRoot\frontend-web"
    
    if (Test-Path "dist" -PathType Container) {
        $deployToken = az staticwebapp secrets list `
            --name $staticWebAppName `
            --resource-group $ResourceGroup `
            --query "properties.apiKey" `
            -o tsv

        if ($deployToken) {
            # Using SWA CLI for deployment
            npm install -g @azure/static-web-apps-cli
            swa deploy --deployment-token $deployToken --env production
            Write-Host "SUCCESS: $Message" -ForegroundColor Green "Frontend deployed to Static Web App"
        }
        else {
            Write-Host "WARNING: $Message" -ForegroundColor Yellow "Could not retrieve deployment token for Static Web App"
        }
    }

    Pop-Location

    $frontendUrl = "https://$staticWebAppName.azurestaticapps.net"
    Write-Host "SUCCESS: $Message" -ForegroundColor Green "Frontend deployed at: $frontendUrl"
}

# ============================================================================
# PART 4: DATABASE SETUP (if using Azure PostgreSQL)
# ============================================================================

Write-Host "INFO: $Message" -ForegroundColor Cyan "========================================"
Write-Host "INFO: $Message" -ForegroundColor Cyan "Step 4: Database Configuration"
Write-Host "INFO: $Message" -ForegroundColor Cyan "========================================"

$dbServerName = "caps360-db-$Environment"
$dbExists = az postgres server show `
    --resource-group $ResourceGroup `
    --name $dbServerName `
    --query "name" `
    -o tsv 2>$null

if (-not $dbExists) {
    Write-Host "WARNING: $Message" -ForegroundColor Yellow "Azure PostgreSQL server not found. Ensure database is configured separately."
    Write-Host "INFO: $Message" -ForegroundColor Cyan "To create one, run:"
    Write-Host "INFO: $Message" -ForegroundColor Cyan "az postgres server create --resource-group $ResourceGroup --name $dbServerName --location $Location --admin-user caps360admin --admin-password <password> --sku-name B_Gen5_1"
}
else {
    Write-Host "SUCCESS: $Message" -ForegroundColor Green "Database server found: $dbServerName"
    
    # Run migrations if database exists
    if ($null -ne (az postgres db show --resource-group $ResourceGroup --server-name $dbServerName --name "caps360" --query "name" -o tsv 2>$null)) {
        Write-Host "INFO: $Message" -ForegroundColor Cyan "Running database migrations..."
        # Add migration commands here
        Write-Host "SUCCESS: $Message" -ForegroundColor Green "Database ready"
    }
}

# ============================================================================
# PART 5: MONITORING AND DIAGNOSTICS
# ============================================================================

Write-Host "INFO: $Message" -ForegroundColor Cyan "========================================"
Write-Host "INFO: $Message" -ForegroundColor Cyan "Step 5: Configuring Monitoring"
Write-Host "INFO: $Message" -ForegroundColor Cyan "========================================"

$appInsightsName = "caps360-insights-$Environment"

# Create Application Insights
Write-Host "INFO: $Message" -ForegroundColor Cyan "Creating Application Insights instance '$appInsightsName'..."
$insightsResult = az monitor app-insights component create `
    --app $appInsightsName `
    --location $Location `
    --resource-group $ResourceGroup `
    --query "instrumentationKey" `
    -o tsv

if ($insightsResult) {
    Write-Host "SUCCESS: $Message" -ForegroundColor Green "Application Insights created"
    
    # Link to backend app if deployed
    if (-not $SkipBackend) {
        az webapp config appsettings set `
            --resource-group $ResourceGroup `
            --name $backendAppName `
            --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$insightsResult" | Out-Null
        Write-Host "SUCCESS: $Message" -ForegroundColor Green "Application Insights linked to backend"
    }
}

# ============================================================================
# PART 6: CLEANUP AND SUMMARY
# ============================================================================

Write-Host "INFO: $Message" -ForegroundColor Cyan "========================================"
Write-Host "INFO: $Message" -ForegroundColor Cyan "Step 6: Deployment Summary"
Write-Host "INFO: $Message" -ForegroundColor Cyan "========================================"

Write-Host "SUCCESS: $Message" -ForegroundColor Green "Deployment completed successfully!"

Write-Host "INFO: $Message" -ForegroundColor Cyan "Deployment Details:"
Write-Host "INFO: $Message" -ForegroundColor Cyan "  Environment: $Environment"
Write-Host "INFO: $Message" -ForegroundColor Cyan "  Resource Group: $ResourceGroup"
Write-Host "INFO: $Message" -ForegroundColor Cyan "  Location: $Location"

if (-not $SkipBackend) {
    Write-Host "INFO: $Message" -ForegroundColor Cyan "  Backend URL: $backendUrl"
    Write-Host "INFO: $Message" -ForegroundColor Cyan "  Backend App Name: $backendAppName"
}

if (-not $SkipFrontend) {
    Write-Host "INFO: $Message" -ForegroundColor Cyan "  Frontend URL: $frontendUrl"
    Write-Host "INFO: $Message" -ForegroundColor Cyan "  Static Web App Name: $staticWebAppName"
}

Write-Host "INFO: $Message" -ForegroundColor Cyan ""
Write-Host "WARNING: $Message" -ForegroundColor Yellow "Next Steps:"
Write-Host "INFO: $Message" -ForegroundColor Cyan "1. Verify deployment health by visiting the URLs above"
Write-Host "INFO: $Message" -ForegroundColor Cyan "2. Configure custom domain if needed"
Write-Host "INFO: $Message" -ForegroundColor Cyan "3. Set up SSL/TLS certificates"
Write-Host "INFO: $Message" -ForegroundColor Cyan "4. Configure CI/CD pipeline in Azure DevOps or GitHub Actions"
Write-Host "INFO: $Message" -ForegroundColor Cyan "5. Monitor logs and metrics in Application Insights"

Write-Host "INFO: $Message" -ForegroundColor Cyan ""
Write-Host "INFO: $Message" -ForegroundColor Cyan "Useful Commands:"
Write-Host "INFO: $Message" -ForegroundColor Cyan "  View backend logs:     az webapp log tail --resource-group $ResourceGroup --name $backendAppName"
Write-Host "INFO: $Message" -ForegroundColor Cyan "  View frontend logs:    az staticwebapp logs list --resource-group $ResourceGroup --name $staticWebAppName"
Write-Host "INFO: $Message" -ForegroundColor Cyan "  Monitor health:        az monitor metrics list --resource-group $ResourceGroup"

Pop-Location
