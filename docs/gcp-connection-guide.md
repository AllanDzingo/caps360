# CAPS360 - Quick GCP Connection Guide

## 🎯 Connect Your Existing GCP Project to CAPS360

Since you already have a GCP account and project set up, follow these steps to connect CAPS360:

---

## Step 1: Get Your Project Information

Run these commands to verify your setup:

```powershell
# Check authentication
gcloud auth list

# Get your project ID
gcloud config get-value project

# List all your projects
gcloud projects list
```

---

## Step 2: Set Your Project (if needed)

```powershell
# Replace with your actual project ID
gcloud config set project caps360
```

---

## Step 3: Enable Required APIs

```powershell
gcloud services enable run.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable storage-api.googleapis.com
## Providing service account credentials

For local development you can use Application Default Credentials:

```powershell
gcloud auth application-default login
```

For deployed environments (e.g., Fly.io) we recommend using a service account key saved as a secret rather than committing credentials to the repo. This project supports two env var formats:

- `GCP_SERVICE_ACCOUNT_KEY` — raw JSON contents of the service account key
- `GCP_SERVICE_ACCOUNT_KEY_B64` — base64 encoded JSON of the service account key

When either variable is provided, the app will parse it and pass the credentials directly to the Google client libraries. Example (PowerShell) to add a secret to Fly:

```powershell
# $json = Get-Content .\service-account.json -Raw
# flyctl secrets set GCP_SERVICE_ACCOUNT_KEY="$json" -a caps360-backend

# or base64 (safer for preserving newlines)
# $b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))
# flyctl secrets set GCP_SERVICE_ACCOUNT_KEY_B64=$b64 -a caps360-backend
```

After setting the secret, redeploy the backend; it will use the provided credentials to authenticate with Firestore and Cloud Storage.

**Important:** Some organizations enforce an Org Policy that prevents creating long‑lived service account keys (you may see `iam.disableServiceAccountKeyCreation`). In that case, prefer **Workload Identity Federation (WIF)** which lets GitHub Actions mint short‑lived tokens without creating JSON keys. See `docs/wif-setup.md` for a step‑by‑step WIF setup and a ready-to-use GitHub Actions workflow included in this repo.
```

---

## Step 4: Create Service Account for GitHub Actions

```powershell
# Create service account
gcloud iam service-accounts create github-actions `
  --display-name="GitHub Actions CI/CD"

# Grant permissions
$PROJECT_ID = gcloud config get-value project
$SA_EMAIL = "github-actions@$PROJECT_ID.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/run.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/storage.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/cloudfunctions.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/iam.serviceAccountUser"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/secretmanager.secretAccessor"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/cloudbuild.builds.editor"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/datastore.user"

# Create service account key
gcloud iam service-accounts keys create github-sa-key.json `
  --iam-account=$SA_EMAIL
```

---

## Step 5: Create GCP Secrets

```powershell
# Create secrets in Secret Manager
echo "your-jwt-secret-here" | gcloud secrets create jwt-secret --data-file=-
echo "your-gemini-api-key" | gcloud secrets create gemini-api-key --data-file=-
echo "your-payfast-merchant-id" | gcloud secrets create payfast-merchant-id --data-file=-
echo "your-payfast-merchant-key" | gcloud secrets create payfast-merchant-key --data-file=-
echo "your-payfast-passphrase" | gcloud secrets create payfast-passphrase --data-file=-
echo "your-paystack-secret-key" | gcloud secrets create paystack-secret-key --data-file=-
```

---

## Step 6: Update Project Configuration Files

### Update `.firebaserc`

Replace `YOUR_PROJECT_ID` with your actual project ID:

```json
{
  "projects": {
    "default": "caps360"
  },
  "targets": {
    "caps360": {
      "hosting": {
        "caps360-web": [
          "caps360-web"
        ]
      }
    }
  }
}
```

### Create `backend/.env`

```env
PORT=8080
NODE_ENV=development
GCP_PROJECT_ID=caps360
GEMINI_API_KEY=your-gemini-api-key
PAYFAST_MERCHANT_ID=your-payfast-merchant-id
PAYFAST_MERCHANT_KEY=your-payfast-merchant-key
PAYFAST_PASSPHRASE=your-payfast-passphrase
PAYSTACK_SECRET_KEY=your-paystack-secret-key
PAYSTACK_PUBLIC_KEY=your-paystack-public-key
JWT_SECRET=your-jwt-secret
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Create `frontend-web/.env`

```env
VITE_API_URL=http://localhost:8080
VITE_PAYSTACK_PUBLIC_KEY=your-paystack-public-key
```

---

## Step 7: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value | Where to Get It |
|------------|-------|-----------------|
| `GCP_PROJECT_ID` | Your GCP project ID | `gcloud config get-value project` |
| `GCP_SA_KEY` | Service account JSON | Copy entire content of `github-sa-key.json` |
| `PRODUCTION_API_URL` | Cloud Run URL | After deploying backend |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key | Paystack dashboard |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase SA JSON | Firebase Console → Project Settings |

---

## Step 8: Test Local Development

```powershell
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend-web
npm install
npm run dev
```

---

## Step 9: Deploy to GCP

### Deploy Backend to Cloud Run

```powershell
cd backend
gcloud run deploy caps360-api `
  --source . `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=$PROJECT_ID" `
  --set-secrets="JWT_SECRET=jwt-secret:latest,GEMINI_API_KEY=gemini-api-key:latest,PAYFAST_MERCHANT_ID=payfast-merchant-id:latest,PAYFAST_MERCHANT_KEY=payfast-merchant-key:latest,PAYSTACK_SECRET_KEY=paystack-secret-key:latest"
```

### Deploy Frontend to Firebase

```powershell
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not done)
firebase init hosting

# Build and deploy
cd frontend-web
npm run build
firebase deploy --only hosting
```

---

## ✅ Verification Checklist

- [ ] GCP project ID configured
- [ ] Required APIs enabled
- [ ] Service account created with permissions
- [ ] Service account key downloaded
- [ ] GCP secrets created
- [ ] `.firebaserc` updated
- [ ] Backend `.env` created
- [ ] Frontend `.env` created
- [ ] GitHub secrets added
- [ ] Backend deployed to Cloud Run
- [ ] Frontend deployed to Firebase
- [ ] GitHub Actions workflows running

---

## 🚀 Quick Commands Reference

```powershell
# Get project info
gcloud config get-value project
gcloud projects list

# Set project
gcloud config set project PROJECT_ID

# Deploy backend
cd backend && gcloud run deploy caps360-api --source . --region us-central1

# Deploy frontend
cd frontend-web && npm run build && firebase deploy

# View logs
gcloud run logs read caps360-api --region us-central1

# List secrets
gcloud secrets list
```

---

## 📚 Next Steps

1. **Push to GitHub**: Use the GitHub setup script
   ```powershell
   .\scripts\setup-github.ps1
   ```

2. **Monitor Deployments**: Check GitHub Actions tab after pushing

3. **View Application**: 
   - Backend: Cloud Run URL
   - Frontend: Firebase Hosting URL

---

## 🆘 Troubleshooting

### "Permission denied" errors
- Verify service account has all required roles
- Check you're authenticated: `gcloud auth list`

### "API not enabled" errors
- Run the enable APIs commands again
- Wait a few minutes for APIs to activate

### Deployment fails
- Check logs: `gcloud run logs read caps360-api`
- Verify all secrets are created
- Ensure Docker is running (for local builds)

---

## 📞 Support

- Full guide: `docs/github-actions-guide.md`
- GCP Console: https://console.cloud.google.com
- Firebase Console: https://console.firebase.google.com
