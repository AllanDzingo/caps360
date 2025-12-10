# CAPS360 - Connect to Existing GCP Project
# This script connects your CAPS360 project to your existing Google Cloud setup

Write-Host "🚀 CAPS360 - GCP Project Integration" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
try {
    $gcloudVersion = gcloud --version 2>&1 | Select-Object -First 1
    Write-Host "✅ Google Cloud SDK found: $gcloudVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error: gcloud CLI is not installed" -ForegroundColor Red
    Write-Host "Install it from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Get current authenticated account
Write-Host "📋 Checking authentication..." -ForegroundColor Yellow
$currentAccount = gcloud config get-value account 2>$null

if ([string]::IsNullOrWhiteSpace($currentAccount)) {
    Write-Host "❌ Not authenticated with Google Cloud" -ForegroundColor Red
    Write-Host "Please run: gcloud auth login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Authenticated as: $currentAccount" -ForegroundColor Green
Write-Host ""

# Get current project
$currentProject = gcloud config get-value project 2>$null

if ([string]::IsNullOrWhiteSpace($currentProject)) {
    Write-Host "⚠️  No default project set" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available projects:" -ForegroundColor Cyan
    gcloud projects list --format="table(projectId,name,projectNumber)"
    Write-Host ""
    $PROJECT_ID = Read-Host "Enter your GCP Project ID"
}
else {
    Write-Host "📋 Current project: $currentProject" -ForegroundColor Green
    Write-Host ""
    $useCurrentProject = Read-Host "Use this project? (y/n)"
    
    if ($useCurrentProject -eq 'y' -or $useCurrentProject -eq 'Y') {
        $PROJECT_ID = $currentProject
    }
    else {
        Write-Host ""
        Write-Host "Available projects:" -ForegroundColor Cyan
        gcloud projects list --format="table(projectId,name,projectNumber)"
        Write-Host ""
        $PROJECT_ID = Read-Host "Enter your GCP Project ID"
    }
}

if ([string]::IsNullOrWhiteSpace($PROJECT_ID)) {
    Write-Host "❌ Error: Project ID cannot be empty" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 Configuration Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   Account:    $currentAccount" -ForegroundColor White
Write-Host "   Project ID: $PROJECT_ID" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$confirm = Read-Host "Continue with this configuration? (y/n)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "❌ Aborted" -ForegroundColor Red
    exit 1
}

# Set the project
Write-Host ""
Write-Host "🔧 Setting active project..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# Check if service account already exists
Write-Host ""
Write-Host "🔍 Checking for existing service account..." -ForegroundColor Yellow
$SERVICE_ACCOUNT = "github-actions@$PROJECT_ID.iam.gserviceaccount.com"
$saExists = gcloud iam service-accounts list --filter="email:$SERVICE_ACCOUNT" --format="value(email)" 2>$null

if ($saExists) {
    Write-Host "ℹ️  Service account already exists: $SERVICE_ACCOUNT" -ForegroundColor Yellow
    $recreate = Read-Host "Recreate service account key? (y/n)"
    
    if ($recreate -ne 'y' -and $recreate -ne 'Y') {
        Write-Host "⏭️  Skipping service account creation" -ForegroundColor Gray
        $skipSA = $true
    }
    else {
        $skipSA = $false
    }
}
else {
    $skipSA = $false
}

if (-not $skipSA) {
    # Enable required APIs
    Write-Host ""
    Write-Host "🔧 Enabling required GCP APIs..." -ForegroundColor Yellow
    Write-Host "   This may take a few minutes..." -ForegroundColor Gray
    
    $apis = @(
        "run.googleapis.com",
        "cloudfunctions.googleapis.com",
        "cloudbuild.googleapis.com",
        "secretmanager.googleapis.com",
        "containerregistry.googleapis.com",
        "firestore.googleapis.com",
        "storage-api.googleapis.com"
    )
    
    foreach ($api in $apis) {
        Write-Host "   - Enabling $api" -ForegroundColor Gray
        gcloud services enable $api --quiet 2>$null
    }
    
    Write-Host "✅ APIs enabled" -ForegroundColor Green

    # Create service account if it doesn't exist
    if (-not $saExists) {
        Write-Host ""
        Write-Host "👤 Creating service account..." -ForegroundColor Yellow
        gcloud iam service-accounts create github-actions `
            --display-name="GitHub Actions CI/CD" `
            --project=$PROJECT_ID
        
        Write-Host "✅ Service account created: $SERVICE_ACCOUNT" -ForegroundColor Green
    }

    # Grant IAM roles
    Write-Host ""
    Write-Host "🔐 Granting IAM permissions..." -ForegroundColor Yellow
    $ROLES = @(
        "roles/run.admin",
        "roles/storage.admin",
        "roles/cloudfunctions.admin",
        "roles/iam.serviceAccountUser",
        "roles/secretmanager.secretAccessor",
        "roles/cloudbuild.builds.editor",
        "roles/datastore.user"
    )

    foreach ($role in $ROLES) {
        Write-Host "   - Granting $role" -ForegroundColor Gray
        gcloud projects add-iam-policy-binding $PROJECT_ID `
            --member="serviceAccount:$SERVICE_ACCOUNT" `
            --role="$role" `
            --quiet 2>$null
    }

    Write-Host "✅ Permissions granted" -ForegroundColor Green

    # Create service account key
    Write-Host ""
    Write-Host "🔑 Creating service account key..." -ForegroundColor Yellow
    $KEY_FILE = "github-sa-key.json"

    if (Test-Path $KEY_FILE) {
        $response = Read-Host "⚠️  $KEY_FILE already exists. Overwrite? (y/n)"
        if ($response -ne 'y' -and $response -ne 'Y') {
            Write-Host "❌ Aborted" -ForegroundColor Red
            exit 1
        }
        Remove-Item $KEY_FILE -Force
    }

    gcloud iam service-accounts keys create $KEY_FILE `
        --iam-account=$SERVICE_ACCOUNT `
        --project=$PROJECT_ID

    Write-Host "✅ Service account key created: $KEY_FILE" -ForegroundColor Green
}

# Create backend environment file
Write-Host ""
Write-Host "📝 Creating backend .env file..." -ForegroundColor Yellow

$envContent = @"
# CAPS360 Backend Environment Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Server Configuration
PORT=8080
NODE_ENV=development

# Google Cloud Platform
GCP_PROJECT_ID=$PROJECT_ID

# For local development with Firestore emulator
# FIRESTORE_EMULATOR_HOST=localhost:8080

# API Keys (Add your actual keys)
GEMINI_API_KEY=your-gemini-api-key-here

# PayFast Configuration
PAYFAST_MERCHANT_ID=your-payfast-merchant-id
PAYFAST_MERCHANT_KEY=your-payfast-merchant-key
PAYFAST_PASSPHRASE=your-payfast-passphrase

# Paystack Configuration
PAYSTACK_SECRET_KEY=your-paystack-secret-key
PAYSTACK_PUBLIC_KEY=your-paystack-public-key

# JWT Secret
JWT_SECRET=your-jwt-secret-here-change-in-production

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
"@

$envPath = "backend\.env"
if (Test-Path $envPath) {
    Write-Host "ℹ️  backend\.env already exists, creating .env.example instead" -ForegroundColor Yellow
    Set-Content "backend\.env.example" $envContent
    Write-Host "✅ Created backend\.env.example" -ForegroundColor Green
}
else {
    Set-Content $envPath $envContent
    Write-Host "✅ Created backend\.env" -ForegroundColor Green
}

# Create frontend environment file
Write-Host ""
Write-Host "📝 Creating frontend .env file..." -ForegroundColor Yellow

$frontendEnvContent = @"
# CAPS360 Frontend Environment Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Backend API URL
VITE_API_URL=http://localhost:8080

# Paystack Public Key
VITE_PAYSTACK_PUBLIC_KEY=your-paystack-public-key
"@

$frontendEnvPath = "frontend-web\.env"
if (Test-Path $frontendEnvPath) {
    Write-Host "ℹ️  frontend-web\.env already exists, creating .env.example instead" -ForegroundColor Yellow
    Set-Content "frontend-web\.env.example" $frontendEnvContent
    Write-Host "✅ Created frontend-web\.env.example" -ForegroundColor Green
}
else {
    Set-Content $frontendEnvPath $frontendEnvContent
    Write-Host "✅ Created frontend-web\.env" -ForegroundColor Green
}

# Update .firebaserc with actual project ID
Write-Host ""
Write-Host "📝 Updating Firebase configuration..." -ForegroundColor Yellow
if (Test-Path ".firebaserc") {
    $firebaserc = Get-Content ".firebaserc" -Raw
    $firebaserc = $firebaserc -replace "YOUR_PROJECT_ID", $PROJECT_ID
    Set-Content ".firebaserc" $firebaserc
    Write-Host "✅ Updated .firebaserc with project ID" -ForegroundColor Green
}

# Display next steps
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ GCP PROJECT CONNECTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Project: $PROJECT_ID" -ForegroundColor White
Write-Host "👤 Service Account: $SERVICE_ACCOUNT" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 NEXT STEPS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Update environment files with your actual API keys:" -ForegroundColor Yellow
Write-Host "   - backend\.env (or .env.example)" -ForegroundColor White
Write-Host "   - frontend-web\.env (or .env.example)" -ForegroundColor White
Write-Host ""
Write-Host "2. Create secrets in GCP Secret Manager:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   gcloud secrets create jwt-secret --data-file=- <<< 'your-jwt-secret'" -ForegroundColor White
Write-Host "   gcloud secrets create gemini-api-key --data-file=- <<< 'your-gemini-key'" -ForegroundColor White
Write-Host "   gcloud secrets create payfast-merchant-id --data-file=- <<< 'your-id'" -ForegroundColor White
Write-Host "   gcloud secrets create payfast-merchant-key --data-file=- <<< 'your-key'" -ForegroundColor White
Write-Host "   gcloud secrets create payfast-passphrase --data-file=- <<< 'your-passphrase'" -ForegroundColor White
Write-Host "   gcloud secrets create paystack-secret-key --data-file=- <<< 'your-key'" -ForegroundColor White
Write-Host ""
Write-Host "3. Add GitHub Secrets (for CI/CD):" -ForegroundColor Yellow
Write-Host "   Go to: GitHub Repository → Settings → Secrets and variables → Actions" -ForegroundColor White
Write-Host ""
Write-Host "   Add these secrets:" -ForegroundColor White
Write-Host "   - GCP_PROJECT_ID = $PROJECT_ID" -ForegroundColor Gray
Write-Host "   - GCP_SA_KEY = (copy content from github-sa-key.json)" -ForegroundColor Gray
Write-Host "   - PRODUCTION_API_URL = (your Cloud Run URL after deployment)" -ForegroundColor Gray
Write-Host "   - PAYSTACK_PUBLIC_KEY = (your Paystack public key)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Test local development:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   npm install" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "5. Deploy to Cloud Run:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   gcloud run deploy caps360-api --source . --region us-central1 --allow-unauthenticated" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  SECURITY NOTES:" -ForegroundColor Red
Write-Host "   - Update all placeholder API keys in .env files" -ForegroundColor White
Write-Host "   - Delete github-sa-key.json after adding to GitHub secrets" -ForegroundColor White
Write-Host "   - Never commit .env files or service account keys" -ForegroundColor White
Write-Host "   - The key file is already in .gitignore" -ForegroundColor White
Write-Host ""
Write-Host "📚 Full documentation: docs/github-actions-guide.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Your CAPS360 project is now connected to GCP!" -ForegroundColor Green
Write-Host ""
