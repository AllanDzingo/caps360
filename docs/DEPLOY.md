# CAPS360 - Quick Deployment Guide

## 🚀 Deploy to GCP (Testing Mode)

This guide will help you deploy CAPS360 to Google Cloud Platform for testing.

---

## Prerequisites

✅ Google Cloud SDK installed and authenticated  
✅ Firebase CLI installed (`npm install -g firebase-tools`)  
✅ Node.js 18+ installed  
✅ Project ID: `caps360`

---

## Quick Deploy

Run the automated deployment script:

```powershell
.\scripts\deploy-gcp.ps1
```

This script will:

1. ✅ Enable required GCP APIs
2. ✅ Create GCP secrets (with placeholder values)
3. ✅ Deploy backend to Cloud Run
4. ✅ Deploy frontend to Firebase Hosting
5. ✅ Generate deployment URLs

**Time:** ~10-15 minutes

---

## After Deployment

### 1. Create Admin User

```powershell
.\scripts\create-admin-user.ps1
```

Enter your admin details when prompted.

### 2. Access Your Platform

- **Frontend:** <https://caps360.web.app>
- **Backend API:** (URL provided after deployment)

### 3. Update Gemini API Key (Optional)

To enable AI features:

```powershell
echo "your-actual-gemini-api-key" | gcloud secrets versions add gemini-api-key --data-file=-
```

Then restart the backend:

```powershell
gcloud run services update caps360-api --region us-central1
```

---

## Testing Mode Features

### ✅ Available Features

- User authentication and login
- Admin dashboard
- Content management
- Quiz generation (with Gemini API key)
- Video lessons
- Student progress tracking
- Analytics dashboard

### ❌ Disabled Features

- Payment processing (PayFast/Paystack)
- Subscription purchases
- Trial activation via payment

---

## Admin Access

As an admin user, you can:

- ✅ Access admin dashboard
- ✅ Manage users
- ✅ Upload content (videos, PDFs)
- ✅ Create quizzes
- ✅ View analytics
- ✅ Manually assign subscription tiers to users

---

## View Logs

### Backend Logs

```powershell
gcloud run logs read caps360-api --region us-central1 --limit 50
```

### Real-time Logs

```powershell
gcloud run logs tail caps360-api --region us-central1
```

---

## Update Deployment

### Update Backend

```powershell
cd backend
gcloud run deploy caps360-api --source . --region us-central1
```

### Update Frontend

```powershell
cd frontend-web
npm run build
firebase deploy --only hosting
```

---

## Enable Payments (When Ready)

1. **Get Paystack Keys:**
   - Sign up at <https://paystack.com>
   - Get your public and secret keys

2. **Update Secrets:**

```powershell
echo "your-paystack-secret-key" | gcloud secrets versions add paystack-secret-key --data-file=-
```

3. **Update Frontend:**

Edit `frontend-web/.env`:

```env
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
```

4. **Redeploy:**

```powershell
# Backend
cd backend
gcloud run deploy caps360-api --source . --region us-central1 --set-env-vars="PAYSTACK_ENABLED=true"

# Frontend
cd frontend-web
npm run build
firebase deploy --only hosting
```

---

## Troubleshooting

### Deployment Fails

**Check APIs are enabled:**

```powershell
gcloud services list --enabled
```

**Check project:**

```powershell
gcloud config get-value project
```

### Backend Not Responding

**Check service status:**

```powershell
gcloud run services describe caps360-api --region us-central1
```

**View recent errors:**

```powershell
gcloud run logs read caps360-api --region us-central1 --limit 20
```

### Frontend Not Loading

**Check Firebase deployment:**

```powershell
firebase hosting:channel:list
```

**Redeploy:**

```powershell
cd frontend-web
firebase deploy --only hosting --project caps360
```

### Admin User Creation Fails

**Check Firestore is enabled:**

```powershell
gcloud services enable firestore.googleapis.com
```

**Create Firestore database:**

- Go to <https://console.firebase.google.com>
- Select your project
- Firestore Database → Create Database
- Choose "Start in production mode"
- Select region: `us-central1`

---

## Useful Commands

```powershell
# View all Cloud Run services
gcloud run services list

# View all secrets
gcloud secrets list

# Delete a deployment
gcloud run services delete caps360-api --region us-central1

# View Firebase projects
firebase projects:list

# View deployment history
firebase hosting:channel:list
```

---

## Cost Monitoring

### Free Tier Limits

- **Cloud Run:** 2 million requests/month
- **Firestore:** 50K reads, 20K writes/day
- **Cloud Storage:** 5GB storage
- **Firebase Hosting:** 10GB storage, 360MB/day transfer

### Monitor Usage

```powershell
# View billing
gcloud billing accounts list

# View current month usage
gcloud alpha billing accounts get-iam-policy BILLING_ACCOUNT_ID
```

Or visit: <https://console.cloud.google.com/billing>

---

## Security Checklist

- [ ] Admin credentials saved securely
- [ ] `ADMIN_CREDENTIALS.txt` deleted after saving
- [ ] `github-sa-key.json` not committed to git
- [ ] Production secrets updated (not using TESTING-MODE)
- [ ] CORS origins configured correctly
- [ ] Rate limiting enabled
- [ ] Firestore security rules configured

---

## Next Steps

1. ✅ Deploy to GCP
2. ✅ Create admin user
3. ✅ Test platform functionality
4. ✅ Upload sample content
5. ✅ Create test quizzes
6. ✅ Test user flows
7. ⏳ Get Paystack keys
8. ⏳ Enable payment features
9. ⏳ Set up custom domain
10. ⏳ Configure production security rules

---

## Support

- **GCP Console:** <https://console.cloud.google.com>
- **Firebase Console:** <https://console.firebase.google.com>
- **Documentation:** `docs/github-actions-guide.md`

---

## Quick Reference

| Resource | URL/Command |
|----------|-------------|
| Frontend | <https://caps360.web.app> |
| Backend API | Check DEPLOYMENT.md |
| GCP Console | <https://console.cloud.google.com/run?project=caps360> |
| Firebase Console | <https://console.firebase.google.com/project/caps360> |
| Logs | `gcloud run logs read caps360-api --region us-central1` |
| Secrets | `gcloud secrets list` |

---

**Ready to deploy?** Run: `.\scripts\deploy-gcp.ps1`
