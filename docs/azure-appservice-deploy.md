# CAPS360 Azure App Service Deployment

## 1. Create Application Insights (if not already present)

az monitor app-insights component create --app caps360-insights --location southafricanorth --resource-group caps360

## 2. Create Azure App Service Plan (Linux)

az appservice plan create --name caps360-plan --resource-group caps360 --location southafricanorth --sku B1 --is-linux

## 3. Create Web App (Node.js)

az webapp create --resource-group caps360 --plan caps360-plan --name caps360-backend --runtime "NODE|18-lts" --deployment-local-git

## 4. Configure Always On

az webapp config set --resource-group caps360 --name caps360-backend --always-on true

## 5. Link Application Insights

$insightsKey = az monitor app-insights component show --app caps360-insights --resource-group caps360 --query instrumentationKey -o tsv
az webapp config appsettings set --resource-group caps360 --name caps360-backend --settings APPINSIGHTS_INSTRUMENTATIONKEY=$insightsKey

## 6. Configure Environment Variables (use Key Vault for secrets)

az webapp config appsettings set --resource-group caps360 --name caps360-backend --settings NODE_ENV=production DATABASE_URL=<AZURE_PG_CONN_STRING> JWT_SECRET=<JWT_SECRET> JWT_EXPIRES_IN=7d

# (Optional) Use Azure Key Vault references for secrets
# See Azure docs for Key Vault integration with App Service

## 7. Deploy Code

# Use local git, GitHub Actions, or Azure DevOps. Example (local git):
# git remote add azure <DEPLOYMENT_GIT_URL>
# git push azure main

## 8. Validate

# Check /health endpoint and Application Insights logs
