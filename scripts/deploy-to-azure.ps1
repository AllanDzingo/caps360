# CAPS360 Azure Deployment Script
# Deploys App Service backend, Static Web Apps frontend, and configures PostgreSQL
# Prerequisites:
#   - Azure CLI installed and authenticated (az login)
#   - Docker installed (optional, for container registry)
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

$ErrorActionPreference = "Stop" 

# ---------------------------
# Prerequisite Checks_check
# ---------------------------
Write-Host "Checking prerequisites..." -ForegroundColor Cyan
try { az version | Out-Null; Write-Host "Azure CLI found" -ForegroundColor Green } catch { Write-Host "Azure CLI missing" -ForegroundColor Red; exit 1 }
try { docker --version | Out-Null; Write-Host "Docker found" -ForegroundColor Green } catch { Write-Host "Docker not found - skipping container ops" -ForegroundColor Yellow }

if ($SubscriptionId) { az account set --subscription $SubscriptionId; Write-Host "Subscription set" -ForegroundColor Green }

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Write-Host "Project root: $projectRoot" -ForegroundColor Cyan

# ---------------------------
# PART 1: Resource Group
# ---------------------------
Write-Host "Step 1: Verifying Resource Group" -ForegroundColor Cyan
$rgExists = az group exists --name $ResourceGroup | ConvertFrom-Json
if (-not $rgExists) { az group create --name $ResourceGroup --location $Location | Out-Null; Write-Host "Resource group created" -ForegroundColor Green } else { Write-Host "Resource group exists" -ForegroundColor Green }

# ---------------------------
# PART 2: Backend Deployment
# ---------------------------
if (-not $SkipBackend) {
    Write-Host "Step 2: Deploying Backend" -ForegroundColor Cyan
    $backendAppName = "caps360-backend-$Environment"
    $backendPlanName = "caps360-plan
