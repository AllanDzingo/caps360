# CAPS360 - Deploy to GCP (Testing Mode)
# This script deploys the CAPS360 platform to GCP for testing
# Payment functionality will be disabled until Paystack keys are available

Write-Host "🚀 CAPS360 - Deploy to GCP (Testing Mode)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$PROJECT_ID = "caps360"

Write-Host "📋 Project: $PROJECT_ID" -ForegroundColor Green
Write-Host "🔧 Mode: Testing (Payment disabled)" -ForegroundColor Yellow
Write-Host ""

# Confirm deployment
$confirm = Read-Host "Deploy CAPS360 to GCP? (y/n)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "STEP 1: Enable Required APIs" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

gcloud config set project $PROJECT_ID

Write-Host "Enabling APIs..." -ForegroundColor Yellow
$apis = @(
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "firestore.googleapis.com",
    "storage-api.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "  - $api" -ForegroundColor Gray
    gcloud services enable $api --quiet 2>$null
}

Write-Host "✅ APIs enabled" -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "STEP 2: Create GCP Secrets" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "Creating secrets..." -ForegroundColor Yellow

# Generate secure JWT secret
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

# Create secrets (using placeholder values for testing)
$secrets = @{
    "jwt-secret"           = $jwtSecret
    "gemini-api-key"       = "PLACEHOLDER-ADD-YOUR-GEMINI-KEY"
    "payfast-merchant-id"  = "TESTING-MODE"
    "payfast-merchant-key" = "TESTING-MODE"
    "payfast-passphrase"   = "TESTING-MODE"
    "paystack-secret-key"  = "TESTING-MODE"
}

foreach ($secretName in $secrets.Keys) {
    $secretValue = $secrets[$secretName]
    
    # Check if secret exists
    $exists = gcloud secrets describe $secretName 2>$null
    
    if ($exists) {
        Write-Host "  - Updating $secretName" -ForegroundColor Gray
        echo $secretValue | gcloud secrets versions add $secretName --data-file=- 2>$null
    }
    else {
        Write-Host "  - Creating $secretName" -ForegroundColor Gray
        echo $secretValue | gcloud secrets create $secretName --data-file=- 2>$null
    }
}

Write-Host "✅ Secrets created" -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "STEP 3: Deploy Backend to Cloud Run" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "Building and deploying backend..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes..." -ForegroundColor Gray
Write-Host ""

cd backend

gcloud run deploy caps360-api `
    --source . `
    --region africa-south1 `
    --allow-unauthenticated `
    --platform managed `
    --memory 512Mi `
    --cpu 1 `
    --min-instances 0 `
    --max-instances 10 `
    --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=$PROJECT_ID,PAYSTACK_ENABLED=false,PAYFAST_ENABLED=false" `
    --set-secrets="JWT_SECRET=jwt-secret:latest,GEMINI_API_KEY=gemini-api-key:latest,PAYFAST_MERCHANT_ID=payfast-merchant-id:latest,PAYFAST_MERCHANT_KEY=payfast-merchant-key:latest,PAYSTACK_SECRET_KEY=paystack-secret-key:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend deployment failed" -ForegroundColor Red
    cd ..
    exit 1
}

# Get the backend URL
$BACKEND_URL = gcloud run services describe caps360-api --region africa-south1 --format="value(status.url)"

cd ..

Write-Host ""
Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
Write-Host "   URL: $BACKEND_URL" -ForegroundColor White
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "STEP 4: Deploy Frontend to Firebase Hosting" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Create frontend .env for production
Write-Host "Creating frontend environment..." -ForegroundColor Yellow

$frontendEnv = @"
VITE_API_URL=$BACKEND_URL
VITE_PAYSTACK_PUBLIC_KEY=TESTING-MODE
"@

Set-Content "frontend-web\.env" $frontendEnv

Write-Host "Building frontend..." -ForegroundColor Yellow
cd frontend-web
npm install --silent
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host ""
Write-Host "Deploying to Firebase..." -ForegroundColor Yellow

firebase deploy --only hosting --project $PROJECT_ID

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend deployment failed" -ForegroundColor Red
    cd ..
    exit 1
}

cd ..

$FRONTEND_URL = "https://$PROJECT_ID.web.app"

Write-Host ""
Write-Host "✅ Frontend deployed successfully!" -ForegroundColor Green
Write-Host "   URL: $FRONTEND_URL" -ForegroundColor White
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Your CAPS360 Platform URLs:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Backend API:  $BACKEND_URL" -ForegroundColor White
Write-Host "   Frontend Web: $FRONTEND_URL" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 NEXT STEPS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Create Admin User:" -ForegroundColor Yellow
Write-Host "   Run: .\scripts\create-admin-user.ps1" -ForegroundColor White
Write-Host ""
Write-Host "2. Test the Platform:" -ForegroundColor Yellow
Write-Host "   Open: $FRONTEND_URL" -ForegroundColor White
Write-Host ""
Write-Host "3. View Logs:" -ForegroundColor Yellow
Write-Host "   Backend: gcloud run logs read caps360-api --region africa-south1" -ForegroundColor White
Write-Host ""
Write-Host "4. Update Gemini API Key:" -ForegroundColor Yellow
Write-Host "   echo 'your-actual-key' | gcloud secrets versions add gemini-api-key --data-file=-" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  NOTE: Payment features are disabled in testing mode" -ForegroundColor Red
Write-Host ""
Write-Host "🎉 Deployment successful! Visit $FRONTEND_URL to see your platform!" -ForegroundColor Green
Write-Host ""

# Save deployment info
$deploymentInfo = @"
CAPS360 Deployment Information
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

URLs
Backend API: $BACKEND_URL
Frontend Web: $FRONTEND_URL

Project
GCP Project ID: $PROJECT_ID
Region: africa-south1

Status
Payment: Disabled (Testing Mode)
Backend: Deployed
Frontend: Deployed

Admin Setup
Run: .\scripts\create-admin-user.ps1

Logs
Backend: gcloud run logs read caps360-api --region africa-south1 --limit 50

Update Secrets
gcloud secrets versions add SECRET_NAME --data-file=-
"@

Set-Content "DEPLOYMENT.md" $deploymentInfo
Write-Host "Deployment info saved to DEPLOYMENT.md" -ForegroundColor Gray
Write-Host ""
