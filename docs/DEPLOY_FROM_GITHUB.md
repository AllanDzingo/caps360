# Deploy CAPS360 Directly from GitHub to GCP

## Overview

Deploy your CAPS360 platform directly from GitHub to Google Cloud Run without Docker or Terraform complexity.

---

## Prerequisites

1. ✅ GitHub repository with your code
2. ✅ GCP project (caps360)
3. ✅ gcloud CLI authenticated

---

## Step 1: Push Code to GitHub

```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit"

# Create repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/CAPS360.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend from GitHub

```bash
cd backend

gcloud run deploy caps360-api \
  --source . \
  --region africa-south1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=caps360,PAYSTACK_ENABLED=false,PAYFAST_ENABLED=false" \
  --set-secrets="JWT_SECRET=jwt-secret:latest,GEMINI_API_KEY=gemini-api-key:latest"
```

This will:

- Build from source automatically
- Deploy to Cloud Run
- No Docker needed!

**Time:** 5-10 minutes

---

## Step 3: Deploy Frontend to Firebase

```bash
cd ../frontend-web

# Get backend URL
BACKEND_URL=$(gcloud run services describe caps360-api --region africa-south1 --format="value(status.url)")

# Create .env
echo "VITE_API_URL=$BACKEND_URL" > .env
echo "VITE_PAYSTACK_PUBLIC_KEY=TESTING-MODE" >> .env

# Build and deploy
npm install
npm run build
firebase deploy --only hosting --project caps360
```

---

## Alternative: Deploy via GCP Console

### For Backend

1. Go to <https://console.cloud.google.com/run>
2. Click **Create Service**
3. Select **Continuously deploy from a repository**
4. Click **Set up with Cloud Build**
5. Connect your GitHub repository
6. Select branch: `main`
7. Build type: **Dockerfile**
8. Dockerfile path: `backend/Dockerfile`
9. Service name: `caps360-api`
10. Region: `africa-south1`
11. Allow unauthenticated
12. Click **Create**

### For Frontend

Use Firebase Hosting as described in Step 3 above.

---

## What This Does

- ✅ Builds directly from source code
- ✅ No local Docker required
- ✅ Automatic rebuilds on git push (if using Cloud Build triggers)
- ✅ Simpler than Terraform for initial deployment
- ✅ Can still use Terraform later for infrastructure

---

## Next Steps

1. Deploy backend with `gcloud run deploy --source .`
2. Deploy frontend with `firebase deploy`
3. Create admin user
4. Test your platform!

---

## Troubleshooting

**Build fails:**

- Check `backend/Dockerfile` exists
- Ensure `package.json` is correct

**Secrets not found:**

- Create secrets first (Terraform already did this)
- Or create manually:

  ```bash
  echo "your-secret" | gcloud secrets create SECRET_NAME --data-file=-
  ```

---

This approach is **much simpler** than building Docker images manually!
