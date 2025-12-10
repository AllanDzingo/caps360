# CAPS360 - Terraform Deployment Script
# Automated deployment using Terraform

Write-Host "CAPS360 - Terraform Deployment" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check if Terraform is installed
try {
    $null = Get-Command terraform -ErrorAction Stop
    $tfVersion = terraform version -json | ConvertFrom-Json
    Write-Host "Terraform version: $($tfVersion.terraform_version)" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Terraform is not installed" -ForegroundColor Red
    Write-Host "Install from: https://www.terraform.io/downloads" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Navigate to terraform directory
Set-Location terraform

# Initialize Terraform
Write-Host "Step 1: Initializing Terraform..." -ForegroundColor Yellow
terraform init

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Terraform initialization failed" -ForegroundColor Red
    exit 1
}

Write-Host "Terraform initialized successfully" -ForegroundColor Green
Write-Host ""

# Plan
Write-Host "Step 2: Creating deployment plan..." -ForegroundColor Yellow
terraform plan -out=tfplan

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Terraform plan failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Plan created successfully" -ForegroundColor Green
Write-Host ""

# Confirm
$confirm = Read-Host "Apply this plan? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Deployment cancelled" -ForegroundColor Yellow
    Remove-Item tfplan -ErrorAction SilentlyContinue
    exit 0
}

# Apply
Write-Host ""
Write-Host "Step 3: Applying infrastructure changes..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes..." -ForegroundColor Gray
Write-Host ""

terraform apply tfplan

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Terraform apply failed" -ForegroundColor Red
    exit 1
}

# Clean up plan file
Remove-Item tfplan -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Infrastructure deployed successfully!" -ForegroundColor Green
Write-Host ""

# Get outputs
Write-Host "Deployment Information:" -ForegroundColor Cyan
Write-Host ""
terraform output

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Build and deploy backend:" -ForegroundColor Yellow
Write-Host "   cd ../backend" -ForegroundColor White
Write-Host "   gcloud builds submit --tag gcr.io/caps360/caps360-backend:latest" -ForegroundColor White
Write-Host "   gcloud run services update caps360-api --image gcr.io/caps360/caps360-backend:latest --region africa-south1" -ForegroundColor White
Write-Host ""
Write-Host "2. Deploy frontend:" -ForegroundColor Yellow
Write-Host "   cd ../frontend-web" -ForegroundColor White
Write-Host "   npm run build" -ForegroundColor White
Write-Host "   firebase deploy --only hosting --project caps360" -ForegroundColor White
Write-Host ""
Write-Host "3. Create admin user:" -ForegroundColor Yellow
Write-Host "   cd .." -ForegroundColor White
Write-Host "   node backend/scripts/create-admin.js" -ForegroundColor White
Write-Host ""
Write-Host "See terraform/README.md for detailed instructions" -ForegroundColor Gray
Write-Host ""

Set-Location ..
