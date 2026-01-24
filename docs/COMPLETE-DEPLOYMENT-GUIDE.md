# CAPS360 Complete Azure Deployment Guide

## 🎯 Overview

This comprehensive guide will help you deploy the CAPS360 educational platform to Azure with all components working together seamlessly.

**What gets deployed:**
- ✅ Azure PostgreSQL Database with all tables
- ✅ Backend API (Node.js/Express) on Azure App Service
- ✅ Frontend (React/Vite) on Azure Static Web Apps
- ✅ Azure Functions for serverless tasks (emails, notifications)
- ✅ Payment integrations (Paystack & PayFast)
- ✅ AI Chat service (OpenAI/Gemini)
- ✅ Authentication system
- ✅ Application Insights monitoring

---

## 📋 Prerequisites

### Required Tools

1. **Azure CLI** (latest version)
   ```powershell
   # Install on Windows
   winget install Microsoft.AzureCLI
   
   # Verify installation
   az --version
   ```

2. **Node.js 20+** and **npm**
   ```powershell
   # Download from: https://nodejs.org/
   node --version  # Should be 20.x or higher
   npm --version
   ```

3. **PostgreSQL Client (psql)**
   ```powershell
   # Download from: https://www.postgresql.org/download/
   psql --version
   ```

4. **Git** (for version control)
   ```powershell
   git --version
   ```

### Azure Account Setup

1. **Active Azure Subscription**
   - Sign up at https://azure.microsoft.com/free/
   - Note your subscription ID

2. **Sufficient Permissions**
   - Contributor or Owner role on subscription
   - Ability to create resources

3. **Login to Azure**
   ```powershell
   az login
   # Select your subscription
   az account set --subscription <subscription-id>
   ```

### Required Secrets & API Keys

Gather these before starting deployment:

| Service | Required | Purpose |
|---------|----------|---------|
| JWT_SECRET | ✅ Yes | Authentication token encryption |
| GEMINI_API_KEY or OPENAI_API_KEY | ✅ Yes | AI chat functionality |
| PAYSTACK_SECRET_KEY | Optional | Recurring subscriptions |
| PAYFAST_MERCHANT_ID | Optional | One-time payments |
| PAYFAST_MERCHANT_KEY | Optional | One-time payments |
| SUPABASE_URL | Optional | Legacy auth (being phased out) |
| SUPABASE_ANON_KEY | Optional | Legacy auth |

**Generate JWT Secret:**
```powershell
# Generate a secure 64-character secret
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
```

---

## 🚀 Quick Start (Automated Deployment)

### Option 1: Master Script (Recommended)

Deploy everything in one command:

```powershell
cd scripts

.\deploy-master.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -JwtSecret "your-64-char-secret" `
  -GeminiApiKey "your-gemini-key" `
  -PaystackSecretKey "your-paystack-key" `
  -PayfastMerchantId "your-payfast-id" `
  -PayfastMerchantKey "your-payfast-key"
```

**Parameters:**
- `Environment`: dev, staging, or prod
- `ResourceGroup`: Azure resource group name (will be created if doesn't exist)
- `Location`: Azure region (default: southafricanorth)
- `JwtSecret`: **Required** - Your JWT secret
- `GeminiApiKey` or `OpenAIApiKey`: **Required** - AI service key
- Other parameters: See script for full list

The master script will:
1. ✅ Deploy PostgreSQL database
2. ✅ Create all database tables
3. ✅ Deploy backend API
4. ✅ Deploy frontend application
5. ✅ Deploy Azure Functions
6. ✅ Configure payment integrations
7. ✅ Run end-to-end tests

**Duration:** Approximately 15-20 minutes

---

## 📝 Step-by-Step Manual Deployment

If you prefer more control or need to troubleshoot, follow these steps:

### Step 1: Database Deployment

**Create PostgreSQL database and tables:**

```powershell
cd scripts

.\deploy-database.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -Location southafricanorth
```

**What happens:**
- ✅ Creates Azure PostgreSQL Flexible Server
- ✅ Configures firewall rules
- ✅ Creates `caps360` database
- ✅ Applies schema from `backend/src/db/schema.sql`
- ✅ Creates admin user
- ✅ Verifies connectivity

**Save the output!** You'll need:
- Database connection string (DATABASE_URL)
- Admin username
- Admin password

**Example output:**
```
Connection String (save this for backend deployment):
postgresql://caps360admin:SecurePassword123@caps360-db-prod.postgres.database.azure.com:5432/caps360?sslmode=require
```

**Manual verification:**
```powershell
# Test connection
$env:PGPASSWORD = "your-db-password"
psql -h caps360-db-prod.postgres.database.azure.com -U caps360admin -d caps360 -c "\dt"
```

---

### Step 2: Backend API Deployment

**Deploy Node.js backend to Azure App Service:**

```powershell
.\deploy-backend.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -DatabaseConnectionString "postgresql://..." `
  -JwtSecret "your-jwt-secret" `
  -GeminiApiKey "your-gemini-key" `
  -PaystackSecretKey "your-paystack-key" `
  -PayfastMerchantId "your-payfast-id" `
  -PayfastMerchantKey "your-payfast-key"
```

**What happens:**
- ✅ Builds backend code
- ✅ Creates App Service Plan
- ✅ Creates Web App
- ✅ Configures environment variables
- ✅ Enables Application Insights
- ✅ Deploys code
- ✅ Configures health checks

**Backend URL:** `https://caps360-backend-prod.azurewebsites.net`

**Verify deployment:**
```powershell
# Test health endpoint
curl https://caps360-backend-prod.azurewebsites.net/health

# Expected response:
# {"status":"healthy","timestamp":"2026-01-15T..."}
```

**View logs:**
```powershell
az webapp log tail `
  --name caps360-backend-prod `
  --resource-group caps360-prod
```

---

### Step 3: Frontend Deployment

**Deploy React frontend to Azure Static Web Apps:**

```powershell
.\deploy-frontend.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -BackendUrl "https://caps360-backend-prod.azurewebsites.net" `
  -SupabaseUrl "your-supabase-url" `
  -SupabaseAnonKey "your-supabase-key"
```

**What happens:**
- ✅ Creates environment configuration
- ✅ Builds frontend bundle
- ✅ Creates Static Web App
- ✅ Deploys to Azure
- ✅ Configures routing and headers
- ✅ Updates backend CORS

**Frontend URL:** `https://caps360-web-prod.azurestaticapps.net`

**Verify deployment:**
```powershell
# Test frontend
curl https://caps360-web-prod.azurestaticapps.net

# Open in browser
Start-Process "https://caps360-web-prod.azurestaticapps.net"
```

---

### Step 4: Azure Functions Deployment

**Deploy serverless functions for emails and notifications:**

```powershell
.\deploy-functions.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -DatabaseConnectionString "postgresql://..." `
  -CommunicationServicesConnectionString "your-acs-connection" `
  -OpenAIApiKey "your-openai-key"
```

**What happens:**
- ✅ Builds function code
- ✅ Creates Storage Account
- ✅ Creates Function App
- ✅ Configures settings
- ✅ Deploys functions
- ✅ Links Application Insights

**Functions deployed:**
- `welcomeEmail` - Send welcome emails to new users
- `weeklySummary` - Send weekly progress summaries
- `inactivityReminder` - Send reminders to inactive users
- `forgotPassword` - Handle password reset emails

**View function logs:**
```powershell
az functionapp log tail `
  --name caps360-functions-prod `
  --resource-group caps360-prod
```

---

### Step 5: Payment Configuration

**Configure Paystack and PayFast webhooks:**

```powershell
.\configure-payments.ps1 `
  -Environment prod `
  -ResourceGroup caps360-prod `
  -BackendUrl "https://caps360-backend-prod.azurewebsites.net" `
  -PaystackSecretKey "your-paystack-key" `
  -PayfastMerchantId "your-payfast-id" `
  -PayfastMerchantKey "your-payfast-key" `
  -PayfastPassphrase "your-payfast-passphrase"
```

**What happens:**
- ✅ Validates webhook endpoints
- ✅ Tests payment endpoints
- ✅ Updates backend settings
- ✅ Provides configuration instructions

**Manual webhook configuration:**

**Paystack:**
1. Login to https://dashboard.paystack.com
2. Navigate to Settings > Webhooks
3. Add webhook URL: `https://caps360-backend-prod.azurewebsites.net/api/payments/paystack/webhook`
4. Select events:
   - subscription.create
   - subscription.disable
   - charge.success
   - invoice.payment_failed

**PayFast:**
1. Login to https://www.payfast.co.za
2. Navigate to Settings > Integration
3. Set ITN URL: `https://caps360-backend-prod.azurewebsites.net/api/payments/payfast/webhook`
4. Enable ITN for payment events

---

### Step 6: Testing & Verification

**Run comprehensive end-to-end tests:**

```powershell
.\test-deployment.ps1 `
  -Environment prod `
  -BackendUrl "https://caps360-backend-prod.azurewebsites.net" `
  -FrontendUrl "https://caps360-web-prod.azurestaticapps.net" `
  -Verbose $true
```

**Tests performed:**
1. ✅ Backend health check
2. ✅ Frontend accessibility
3. ✅ CORS configuration
4. ✅ User registration
5. ✅ User login
6. ✅ Protected endpoint access
7. ✅ AI chat functionality
8. ✅ Content retrieval
9. ✅ Quiz generation
10. ✅ Payment initialization
11. ✅ Database connectivity
12. ✅ Error handling
13. ✅ Rate limiting
14. ✅ SSL/TLS configuration
15. ✅ Security headers

**Expected output:**
```
========================================
           TEST RESULTS SUMMARY
========================================

Total Tests:   15
Passed:        15
Failed:        0
Skipped:       0

Success Rate:  100%

✓ All tests passed! Deployment is successful.
```

---

## 🔍 Post-Deployment Verification

### 1. Test User Flows

**Registration:**
```powershell
# Test user registration
$body = @{
    email = "test@example.com"
    password = "Test123!@#"
    first_name = "Test"
    last_name = "User"
    role = "student"
    grade = 10
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://caps360-backend-prod.azurewebsites.net/api/auth/register" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

**Login:**
```powershell
# Test login
$body = @{
    email = "test@example.com"
    password = "Test123!@#"
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "https://caps360-backend-prod.azurewebsites.net/api/auth/login" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"

# Save token for subsequent requests
$token = $response.token
```

**AI Chat:**
```powershell
# Test AI chat
$headers = @{ Authorization = "Bearer $token" }
$body = @{
    message = "Explain photosynthesis"
    conversation_id = $null
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://caps360-backend-prod.azurewebsites.net/api/ai/chat" `
  -Method Post `
  -Headers $headers `
  -Body $body `
  -ContentType "application/json"
```

---

### 2. Monitor Application Health

**Application Insights:**
```powershell
# Get insights resource
az monitor app-insights component show `
  --app caps360-insights-prod `
  --resource-group caps360-prod
```

**View metrics in Azure Portal:**
1. Navigate to Application Insights resource
2. Check:
   - Request rates
   - Response times
   - Failure rates
   - Dependencies
   - Exceptions

**Set up alerts:**
```powershell
# Create alert for high error rate
az monitor metrics alert create `
  --name "High Error Rate" `
  --resource-group caps360-prod `
  --scopes "/subscriptions/.../caps360-backend-prod" `
  --condition "count requests/failed > 10" `
  --window-size 5m `
  --evaluation-frequency 1m
```

---

### 3. Database Verification

**Check tables:**
```powershell
$env:PGPASSWORD = "your-db-password"
psql -h caps360-db-prod.postgres.database.azure.com -U caps360admin -d caps360

# List tables
\dt

# Check user count
SELECT COUNT(*) FROM users;

# Check subscriptions
SELECT COUNT(*) FROM subscriptions;

# Exit
\q
```

**Database backups:**
```powershell
# Enable automated backups (7 day retention)
az postgres flexible-server update `
  --resource-group caps360-prod `
  --name caps360-db-prod `
  --backup-retention 7
```

---

## 🛠️ Troubleshooting

### Database Connection Issues

**Problem:** Backend cannot connect to database

**Solution:**
1. Check firewall rules:
   ```powershell
   az postgres flexible-server firewall-rule list `
     --resource-group caps360-prod `
     --name caps360-db-prod
   ```

2. Add your IP if needed:
   ```powershell
   az postgres flexible-server firewall-rule create `
     --resource-group caps360-prod `
     --name caps360-db-prod `
     --rule-name MyIP `
     --start-ip-address <your-ip> `
     --end-ip-address <your-ip>
   ```

3. Verify connection string in backend settings:
   ```powershell
   az webapp config appsettings list `
     --name caps360-backend-prod `
     --resource-group caps360-prod `
     --query "[?name=='DATABASE_URL']"
   ```

---

### Backend Not Starting

**Problem:** Backend shows unhealthy status

**Solution:**
1. Check logs:
   ```powershell
   az webapp log tail `
     --name caps360-backend-prod `
     --resource-group caps360-prod
   ```

2. Verify environment variables:
   ```powershell
   az webapp config appsettings list `
     --name caps360-backend-prod `
     --resource-group caps360-prod
   ```

3. Restart app:
   ```powershell
   az webapp restart `
     --name caps360-backend-prod `
     --resource-group caps360-prod
   ```

---

### Frontend Not Loading

**Problem:** Frontend shows blank page or errors

**Solution:**
1. Check browser console for errors
2. Verify environment variables were injected:
   - Visit `https://caps360-web-prod.azurestaticapps.net/env.js`
3. Check API connectivity from frontend
4. Verify CORS settings on backend

---

### Payment Webhooks Not Working

**Problem:** Payments succeed but not recorded in database

**Solution:**
1. Test webhook endpoint:
   ```powershell
   Invoke-RestMethod `
     -Uri "https://caps360-backend-prod.azurewebsites.net/api/payments/paystack/webhook" `
     -Method Post `
     -Body '{"event":"test"}' `
     -ContentType "application/json"
   ```

2. Check webhook logs in Application Insights
3. Verify webhook URL is correct in payment provider dashboard
4. Check payment provider IP whitelist if applicable

---

### AI Chat Not Responding

**Problem:** AI chat returns errors

**Solution:**
1. Verify API key is configured:
   ```powershell
   az webapp config appsettings list `
     --name caps360-backend-prod `
     --resource-group caps360-prod `
     --query "[?name=='GEMINI_API_KEY' || name=='OPENAI_API_KEY']"
   ```

2. Check API quota/limits in AI provider dashboard
3. Test AI endpoint directly:
   ```powershell
   $headers = @{ Authorization = "Bearer <token>" }
   Invoke-RestMethod `
     -Uri "https://caps360-backend-prod.azurewebsites.net/api/ai/chat" `
     -Method Post `
     -Headers $headers `
     -Body '{"message":"test"}' `
     -ContentType "application/json"
   ```

---

## 🔐 Security Best Practices

### 1. Rotate Secrets Regularly

**JWT Secret:**
```powershell
# Generate new secret
$newSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

# Update in backend
az webapp config appsettings set `
  --name caps360-backend-prod `
  --resource-group caps360-prod `
  --settings "JWT_SECRET=$newSecret"
```

### 2. Enable Advanced Threat Protection

```powershell
# Enable for database
az postgres flexible-server update `
  --resource-group caps360-prod `
  --name caps360-db-prod `
  --enable-high-availability
```

### 3. Configure SSL/TLS

**Custom domain with SSL:**
```powershell
# Add custom domain to frontend
az staticwebapp hostname set `
  --name caps360-web-prod `
  --resource-group caps360-prod `
  --hostname www.caps360.co.za

# Add custom domain to backend
az webapp config hostname add `
  --webapp-name caps360-backend-prod `
  --resource-group caps360-prod `
  --hostname api.caps360.co.za

# Bind SSL certificate (managed certificate)
az webapp config ssl bind `
  --certificate-thumbprint auto `
  --ssl-type SNI `
  --name caps360-backend-prod `
  --resource-group caps360-prod
```

### 4. Implement Rate Limiting

Rate limiting is configured in backend code (`backend/src/middleware/rate-limit.middleware.ts`). Adjust limits as needed for production traffic.

### 5. Enable Audit Logging

```powershell
# Enable diagnostic logs for backend
az monitor diagnostic-settings create `
  --name BackendDiagnostics `
  --resource "/subscriptions/.../caps360-backend-prod" `
  --logs '[{"category":"AppServiceHTTPLogs","enabled":true}]' `
  --workspace caps360-logs
```

---

## 📊 Cost Optimization

### Estimated Monthly Costs (South Africa Region)

| Service | Tier | Estimated Cost (ZAR) |
|---------|------|---------------------|
| PostgreSQL Flexible Server | Burstable B2s | R500-800 |
| App Service Plan | B1 (Basic) | R500-700 |
| Static Web Apps | Free tier | R0 |
| Azure Functions | Consumption | R100-300 |
| Application Insights | Basic | R200-400 |
| Storage Account | Standard | R50-100 |
| **Total** | | **R1,350-2,300/month** |

### Cost Reduction Tips

1. **Use reserved instances** for App Service (save up to 30%)
2. **Scale down during off-hours** (evenings/weekends)
3. **Use consumption plan** for Functions
4. **Monitor usage** in Azure Cost Management
5. **Set spending alerts**

---

## 🔄 Rollback Procedure

If deployment fails or issues arise:

### 1. Database Rollback

```powershell
# Restore from backup
az postgres flexible-server restore `
  --resource-group caps360-prod `
  --name caps360-db-prod-restored `
  --source-server caps360-db-prod `
  --restore-time "2026-01-15T10:00:00Z"
```

### 2. Backend Rollback

```powershell
# Deploy previous version
az webapp deployment slot swap `
  --name caps360-backend-prod `
  --resource-group caps360-prod `
  --slot staging
```

### 3. Frontend Rollback

```powershell
# Redeploy previous build
swa deploy ./dist-backup `
  --deployment-token <token> `
  --env production
```

---

## 📞 Support & Resources

### Azure Resources
- [Azure Portal](https://portal.azure.com)
- [Azure CLI Documentation](https://docs.microsoft.com/cli/azure/)
- [Azure App Service Docs](https://docs.microsoft.com/azure/app-service/)
- [Azure Functions Docs](https://docs.microsoft.com/azure/azure-functions/)

### CAPS360 Documentation
- [Backend API Documentation](../backend/README.md)
- [Frontend Documentation](../frontend-web/README.md)
- [Database Schema](../backend/src/db/schema.sql)
- [Payment Flows](./payment-flows.md)

### Getting Help
- Check logs in Application Insights
- Review error messages carefully
- Test each component individually
- Use the provided test script for diagnostics

---

## ✅ Deployment Checklist

Print this checklist and check off each item:

### Pre-Deployment
- [ ] Azure CLI installed and authenticated
- [ ] Node.js 20+ and npm installed
- [ ] PostgreSQL client (psql) installed
- [ ] All API keys and secrets gathered
- [ ] Azure subscription has sufficient credits/budget
- [ ] Resource group name decided

### Database
- [ ] Database deployed successfully
- [ ] All tables created (15+ tables)
- [ ] Admin user created
- [ ] Connection string saved securely
- [ ] Database accessible from your IP

### Backend
- [ ] Backend built without errors
- [ ] App Service created
- [ ] Environment variables configured
- [ ] Health endpoint returns "healthy"
- [ ] Application Insights enabled
- [ ] CORS configured

### Frontend
- [ ] Frontend built successfully
- [ ] Static Web App created
- [ ] Environment variables injected
- [ ] Can access frontend URL
- [ ] Can login to application
- [ ] Backend API connectivity verified

### Azure Functions
- [ ] Functions built successfully
- [ ] Function App created
- [ ] All functions deployed
- [ ] Can trigger functions manually
- [ ] Database connectivity verified

### Payments
- [ ] Webhook URLs configured in Paystack
- [ ] Webhook URLs configured in PayFast
- [ ] Payment endpoints tested
- [ ] Test transaction successful

### Testing
- [ ] All automated tests pass
- [ ] Manual registration test works
- [ ] Manual login test works
- [ ] AI chat responds correctly
- [ ] Payment flow completes

### Production Ready
- [ ] Custom domain configured (optional)
- [ ] SSL certificate installed
- [ ] Monitoring alerts set up
- [ ] Backup strategy implemented
- [ ] Documentation updated
- [ ] Team trained on monitoring

---

## 🎉 Success!

If you've completed all steps, your CAPS360 platform is now live on Azure!

**Next steps:**
1. Monitor your application in the first 24 hours
2. Gather user feedback
3. Set up continuous deployment (CI/CD)
4. Plan for scaling as user base grows
5. Implement additional features

**Remember:**
- Monitor costs daily for the first week
- Review Application Insights regularly
- Keep secrets secure and rotate them periodically
- Test payment flows thoroughly before marketing
- Backup database regularly

---

**Deployment Date:** January 15, 2026  
**Version:** 1.0.0  
**Author:** CAPS360 DevOps Team
