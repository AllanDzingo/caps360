#!/usr/bin/env pwsh

# CAPS360 Azure Deployment Script (PowerShell)
# Deploys backend to App Service and frontend to Static Web App

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment,

    [Parameter(Mandatory = $true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory = $false)]
    [string]$Location = 'southafricanorth'
)

$ErrorActionPreference = "Stop"

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Invoke-Caps360Deployment {
    param(
        [string]$Environment,
        [string]$ResourceGroup,
        [string]$Location
    )

    # Get project root
    $projectRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

    Write-Info "========================================"
    Write-Info "CAPS360 Azure Deployment"
    Write-Info "========================================"
    Write-Info "Environment: $Environment"
    Write-Info "Resource Group: $ResourceGroup"
    Write-Info "Location: $Location"
    Write-Info "Project Root: $projectRoot"

    # ============================================================================
    # PART 1: RESOURCE GROUP
    # ============================================================================

    Write-Info "Step 1: Resource Group"
    Write-Info "========================================"

    $rgExists = az group exists --name $ResourceGroup | ConvertFrom-Json
    if (-not $rgExists) {
        Write-Info "Creating resource group..."
        az group create --name $ResourceGroup --location $Location | Out-Null
        Write-Success "Resource group created"
    } else {
        Write-Success "Resource group already exists"
    }

    # ============================================================================
    # PART 2: BACKEND DEPLOYMENT
    # ============================================================================

    Write-Info ""
    Write-Info "Step 2: Backend Deployment"
    Write-Info "========================================"

    $backendAppName = "caps360-backend-$Environment"
    $backendPlanName = "caps360-plan"

    $planExists = az appservice plan show `
        --resource-group $ResourceGroup `
        --name $backendPlanName 2>$null

    if (-not $?) {
        Write-Info "Creating App Service Plan..."
        az appservice plan create `
            --resource-group $ResourceGroup `
            --name $backendPlanName `
            --location $Location `
            --sku B1 `
            --is-linux | Out-Null
        Write-Success "App Service Plan created"
    } else {
        Write-Success "App Service Plan already exists"
    }

    $webAppExists = az webapp show `
        --resource-group $ResourceGroup `
        --name $backendAppName 2>$null

    if (-not $?) {
        Write-Info "Creating Web App..."
        az webapp create `
            --resource-group $ResourceGroup `
            --plan $backendPlanName `
            --name $backendAppName `
            --runtime "NODE|20-lts" | Out-Null
        Write-Success "Web App created"
    } else {
        Write-Success "Web App already exists"
    }

    Write-Info "Configuring application settings..."
    $envFile = "$projectRoot\.env.$Environment"
    if (Test-Path $envFile) {
        Write-Info "Loading environment variables from .env.$Environment..."
        $settings = @()
        Get-Content $envFile | ForEach-Object {
            if ($_ -and -not $_.StartsWith('#')) {
                $parts = $_ -split '=', 2
                if ($parts.Length -eq 2) {
                    $settings += "$($parts[0])=$($parts[1])"
                }
            }
        }

        if ($settings.Count -gt 0) {
            az webapp config appsettings set `
                --resource-group $ResourceGroup `
                --name $backendAppName `
                --settings $settings | Out-Null
        }
    }
    Write-Success "Application settings configured"

    Write-Info "Enabling Always On..."
    az webapp config set `
        --resource-group $ResourceGroup `
        --name $backendAppName `
        --always-on true | Out-Null
    Write-Success "Always On enabled"

    Write-Info "Building backend..."
    Push-Location "$projectRoot\backend"
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
    }
    npm ci | Out-Null
    npm run build | Out-Null
    npm prune --production | Out-Null

    $zipPath = Join-Path $projectRoot "backend.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }

    Write-Info "Packaging backend (dist + node_modules)..."
    tar -a -c -f $zipPath dist package.json package-lock.json node_modules | Out-Null

    Write-Info "Deploying backend code..."
    cmd /c az webapp deploy --resource-group $ResourceGroup --name $backendAppName --src-path $zipPath --type zip | Out-Null

    Remove-Item $zipPath -Force
    Pop-Location
    Write-Success "Backend deployed"
    $backendUrl = "https://$backendAppName.azurewebsites.net"
    Write-Success "Backend URL: $backendUrl"

    # ============================================================================
    # PART 3: FRONTEND DEPLOYMENT
    # ============================================================================

    Write-Info ""
    Write-Info "Step 3: Frontend Deployment"
    Write-Info "========================================"

    $staticWebAppName = "caps360-web-$Environment"

    $staticExists = az staticwebapp show `
        --name $staticWebAppName `
        --resource-group $ResourceGroup 2>$null

    if (-not $?) {
        Write-Info "Creating Static Web App..."
        az staticwebapp create `
            --name $staticWebAppName `
            --resource-group $ResourceGroup `
            --location $Location | Out-Null
        Write-Success "Static Web App created"
    } else {
        Write-Success "Static Web App already exists"
    }

    Write-Info "Building frontend..."
    Push-Location "$projectRoot\frontend-web"
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
    }
    npm ci | Out-Null
    npm run build | Out-Null
    Pop-Location
    Write-Success "Frontend built"

    Write-Info "Deploying frontend..."
    Push-Location "$projectRoot\frontend-web"

    if (Test-Path "dist") {
        $deployToken = az staticwebapp secrets list `
            --name $staticWebAppName `
            --resource-group $ResourceGroup `
            --query "properties.apiKey" `
            -o tsv 2>$null

        if ($deployToken) {
            npm install -g @azure/static-web-apps-cli 2>$null | Out-Null
            swa deploy --deployment-token $deployToken --env production | Out-Null
            Write-Success "Frontend deployed"
        } else {
            Write-Warning "Could not retrieve deployment token"
        }
    }

    Pop-Location
    $frontendUrl = "https://$staticWebAppName.azurestaticapps.net"
    Write-Success "Frontend URL: $frontendUrl"

    # ============================================================================
    # SUMMARY
    # ============================================================================

    Write-Info ""
    Write-Info "========================================"
    Write-Info "Deployment Complete"
    Write-Info "========================================"
    Write-Success "Deployment completed successfully!"

    Write-Info ""
    Write-Info "Deployment Details:"
    Write-Info "  Environment: $Environment"
    Write-Info "  Resource Group: $ResourceGroup"
    Write-Info "  Location: $Location"
    Write-Info "  Backend URL: $backendUrl"
    Write-Info "  Frontend URL: $frontendUrl"

    Write-Info ""
    Write-Success "Your application is deployed to Azure!"
}


Invoke-Caps360Deployment -Environment $Environment -ResourceGroup $ResourceGroup -Location $Location
