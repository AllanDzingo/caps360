# CAPS360 Deployment Guide

## Prerequisites

- Google Cloud Platform account with billing enabled
- GCP CLI (`gcloud`) installed and configured
- Docker installed
- Node.js 18+ and npm
- Domain name (optional, for custom domain)

## GCP Project Setup

### 1. Create GCP Project

```bash
# Set project ID
export PROJECT_ID="caps360-prod"
export REGION="us-central1"

# Create project
gcloud projects create $PROJECT_ID

# Set as active project
gcloud config set project $PROJECT_ID

# Enable billing (must be done via Console)
```

### 2. Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudscheduler.googleapis.com \
  secretmanager.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com
```

### 3. Create Firestore Database

```bash
# Create Firestore in Native mode
gcloud firestore databases create --region=$REGION
```

### 4. Create Cloud Storage Bucket

```bash
# Create bucket for content storage
gsutil mb -l $REGION gs://${PROJECT_ID}-content

# Set CORS configuration
cat > cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://${PROJECT_ID}-content
```

### 5. Set Up Secrets

```bash
# Create secrets
echo -n "your-jwt-secret" | gcloud secrets create jwt-secret --data-file=-
echo -n "your-gemini-api-key" | gcloud secrets create gemini-api-key --data-file=-
echo -n "your-payfast-merchant-id" | gcloud secrets create payfast-merchant-id --data-file=-
echo -n "your-payfast-merchant-key" | gcloud secrets create payfast-merchant-key --data-file=-
echo -n "your-paystack-secret-key" | gcloud secrets create paystack-secret-key --data-file=-
```

## Backend Deployment

### 1. Build and Deploy to Cloud Run

```bash
cd backend

# Build Docker image
docker build -t gcr.io/$PROJECT_ID/caps360-api .

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/caps360-api

# Deploy to Cloud Run
gcloud run deploy caps360-api \
  --image gcr.io/$PROJECT_ID/caps360-api \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=$PROJECT_ID,GCS_BUCKET_NAME=${PROJECT_ID}-content" \
  --set-secrets="JWT_SECRET=jwt-secret:latest,GEMINI_API_KEY=gemini-api-key:latest,PAYFAST_MERCHANT_ID=payfast-merchant-id:latest,PAYFAST_MERCHANT_KEY=payfast-merchant-key:latest,PAYSTACK_SECRET_KEY=paystack-secret-key:latest" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

### 2. Get API URL

```bash
gcloud run services describe caps360-api --region $REGION --format 'value(status.url)'
```

## Cloud Functions Deployment

### 1. Deploy Trial Expiry Checker

```bash
cd functions/trial-expiry-checker

gcloud functions deploy trial-expiry-checker \
  --runtime nodejs18 \
  --trigger-topic trial-expiry-check \
  --region $REGION \
  --set-env-vars="GCP_PROJECT_ID=$PROJECT_ID"
```

### 2. Deploy Welcome Premium Expiry

```bash
cd ../welcome-premium-expiry

gcloud functions deploy welcome-premium-expiry \
  --runtime nodejs18 \
  --trigger-topic welcome-premium-expiry-check \
  --region $REGION \
  --set-env-vars="GCP_PROJECT_ID=$PROJECT_ID"
```

### 3. Deploy Webhook Functions

```bash
cd ../payfast-webhook

gcloud functions deploy payfast-webhook \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --region $REGION \
  --set-secrets="PAYFAST_PASSPHRASE=payfast-passphrase:latest"

cd ../paystack-webhook

gcloud functions deploy paystack-webhook \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --region $REGION \
  --set-secrets="PAYSTACK_SECRET_KEY=paystack-secret-key:latest"
```

### 4. Set Up Cloud Scheduler

```bash
# Create scheduler jobs
gcloud scheduler jobs create pubsub trial-expiry-daily \
  --schedule="0 2 * * *" \
  --topic=trial-expiry-check \
  --message-body="check" \
  --time-zone="Africa/Johannesburg"

gcloud scheduler jobs create pubsub welcome-premium-expiry-daily \
  --schedule="0 3 * * *" \
  --topic=welcome-premium-expiry-check \
  --message-body="check" \
  --time-zone="Africa/Johannesburg"
```

## Frontend Web Deployment

### Option 1: Firebase Hosting

```bash
cd frontend-web

# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting

# Build
npm run build

# Deploy
firebase deploy --only hosting
```

### Option 2: Vercel

```bash
cd frontend-web

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Option 3: Netlify

```bash
cd frontend-web

# Install Netlify CLI
npm install -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

## Frontend Mobile Deployment

### 1. Configure Expo

```bash
cd frontend-mobile

# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure
```

### 2. Build for iOS

```bash
eas build --platform ios
```

### 3. Build for Android

```bash
eas build --platform android
```

### 4. Submit to Stores

```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

## Post-Deployment Configuration

### 1. Update Frontend Environment Variables

```bash
# For web frontend
VITE_API_URL=https://caps360-api-xxx-uc.a.run.app
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxx

# For mobile frontend
API_URL=https://caps360-api-xxx-uc.a.run.app
PAYSTACK_PUBLIC_KEY=pk_live_xxx
```

### 2. Configure Webhook URLs

Update PayFast and Paystack webhook URLs:
- PayFast: `https://[REGION]-[PROJECT_ID].cloudfunctions.net/payfast-webhook`
- Paystack: `https://[REGION]-[PROJECT_ID].cloudfunctions.net/paystack-webhook`

### 3. Set Up Custom Domain (Optional)

```bash
# Map custom domain to Cloud Run
gcloud run domain-mappings create \
  --service caps360-api \
  --domain api.caps360.co.za \
  --region $REGION
```

## Monitoring Setup

### 1. Create Uptime Checks

```bash
gcloud monitoring uptime create caps360-api-health \
  --resource-type=uptime-url \
  --host=caps360-api-xxx-uc.a.run.app \
  --path=/health
```

### 2. Set Up Alerts

```bash
# Create alert policy for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s
```

## Backup Strategy

### 1. Firestore Backup

```bash
# Enable automatic backups
gcloud firestore backups schedules create \
  --database='(default)' \
  --recurrence=daily \
  --retention=7d
```

### 2. Cloud Storage Versioning

```bash
gsutil versioning set on gs://${PROJECT_ID}-content
```

## Rollback Procedure

### Backend Rollback

```bash
# List revisions
gcloud run revisions list --service caps360-api --region $REGION

# Rollback to previous revision
gcloud run services update-traffic caps360-api \
  --to-revisions REVISION_NAME=100 \
  --region $REGION
```

### Frontend Rollback

```bash
# Firebase
firebase hosting:rollback

# Vercel
vercel rollback [DEPLOYMENT_URL]
```

## Cost Optimization

1. **Cloud Run**: Set min instances to 0 for auto-scaling to zero
2. **AI Caching**: Implemented to reduce Gemini API costs
3. **Cloud Storage**: Use lifecycle policies to delete old files
4. **Firestore**: Use composite indexes efficiently
5. **Monitoring**: Set budget alerts in GCP Console

## Security Checklist

- [ ] All secrets stored in Secret Manager
- [ ] CORS configured for frontend domains only
- [ ] Rate limiting enabled on API
- [ ] Webhook signature verification implemented
- [ ] HTTPS enforced on all endpoints
- [ ] Regular security audits scheduled
- [ ] Firestore security rules configured
- [ ] IAM roles properly assigned

## Troubleshooting

### API Not Responding
```bash
# Check Cloud Run logs
gcloud run services logs read caps360-api --region $REGION --limit 50
```

### Firestore Connection Issues
```bash
# Verify Firestore is enabled
gcloud firestore databases list
```

### Payment Webhooks Failing
```bash
# Check Cloud Function logs
gcloud functions logs read paystack-webhook --region $REGION --limit 50
```
