# =====================================================
# CAPS360 Azure PostgreSQL Database Deployment Script
# =====================================================
# This script creates and configures Azure PostgreSQL database with all tables
# Prerequisites:
#   - Azure CLI installed and authenticated (az login)
#   - psql client installed (PostgreSQL tools)
# Usage: .\deploy-database.ps1 -Environment prod -ResourceGroup caps360-prod

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment,

    [Parameter(Mandatory = $true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory = $false)]
    [string]$Location = 'southafricanorth',

    [Parameter(Mandatory = $false)]
    [string]$AdminUsername = 'caps360admin',

    [Parameter(Mandatory = $false)]
    [string]$AdminPassword,

    [Parameter(Mandatory = $false)]
    [string]$DatabaseName = 'caps360',

    [Parameter(Mandatory = $false)]
    [bool]$SkipTableCreation = $false
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
    Write-Error-Custom "Azure CLI not installed. Install from: https://aka.ms/installazurecliwindows"
    exit 1 
}

try { 
    psql --version | Out-Null
    Write-Success "PostgreSQL client (psql) found" 
} catch { 
    Write-Error-Custom "PostgreSQL client not installed. Install from: https://www.postgresql.org/download/"
    exit 1 
}

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$schemaFile = Join-Path $projectRoot "backend\src\db\schema.sql"

if (-not (Test-Path $schemaFile)) {
    Write-Error-Custom "Schema file not found at: $schemaFile"
    exit 1
}
Write-Success "Schema file found"

# Generate secure admin password if not provided
if (-not $AdminPassword) {
    Write-Info "Generating secure admin password..."
    $AdminPassword = -join ((65..90) + (97..122) + (48..57) + @(33, 35, 36, 37, 38, 42, 43, 45, 61) | Get-Random -Count 20 | ForEach-Object { [char]$_ })
    Write-Info "Generated password (SAVE THIS): $AdminPassword"
}

# ---------------------------
# Step 1: Resource Group
# ---------------------------
Write-Step "Step 1: Ensuring Resource Group Exists"
$rgExists = az group exists --name $ResourceGroup | ConvertFrom-Json
if (-not $rgExists) {
    az group create --name $ResourceGroup --location $Location | Out-Null
    Write-Success "Resource group '$ResourceGroup' created in '$Location'"
} else {
    Write-Success "Resource group '$ResourceGroup' already exists"
}

# ---------------------------
# Step 2: Create PostgreSQL Flexible Server
# ---------------------------
Write-Step "Step 2: Creating Azure PostgreSQL Flexible Server"
$serverName = "caps360-db-$Environment"
Write-Info "Server name: $serverName"

# Check if server already exists
$serverExists = az postgres flexible-server list --resource-group $ResourceGroup --query "[?name=='$serverName']" | ConvertFrom-Json
if ($serverExists.Count -gt 0) {
    Write-Success "PostgreSQL server '$serverName' already exists"
} else {
    Write-Info "Creating PostgreSQL Flexible Server (this may take 5-10 minutes)..."
    
    # Create PostgreSQL Flexible Server
    az postgres flexible-server create `
        --resource-group $ResourceGroup `
        --name $serverName `
        --location $Location `
        --admin-user $AdminUsername `
        --admin-password $AdminPassword `
        --sku-name Standard_B2s `
        --tier Burstable `
        --storage-size 32 `
        --version 16 `
        --public-access 0.0.0.0-255.255.255.255 `
        --yes | Out-Null
    
    Write-Success "PostgreSQL server created successfully"
}

# ---------------------------
# Step 3: Configure Firewall Rules
# ---------------------------
Write-Step "Step 3: Configuring Firewall Rules"

# Allow Azure services
Write-Info "Adding firewall rule for Azure services..."
az postgres flexible-server firewall-rule create `
    --resource-group $ResourceGroup `
    --name $serverName `
    --rule-name AllowAzureServices `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0 | Out-Null
Write-Success "Azure services allowed"

# Allow current IP (for deployment)
Write-Info "Getting your current public IP..."
$myIp = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
Write-Info "Your IP: $myIp"

az postgres flexible-server firewall-rule create `
    --resource-group $ResourceGroup `
    --name $serverName `
    --rule-name AllowDeploymentIP `
    --start-ip-address $myIp `
    --end-ip-address $myIp | Out-Null
Write-Success "Your IP allowed for deployment"

# ---------------------------
# Step 4: Create Database
# ---------------------------
Write-Step "Step 4: Creating Database"
$dbExists = az postgres flexible-server db list --resource-group $ResourceGroup --server-name $serverName --query "[?name=='$DatabaseName']" | ConvertFrom-Json
if ($dbExists.Count -gt 0) {
    Write-Success "Database '$DatabaseName' already exists"
} else {
    az postgres flexible-server db create `
        --resource-group $ResourceGroup `
        --server-name $serverName `
        --database-name $DatabaseName | Out-Null
    Write-Success "Database '$DatabaseName' created"
}

# ---------------------------
# Step 5: Get Connection Details
# ---------------------------
Write-Step "Step 5: Getting Connection Details"
$serverFqdn = az postgres flexible-server show `
    --resource-group $ResourceGroup `
    --name $serverName `
    --query "fullyQualifiedDomainName" `
    --output tsv

$connectionString = "postgresql://${AdminUsername}:${AdminPassword}@${serverFqdn}:5432/${DatabaseName}?sslmode=require"
Write-Success "Connection string generated"

# ---------------------------
# Step 6: Apply Database Schema
# ---------------------------
if (-not $SkipTableCreation) {
    Write-Step "Step 6: Applying Database Schema"
    Write-Info "Creating tables from schema.sql..."
    
    # Wait for server to be ready
    Write-Info "Waiting for server to be fully ready (30 seconds)..."
    Start-Sleep -Seconds 30
    
    # Set environment variable for psql
    $env:PGPASSWORD = $AdminPassword
    
    try {
        psql -h $serverFqdn -U $AdminUsername -d $DatabaseName -f $schemaFile -v ON_ERROR_STOP=1
        Write-Success "All database tables created successfully"
    } catch {
        Write-Error-Custom "Error creating tables: $_"
        Write-Info "You can manually apply the schema later using:"
        Write-Info "psql -h $serverFqdn -U $AdminUsername -d $DatabaseName -f $schemaFile"
    } finally {
        Remove-Item Env:\PGPASSWORD
    }
} else {
    Write-Info "Skipping table creation (SkipTableCreation = true)"
}

# ---------------------------
# Step 7: Verify Database Connection
# ---------------------------
Write-Step "Step 7: Verifying Database Connection"
$env:PGPASSWORD = $AdminPassword
try {
    $tableCount = psql -h $serverFqdn -U $AdminUsername -d $DatabaseName -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
    $tableCount = $tableCount.Trim()
    Write-Success "Database connection verified - $tableCount tables found"
} catch {
    Write-Error-Custom "Database connection verification failed: $_"
} finally {
    Remove-Item Env:\PGPASSWORD
}

# ---------------------------
# Step 8: Create Admin User (Optional)
# ---------------------------
Write-Step "Step 8: Creating Admin User in Database"
$adminEmail = "admin@caps360.co.za"
$adminPasswordHash = '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW' # bcrypt hash of 'admin123' - CHANGE THIS!

$env:PGPASSWORD = $AdminPassword
try {
    $checkAdmin = psql -h $serverFqdn -U $AdminUsername -d $DatabaseName -t -c "SELECT COUNT(*) FROM users WHERE email='$adminEmail';"
    if ($checkAdmin.Trim() -eq "0") {
        psql -h $serverFqdn -U $AdminUsername -d $DatabaseName -c "INSERT INTO users (email, password_hash, first_name, last_name, role, current_tier) VALUES ('$adminEmail', '$adminPasswordHash', 'Admin', 'User', 'admin', 'premium');"
        Write-Success "Admin user created (email: $adminEmail, password: admin123 - CHANGE THIS!)"
    } else {
        Write-Success "Admin user already exists"
    }
} catch {
    Write-Error-Custom "Error creating admin user: $_"
} finally {
    Remove-Item Env:\PGPASSWORD
}

# ---------------------------
# Step 9: Output Summary
# ---------------------------
Write-Step "Deployment Summary"
Write-Host ""
Write-Host "✓ PostgreSQL Server: $serverName" -ForegroundColor Green
Write-Host "✓ Database: $DatabaseName" -ForegroundColor Green
Write-Host "✓ FQDN: $serverFqdn" -ForegroundColor Green
Write-Host "✓ Admin Username: $AdminUsername" -ForegroundColor Green
Write-Host "✓ Admin Password: $AdminPassword" -ForegroundColor Yellow
Write-Host ""
Write-Host "Connection String (save this for backend deployment):" -ForegroundColor Cyan
Write-Host $connectionString -ForegroundColor White
Write-Host ""
Write-Host "Environment Variables for Backend:" -ForegroundColor Cyan
Write-Host "DB_HOST=$serverFqdn" -ForegroundColor White
Write-Host "DB_PORT=5432" -ForegroundColor White
Write-Host "DB_NAME=$DatabaseName" -ForegroundColor White
Write-Host "DB_USER=$AdminUsername" -ForegroundColor White
Write-Host "DB_PASSWORD=$AdminPassword" -ForegroundColor White
Write-Host "DATABASE_URL=$connectionString" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Save the connection string and credentials securely" -ForegroundColor White
Write-Host "2. Update your .env file with the database connection details" -ForegroundColor White
Write-Host "3. Deploy backend using: .\deploy-backend.ps1" -ForegroundColor White
Write-Host "4. Test database connectivity from backend" -ForegroundColor White
Write-Host ""
Write-Success "Database deployment completed successfully!"
