# GitHub Secrets Setup for CAPS360

## Required Secrets

To enable GitHub Actions for automated deployment, you need to add the following secrets to your GitHub repository.

### How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below

---

## Secrets to Add

### 1. GCP_PROJECT_ID
**Value**: Your Google Cloud Project ID (e.g., `caps360-prod`)

```
GCP_PROJECT_ID=caps360-prod
```

### 2. GCP_SA_KEY
**Value**: Service Account JSON key

**How to get it**:
```bash
# Create a service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant necessary permissions
gcloud projects add-iam-policy-binding caps360 \
  --member="serviceAccount:github-actions@caps360.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding caps360 \
  --member="serviceAccount:github-actions@caps360.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding caps360 \
  --member="serviceAccount:github-actions@caps360.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.admin"

gcloud projects add-iam-policy-binding caps360 \
  --member="serviceAccount:github-actions@caps360.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create github-sa-key.json \
  --iam-account=github-actions@caps360.iam.gserviceaccount.com

# Copy the entire contents of github-sa-key.json
cat github-sa-key.json
```

Copy the **entire JSON content** and paste it as the secret value.

---

## Workflow Files Location

The GitHub Actions workflows are already created in:
- `.github/workflows/deploy-backend.yml` - Backend deployment
- `.github/workflows/deploy-functions.yml` - Cloud Functions deployment

---

## Testing the Workflows

### Option 1: Push to Main Branch
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Option 2: Manual Trigger
1. Go to **Actions** tab in GitHub
2. Select the workflow (e.g., "Deploy Backend to Cloud Run")
3. Click **Run workflow**
4. Select branch and click **Run workflow**

---

## Workflow Triggers

### Backend Deployment (`deploy-backend.yml`)
**Triggers**:
- Push to `main` branch with changes in `backend/**`
- Manual trigger via GitHub UI

**What it does**:
1. Runs tests
2. Builds Docker image
3. Pushes to Google Container Registry
4. Deploys to Cloud Run
5. Runs health check

### Functions Deployment (`deploy-functions.yml`)
**Triggers**:
- Push to `main` branch with changes in `functions/**`
- Manual trigger via GitHub UI

**What it does**:
1. Deploys all Cloud Functions
2. Updates webhook endpoints
3. Updates scheduled jobs

---

## Troubleshooting

### Workflow fails with "Permission denied"
- Check that service account has correct IAM roles
- Verify `GCP_SA_KEY` secret is valid JSON

### Workflow fails with "Project not found"
- Verify `GCP_PROJECT_ID` secret matches your actual project ID
- Ensure billing is enabled on the project

### Docker build fails
- Check that `backend/Dockerfile` exists
- Verify all dependencies in `package.json` are correct

### Cloud Run deployment fails
- Ensure Cloud Run API is enabled: `gcloud services enable run.googleapis.com`
- Check that secrets exist in Secret Manager

---

## Quick Setup Script

Run this script to set up everything:

```bash
#!/bin/bash

# Set your project ID
export PROJECT_ID="caps360-prod"

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com

# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions" \
  --project=$PROJECT_ID

# Grant permissions
for role in roles/run.admin roles/storage.admin roles/cloudfunctions.admin roles/iam.serviceAccountUser roles/secretmanager.secretAccessor
do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="$role"
done

# Create key
gcloud iam service-accounts keys create github-sa-key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com \
  --project=$PROJECT_ID

echo "✅ Service account created!"
echo "📋 Copy the contents of github-sa-key.json to GitHub secret GCP_SA_KEY"
cat github-sa-key.json
```

---

## Next Steps

1. ✅ Add secrets to GitHub repository
2. ✅ Push code to GitHub
3. ✅ Watch workflows run in Actions tab
4. ✅ Verify deployment in GCP Console

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `github-sa-key.json` to the repository
- Add it to `.gitignore`
- Delete the key file after adding to GitHub secrets
- Rotate service account keys regularly
