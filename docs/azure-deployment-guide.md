# CAPS360 Azure Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying CAPS360 to Microsoft Azure. The deployment includes:

- **Backend**: Node.js API on Azure App Service
- **Frontend**: React/Vite on Azure Static Web Apps
- **Database**: Azure PostgreSQL (optional)
- **Monitoring**: Application Insights
- **Storage**: Azure Blob Storage (optional)

## Prerequisites

### Required
- Azure subscription with appropriate permissions
- Azure CLI installed (`az login` configured)
- Node.js 20+ and npm
- Git (for version control)

### Optional
- Docker (for container deployments)
- Azure PowerShell (for advanced management)
- Visual Studio Code with Azure Extensions

### Install Azure CLI

**Windows:**
```powershell
# Using Windows Package Manager
winget install Microsoft.AzureCLI

# Or download from: https://aka.ms/installazurecliwindows
```

**macOS/Linux:**
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

## Quick Start

### 1. Authenticate to Azure

```bash
az login
```

This opens a browser window to authenticate. After login, your subscription will be active.

### 2. Prepare Environment Variables

Create environment configuration files:

```bash
# For production
cp .env.example .env.prod
# Edit with production values
```

**Required variables:**
```
NODE_ENV=production
JWT_SECRET=<your-jwt-secret>
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
GEMINI_API_KEY=<your-gemini-key>
PAYSTACK_SECRET_KEY=<your-paystack-key>
```

### 3. Run Deployment Script

**Windows (PowerShell):**
```powershell
cd scripts
.\deploy-to-azure.ps1 -Environment prod -ResourceGroup caps360-prod -Location eastus
```

**macOS/Linux (Bash):**
```bash
cd scripts
chmod +x deploy-to-azure.sh
./deploy-to-azure.sh --environment prod --resource-group caps360-prod --location eastus
```

#### Script Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| Environment | string | Yes | Deployment environment: `dev`, `staging`, or `prod` |
| ResourceGroup | string | Yes | Azure resource group name |
| SubscriptionId | string | No | Azure subscription ID (defaults to current) |
| Location | string | No | Azure region (default: `eastus`) |
| SkipBuild | bool | No | Skip building frontend/backend |
| SkipFrontend | bool | No | Skip frontend deployment |
| SkipBackend | bool | No | Skip backend deployment |

## Manual Deployment Steps

### Step 1: Create Resource Group

```bash
az group create \
  --name caps360-prod \
  --location eastus
```

### Step 2: Backend Deployment

#### Create App Service Plan

```bash
az appservice plan create \
  --resource-group caps360-prod \
  --name caps360-plan-prod \
  --location eastus \
  --sku B2 \
  --is-linux
```

#### Create Web App

```bash
az webapp create \
  --resource-group caps360-prod \
  --plan caps360-plan-prod \
  --name caps360-backend-prod \
  --runtime "NODE|20-lts"
```

#### Configure Settings

```bash
az webapp config appsettings set \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --settings \
    NODE_ENV=production \
    JWT_SECRET=your-secret \
    SUPABASE_URL=your-url \
    SUPABASE_ANON_KEY=your-key
```

#### Build and Deploy

```bash
cd backend

# Install and build
npm ci
npm run build

# Create deployment package
cd dist
zip -r ../backend-deploy.zip .
cd ..

# Deploy
az webapp deployment source config-zip \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --src backend-deploy.zip
```

### Step 3: Frontend Deployment

#### Create Static Web App

```bash
az staticwebapp create \
  --name caps360-web-prod \
  --resource-group caps360-prod \
  --location eastus
```

#### Build Frontend

```bash
cd frontend-web
npm ci
npm run build
```

#### Deploy

```bash
# Get deployment token
DEPLOY_TOKEN=$(az staticwebapp secrets list \
  --name caps360-web-prod \
  --resource-group caps360-prod \
  --query "properties.apiKey" \
  -o tsv)

# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Deploy
swa deploy --deployment-token $DEPLOY_TOKEN --env production
```

### Step 4: Database Setup (Optional)

#### Create PostgreSQL Server

```bash
az postgres server create \
  --resource-group caps360-prod \
  --name caps360-db-prod \
  --location eastus \
  --admin-user dbadmin \
  --admin-password <your-password> \
  --sku-name B_Gen5_2 \
  --storage-size 51200 \
  --backup-retention 7 \
  --geo-redundant-backup Enabled
```

#### Configure Firewall

```bash
# Allow Azure services
az postgres server firewall-rule create \
  --resource-group caps360-prod \
  --server-name caps360-db-prod \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Allow your IP
az postgres server firewall-rule create \
  --resource-group caps360-prod \
  --server-name caps360-db-prod \
  --name AllowMyIP \
  --start-ip-address <your-ip> \
  --end-ip-address <your-ip>
```

#### Run Migrations

```bash
# Connect to database
psql -h caps360-db-prod.postgres.database.azure.com \
     -U dbadmin@caps360-db-prod \
     -d caps360

# Run migrations
\i backend/db/schema.sql
```

### Step 5: Application Insights

```bash
az monitor app-insights component create \
  --app caps360-insights-prod \
  --location eastus \
  --resource-group caps360-prod

# Link to backend
INSIGHTS_KEY=$(az monitor app-insights component show \
  --app caps360-insights-prod \
  --resource-group caps360-prod \
  --query "instrumentationKey" \
  -o tsv)

az webapp config appsettings set \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$INSIGHTS_KEY"
```

## Post-Deployment Configuration

### 1. Custom Domain Setup

```bash
az staticwebapp custom-domain create \
  --name caps360-web-prod \
  --resource-group caps360-prod \
  --domain-name yourdomain.com
```

### 2. SSL Certificate

Azure automatically provisions SSL certificates via Let's Encrypt.

### 3. Configure CORS (if needed)

```bash
az webapp cors add \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --allowed-origins "https://yourdomain.com"
```

### 4. Set Up CI/CD Pipeline

Create `.github/workflows/deploy-azure.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'frontend-web/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Deploy Backend
        run: |
          cd backend
          npm ci
          npm run build
          cd dist
          zip -r ../deploy.zip .
          cd ..
          az webapp deployment source config-zip \
            --resource-group caps360-prod \
            --name caps360-backend-prod \
            --src deploy.zip
      
      - name: Deploy Frontend
        run: |
          cd frontend-web
          npm ci
          npm run build
          swa deploy --deployment-token ${{ secrets.AZURE_SWA_TOKEN }}
```

## Monitoring and Diagnostics

### View Logs

```bash
# Backend logs
az webapp log tail \
  --resource-group caps360-prod \
  --name caps360-backend-prod

# Stream logs
az webapp log tail \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --provider FSLogix
```

### Monitor Performance

```bash
# View metrics
az monitor metrics list \
  --resource-group caps360-prod \
  --resource-type "Microsoft.Web/sites" \
  --resource-names caps360-backend-prod \
  --interval PT1M \
  --metric "Requests"
```

### Check Health

```bash
# Backend health
curl https://caps360-backend-prod.azurewebsites.net/health

# Frontend health
curl https://caps360-web-prod.azurestaticapps.net/
```

## Scaling

### Scale Backend

```bash
# Scale up instance size
az appservice plan update \
  --resource-group caps360-prod \
  --name caps360-plan-prod \
  --sku S1

# Scale out (add instances)
az appservice plan update \
  --resource-group caps360-prod \
  --name caps360-plan-prod \
  --number-of-workers 3
```

### Auto-scale Rules

```bash
az monitor autoscale create \
  --resource-group caps360-prod \
  --resource-name caps360-plan-prod \
  --resource-type "Microsoft.Web/serverfarms" \
  --min-count 1 \
  --max-count 3 \
  --count 1
```

## Troubleshooting

### Issue: Deployment fails with "Missing dependencies"

**Solution:**
```bash
# Clear cache and rebuild
cd backend
rm -rf node_modules dist
npm ci
npm run build
```

### Issue: Frontend not loading static assets

**Solution:**
- Check `vite.config.ts` has correct `base` path
- Verify `staticWebAppLocation` in `staticwebapp.config.json`

### Issue: Backend API not responding

**Solution:**
```bash
# Check application logs
az webapp log tail --resource-group caps360-prod --name caps360-backend-prod

# Restart app
az webapp restart --resource-group caps360-prod --name caps360-backend-prod
```

### Issue: Database connection fails

**Solution:**
```bash
# Check firewall rules
az postgres server firewall-rule list \
  --resource-group caps360-prod \
  --server-name caps360-db-prod

# Verify connection string
az postgres server show \
  --resource-group caps360-prod \
  --name caps360-db-prod \
  --query "fullyQualifiedDomainName"
```

## Cost Optimization

### Recommended SKUs

| Component | Dev | Staging | Prod |
|-----------|-----|---------|------|
| App Service Plan | B1 | B2 | S1 |
| Static Web App | Free | Standard | Standard |
| PostgreSQL | B_Gen5_1 | B_Gen5_2 | D_Gen5_4 |
| App Insights | Pay-As-You-Go | Pay-As-You-Go | Pay-As-You-Go |

### Cost Reduction Tips

1. Use reserved instances for production
2. Enable auto-shutdown for dev/staging environments
3. Use Azure DevOps for CI/CD (included with subscription)
4. Monitor spending with Azure Cost Management

## Security Best Practices

### 1. Use Azure Key Vault for Secrets

```bash
# Create Key Vault
az keyvault create \
  --resource-group caps360-prod \
  --name caps360-vault-prod

# Add secrets
az keyvault secret set \
  --vault-name caps360-vault-prod \
  --name jwt-secret \
  --value "your-secret-value"

# Reference in App Service
az webapp config appsettings set \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --settings "JWT_SECRET=@Microsoft.KeyVault(SecretUri=https://caps360-vault-prod.vault.azure.net/secrets/jwt-secret/)"
```

### 2. Enable HTTPS Only

```bash
az webapp update \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --https-only true
```

### 3. Configure Web Application Firewall

```bash
# Create WAF policy
az network front-door create \
  --resource-group caps360-prod \
  --name caps360-waf-prod
```

### 4. Enable Managed Identity

```bash
az webapp identity assign \
  --resource-group caps360-prod \
  --name caps360-backend-prod
```

## Backup and Disaster Recovery

### Enable Backups

```bash
# App Service backup
az webapp config backup update \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --container-url https://storageaccount.blob.core.windows.net/backups \
  --frequency Daily

# PostgreSQL backup
az postgres server update \
  --resource-group caps360-prod \
  --name caps360-db-prod \
  --backup-retention 35 \
  --geo-redundant-backup Enabled
```

## Cleanup

### Remove All Resources

```bash
# WARNING: This will delete all resources in the resource group
az group delete \
  --resource-group caps360-prod \
  --yes --no-wait
```

### Remove Specific Resource

```bash
az webapp delete \
  --resource-group caps360-prod \
  --name caps360-backend-prod
```

## Additional Resources

- [Azure App Service Documentation](https://learn.microsoft.com/en-us/azure/app-service/)
- [Azure Static Web Apps Documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [Azure CLI Reference](https://learn.microsoft.com/en-us/cli/azure/)
- [Azure PostgreSQL Documentation](https://learn.microsoft.com/en-us/azure/postgresql/)

## Support

For issues and questions:
1. Check Azure Status Dashboard: https://status.azure.com/
2. Review Azure Activity Logs in portal
3. Contact Azure Support (if subscription level includes it)
4. Check application logs via deployment scripts
