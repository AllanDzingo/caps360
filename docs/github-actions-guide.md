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

### 🚀 Deployment Workflow (`fly-deploy.yml`)

**Triggers:**

- Push to `main` branch
- Manual workflow dispatch

**What it does:**

1. Runs tests
2. Deploys backend to Fly.io
3. Deploys frontend to Fly.io
4. Performs health check

**Secrets required:**

- `FLY_API_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `PAYSTACK_SECRET_KEY`

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

### Fly.io & Supabase Secrets

| Secret Name | Description | How to Obtain |
|------------|-------------|---------------|
| `FLY_API_TOKEN` | Fly.io access token | `fly auth token` |
| `SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase anon key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard → Settings → API |
| `GEMINI_API_KEY` | Google Gemini API key | Google AI Studio |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | Paystack Dashboard |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key | Paystack Dashboard |

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

### 4. Configure Fly.io

1. Login to Fly.io: `fly auth login`
2. Launch your backend and frontend apps on Fly.io.

### 5. Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings → Secrets and variables → Actions**
3. Add the secrets listed in the section above.

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

### Test Deployment

1. Commit and push to main:

   ```powershell
   git checkout main
   git add .
   git commit -m "feat: test deployment"
   git push
   ```

2. Go to **Actions** tab on GitHub

3. Watch the `Deploy to Fly.io` workflow

4. Verify deployment succeeds

---

## Troubleshooting

### Workflow Fails: "Authentication failed"

**Problem:** Fly.io authentication is not working

**Solution:**

1. Verify `FLY_API_TOKEN` secret is set correctly.

### Tests Fail in CI

**Problem:** Tests pass locally but fail in CI

**Solution:**

1. Check Node.js version matches (18 or 20).
2. Ensure all dependencies are in `package.json`.
3. Review test logs in GitHub Actions.

---

## Workflow Status Badges

Add these to your `README.md`:

```markdown
![CI](https://github.com/YOUR_USERNAME/CAPS360/workflows/CI%20-%20Tests%20and%20Linting/badge.svg)
![Deploy](https://github.com/YOUR_USERNAME/CAPS360/workflows/Deploy%20to%20Fly.io/badge.svg)
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

---

## Support

For CAPS360-specific issues, contact: <support@caps360.co.za>
