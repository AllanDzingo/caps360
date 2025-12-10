# GitHub Actions CI/CD Guide for CAPS360

## Overview

CAPS360 uses GitHub Actions for continuous integration and deployment. This guide covers all workflows, required secrets, and troubleshooting.

## Workflows

### 🔄 CI Workflow (`ci.yml`)

**Triggers:** Pull requests and pushes to `main` and `develop` branches

**What it does:**
- Runs backend tests and linting on Node.js 18 and 20
- Runs frontend tests, linting, and TypeScript checks
- Builds frontend to verify no build errors
- Uploads code coverage reports

**Required for:** All pull requests must pass before merging

---

### 🚀 Backend Deployment (`deploy-backend.yml`)

**Triggers:** 
- Push to `main` branch with changes in `backend/**`
- Manual workflow dispatch

**What it does:**
1. Runs tests
2. Builds Docker image
3. Pushes to Google Container Registry
4. Deploys to Cloud Run
5. Performs health check

**Secrets required:**
- `GCP_PROJECT_ID`
- `GCP_SA_KEY`
- Secrets in Secret Manager: `jwt-secret`, `gemini-api-key`, `payfast-merchant-id`, `payfast-merchant-key`, `paystack-secret-key`

---

### ☁️ Cloud Functions Deployment (`deploy-functions.yml`)

**Triggers:**
- Push to `main` branch with changes in `functions/**`
- Manual workflow dispatch

**What it does:**
- Deploys all Cloud Functions (trial-expiry-checker, welcome-premium-expiry, payfast-webhook, paystack-webhook)

**Secrets required:**
- `GCP_PROJECT_ID`
- `GCP_SA_KEY`
- Secrets in Secret Manager: `payfast-passphrase`, `paystack-secret-key`

---

### 🌐 Frontend Deployment (`deploy-frontend.yml`)

**Triggers:**
- Push to `main` branch with changes in `frontend-web/**`
- Manual workflow dispatch
- Pull requests (preview deployments)

**What it does:**
1. Builds optimized production bundle
2. Deploys to Firebase Hosting
3. Creates preview deployments for PRs
4. Runs smoke tests

**Secrets required:**
- `GCP_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT`
- `PRODUCTION_API_URL`
- `STAGING_API_URL`
- `PAYSTACK_PUBLIC_KEY`

---

### 🔒 Security Scanning (`security.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests
- Weekly schedule (Mondays at 9 AM UTC)
- Manual workflow dispatch

**What it does:**
- Runs `npm audit` on backend and frontend
- Performs CodeQL security analysis
- Scans for secrets with TruffleHog
- Scans Docker images with Trivy

**No secrets required** (uses default `GITHUB_TOKEN`)

---

### 📦 Dependabot Auto-merge (`dependabot-auto-merge.yml`)

**Triggers:** Dependabot pull requests

**What it does:**
- Auto-merges minor and patch dependency updates
- Comments on major updates for manual review

**Configuration:** `.github/dependabot.yml`

---

## Required GitHub Secrets

Navigate to: **Repository → Settings → Secrets and variables → Actions**

### GCP Authentication

| Secret Name | Description | How to Obtain |
|------------|-------------|---------------|
| `GCP_PROJECT_ID` | Your GCP project ID | From GCP Console or run setup script |
| `GCP_SA_KEY` | Service account JSON key | Run `.\scripts\setup-github-actions.ps1` |

### Firebase Hosting

| Secret Name | Description | How to Obtain |
|------------|-------------|---------------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON | Firebase Console → Project Settings → Service Accounts |

### API Configuration

| Secret Name | Description | Example |
|------------|-------------|---------|
| `PRODUCTION_API_URL` | Production backend URL | `https://caps360-api-xxxxx.run.app` |
| `STAGING_API_URL` | Staging backend URL | `https://caps360-api-staging-xxxxx.run.app` |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key | `pk_live_xxxxx` or `pk_test_xxxxx` |

---

## Setup Instructions

### 1. Initialize Git Repository

```powershell
cd "c:\Users\Hanco Sipsma\Desktop\Allan 2025\CAPS360"
git init
git add .
git commit -m "Initial commit: CAPS360 platform"
```

### 2. Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository named `CAPS360`
3. **Do NOT** initialize with README, .gitignore, or license
4. Copy the repository URL

### 3. Connect Local Repository to GitHub

```powershell
git remote add origin https://github.com/YOUR_USERNAME/CAPS360.git
git branch -M main
git push -u origin main
```

### 4. Set Up GCP Service Account

Run the setup script:

```powershell
.\scripts\setup-github-actions.ps1
```

This will:
- Enable required GCP APIs
- Create a service account named `github-actions`
- Grant necessary IAM permissions
- Generate a service account key JSON file

### 5. Configure GitHub Secrets

#### Add GCP Secrets

1. Go to your GitHub repository
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Add the following secrets:

**GCP_PROJECT_ID:**
```
caps360
```

**GCP_SA_KEY:**
```json
{
  "type": "service_account",
  "project_id": "caps360",
  ...
}
```
(Copy the entire JSON from `github-sa-key.json`)

#### Add Firebase Secret

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Generate service account:
   ```powershell
   firebase projects:list
   # Note your project ID
   ```
4. Go to [Firebase Console](https://console.firebase.google.com/)
5. Project Settings → Service Accounts → Generate New Private Key
6. Copy the JSON and add as `FIREBASE_SERVICE_ACCOUNT` secret

#### Add API Configuration Secrets

Add these secrets with your actual values:
- `PRODUCTION_API_URL`: Your Cloud Run backend URL
- `STAGING_API_URL`: Your staging backend URL (if applicable)
- `PAYSTACK_PUBLIC_KEY`: Your Paystack public key

### 6. Update Configuration Files

#### Update `.firebaserc`

Replace `YOUR_PROJECT_ID` with your actual GCP project ID:

```json
{
  "projects": {
    "default": "caps360"
  }
}
```

#### Update `.github/dependabot.yml`

Replace `YOUR_GITHUB_USERNAME` with your GitHub username.

### 7. Set Up GCP Secret Manager

Create secrets in GCP Secret Manager:

```powershell
# Set your project
gcloud config set project caps360

# Create secrets
echo -n "your-jwt-secret" | gcloud secrets create jwt-secret --data-file=-
echo -n "your-gemini-api-key" | gcloud secrets create gemini-api-key --data-file=-
echo -n "your-payfast-merchant-id" | gcloud secrets create payfast-merchant-id --data-file=-
echo -n "your-payfast-merchant-key" | gcloud secrets create payfast-merchant-key --data-file=-
echo -n "your-paystack-secret-key" | gcloud secrets create paystack-secret-key --data-file=-
echo -n "your-payfast-passphrase" | gcloud secrets create payfast-passphrase --data-file=-
```

---

## Testing Your Setup

### Test CI Workflow

1. Create a new branch:
   ```powershell
   git checkout -b test/ci-workflow
   ```

2. Make a small change to any file

3. Commit and push:
   ```powershell
   git add .
   git commit -m "test: CI workflow"
   git push -u origin test/ci-workflow
   ```

4. Create a pull request on GitHub

5. Verify the CI workflow runs and passes

### Test Backend Deployment

1. Make a change to backend code

2. Commit and push to main:
   ```powershell
   git checkout main
   git add backend/
   git commit -m "feat(backend): update feature"
   git push
   ```

3. Go to **Actions** tab on GitHub

4. Watch the `Deploy Backend to Cloud Run` workflow

5. Verify deployment succeeds

### Manual Workflow Trigger

1. Go to **Actions** tab on GitHub
2. Select any workflow
3. Click **Run workflow** button
4. Select branch and click **Run workflow**

---

## Troubleshooting

### Workflow Fails: "Authentication failed"

**Problem:** GCP authentication is not working

**Solution:**
1. Verify `GCP_SA_KEY` secret is set correctly
2. Ensure the JSON is valid (no extra spaces or line breaks)
3. Check service account has required permissions
4. Re-run the setup script if needed

### Workflow Fails: "Permission denied"

**Problem:** Service account lacks necessary permissions

**Solution:**
1. Run the setup script again to grant all roles
2. Manually verify roles in GCP Console:
   - IAM & Admin → IAM
   - Find `github-actions@...` service account
   - Verify it has: `roles/run.admin`, `roles/storage.admin`, etc.

### Frontend Deployment Fails

**Problem:** Firebase deployment not working

**Solution:**
1. Verify `FIREBASE_SERVICE_ACCOUNT` secret is set
2. Ensure Firebase Hosting is enabled in Firebase Console
3. Check `.firebaserc` has correct project ID
4. Verify `firebase.json` points to correct build directory

### Tests Fail in CI

**Problem:** Tests pass locally but fail in CI

**Solution:**
1. Check Node.js version matches (18 or 20)
2. Ensure all dependencies are in `package.json`
3. Check for environment-specific code
4. Review test logs in GitHub Actions

### Docker Build Fails

**Problem:** Backend Docker image won't build

**Solution:**
1. Test Docker build locally:
   ```powershell
   cd backend
   docker build -t test .
   ```
2. Check `Dockerfile` syntax
3. Ensure all files are committed
4. Verify `tsconfig.json` is present

---

## Workflow Status Badges

Add these to your `README.md`:

```markdown
![CI](https://github.com/YOUR_USERNAME/CAPS360/workflows/CI%20-%20Tests%20and%20Linting/badge.svg)
![Backend Deploy](https://github.com/YOUR_USERNAME/CAPS360/workflows/Deploy%20Backend%20to%20Cloud%20Run/badge.svg)
![Security](https://github.com/YOUR_USERNAME/CAPS360/workflows/Security%20Scanning/badge.svg)
```

---

## Best Practices

### Branch Protection Rules

Set up branch protection for `main`:

1. Go to **Settings → Branches**
2. Add rule for `main` branch
3. Enable:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass (select CI workflow)
   - ✅ Require branches to be up to date
   - ✅ Include administrators

### Commit Message Convention

Use conventional commits:
- `feat(scope): description` - New features
- `fix(scope): description` - Bug fixes
- `chore(scope): description` - Maintenance
- `docs(scope): description` - Documentation
- `test(scope): description` - Tests

### Environment Variables

Never commit secrets! Use:
- GitHub Secrets for CI/CD
- GCP Secret Manager for production
- `.env` files for local development (in `.gitignore`)

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)

---

## Support

For issues with GitHub Actions setup, check:
1. Workflow logs in GitHub Actions tab
2. GCP Cloud Run logs in GCP Console
3. This troubleshooting guide

For CAPS360-specific issues, contact: support@caps360.co.za
