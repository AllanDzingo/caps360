# 🎓 CAPS360 - Azure Deployment Solution

## 🚀 Complete Azure Deployment Scripts

This directory contains production-ready PowerShell scripts to deploy the entire CAPS360 educational platform to Microsoft Azure.

---

## 📦 What's Included

### Deployment Scripts
- **`deploy-master.ps1`** - Master orchestration (deploys everything)
- **`deploy-database.ps1`** - PostgreSQL database setup
- **`deploy-backend.ps1`** - Backend API deployment
- **`deploy-frontend.ps1`** - Frontend React app deployment
- **`deploy-functions.ps1`** - Azure Functions for serverless tasks
- **`configure-payments.ps1`** - Payment integration setup
- **`test-deployment.ps1`** - End-to-end testing (15 tests)

### Configuration
- **`deployment-secrets-template.ps1`** - Template for organizing secrets

### Documentation
- **`../DEPLOYMENT-SUMMARY.md`** - Overview of all scripts
- **`../DEPLOYMENT-QUICKSTART.md`** - 5-minute quick start
- **`../docs/COMPLETE-DEPLOYMENT-GUIDE.md`** - Full deployment guide (50+ pages)

---

## ⚡ Quick Start

### 1. Prerequisites
```powershell
# Install Azure CLI
winget install Microsoft.AzureCLI

# Login
az login
az account set --subscription <your-subscription-id>

# Verify tools
az --version
node --version  # Need 20+
psql --version
```

### 2. Prepare Secrets
```powershell
# Copy template
Copy-Item deployment-secrets-template.ps1 deployment-secrets.ps1

# Edit with your values
notepad deployment-secrets.ps1

# Generate JWT secret (64 characters)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
```

### 3. Deploy
```powershell
# Option A: Load from secrets file
. .\deployment-secrets.ps1
# Then run the deployment command in that file

# Option B: Direct command
.\deploy-master.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -JwtSecret "your-64-char-secret" `
  -GeminiApiKey "your-gemini-key"
```

### 4. Test
```powershell
.\test-deployment.ps1 `
  -Environment prod `
  -BackendUrl "https://caps360-backend-prod.azurewebsites.net" `
  -FrontendUrl "https://caps360-web-prod.azurestaticapps.net"
```

**Total Time: ~20 minutes**

---

## 📋 Script Details

### deploy-master.ps1
**Master orchestration script - Use this for first deployment**

**What it does:**
1. Deploys PostgreSQL database + schema
2. Deploys backend API to App Service
3. Deploys frontend to Static Web Apps
4. Deploys Azure Functions
5. Configures payment webhooks
6. Runs end-to-end tests
7. Provides deployment summary

**Usage:**
```powershell
.\deploy-master.ps1 `
  -Environment <dev|staging|prod> `
  -ResourceGroup <name> `
  -JwtSecret <secret> `
  -GeminiApiKey <key>
```

**Runtime:** 15-20 minutes

---

### deploy-database.ps1
**Database deployment only**

**What it does:**
1. Creates PostgreSQL Flexible Server
2. Configures firewall rules
3. Creates database
4. Applies schema (15+ tables)
5. Creates admin user
6. Verifies connectivity

**Usage:**
```powershell
.\deploy-database.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod
```

**Output:** Connection string (save this!)

**Runtime:** 5-7 minutes

---

### deploy-backend.ps1
**Backend API deployment only**

**What it does:**
1. Builds TypeScript backend
2. Creates App Service Plan + Web App
3. Configures environment variables
4. Enables Application Insights
5. Deploys code
6. Configures CORS and health checks

**Usage:**
```powershell
.\deploy-backend.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -DatabaseConnectionString "postgresql://..." `
  -JwtSecret "..." `
  -GeminiApiKey "..."
```

**Runtime:** 4-6 minutes

---

### deploy-frontend.ps1
**Frontend deployment only**

**What it does:**
1. Creates .env file with backend URL
2. Builds React/Vite app
3. Creates Static Web App
4. Deploys build
5. Configures routing and security

**Usage:**
```powershell
.\deploy-frontend.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -BackendUrl "https://caps360-backend-prod.azurewebsites.net"
```

**Runtime:** 3-5 minutes

---

### deploy-functions.ps1
**Azure Functions deployment only**

**What it does:**
1. Builds functions
2. Creates Storage Account
3. Creates Function App
4. Deploys functions
5. Configures Application Insights

**Functions deployed:**
- welcomeEmail
- weeklySummary
- inactivityReminder
- forgotPassword

**Usage:**
```powershell
.\deploy-functions.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -DatabaseConnectionString "postgresql://..."
```

**Runtime:** 3-4 minutes

---

### configure-payments.ps1
**Payment integration setup**

**What it does:**
1. Tests webhook endpoints
2. Updates backend settings
3. Provides webhook URLs
4. Shows configuration instructions

**Usage:**
```powershell
.\configure-payments.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -BackendUrl "https://..." `
  -PaystackSecretKey "..." `
  -PayfastMerchantId "..."
```

**Runtime:** 2 minutes

---

### test-deployment.ps1
**End-to-end testing**

**What it does:**
15 comprehensive tests:
1. Backend health
2. Frontend accessibility
3. CORS configuration
4. User registration
5. User login
6. Protected endpoints
7. AI chat
8. Content retrieval
9. Quiz generation
10. Payment initialization
11. Database connectivity
12. Error handling
13. Rate limiting
14. SSL/TLS
15. Security headers

**Usage:**
```powershell
.\test-deployment.ps1 `
  -Environment prod `
  -BackendUrl "https://..." `
  -FrontendUrl "https://..."
```

**Runtime:** 2-3 minutes

---

## 🎯 Deployment Scenarios

### Scenario 1: First Time Deployment
```powershell
# Use master script
.\deploy-master.ps1 -Environment prod -ResourceGroup caps360-prod -JwtSecret "..." -GeminiApiKey "..."
```

### Scenario 2: Update Backend Only
```powershell
# Backend code changes
.\deploy-backend.ps1 -Environment prod -ResourceGroup caps360-prod -DatabaseConnectionString "..." -JwtSecret "..." -GeminiApiKey "..." -SkipBuild $false
```

### Scenario 3: Update Frontend Only
```powershell
# Frontend code changes
.\deploy-frontend.ps1 -Environment prod -ResourceGroup caps360-prod -BackendUrl "https://..." -SkipBuild $false
```

### Scenario 4: Database Schema Changes
```powershell
# 1. Update backend/src/db/schema.sql
# 2. Redeploy database (will create new tables)
.\deploy-database.ps1 -Environment prod -ResourceGroup caps360-prod
```

### Scenario 5: Add New Environment Variable
```powershell
# Update backend
az webapp config appsettings set `
  --name caps360-backend-prod `
  --resource-group caps360-prod `
  --settings "NEW_VAR=value"

# Restart
az webapp restart --name caps360-backend-prod --resource-group caps360-prod
```

---

## 🔐 Required Secrets

| Secret | Required | Purpose | How to Get |
|--------|----------|---------|------------|
| JWT_SECRET | ✅ Yes | Auth tokens | Generate: 64 random chars |
| GEMINI_API_KEY | ✅ Yes* | AI chat | https://makersuite.google.com/app/apikey |
| OPENAI_API_KEY | ✅ Yes* | AI chat | https://platform.openai.com/api-keys |
| PAYSTACK_SECRET_KEY | ⭕ Optional | Subscriptions | https://dashboard.paystack.com |
| PAYFAST_MERCHANT_ID | ⭕ Optional | Payments | https://www.payfast.co.za |

*Choose either Gemini or OpenAI

---

## 💰 Cost Estimate

**Monthly (South Africa North):**
- PostgreSQL Flexible Server: ~R600
- App Service (B1): ~R600
- Static Web Apps: R0 (Free tier)
- Azure Functions: ~R200
- Storage: ~R50
- Application Insights: ~R300

**Total: ~R1,750/month**

---

## 📊 What Gets Deployed

```
Azure Resource Group: caps360-prod
│
├── PostgreSQL Server
│   └── Database: caps360
│       ├── users (with roles, subscriptions)
│       ├── courses, topics, lessons
│       ├── quizzes, quiz_attempts
│       ├── subscriptions, payments
│       ├── ai_conversations
│       └── 10+ more tables
│
├── App Service
│   └── Backend API (Node.js 20)
│       ├── /health
│       ├── /api/auth/*
│       ├── /api/ai/*
│       ├── /api/payments/*
│       └── /api/content/*
│
├── Static Web App
│   └── Frontend (React/Vite)
│       └── Connected to backend
│
├── Function App
│   ├── welcomeEmail
│   ├── weeklySummary
│   ├── inactivityReminder
│   └── forgotPassword
│
└── Application Insights
    └── Monitoring & Logs
```

---

## ✅ Success Checklist

After deployment, verify:
- [ ] All tests pass (15/15)
- [ ] Can access frontend URL
- [ ] Can register new user
- [ ] Can login successfully
- [ ] AI chat responds
- [ ] Health endpoint returns "healthy"
- [ ] No errors in Application Insights
- [ ] Payment webhooks configured (if using payments)

---

## 🛠️ Common Commands

### View Logs
```powershell
# Backend
az webapp log tail --name caps360-backend-prod --resource-group caps360-prod

# Functions
az functionapp log tail --name caps360-functions-prod --resource-group caps360-prod
```

### Restart Services
```powershell
# Backend
az webapp restart --name caps360-backend-prod --resource-group caps360-prod

# Functions
az functionapp restart --name caps360-functions-prod --resource-group caps360-prod
```

### Update Environment Variables
```powershell
az webapp config appsettings set `
  --name caps360-backend-prod `
  --resource-group caps360-prod `
  --settings "VAR_NAME=value"
```

### Check Deployment Status
```powershell
# Backend status
az webapp show --name caps360-backend-prod --resource-group caps360-prod --query "state"

# Functions status
az functionapp show --name caps360-functions-prod --resource-group caps360-prod --query "state"
```

---

## 🐛 Troubleshooting

### Database Issues
```powershell
# Check firewall rules
az postgres flexible-server firewall-rule list --resource-group caps360-prod --name caps360-db-prod

# Add your IP
az postgres flexible-server firewall-rule create --resource-group caps360-prod --name caps360-db-prod --rule-name MyIP --start-ip-address <ip> --end-ip-address <ip>
```

### Backend Issues
```powershell
# View logs
az webapp log tail --name caps360-backend-prod --resource-group caps360-prod

# Check environment variables
az webapp config appsettings list --name caps360-backend-prod --resource-group caps360-prod

# Restart
az webapp restart --name caps360-backend-prod --resource-group caps360-prod
```

### Frontend Issues
- Check browser console
- Verify environment variables at `/env.js`
- Check backend CORS settings
- Verify frontend can reach backend

---

## 📚 Documentation

1. **Quick Start** → `../DEPLOYMENT-QUICKSTART.md`
2. **Full Guide** → `../docs/COMPLETE-DEPLOYMENT-GUIDE.md`
3. **Summary** → `../DEPLOYMENT-SUMMARY.md`

---

## 🎉 Ready to Deploy?

```powershell
# 1. Prepare secrets
Copy-Item deployment-secrets-template.ps1 deployment-secrets.ps1
notepad deployment-secrets.ps1

# 2. Deploy
. .\deployment-secrets.ps1
# Run deployment command from secrets file

# 3. Test
.\test-deployment.ps1 -Environment prod -BackendUrl "..." -FrontendUrl "..."

# 4. Access
Start-Process "https://caps360-web-prod.azurestaticapps.net"
```

---

**Need help?** Read the full guide: `../docs/COMPLETE-DEPLOYMENT-GUIDE.md`

**Quick reference?** See: `../DEPLOYMENT-QUICKSTART.md`

**All done?** Your CAPS360 platform is live! 🚀
