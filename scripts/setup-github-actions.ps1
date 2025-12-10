# CAPS360 - GitHub Actions Setup (PowerShell)
# This script sets up the GCP service account for GitHub Actions on Windows

Write-Host "🚀 CAPS360 GitHub Actions Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
try {
    $null = Get-Command gcloud -ErrorAction Stop
} catch {
    Write-Host "❌ Error: gcloud CLI is not installed" -ForegroundColor Red
    Write-Host "Install it from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Prompt for project ID
$PROJECT_ID = Read-Host "Enter your GCP Project ID"

if ([string]::IsNullOrWhiteSpace($PROJECT_ID)) {
    Write-Host "❌ Error: Project ID cannot be empty" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Using Project ID: $PROJECT_ID" -ForegroundColor Green
Write-Host ""

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
Write-Host "🔧 Enabling required GCP APIs..." -ForegroundColor Yellow
gcloud services enable `
  run.googleapis.com `
  cloudfunctions.googleapis.com `
  cloudbuild.googleapis.com `
  secretmanager.googleapis.com `
  containerregistry.googleapis.com

Write-Host "✅ APIs enabled" -ForegroundColor Green
Write-Host ""

# Create service account
Write-Host "👤 Creating service account..." -ForegroundColor Yellow
gcloud iam service-accounts create github-actions `
  --display-name="GitHub Actions CI/CD" `
  --project=$PROJECT_ID

$SERVICE_ACCOUNT = "github-actions@$PROJECT_ID.iam.gserviceaccount.com"
Write-Host "✅ Service account created: $SERVICE_ACCOUNT" -ForegroundColor Green
Write-Host ""

# Grant IAM roles
Write-Host "🔐 Granting IAM permissions..." -ForegroundColor Yellow
$ROLES = @(
  "roles/run.admin",
  "roles/storage.admin",
  "roles/cloudfunctions.admin",
  "roles/iam.serviceAccountUser",
  "roles/secretmanager.secretAccessor",
  "roles/cloudbuild.builds.editor"
)

foreach ($role in $ROLES) {
    Write-Host "  - Granting $role" -ForegroundColor Gray
    gcloud projects add-iam-policy-binding $PROJECT_ID `
      --member="serviceAccount:$SERVICE_ACCOUNT" `
      --role="$role" `
      --quiet
}

Write-Host "✅ Permissions granted" -ForegroundColor Green
Write-Host ""

# Create service account key
Write-Host "🔑 Creating service account key..." -ForegroundColor Yellow
$KEY_FILE = "github-sa-key.json"

if (Test-Path $KEY_FILE) {
    $response = Read-Host "⚠️  $KEY_FILE already exists. Overwrite? (y/n)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "❌ Aborted" -ForegroundColor Red
        exit 1
    }
}

gcloud iam service-accounts keys create $KEY_FILE `
  --iam-account=$SERVICE_ACCOUNT `
  --project=$PROJECT_ID

Write-Host "✅ Service account key created: $KEY_FILE" -ForegroundColor Green
Write-Host ""

# Display instructions
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 NEXT STEPS: Add Secrets to GitHub" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to your GitHub repository"
Write-Host "2. Navigate to: Settings → Secrets and variables → Actions"
Write-Host "3. Click 'New repository secret'"
Write-Host ""
Write-Host "4. Add the following secrets:"
Write-Host ""
Write-Host "   Secret Name: GCP_PROJECT_ID" -ForegroundColor Yellow
Write-Host "   Value: $PROJECT_ID" -ForegroundColor White
Write-Host ""
Write-Host "   Secret Name: GCP_SA_KEY" -ForegroundColor Yellow
Write-Host "   Value: (copy the entire content below)" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📄 Service Account Key (copy everything between the lines):" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Get-Content $KEY_FILE
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  SECURITY NOTES:" -ForegroundColor Red
Write-Host "   - Delete $KEY_FILE after adding to GitHub secrets"
Write-Host "   - Never commit this file to your repository"
Write-Host "   - The key is already in .gitignore"
Write-Host ""
Write-Host "🎉 Setup complete! You can now use GitHub Actions for deployment." -ForegroundColor Green
Write-Host ""
