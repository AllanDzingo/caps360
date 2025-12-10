# CAPS360 Terraform Deployment Guide

## Prerequisites

- Terraform >= 1.0 installed
- Google Cloud SDK installed and authenticated
- Firebase CLI installed
- Docker installed (for building backend image)

## Quick Start

### 1. Initialize Terraform

```bash
cd terraform
terraform init
```

### 2. Review the Plan

```bash
terraform plan
```

This will show you all the resources that will be created.

### 3. Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted.

**This will create:**

- Cloud Run service for backend
- Firestore database
- Cloud Storage bucket for content
- Secret Manager secrets (with secure JWT)
- Service accounts and IAM permissions

**Time:** ~5-10 minutes

### 4. Build and Deploy Backend

```bash
cd ../backend
gcloud builds submit --tag gcr.io/caps360/caps360-backend:latest
gcloud run services update caps360-api --image gcr.io/caps360/caps360-backend:latest --region africa-south1
```

### 5. Deploy Frontend

```bash
cd ../frontend-web

# Update .env with backend URL (from terraform output)
echo "VITE_API_URL=$(cd ../terraform && terraform output -raw backend_url)" > .env
echo "VITE_PAYSTACK_PUBLIC_KEY=TESTING-MODE" >> .env

# Build and deploy
npm run build
firebase deploy --only hosting --project caps360
```

### 6. Create Admin User

```bash
cd ..
node backend/scripts/create-admin.js
```

---

## Terraform Commands

### View Outputs

```bash
cd terraform
terraform output
```

### View Backend URL

```bash
terraform output backend_url
```

### View All Deployment Commands

```bash
terraform output deployment_commands
```

### Update Infrastructure

```bash
terraform apply
```

### Destroy Infrastructure (WARNING)

```bash
terraform destroy
```

---

## What Gets Created

### Cloud Run

- **Service:** caps360-api
- **Region:** africa-south1
- **Memory:** 512Mi
- **CPU:** 1 vCPU
- **Scaling:** 0-10 instances
- **Access:** Public (unauthenticated)

### Firestore

- **Database:** (default)
- **Type:** Native mode
- **Region:** africa-south1

### Cloud Storage

- **Bucket:** caps360-content
- **Location:** africa-south1
- **CORS:** Enabled for web app

### Secrets

- `jwt-secret` - Auto-generated 64-character secure key
- `gemini-api-key` - Placeholder (update later)
- `payfast-merchant-id` - TESTING-MODE
- `payfast-merchant-key` - TESTING-MODE
- `payfast-passphrase` - TESTING-MODE
- `paystack-secret-key` - TESTING-MODE

### Service Account

- **Name:** caps360-backend
- **Permissions:**
  - Firestore user
  - Storage object admin
  - Secret accessor

---

## Update Secrets

### Update Gemini API Key

```bash
echo -n "your-actual-key" | gcloud secrets versions add gemini-api-key --data-file=-
```

Then restart Cloud Run:

```bash
gcloud run services update caps360-api --region africa-south1
```

### Update Payment Keys (When Ready)

```bash
echo -n "your-paystack-key" | gcloud secrets versions add paystack-secret-key --data-file=-
echo -n "your-payfast-id" | gcloud secrets versions add payfast-merchant-id --data-file=-
echo -n "your-payfast-key" | gcloud secrets versions add payfast-merchant-key --data-file=-
```

Update environment variables:

```bash
gcloud run services update caps360-api \
  --region africa-south1 \
  --set-env-vars="PAYSTACK_ENABLED=true,PAYFAST_ENABLED=true"
```

---

## Troubleshooting

### Terraform Init Fails

```bash
# Clear cache
rm -rf .terraform .terraform.lock.hcl

# Re-initialize
terraform init
```

### Apply Fails - API Not Enabled

Wait a few minutes for APIs to fully enable, then retry:

```bash
terraform apply
```

### Cloud Run Image Not Found

The first `terraform apply` will fail because the Docker image doesn't exist yet. This is expected.

**Solution:**

1. Build and push the image first:

   ```bash
   cd backend
   gcloud builds submit --tag gcr.io/caps360/caps360-backend:latest
   ```

2. Then apply again:

   ```bash
   cd ../terraform
   terraform apply
   ```

Or use the lifecycle ignore_changes (already configured) and update the image separately.

### Firestore Already Exists

If you get an error that Firestore already exists:

```bash
# Remove from state
terraform state rm google_firestore_database.database

# Import existing
terraform import google_firestore_database.database "(default)"
```

---

## State Management

### Local State (Default)

Terraform state is stored locally in `terraform.tfstate`.

**IMPORTANT:**

- Do NOT commit `terraform.tfstate` to git
- Do NOT delete `terraform.tfstate` (you'll lose track of resources)
- Back up `terraform.tfstate` regularly

### Remote State (Recommended for Production)

Create a GCS bucket for state:

```bash
gsutil mb gs://caps360-terraform-state
```

Add to `main.tf`:

```hcl
terraform {
  backend "gcs" {
    bucket = "caps360-terraform-state"
    prefix = "terraform/state"
  }
}
```

Then migrate:

```bash
terraform init -migrate-state
```

---

## Cost Estimate

### Free Tier

- Cloud Run: 2M requests/month
- Firestore: 50K reads, 20K writes/day
- Cloud Storage: 5GB
- Secret Manager: 6 secrets

**Expected Cost:** $0-10/month during testing

---

## Deployment Workflow

```
┌─────────────────────────────────────┐
│  1. terraform init                   │
│     Initialize Terraform             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. terraform plan                   │
│     Review changes                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. terraform apply                  │
│     Create infrastructure            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. Build & push Docker image        │
│     gcloud builds submit             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  5. Update Cloud Run                 │
│     gcloud run services update       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  6. Deploy frontend                  │
│     firebase deploy                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  7. Create admin user                │
│     node create-admin.js             │
└─────────────────────────────────────┘
```

---

## Next Steps

After deployment:

1. ✅ Access frontend: <https://caps360.web.app>
2. ✅ Access backend: (from terraform output)
3. ✅ Create admin user
4. ✅ Test platform features
5. ⏳ Add Gemini API key for AI features
6. ⏳ Add payment keys when ready

---

## Useful Commands

```bash
# View all resources
terraform state list

# View specific resource
terraform state show google_cloud_run_service.backend

# Refresh state
terraform refresh

# Format code
terraform fmt

# Validate configuration
terraform validate

# View graph
terraform graph | dot -Tpng > graph.png
```

---

## Security Best Practices

- ✅ Secrets stored in Secret Manager (not in code)
- ✅ Service account with minimal permissions
- ✅ JWT secret auto-generated
- ✅ terraform.tfvars in .gitignore
- ✅ State file not committed
- ⚠️ Update placeholder secrets before production
- ⚠️ Enable authentication for Cloud Run in production
- ⚠️ Set up Firestore security rules

---

## Support

- Terraform Docs: <https://registry.terraform.io/providers/hashicorp/google/latest/docs>
- GCP Console: <https://console.cloud.google.com>
- Firebase Console: <https://console.firebase.google.com>
