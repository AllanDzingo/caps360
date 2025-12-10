#!/bin/bash

# CAPS360 - GitHub Actions Setup Script
# This script sets up the GCP service account for GitHub Actions

set -e

echo "🚀 CAPS360 GitHub Actions Setup"
echo "================================"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Prompt for project ID
read -p "Enter your GCP Project ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: Project ID cannot be empty"
    exit 1
fi

echo ""
echo "📋 Using Project ID: $PROJECT_ID"
echo ""

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com

echo "✅ APIs enabled"
echo ""

# Create service account
echo "👤 Creating service account..."
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions CI/CD" \
  --project=$PROJECT_ID

SERVICE_ACCOUNT="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"
echo "✅ Service account created: $SERVICE_ACCOUNT"
echo ""

# Grant IAM roles
echo "🔐 Granting IAM permissions..."
ROLES=(
  "roles/run.admin"
  "roles/storage.admin"
  "roles/cloudfunctions.admin"
  "roles/iam.serviceAccountUser"
  "roles/secretmanager.secretAccessor"
  "roles/cloudbuild.builds.editor"
)

for role in "${ROLES[@]}"
do
  echo "  - Granting $role"
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="$role" \
    --quiet
done

echo "✅ Permissions granted"
echo ""

# Create service account key
echo "🔑 Creating service account key..."
KEY_FILE="github-sa-key.json"

if [ -f "$KEY_FILE" ]; then
    read -p "⚠️  $KEY_FILE already exists. Overwrite? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
fi

gcloud iam service-accounts keys create $KEY_FILE \
  --iam-account=$SERVICE_ACCOUNT \
  --project=$PROJECT_ID

echo "✅ Service account key created: $KEY_FILE"
echo ""

# Display instructions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 NEXT STEPS: Add Secrets to GitHub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to your GitHub repository"
echo "2. Navigate to: Settings → Secrets and variables → Actions"
echo "3. Click 'New repository secret'"
echo ""
echo "4. Add the following secrets:"
echo ""
echo "   Secret Name: GCP_PROJECT_ID"
echo "   Value: $PROJECT_ID"
echo ""
echo "   Secret Name: GCP_SA_KEY"
echo "   Value: (copy the entire content below)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 Service Account Key (copy everything between the lines):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat $KEY_FILE
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  SECURITY NOTES:"
echo "   - Delete $KEY_FILE after adding to GitHub secrets"
echo "   - Never commit this file to your repository"
echo "   - The key is already in .gitignore"
echo ""
echo "🎉 Setup complete! You can now use GitHub Actions for deployment."
echo ""
