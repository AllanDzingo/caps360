# =====================================================
# CAPS360 MASTER DEPLOYMENT ORCHESTRATION SCRIPT
# =====================================================
# This script orchestrates the complete deployment of CAPS360 to Azure
# Components: Database -> Backend -> Frontend -> Functions -> Payment Configuration
# Usage: .\deploy-master.ps1 -Environment prod -ResourceGroup caps360-prod

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment,

    [Parameter(Mandatory = $true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory = $false)]
    [string]$Location = 'southafricanorth',

    [Parameter(Mandatory = $false)]
    [string]$FrontendLocation = 'westeurope',

    # Database parameters
    [Parameter(Mandatory = $false)]
    [string]$DbAdminPassword,

    [Parameter(Mandatory = $false)]
    [string]$DatabaseConnectionString,

    # Security parameters
    [Parameter(Mandatory = $true)]
    [string]$JwtSecret,

    # AI parameters
    [Parameter(Mandatory = $false)]
    [string]$GeminiApiKey,

    [Parameter(Mandatory = $false)]
    [string]$OpenAIApiKey,

    # Payment parameters
    [Parameter(Mandatory = $false)]
    [string]$PaystackSecretKey,

    [Parameter(Mandatory = $false)]
    [string]$PayfastMerchantId,

    [Parameter(Mandatory = $false)]
    [string]$PayfastMerchantKey,

    [Parameter(Mandatory = $false)]
    [string]$PayfastPassphrase,

    # Auth parameters (Supabase)
    [Parameter(Mandatory = $false)]
    [string]$SupabaseUrl,

    [Parameter(Mandatory = $false)]
    [string]$SupabaseAnonKey,

    [Parameter(Mandatory = $false)]
    [string]$SupabaseServiceRoleKey,

    # Communication services
    [Parameter(Mandatory = $false)]
    [string]$CommunicationServicesConnectionString,

    # Deployment options
    [Parameter(Mandatory = $false)]
    [bool]$SkipDatabase = $false,

    [Parameter(Mandatory = $false)]
    [bool]$SkipBackend = $false,

    [Parameter(Mandatory = $false)]
    [bool]$SkipFrontend = $false,

    [Parameter(Mandatory = $false)]
    [bool]$SkipFunctions = $false,

    [Parameter(Mandatory = $false)]
    [bool]$SkipPayments = $false,

    [Parameter(Mandatory = $false)]
    [bool]$SkipTests = $false,

    [Parameter(Mandatory = $false)]
    [bool]$AutoConfirm = $false
)

$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath

# ---------------------------
# Helper Functions
# ---------------------------
function Write-Banner {
    param([string]$Message)
    Write-Host "`n" -NoNewline
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n-> $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERR] $Message" -ForegroundColor Red
}

function Confirm-Action {
    param([string]$Message)
    
    if ($AutoConfirm) {
        return $true
    }
    
    Write-Host "`n$Message" -ForegroundColor Yellow
    $response = Read-Host "Continue? (y/n)"
    return $response -eq 'y' -or $response -eq 'Y'
}

# ---------------------------
# Deployment State Tracking
# ---------------------------
$deploymentState = @{
    StartTime = Get-Date
    Database  = @{ Status = "Not Started"; Output = $null }
    Backend   = @{ Status = "Not Started"; Output = $null }
    Frontend  = @{ Status = "Not Started"; Output = $null }
    Functions = @{ Status = "Not Started"; Output = $null }
    Payments  = @{ Status = "Not Started"; Output = $null }
    Tests     = @{ Status = "Not Started"; Output = $null }
}

# ---------------------------
# Banner & Prerequisites
# ---------------------------
Write-Banner "CAPS360 MASTER DEPLOYMENT"
Write-Host ""
Write-Host "Environment:     $Environment" -ForegroundColor White
Write-Host "Resource Group:  $ResourceGroup" -ForegroundColor White
Write-Host "Location:        $Location" -ForegroundColor White
Write-Host ""

# Prerequisites check
Write-Step "Checking prerequisites..."
try { az version | Out-Null; Write-Success "Azure CLI installed" } catch { Write-Error-Custom "Azure CLI missing"; exit 1 }
try { node --version | Out-Null; Write-Success "Node.js installed" } catch { Write-Error-Custom "Node.js missing"; exit 1 }
try { npm --version | Out-Null; Write-Success "npm installed" } catch { Write-Error-Custom "npm missing"; exit 1 }

# Confirm deployment
if (-not (Confirm-Action "This will deploy CAPS360 to Azure ($($Environment) environment).")) {
    Write-Host "Deployment cancelled by user." -ForegroundColor Yellow
    exit 0
}

# ---------------------------
# Auto-Load Environment Variables
# ---------------------------
Write-Step "Loading environment variables..."

# Function to load env file
function Load-EnvFile {
    param([string]$FilePath)
    if (Test-Path $FilePath) {
        Write-Host "Loading $FilePath..." -ForegroundColor Gray
        $content = Get-Content $FilePath
        foreach ($line in $content) {
            if ($line -match '^([^#=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                if (-not (Get-Variable -Name $name -Scope Script -ErrorAction SilentlyContinue)) {
                    # Only set if not already passed as param (though params are auto-bound, this sets global scope vars which might be picked up if logic used $env:VAR)
                    # Actually, for script params, we need to manually assign to the variable if it's null/empty
                    
                    # Map common env vars to script params
                    switch ($name) {
                        "JWT_SECRET" { if (-not $JwtSecret) { $script:JwtSecret = $value } }
                        "DATABASE_URL" { if (-not $DatabaseConnectionString) { $script:DatabaseConnectionString = $value } }
                        "GEMINI_API_KEY" { if (-not $GeminiApiKey) { $script:GeminiApiKey = $value } }
                        "OPENAI_API_KEY" { if (-not $OpenAIApiKey) { $script:OpenAIApiKey = $value } }
                        "PAYSTACK_SECRET_KEY" { if (-not $PaystackSecretKey) { $script:PaystackSecretKey = $value } }
                        "PAYFAST_MERCHANT_ID" { if (-not $PayfastMerchantId) { $script:PayfastMerchantId = $value } }
                        "PAYFAST_MERCHANT_KEY" { if (-not $PayfastMerchantKey) { $script:PayfastMerchantKey = $value } }
                        "PAYFAST_PASSPHRASE" { if (-not $PayfastPassphrase) { $script:PayfastPassphrase = $value } }
                        "SUPABASE_URL" { if (-not $SupabaseUrl) { $script:SupabaseUrl = $value } }
                        "SUPABASE_ANON_KEY" { if (-not $SupabaseAnonKey) { $script:SupabaseAnonKey = $value } }
                        "SUPABASE_SERVICE_ROLE_KEY" { if (-not $SupabaseServiceRoleKey) { $script:SupabaseServiceRoleKey = $value } }
                        "COMMUNICATION_SERVICES_CONNECTION_STRING" { if (-not $CommunicationServicesConnectionString) { $script:CommunicationServicesConnectionString = $value } }
                    }
                }
            }
        }
    }
}

Load-EnvFile "$projectRoot\.env"
Load-EnvFile "$projectRoot\.env.$Environment"
Write-Success "Environment variables loaded"

# ---------------------------
# Auto-Load Environment Variables
# ---------------------------
Write-Step "Loading environment variables..."

# Function to load env file
function Load-EnvFile {
    param([string]$FilePath)
    if (Test-Path $FilePath) {
        Write-Host "Loading $FilePath..." -ForegroundColor Gray
        $content = Get-Content $FilePath
        foreach ($line in $content) {
            if ($line -match '^([^#=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                if (-not (Get-Variable -Name $name -Scope Script -ErrorAction SilentlyContinue)) {
                    # Only set if not already passed as param (though params are auto-bound, this sets global scope vars which might be picked up if logic used $env:VAR)
                    # Actually, for script params, we need to manually assign to the variable if it's null/empty
                    
                    # Map common env vars to script params
                    switch ($name) {
                        "JWT_SECRET" { if (-not $JwtSecret) { $script:JwtSecret = $value } }
                        "DATABASE_URL" { if (-not $DatabaseConnectionString) { $script:DatabaseConnectionString = $value } }
                        "GEMINI_API_KEY" { if (-not $GeminiApiKey) { $script:GeminiApiKey = $value } }
                        "OPENAI_API_KEY" { if (-not $OpenAIApiKey) { $script:OpenAIApiKey = $value } }
                        "PAYSTACK_SECRET_KEY" { if (-not $PaystackSecretKey) { $script:PaystackSecretKey = $value } }
                        "PAYFAST_MERCHANT_ID" { if (-not $PayfastMerchantId) { $script:PayfastMerchantId = $value } }
                        "PAYFAST_MERCHANT_KEY" { if (-not $PayfastMerchantKey) { $script:PayfastMerchantKey = $value } }
                        "PAYFAST_PASSPHRASE" { if (-not $PayfastPassphrase) { $script:PayfastPassphrase = $value } }
                        "SUPABASE_URL" { if (-not $SupabaseUrl) { $script:SupabaseUrl = $value } }
                        "SUPABASE_ANON_KEY" { if (-not $SupabaseAnonKey) { $script:SupabaseAnonKey = $value } }
                        "SUPABASE_SERVICE_ROLE_KEY" { if (-not $SupabaseServiceRoleKey) { $script:SupabaseServiceRoleKey = $value } }
                        "COMMUNICATION_SERVICES_CONNECTION_STRING" { if (-not $CommunicationServicesConnectionString) { $script:CommunicationServicesConnectionString = $value } }
                    }
                }
            }
        }
    }
}

Load-EnvFile "$projectRoot\.env"
Load-EnvFile "$projectRoot\.env.$Environment"
Write-Success "Environment variables loaded"

# ---------------------------
# STEP 1: DATABASE DEPLOYMENT
# ---------------------------
if (-not $SkipDatabase) {
    Write-Banner "STEP 1: DATABASE DEPLOYMENT"
    $deploymentState.Database.Status = "In Progress"
    
    try {
        Write-Step "Deploying PostgreSQL database..."
        
        $dbParams = @{
            Environment   = $Environment
            ResourceGroup = $ResourceGroup
            Location      = $Location
        }
        
        if ($DbAdminPassword) {
            $dbParams['AdminPassword'] = $DbAdminPassword
        }
        
        & "$scriptPath\deploy-database.ps1" @dbParams
        
        # Extract connection string from output (stored in last deployment)
        if ($DatabaseConnectionString) {
            $dbConnectionString = $DatabaseConnectionString
        }
        else {
            $dbConnectionString = Read-Host "Enter the DATABASE_URL connection string from above"
        }
        
        $deploymentState.Database.Status = "Success"
        $deploymentState.Database.Output = @{ ConnectionString = $dbConnectionString }
        Write-Success "Database deployment completed"
    }
    catch {
        $deploymentState.Database.Status = "Failed"
        Write-Error-Custom "Database deployment failed: $_"
        exit 1
    }
}
else {
    Write-Banner "STEP 1: DATABASE DEPLOYMENT (SKIPPED)"
    $deploymentState.Database.Status = "Skipped"
    if ($DatabaseConnectionString) {
        $dbConnectionString = $DatabaseConnectionString
    }
    else {
        $dbConnectionString = Read-Host "Enter the DATABASE_URL connection string"
    }
}

# ---------------------------
# STEP 2: BACKEND DEPLOYMENT
# ---------------------------
if (-not $SkipBackend) {
    Write-Banner "STEP 2: BACKEND DEPLOYMENT"
    $deploymentState.Backend.Status = "In Progress"
    
    try {
        Write-Step "Deploying backend API..."
        
        $backendParams = @{
            Environment              = $Environment
            ResourceGroup            = $ResourceGroup
            Location                 = $Location
            DatabaseConnectionString = $dbConnectionString
            JwtSecret                = $JwtSecret
        }
        
        if ($GeminiApiKey) { $backendParams['GeminiApiKey'] = $GeminiApiKey }
        if ($OpenAIApiKey) { $backendParams['OpenAIApiKey'] = $OpenAIApiKey }
        if ($PaystackSecretKey) { $backendParams['PaystackSecretKey'] = $PaystackSecretKey }
        if ($PayfastMerchantId) { $backendParams['PayfastMerchantId'] = $PayfastMerchantId }
        if ($PayfastMerchantKey) { $backendParams['PayfastMerchantKey'] = $PayfastMerchantKey }
        if ($SupabaseUrl) { $backendParams['SupabaseUrl'] = $SupabaseUrl }
        if ($SupabaseAnonKey) { $backendParams['SupabaseAnonKey'] = $SupabaseAnonKey }
        if ($SupabaseServiceRoleKey) { $backendParams['SupabaseServiceRoleKey'] = $SupabaseServiceRoleKey }
        
        & "$scriptPath\deploy-backend.ps1" @backendParams
        
        $backendUrl = "https://caps360-backend-$Environment.azurewebsites.net"
        
        $deploymentState.Backend.Status = "Success"
        $deploymentState.Backend.Output = @{ Url = $backendUrl }
        Write-Success "Backend deployment completed"
    }
    catch {
        $deploymentState.Backend.Status = "Failed"
        Write-Error-Custom "Backend deployment failed: $_"
        exit 1
    }
}
else {
    Write-Banner "STEP 2: BACKEND DEPLOYMENT (SKIPPED)"
    $deploymentState.Backend.Status = "Skipped"
    $backendUrl = Read-Host "Enter the backend URL"
}

# ---------------------------
# STEP 3: FRONTEND DEPLOYMENT
# ---------------------------
if (-not $SkipFrontend) {
    Write-Banner "STEP 3: FRONTEND DEPLOYMENT"
    $deploymentState.Frontend.Status = "In Progress"
    
    try {
        Write-Step "Deploying frontend..."
        
        $frontendParams = @{
            Environment   = $Environment
            ResourceGroup = $ResourceGroup
            Location      = $FrontendLocation
            BackendUrl    = $backendUrl
        }
        
        if ($SupabaseUrl) { $frontendParams['SupabaseUrl'] = $SupabaseUrl }
        if ($SupabaseAnonKey) { $frontendParams['SupabaseAnonKey'] = $SupabaseAnonKey }
        
        & "$scriptPath\deploy-frontend.ps1" @frontendParams
        
        $frontendUrl = "https://caps360-web-$Environment.azurestaticapps.net"
        
        $deploymentState.Frontend.Status = "Success"
        $deploymentState.Frontend.Output = @{ Url = $frontendUrl }
        Write-Success "Frontend deployment completed"
    }
    catch {
        $deploymentState.Frontend.Status = "Failed"
        Write-Error-Custom "Frontend deployment failed: $_"
        exit 1
    }
}
else {
    Write-Banner "STEP 3: FRONTEND DEPLOYMENT (SKIPPED)"
    $deploymentState.Frontend.Status = "Skipped"
    $frontendUrl = Read-Host "Enter the frontend URL"
}

# ---------------------------
# STEP 4: AZURE FUNCTIONS DEPLOYMENT
# ---------------------------
if (-not $SkipFunctions) {
    Write-Banner "STEP 4: AZURE FUNCTIONS DEPLOYMENT"
    $deploymentState.Functions.Status = "In Progress"
    
    try {
        Write-Step "Deploying Azure Functions..."
        
        $functionsParams = @{
            Environment              = $Environment
            ResourceGroup            = $ResourceGroup
            Location                 = $Location
            DatabaseConnectionString = $dbConnectionString
        }
        
        if ($CommunicationServicesConnectionString) { 
            $functionsParams['CommunicationServicesConnectionString'] = $CommunicationServicesConnectionString 
        }
        if ($OpenAIApiKey) { $functionsParams['OpenAIApiKey'] = $OpenAIApiKey }
        
        & "$scriptPath\deploy-functions.ps1" @functionsParams
        
        $deploymentState.Functions.Status = "Success"
        Write-Success "Functions deployment completed"
    }
    catch {
        $deploymentState.Functions.Status = "Failed"
        Write-Error-Custom "Functions deployment failed: $_"
        # Non-critical - continue
    }
}
else {
    Write-Banner "STEP 4: AZURE FUNCTIONS DEPLOYMENT (SKIPPED)"
    $deploymentState.Functions.Status = "Skipped"
}

# ---------------------------
# STEP 5: PAYMENT CONFIGURATION
# ---------------------------
if (-not $SkipPayments -and ($PaystackSecretKey -or $PayfastMerchantId)) {
    Write-Banner "STEP 5: PAYMENT CONFIGURATION"
    $deploymentState.Payments.Status = "In Progress"
    
    try {
        Write-Step "Configuring payment integrations..."
        
        $paymentsParams = @{
            Environment   = $Environment
            ResourceGroup = $ResourceGroup
            BackendUrl    = $backendUrl
        }
        
        if ($PaystackSecretKey) { $paymentsParams['PaystackSecretKey'] = $PaystackSecretKey }
        if ($PayfastMerchantId) { $paymentsParams['PayfastMerchantId'] = $PayfastMerchantId }
        if ($PayfastMerchantKey) { $paymentsParams['PayfastMerchantKey'] = $PayfastMerchantKey }
        if ($PayfastPassphrase) { $paymentsParams['PayfastPassphrase'] = $PayfastPassphrase }
        
        & "$scriptPath\configure-payments.ps1" @paymentsParams
        
        $deploymentState.Payments.Status = "Success"
        Write-Success "Payment configuration completed"
    }
    catch {
        $deploymentState.Payments.Status = "Failed"
        Write-Error-Custom "Payment configuration failed: $_"
        # Non-critical - continue
    }
}
else {
    Write-Banner "STEP 5: PAYMENT CONFIGURATION (SKIPPED)"
    $deploymentState.Payments.Status = "Skipped"
}

# ---------------------------
# STEP 6: END-TO-END TESTING
# ---------------------------
if (-not $SkipTests) {
    Write-Banner "STEP 6: END-TO-END TESTING"
    $deploymentState.Tests.Status = "In Progress"
    
    try {
        Write-Step "Running deployment tests..."
        
        $testParams = @{
            Environment = $Environment
            BackendUrl  = $backendUrl
            FrontendUrl = $frontendUrl
            Verbose     = $true
        }
        
        & "$scriptPath\test-deployment.ps1" @testParams
        
        $deploymentState.Tests.Status = "Success"
        Write-Success "All tests passed"
    }
    catch {
        $deploymentState.Tests.Status = "Failed"
        Write-Error-Custom "Some tests failed - review output above"
        # Continue to show summary
    }
}
else {
    Write-Banner "STEP 6: END-TO-END TESTING (SKIPPED)"
    $deploymentState.Tests.Status = "Skipped"
}

# ---------------------------
# DEPLOYMENT SUMMARY
# ---------------------------
$endTime = Get-Date
$duration = $endTime - $deploymentState.StartTime

Write-Banner "DEPLOYMENT SUMMARY"
Write-Host ""
Write-Host "Deployment Duration: $($duration.ToString('hh\:mm\:ss'))" -ForegroundColor White
Write-Host ""
Write-Host "Component Status:" -ForegroundColor Cyan
Write-Host "  Database:  $($deploymentState.Database.Status)" -ForegroundColor $(if ($deploymentState.Database.Status -eq "Success") { "Green" } elseif ($deploymentState.Database.Status -eq "Failed") { "Red" } else { "Yellow" })
Write-Host "  Backend:   $($deploymentState.Backend.Status)" -ForegroundColor $(if ($deploymentState.Backend.Status -eq "Success") { "Green" } elseif ($deploymentState.Backend.Status -eq "Failed") { "Red" } else { "Yellow" })
Write-Host "  Frontend:  $($deploymentState.Frontend.Status)" -ForegroundColor $(if ($deploymentState.Frontend.Status -eq "Success") { "Green" } elseif ($deploymentState.Frontend.Status -eq "Failed") { "Red" } else { "Yellow" })
Write-Host "  Functions: $($deploymentState.Functions.Status)" -ForegroundColor $(if ($deploymentState.Functions.Status -eq "Success") { "Green" } elseif ($deploymentState.Functions.Status -eq "Failed") { "Red" } else { "Yellow" })
Write-Host "  Payments:  $($deploymentState.Payments.Status)" -ForegroundColor $(if ($deploymentState.Payments.Status -eq "Success") { "Green" } elseif ($deploymentState.Payments.Status -eq "Failed") { "Red" } else { "Yellow" })
Write-Host "  Tests:     $($deploymentState.Tests.Status)" -ForegroundColor $(if ($deploymentState.Tests.Status -eq "Success") { "Green" } elseif ($deploymentState.Tests.Status -eq "Failed") { "Red" } else { "Yellow" })
Write-Host ""

if ($deploymentState.Backend.Output) {
    Write-Host "Application URLs:" -ForegroundColor Cyan
    Write-Host "  Backend:  $($deploymentState.Backend.Output.Url)" -ForegroundColor White
    if ($deploymentState.Frontend.Output) {
        Write-Host "  Frontend: $($deploymentState.Frontend.Output.Url)" -ForegroundColor White
    }
    Write-Host ""
}

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Visit your application: $frontendUrl" -ForegroundColor White
Write-Host "2. Test user registration and login" -ForegroundColor White
Write-Host "3. Test AI chat functionality" -ForegroundColor White
Write-Host "4. Configure payment provider webhooks" -ForegroundColor White
Write-Host "5. Set up custom domain and SSL (optional)" -ForegroundColor White
Write-Host "6. Configure monitoring and alerts in Azure" -ForegroundColor White
Write-Host "7. Review Application Insights dashboards" -ForegroundColor White
Write-Host ""

Write-Host "Monitoring Commands:" -ForegroundColor Cyan
Write-Host "# Backend logs:" -ForegroundColor Gray
Write-Host "az webapp log tail --name caps360-backend-$Environment --resource-group $ResourceGroup" -ForegroundColor Gray
Write-Host ""
Write-Host "# Functions logs:" -ForegroundColor Gray
Write-Host "az functionapp log tail --name caps360-functions-$Environment --resource-group $ResourceGroup" -ForegroundColor Gray
Write-Host ""

# Check for any failures
$hasFailures = $false
foreach ($component in $deploymentState.Keys) {
    if ($deploymentState[$component].Status -eq "Failed") {
        $hasFailures = $true
        break
    }
}

if ($hasFailures) {
    Write-Host "[WARN] DEPLOYMENT COMPLETED WITH ERRORS" -ForegroundColor Yellow
    Write-Host "Review the error messages above and re-run failed components individually." -ForegroundColor Yellow
    exit 1
}
else {
    Write-Host "[OK] DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "Your CAPS360 platform is now live on Azure." -ForegroundColor Green
    exit 0
}
