# Azure DevOps Setup Checklist

Use this checklist to ensure you've completed all necessary steps to set up Azure Pipelines for the CAPS360 project.

---

## 📋 Pre-Setup Checklist

### Accounts and Access
- [ ] Azure account with active subscription
- [ ] Azure DevOps account ([dev.azure.com](https://dev.azure.com))
- [ ] GitHub repository access (AllanDzingo/caps360)
- [ ] Visual Studio 2022 installed (optional)
- [ ] Azure CLI installed and configured

### Knowledge Prerequisites
- [ ] Read `MIGRATION_SUMMARY.md` to understand what changed
- [ ] Review `docs/azure-devops-quickstart.md` for quick setup (5-10 min)
- [ ] Have `docs/azure-devops-setup-guide.md` ready for reference

---

## 🏗️ Azure DevOps Setup

### Step 1: Create Organization and Project
- [ ] Go to [dev.azure.com](https://dev.azure.com)
- [ ] Create new organization (e.g., `caps360-org`)
- [ ] Create new project: `CAPS360`
- [ ] Set visibility to **Private**
- [ ] Choose **Git** for version control
- [ ] Select **Agile** for work item process

### Step 2: Connect Repository
Choose one option:

**Option A: Import from GitHub**
- [ ] In Azure DevOps, go to **Repos**
- [ ] Click **Import repository**
- [ ] Select **GitHub** and authenticate
- [ ] Import `AllanDzingo/caps360` repository

**Option B: External GitHub Connection**
- [ ] Keep repository on GitHub
- [ ] Pipeline will connect directly during setup
- [ ] Will need to authorize Azure Pipelines

### Step 3: Create Pipeline
- [ ] Navigate to **Pipelines** → **Pipelines**
- [ ] Click **New pipeline**
- [ ] Select **GitHub** or **Azure Repos Git** (based on Step 2)
- [ ] Authenticate if needed
- [ ] Select the `caps360` repository
- [ ] Choose **Existing Azure Pipelines YAML file**
- [ ] Select branch: `main` or `master`
- [ ] Path: `/azure-pipelines.yml`
- [ ] Click **Continue**
- [ ] Review configuration
- [ ] Click **Save** (don't run yet)

---

## ☁️ Azure Resources Setup

### Option A: Use Existing Resources
If you already have Azure resources deployed:

- [ ] Note your Azure App Service name: `_______________________`
- [ ] Note your Static Web App name: `_______________________`
- [ ] Note your resource group: `_______________________`
- [ ] Get Static Web Apps deployment token (see Step 4B)
- [ ] Skip to **Service Connection Setup**

### Option B: Create New Resources
Use Azure CLI to create resources:

#### Create Resource Group
```bash
az login
az group create --name caps360-prod --location eastus
```
- [ ] Resource group created
- [ ] Name: `_______________________`

#### Create App Service Plan
```bash
az appservice plan create \
  --name caps360-plan \
  --resource-group caps360-prod \
  --sku B2 \
  --is-linux
```
- [ ] App Service Plan created
- [ ] SKU: B2 (or higher for production)

#### Create Backend App Service
```bash
az webapp create \
  --name caps360-backend-prod \
  --resource-group caps360-prod \
  --plan caps360-plan \
  --runtime "NODE:20-lts"
```
- [ ] Backend App Service created
- [ ] Name: `_______________________`
- [ ] URL: `https://_________________.azurewebsites.net`

#### Create Frontend Static Web App
```bash
az staticwebapp create \
  --name caps360-web-prod \
  --resource-group caps360-prod \
  --location eastus2
```
- [ ] Static Web App created
- [ ] Name: `_______________________`
- [ ] URL: `https://_________________.azurestaticapps.net`

#### Get Static Web Apps Deployment Token
```bash
az staticwebapp secrets list \
  --name caps360-web-prod \
  --resource-group caps360-prod \
  --query "properties.apiKey" -o tsv
```
- [ ] Deployment token obtained
- [ ] Saved securely: `_______________________`

---

## 🔗 Service Connection Setup

### Create Azure Resource Manager Service Connection
- [ ] In Azure DevOps, go to **Project Settings** (bottom left)
- [ ] Under **Pipelines**, select **Service connections**
- [ ] Click **New service connection**
- [ ] Select **Azure Resource Manager**
- [ ] Click **Next**
- [ ] Choose **Service principal (automatic)**
- [ ] Fill in:
  - [ ] Scope level: **Subscription**
  - [ ] Subscription: Select your Azure subscription
  - [ ] Resource group: `caps360-prod` (or your resource group)
  - [ ] Service connection name: `AZURE_SUBSCRIPTION_SERVICE_CONNECTION`
  - [ ] Grant access to all pipelines: ✓ Checked
- [ ] Click **Save**
- [ ] Verify connection shows as "Ready"

---

## 🔐 Pipeline Variables Setup

### Option A: Variable Group (Recommended)
- [ ] Go to **Pipelines** → **Library**
- [ ] Click **+ Variable group**
- [ ] Name: `azure-deployment-vars`
- [ ] Add variables:

| Variable Name | Value | Secret? | My Value |
|--------------|-------|---------|----------|
| `AZURE_SUBSCRIPTION_SERVICE_CONNECTION` | (service connection name) | No | `___________` |
| `AZURE_BACKEND_APP_NAME` | (backend app name) | No | `___________` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | (deployment token) | **Yes** | `___________` |

- [ ] Click **Save**
- [ ] Link to pipeline:
  - [ ] Go to **Pipelines** → Select pipeline → **Edit**
  - [ ] Click **Variables** → **Variable groups**
  - [ ] Link `azure-deployment-vars`
  - [ ] Click **Save**

### Option B: Pipeline Variables
- [ ] Go to **Pipelines** → Select pipeline → **Edit**
- [ ] Click **Variables** (top right)
- [ ] Add each variable individually
- [ ] Check **Keep this value secret** for sensitive data

---

## 🌍 Environment Setup

- [ ] Go to **Pipelines** → **Environments**
- [ ] Click **New environment**
- [ ] Name: `production`
- [ ] Description: `Production deployment environment`
- [ ] Resource: **None** (for now)
- [ ] Click **Create**
- [ ] Optional: Add approval checks
  - [ ] Click on environment
  - [ ] Click **⋮** (more options) → **Approvals and checks**
  - [ ] Add required approvers

---

## 🚀 First Deployment

### Configure Backend Environment Variables
Set these in Azure App Service:

```bash
az webapp config appsettings set \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    SUPABASE_URL="your-supabase-url" \
    SUPABASE_ANON_KEY="your-key" \
    GEMINI_API_KEY="your-key" \
    JWT_SECRET="your-secret" \
    PAYSTACK_SECRET_KEY="your-key"
```

- [ ] Backend environment variables configured
- [ ] Verify in Azure Portal

### Run Pipeline
- [ ] Go to **Pipelines** → Select pipeline
- [ ] Click **Run pipeline**
- [ ] Select branch: `main` or `master`
- [ ] Click **Run**
- [ ] Monitor build progress

### Build Stage
- [ ] Backend build successful
- [ ] Frontend build successful
- [ ] Artifacts published

### Deploy Stage
- [ ] Backend deployed to Azure App Service
- [ ] Frontend deployed to Azure Static Web Apps
- [ ] Health check passed

### Verify Deployment
```bash
# Test backend
curl https://caps360-backend-prod.azurewebsites.net/health

# Test frontend
curl https://caps360-web-prod.azurestaticapps.net/
```

- [ ] Backend responding correctly
- [ ] Frontend loading correctly
- [ ] URLs accessible:
  - [ ] Backend: `https://___________________.azurewebsites.net`
  - [ ] Frontend: `https://___________________.azurestaticapps.net`

---

## 💻 Visual Studio Integration (Optional)

- [ ] Install Visual Studio 2022
- [ ] Install **Azure development** workload
- [ ] Open Visual Studio
- [ ] Go to **View** → **Team Explorer**
- [ ] Click **Connect**
- [ ] Select **Manage Connections** → **Connect to a Project**
- [ ] Sign in to Azure DevOps
- [ ] Select organization and project
- [ ] Click **Connect**
- [ ] Clone repository if needed
- [ ] View pipelines from **View** → **Other Windows** → **Azure DevOps**

---

## 🔍 Post-Deployment Verification

### Functional Testing
- [ ] Test user registration/login
- [ ] Test AI features
- [ ] Test payment integration
- [ ] Test file uploads
- [ ] Test API endpoints

### Performance Testing
- [ ] Check response times
- [ ] Verify load handling
- [ ] Monitor Application Insights (if configured)

### Security Testing
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Authentication working
- [ ] API authorization working

---

## 📊 Monitoring Setup (Recommended)

### Application Insights
- [ ] Create Application Insights resource
- [ ] Configure in backend application
- [ ] Set up alerts for errors
- [ ] Create performance dashboard

### Logging
- [ ] Enable App Service logs
- [ ] Configure log retention
- [ ] Set up log streaming

### Alerts
- [ ] Pipeline failure alerts
- [ ] Application error alerts
- [ ] Performance degradation alerts
- [ ] Cost threshold alerts

---

## 📚 Documentation Review

- [ ] Read `MIGRATION_SUMMARY.md` - Overall changes
- [ ] Read `docs/azure-devops-quickstart.md` - Quick setup guide
- [ ] Read `docs/azure-devops-setup-guide.md` - Detailed guide
- [ ] Bookmark `docs/azure-quick-reference.md` - Common commands
- [ ] Review `azure-pipelines.yml` - Pipeline configuration
- [ ] Read `.github/workflows/README.md` - Why workflows disabled

---

## 🎯 Next Steps (Optional Enhancements)

### Multiple Environments
- [ ] Create dev environment
- [ ] Create staging environment
- [ ] Configure environment-specific variables
- [ ] Set up approval gates

### Advanced Pipeline Features
- [ ] Add code coverage reporting
- [ ] Configure automated tests
- [ ] Set up integration tests
- [ ] Add security scanning

### Azure Services Integration
- [ ] Set up Azure Key Vault for secrets
- [ ] Configure Azure CDN
- [ ] Set up Azure Front Door
- [ ] Enable auto-scaling

### Development Workflow
- [ ] Configure branch policies
- [ ] Require pull request reviews
- [ ] Require pipeline success before merge
- [ ] Set up automatic PR builds

---

## ✅ Completion Checklist

### Essential Setup Complete
- [ ] Azure DevOps organization and project created
- [ ] Repository connected
- [ ] Pipeline configured
- [ ] Service connection working
- [ ] Variables configured
- [ ] Environment created
- [ ] First deployment successful
- [ ] Applications accessible and working

### Documentation Complete
- [ ] Team notified of changes
- [ ] Documentation reviewed
- [ ] Deployment process documented
- [ ] Rollback procedure understood

### Ready for Production
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Monitoring in place
- [ ] Team trained on new process

---

## 📝 Notes and Issues

Use this space to track any issues or notes during setup:

```
Issue 1: ___________________________________________________________
Resolution: _________________________________________________________

Issue 2: ___________________________________________________________
Resolution: _________________________________________________________

Issue 3: ___________________________________________________________
Resolution: _________________________________________________________
```

---

## 🆘 Need Help?

If you encounter issues:

1. **Check Documentation**
   - `docs/azure-devops-setup-guide.md` - Troubleshooting section
   - `docs/azure-devops-quickstart.md` - Common issues

2. **Check Pipeline Logs**
   - Click on failed stage in Azure DevOps
   - Review error messages
   - Check for configuration issues

3. **Check Azure Resources**
   - Verify resources exist in Azure Portal
   - Check resource logs
   - Verify network settings

4. **Get Support**
   - Azure DevOps Community
   - Azure Support
   - Email: <support@caps360.co.za>

---

**Checklist Version**: 1.0  
**Last Updated**: January 2025  
**Estimated Time**: 30-60 minutes (first time)
