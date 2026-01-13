# Quick Start: Azure DevOps & Visual Studio Deployment

This guide provides a quick 5-10 minute setup for deploying CAPS360 to Azure using Azure DevOps and Visual Studio.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Azure account with active subscription
- [ ] Azure DevOps account (free at [dev.azure.com](https://dev.azure.com))
- [ ] Azure resources created (App Service + Static Web App) OR use deployment scripts
- [ ] Visual Studio 2022 (optional, but recommended)
- [ ] Azure CLI installed and configured

## Option 1: Quick Setup (5 Minutes)

### Step 1: Login to Azure DevOps

```bash
# Open browser to Azure DevOps
https://dev.azure.com
```

1. Sign in with your Microsoft account
2. Create organization (if new): `caps360-org`
3. Create project: `CAPS360`

### Step 2: Connect Repository

1. In Azure DevOps project, go to **Repos**
2. Click **Import repository**
3. Select **GitHub** and authenticate
4. Import `AllanDzingo/caps360` repository

### Step 3: Create Pipeline

1. Go to **Pipelines** → **Pipelines**
2. Click **New pipeline**
3. Select **GitHub** (or **Azure Repos Git** if you imported)
4. Select the `caps360` repository
5. Choose **Existing Azure Pipelines YAML file**
6. Path: `/azure-pipelines.yml`
7. Click **Save** (don't run yet)

### Step 4: Configure Azure Resources

#### Option A: Use Existing Resources

If you already have Azure resources:

1. Note your App Service name (e.g., `caps360-backend-prod`)
2. Get Static Web Apps deployment token from Azure Portal
3. Skip to Step 5

#### Option B: Create New Resources

```bash
# Login to Azure
az login

# Create resource group
az group create --name caps360-prod --location eastus

# Create App Service Plan
az appservice plan create \
  --name caps360-plan \
  --resource-group caps360-prod \
  --sku B2 \
  --is-linux

# Create Web App for Backend
az webapp create \
  --name caps360-backend-prod \
  --resource-group caps360-prod \
  --plan caps360-plan \
  --runtime "NODE:20-lts"

# Create Static Web App for Frontend
az staticwebapp create \
  --name caps360-web-prod \
  --resource-group caps360-prod \
  --location eastus2

# Get Static Web App deployment token
az staticwebapp secrets list \
  --name caps360-web-prod \
  --resource-group caps360-prod \
  --query "properties.apiKey" -o tsv
```

### Step 5: Configure Pipeline

1. In Azure DevOps, go to **Project Settings** → **Service connections**
2. Click **New service connection** → **Azure Resource Manager**
3. Choose **Service principal (automatic)**
4. Select your subscription and resource group
5. Name it: `AZURE_SUBSCRIPTION_SERVICE_CONNECTION`
6. Check "Grant access to all pipelines"
7. Click **Save**

### Step 6: Add Pipeline Variables

1. Go to **Pipelines** → **Library**
2. Click **+ Variable group**
3. Name: `azure-deployment-vars`
4. Add variables:

   | Variable | Value | Secret? |
   |----------|-------|---------|
   | `AZURE_SUBSCRIPTION_SERVICE_CONNECTION` | (your service connection name) | No |
   | `AZURE_BACKEND_APP_NAME` | `caps360-backend-prod` | No |
   | `AZURE_STATIC_WEB_APPS_API_TOKEN` | (your token from Step 4) | **Yes** |

5. Click **Save**
6. Go to **Pipelines** → Your pipeline → **Edit**
7. Click **Variables** → **Variable groups**
8. Link the `azure-deployment-vars` group
9. Click **Save**

### Step 7: Create Environment

1. Go to **Pipelines** → **Environments**
2. Click **New environment**
3. Name: `production`
4. Description: `Production deployment environment`
5. Click **Create**

### Step 8: Run Pipeline

1. Go to **Pipelines** → Your pipeline
2. Click **Run pipeline**
3. Select branch: `main`
4. Click **Run**
5. Monitor the deployment (takes 5-10 minutes)

### Step 9: Verify Deployment

```bash
# Test backend
curl https://caps360-backend-prod.azurewebsites.net/health

# Test frontend
curl https://caps360-web-prod.azurestaticapps.net/
```

## Option 2: Visual Studio Setup (10 Minutes)

### Step 1: Install Visual Studio 2022

1. Download from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/)
2. Install with **Azure development** workload
3. Install **Git for Windows**

### Step 2: Connect to Azure DevOps

1. Open Visual Studio 2022
2. Go to **View** → **Team Explorer**
3. Click **Connect** (plug icon)
4. Click **Manage Connections** → **Connect to a Project**
5. Sign in to Azure DevOps
6. Select your organization and the CAPS360 project
7. Click **Connect**

### Step 3: Clone Repository

1. In Team Explorer, click **Clone**
2. Select the CAPS360 repository
3. Choose local folder
4. Click **Clone**

### Step 4: Configure Azure Resources

Follow **Step 4** from Option 1 above

### Step 5: View and Configure Pipeline

1. In Visual Studio, go to **View** → **Other Windows** → **Azure DevOps**
2. Navigate to **Pipelines**
3. You should see the pipeline auto-created from `azure-pipelines.yml`
4. Configure service connection and variables (same as Steps 5-7 in Option 1)

### Step 6: Run Pipeline from Visual Studio

1. In Azure DevOps window, right-click pipeline
2. Select **Queue build**
3. Monitor progress in Visual Studio

### Step 7: Make Changes and Deploy

1. Edit code in Visual Studio
2. Go to **View** → **Git Changes**
3. Stage changes and write commit message
4. Click **Commit All and Push**
5. Pipeline automatically triggers and deploys

## Environment Variables

### Backend Environment Variables (Azure App Service)

Configure these in Azure Portal or via CLI:

```bash
az webapp config appsettings set \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    SUPABASE_URL="your-url" \
    SUPABASE_ANON_KEY="your-key" \
    GEMINI_API_KEY="your-key" \
    JWT_SECRET="your-secret" \
    PAYSTACK_SECRET_KEY="your-key"
```

### Frontend Environment Variables (Static Web Apps)

These are set during build in the pipeline. Update in Azure DevOps:

1. Go to **Pipelines** → **Library**
2. Edit `azure-deployment-vars`
3. Add:
   - `VITE_API_URL`: `https://caps360-backend-prod.azurewebsites.net`
   - `VITE_PAYSTACK_PUBLIC_KEY`: Your Paystack public key

## Troubleshooting

### Pipeline Fails at Build

```bash
# Check Node.js version matches
node --version  # Should be 20.x

# Clear cache and rebuild locally
cd backend
npm cache clean --force
npm ci
npm run build
```

### Deployment Fails

1. Check service connection is valid
2. Verify App Service is running
3. Check logs in Azure Portal
4. Verify deployment token for Static Web Apps

### Can't Connect from Visual Studio

1. Ensure Visual Studio 2022 is up to date
2. Check Azure DevOps extension is installed
3. Sign out and sign in again
4. Try using **Team Explorer** instead

## Next Steps

After successful deployment:

1. ✅ Set up custom domain (optional)
2. ✅ Configure SSL certificates
3. ✅ Set up Application Insights monitoring
4. ✅ Configure auto-scaling
5. ✅ Set up staging environment
6. ✅ Add approval gates for production
7. ✅ Configure backup schedule

## Resources

- [Full Setup Guide](./azure-devops-setup-guide.md)
- [Azure Deployment Guide](./azure-deployment-guide.md)
- [Azure Quick Reference](./azure-quick-reference.md)
- [Azure Pipelines Docs](https://learn.microsoft.com/en-us/azure/devops/pipelines/)

## Support

- **Azure DevOps**: [dev.azure.com](https://dev.azure.com)
- **Azure Portal**: [portal.azure.com](https://portal.azure.com)
- **Documentation**: See `/docs` folder
- **Email**: <support@caps360.co.za>

---

**Time to Deploy**: 5-10 minutes  
**Difficulty**: Beginner-friendly  
**Last Updated**: January 2025
