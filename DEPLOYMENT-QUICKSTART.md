# 🚀 CAPS360 Azure Deployment - Quick Start

## ⚡ 5-Minute Deployment

### 1. Prerequisites
```powershell
# Login to Azure
az login

# Verify tools
az --version
node --version  # Need 20+
psql --version
```

### 2. Prepare Environment Variables

Create a file `deployment-vars.ps1`:
```powershell
$ENV:JWT_SECRET = "<64-char-random-string>"
$ENV:GEMINI_API_KEY = "<your-gemini-key>"
$ENV:PAYSTACK_SECRET_KEY = "<your-paystack-key>"
$ENV:PAYFAST_MERCHANT_ID = "<your-payfast-id>"
$ENV:PAYFAST_MERCHANT_KEY = "<your-payfast-key>"
```

### 3. Deploy Everything
```powershell
# Load variables
. .\deployment-vars.ps1

# Run master deployment
cd scripts
.\deploy-master.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -JwtSecret $ENV:JWT_SECRET `
  -GeminiApiKey $ENV:GEMINI_API_KEY `
  -PaystackSecretKey $ENV:PAYSTACK_SECRET_KEY `
  -PayfastMerchantId $ENV:PAYFAST_MERCHANT_ID `
  -PayfastMerchantKey $ENV:PAYFAST_MERCHANT_KEY
```

### 4. Test Deployment
```powershell
.\test-deployment.ps1 `
  -Environment prod `
  -BackendUrl "https://caps360-backend-prod.azurewebsites.net" `
  -FrontendUrl "https://caps360-web-prod.azurestaticapps.net"
```

### 5. Access Your Application
- **Frontend:** https://caps360-web-prod.azurestaticapps.net
- **Backend API:** https://caps360-backend-prod.azurewebsites.net
- **Health Check:** https://caps360-backend-prod.azurewebsites.net/health

---

## 📦 Individual Component Deployment

### Database Only
```powershell
.\deploy-database.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod
```

### Backend Only
```powershell
.\deploy-backend.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -DatabaseConnectionString "postgresql://..." `
  -JwtSecret "your-secret" `
  -GeminiApiKey "your-key"
```

### Frontend Only
```powershell
.\deploy-frontend.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -BackendUrl "https://caps360-backend-prod.azurewebsites.net"
```

### Functions Only
```powershell
.\deploy-functions.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -DatabaseConnectionString "postgresql://..."
```

### Payment Config Only
```powershell
.\configure-payments.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -BackendUrl "https://caps360-backend-prod.azurewebsites.net" `
  -PaystackSecretKey "your-key"
```

---

## 🔍 Common Commands

### View Logs
```powershell
# Backend logs
az webapp log tail --name caps360-backend-prod --resource-group caps360-prod

# Functions logs
az functionapp log tail --name caps360-functions-prod --resource-group caps360-prod
```

### Restart Services
```powershell
# Restart backend
az webapp restart --name caps360-backend-prod --resource-group caps360-prod

# Restart functions
az functionapp restart --name caps360-functions-prod --resource-group caps360-prod
```

### Check Status
```powershell
# Backend health
curl https://caps360-backend-prod.azurewebsites.net/health

# Frontend
curl https://caps360-web-prod.azurestaticapps.net
```

### Update Environment Variables
```powershell
# Update backend setting
az webapp config appsettings set `
  --name caps360-backend-prod `
  --resource-group caps360-prod `
  --settings "NEW_VAR=value"

# Update functions setting
az functionapp config appsettings set `
  --name caps360-functions-prod `
  --resource-group caps360-prod `
  --settings "NEW_VAR=value"
```

---

## 🛠️ Quick Troubleshooting

### Issue: Database connection failed
```powershell
# Check firewall rules
az postgres flexible-server firewall-rule list `
  --resource-group caps360-prod `
  --name caps360-db-prod

# Add your IP
az postgres flexible-server firewall-rule create `
  --resource-group caps360-prod `
  --name caps360-db-prod `
  --rule-name MyIP `
  --start-ip-address <your-ip> `
  --end-ip-address <your-ip>
```

### Issue: Backend not responding
```powershell
# Check logs for errors
az webapp log tail --name caps360-backend-prod --resource-group caps360-prod

# Restart
az webapp restart --name caps360-backend-prod --resource-group caps360-prod
```

### Issue: Frontend shows blank page
1. Check browser console for errors
2. Verify backend URL in environment variables
3. Check CORS settings on backend

### Issue: AI chat not working
```powershell
# Verify API key is set
az webapp config appsettings list `
  --name caps360-backend-prod `
  --resource-group caps360-prod `
  --query "[?name=='GEMINI_API_KEY']"
```

---

## 📋 Deployment Checklist

- [ ] Azure CLI authenticated
- [ ] All secrets/API keys ready
- [ ] Database deployed & verified
- [ ] Backend deployed & healthy
- [ ] Frontend deployed & accessible
- [ ] Functions deployed (optional)
- [ ] Payments configured (optional)
- [ ] Tests passing
- [ ] Can login to application
- [ ] AI chat working
- [ ] Application Insights configured

---

## 🔐 Required Secrets

| Secret | Required | How to Get |
|--------|----------|------------|
| JWT_SECRET | ✅ Yes | Generate: `-join ((65..90) + (97..122) + (48..57) \| Get-Random -Count 64 \| ForEach-Object { [char]$_ })` |
| GEMINI_API_KEY | ✅ Yes (or OpenAI) | https://makersuite.google.com/app/apikey |
| OPENAI_API_KEY | ✅ Yes (or Gemini) | https://platform.openai.com/api-keys |
| PAYSTACK_SECRET_KEY | Optional | https://dashboard.paystack.com |
| PAYFAST_MERCHANT_ID | Optional | https://www.payfast.co.za |
| PAYFAST_MERCHANT_KEY | Optional | https://www.payfast.co.za |

---

## 💰 Estimated Costs

**Monthly (South Africa North region):**
- PostgreSQL: ~R600
- App Service: ~R600
- Static Web Apps: R0 (Free)
- Functions: ~R200
- Storage: ~R50
- Application Insights: ~R300
- **Total: ~R1,750/month**

---

## 📞 Need Help?

1. **Check logs** first (see commands above)
2. **Run test script** to identify issues
3. **Review full guide:** `docs/COMPLETE-DEPLOYMENT-GUIDE.md`
4. **Common issues:** See troubleshooting section above

---

## 🎯 What Gets Deployed

```
Azure Resource Group: caps360-prod
├── PostgreSQL Server (caps360-db-prod)
│   └── Database: caps360 (15+ tables)
├── App Service Plan (caps360-plan-prod)
│   └── Backend API (caps360-backend-prod)
│       └── Node.js 20, Express
├── Static Web App (caps360-web-prod)
│   └── React/Vite frontend
├── Function App (caps360-functions-prod)
│   ├── welcomeEmail
│   ├── weeklySummary
│   ├── inactivityReminder
│   └── forgotPassword
├── Storage Account (caps360funcprod)
│   └── Function storage
└── Application Insights (caps360-insights-prod)
    └── Monitoring & logs
```

---

## 🚦 Deployment Order

**Correct deployment order (automated by master script):**

1. **Database** - Must be first (other components need connection string)
2. **Backend** - Depends on database
3. **Frontend** - Depends on backend URL
4. **Functions** - Depends on database
5. **Payments** - Depends on backend
6. **Tests** - Validates everything

**Never skip the database!** All other components require it.

---

## ✅ Success Criteria

Your deployment is successful when:
- ✅ All tests pass (15/15)
- ✅ Can register new user
- ✅ Can login successfully
- ✅ AI chat responds
- ✅ Payment initialization works
- ✅ Health endpoint returns "healthy"
- ✅ Frontend loads without errors
- ✅ No errors in Application Insights

---

**Time to Deploy:** 15-20 minutes (automated)  
**Last Updated:** January 15, 2026
