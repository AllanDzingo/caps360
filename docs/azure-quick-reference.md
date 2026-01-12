# Azure Deployment Quick Reference

## Quick Start (< 5 minutes)

### 1. Login to Azure
```bash
az login
```

### 2. Run Deployment
**Windows:**
```powershell
cd scripts
.\deploy-to-azure.ps1 -Environment prod -ResourceGroup caps360-prod
```

**Linux/macOS:**
```bash
cd scripts
./deploy-to-azure.sh --environment prod --resource-group caps360-prod
```

### 3. Verify Deployment
```bash
# Check backend
curl https://caps360-backend-prod.azurewebsites.net/health

# Check frontend
curl https://caps360-web-prod.azurestaticapps.net/
```

---

## Common Commands

### Resource Management
```bash
# List all resources
az resource list --resource-group caps360-prod

# Delete resource group
az group delete --name caps360-prod --yes

# Get resource details
az webapp show --resource-group caps360-prod --name caps360-backend-prod
```

### Logs & Monitoring
```bash
# Tail backend logs
az webapp log tail --resource-group caps360-prod --name caps360-backend-prod

# Download logs
az webapp log download --resource-group caps360-prod --name caps360-backend-prod

# View metrics
az monitor metrics list \
  --resource-group caps360-prod \
  --resource-type "Microsoft.Web/sites" \
  --resource-names caps360-backend-prod \
  --metric "Requests"
```

### Configuration
```bash
# Set environment variable
az webapp config appsettings set \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --settings "KEY=value"

# List settings
az webapp config appsettings list \
  --resource-group caps360-prod \
  --name caps360-backend-prod

# Restart app
az webapp restart --resource-group caps360-prod --name caps360-backend-prod
```

### Database
```bash
# Connect to PostgreSQL
psql -h caps360-db-prod.postgres.database.azure.com \
     -U dbadmin@caps360-db-prod \
     -d caps360

# Create backup
az postgres server backup create \
  --resource-group caps360-prod \
  --server-name caps360-db-prod \
  --backup-name manual-backup
```

### Static Web App
```bash
# List deployments
az staticwebapp list --resource-group caps360-prod

# View deployment status
az staticwebapp show \
  --name caps360-web-prod \
  --resource-group caps360-prod

# Clear cache
az cdn endpoint purge \
  --resource-group caps360-prod \
  --profile-name caps360-cdn \
  --name caps360-web-prod \
  --content-paths "/*"
```

---

## Environment Variables

### Required Variables (Backend)
```bash
NODE_ENV=production
JWT_SECRET=<generate-with-openssl>
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxx...
GEMINI_API_KEY=AIzaXxx...
PAYSTACK_SECRET_KEY=sk_live_xxx
```

### Frontend Variables
```bash
VITE_API_URL=https://caps360-backend-prod.azurewebsites.net
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxx
```

---

## Troubleshooting

### Backend Not Starting
```bash
# 1. Check logs
az webapp log tail --resource-group caps360-prod --name caps360-backend-prod

# 2. Verify environment variables
az webapp config appsettings list --resource-group caps360-prod --name caps360-backend-prod

# 3. Restart app
az webapp restart --resource-group caps360-prod --name caps360-backend-prod

# 4. Check if port 8080 is configured
az webapp config appsettings set \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --settings "PORT=8080"
```

### Frontend Not Loading
```bash
# 1. Check deployment status
az staticwebapp show --name caps360-web-prod --resource-group caps360-prod

# 2. Check recent deployments
az staticwebapp builds list --name caps360-web-prod --resource-group caps360-prod

# 3. Check configuration
cat frontend-web/staticwebapp.config.json

# 4. Verify build
npm run build
```

### Database Connection Issues
```bash
# 1. Check firewall rules
az postgres server firewall-rule list \
  --resource-group caps360-prod \
  --server-name caps360-db-prod

# 2. Add your IP
az postgres server firewall-rule create \
  --resource-group caps360-prod \
  --server-name caps360-db-prod \
  --name "MyIP" \
  --start-ip-address <your-ip> \
  --end-ip-address <your-ip>

# 3. Test connection
psql -h caps360-db-prod.postgres.database.azure.com \
     -U dbadmin@caps360-db-prod \
     -d postgres \
     -c "SELECT version();"
```

### High Latency/Slow Response
```bash
# 1. Check App Service metrics
az monitor metrics list \
  --resource-group caps360-prod \
  --resource-type "Microsoft.Web/sites" \
  --resource-names caps360-backend-prod \
  --interval PT1M

# 2. Scale up
az appservice plan update \
  --resource-group caps360-prod \
  --name caps360-plan-prod \
  --sku S1

# 3. Enable auto-scale
az monitor autoscale create \
  --resource-group caps360-prod \
  --resource-name caps360-plan-prod \
  --resource-type "Microsoft.Web/serverfarms" \
  --min-count 2 \
  --max-count 5 \
  --count 2
```

---

## Performance Optimization

### Backend
```bash
# Enable compression
az webapp config set \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --web-sockets-enabled true

# Configure caching headers
# (Set in application code)
```

### Frontend
```bash
# Enable CDN
az cdn profile create \
  --resource-group caps360-prod \
  --name caps360-cdn \
  --sku Standard_Microsoft

# Enable compression
az cdn endpoint update \
  --resource-group caps360-prod \
  --profile-name caps360-cdn \
  --name caps360-web-prod \
  --enable-compression true
```

---

## Security Updates

### Update Node.js Runtime
```bash
az webapp config set \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --linux-fx-version "NODE|20-lts"
```

### Rotate Secrets
```bash
# 1. Generate new secret
openssl rand -base64 32

# 2. Update in Key Vault
az keyvault secret set \
  --vault-name caps360-vault-prod \
  --name jwt-secret \
  --value "new-secret-value"

# 3. App will reference updated secret
```

---

## Cost Monitoring

```bash
# View current spending
az consumption usage list \
  --resource-group caps360-prod \
  --format table

# Set spending limit
az billing spending limit update \
  --spending-limit --value 1000

# View forecast
az consumption forecast list --resource-group caps360-prod
```

---

## Useful Links

- **Azure Portal**: https://portal.azure.com/
- **Azure CLI Reference**: https://learn.microsoft.com/cli/azure/
- **App Service Limits**: https://learn.microsoft.com/azure/app-service/azure-web-sites-web-hosting-plans-in-depth-overview
- **Static Web Apps**: https://learn.microsoft.com/azure/static-web-apps/
- **Azure Status**: https://status.azure.com/

---

## Emergency Contacts

```
DevOps Lead: [Phone/Email]
Azure Admin: [Phone/Email]
On-call: [Phone/Email]
```

---

## Common Scripts

### Deploy with Specific Environment
```powershell
# PowerShell
.\deploy-to-azure.ps1 -Environment prod -ResourceGroup caps360-prod -Location eastus
```

### Rollback to Previous Version
```bash
# Check deployment history
az webapp deployment slot list \
  --resource-group caps360-prod \
  --name caps360-backend-prod

# Swap slots
az webapp deployment slot swap \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --slot staging
```

### Full Cleanup
```bash
# WARNING: This deletes everything!
az group delete --name caps360-prod --yes --no-wait
```

---

*Last Updated: January 2025*
