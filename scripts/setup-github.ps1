# CAPS360 GitHub Setup - Quick Start Script
# Run this script to set up your GitHub repository

Write-Host "🚀 CAPS360 GitHub Setup" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Check if git is installed
try {
    $null = Get-Command git -ErrorAction Stop
}
catch {
    Write-Host "❌ Error: Git is not installed" -ForegroundColor Red
    Write-Host "Install it from: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# Get GitHub username
$GITHUB_USERNAME = Read-Host "Enter your GitHub username"

if ([string]::IsNullOrWhiteSpace($GITHUB_USERNAME)) {
    Write-Host "❌ Error: GitHub username cannot be empty" -ForegroundColor Red
    exit 1
}

# Get repository name (default: CAPS360)
$REPO_NAME = Read-Host "Enter repository name (default: CAPS360)"
if ([string]::IsNullOrWhiteSpace($REPO_NAME)) {
    $REPO_NAME = "CAPS360"
}

Write-Host ""
Write-Host "📋 Configuration:" -ForegroundColor Green
Write-Host "   GitHub Username: $GITHUB_USERNAME" -ForegroundColor White
Write-Host "   Repository Name: $REPO_NAME" -ForegroundColor White
Write-Host ""

# Confirm
$confirm = Read-Host "Continue with this configuration? (y/n)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "❌ Aborted" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Setting up Git repository..." -ForegroundColor Yellow

# Initialize git if not already initialized
if (-not (Test-Path ".git")) {
    git init
    Write-Host "✅ Git repository initialized" -ForegroundColor Green
}
else {
    Write-Host "ℹ️  Git repository already initialized" -ForegroundColor Gray
}

# Update configuration files with actual values
Write-Host ""
Write-Host "📝 Updating configuration files..." -ForegroundColor Yellow

# Update .firebaserc
$firebaserc = Get-Content ".firebaserc" -Raw
$firebaserc = $firebaserc -replace "YOUR_PROJECT_ID", "caps360"
Set-Content ".firebaserc" $firebaserc
Write-Host "   Updated .firebaserc" -ForegroundColor Gray

# Update dependabot.yml
$dependabot = Get-Content ".github\dependabot.yml" -Raw
$dependabot = $dependabot -replace "YOUR_GITHUB_USERNAME", $GITHUB_USERNAME
Set-Content ".github\dependabot.yml" $dependabot
Write-Host "   Updated dependabot.yml" -ForegroundColor Gray

Write-Host "✅ Configuration files updated" -ForegroundColor Green

# Add all files
Write-Host ""
Write-Host "📦 Staging files..." -ForegroundColor Yellow
git add .

# Create initial commit
Write-Host "💾 Creating initial commit..." -ForegroundColor Yellow
git commit -m "Initial commit: CAPS360 platform with GitHub Actions CI/CD"

# Rename branch to main
Write-Host "🔀 Setting main branch..." -ForegroundColor Yellow
git branch -M main

Write-Host "✅ Local repository ready!" -ForegroundColor Green
Write-Host ""

# Display next steps
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 NEXT STEPS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Create a new repository on GitHub:" -ForegroundColor Yellow
Write-Host "   https://github.com/new" -ForegroundColor White
Write-Host ""
Write-Host "   Repository name: $REPO_NAME" -ForegroundColor White
Write-Host "   ⚠️  Do NOT initialize with README, .gitignore, or license" -ForegroundColor Red
Write-Host ""
Write-Host "2. Connect your local repository to GitHub:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git" -ForegroundColor White
Write-Host "   git push -u origin main" -ForegroundColor White
Write-Host ""
Write-Host "3. Set up GCP service account for GitHub Actions:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   .\scripts\setup-github-actions.ps1" -ForegroundColor White
Write-Host ""
Write-Host "4. Add GitHub Secrets (see docs/github-actions-guide.md for details):" -ForegroundColor Yellow
Write-Host "   - GCP_PROJECT_ID" -ForegroundColor White
Write-Host "   - GCP_SA_KEY" -ForegroundColor White
Write-Host "   - FIREBASE_SERVICE_ACCOUNT" -ForegroundColor White
Write-Host "   - PRODUCTION_API_URL" -ForegroundColor White
Write-Host "   - PAYSTACK_PUBLIC_KEY" -ForegroundColor White
Write-Host ""
Write-Host "5. Update .firebaserc with your actual GCP project ID" -ForegroundColor Yellow
Write-Host ""
Write-Host "📚 Full documentation: docs/github-actions-guide.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Setup complete! Follow the steps above to push to GitHub." -ForegroundColor Green
Write-Host ""
