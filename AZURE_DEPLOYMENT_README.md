# Azure Deployment Scripts - Summary

## Overview

Complete Azure deployment solution for CAPS360 with automated scripts, comprehensive documentation, and CI/CD integration.

## Files Created/Modified

### 1. Deployment Scripts

#### `scripts/deploy-to-azure.ps1` (Windows/PowerShell)
- **Purpose**: Automated deployment script for Windows users
- **Features**:
  - One-command deployment to Azure
  - Resource group creation/verification
  - Backend deployment to App Service
  - Frontend deployment to Static Web Apps
  - Application Insights setup
  - Database configuration support
  - Environment-specific settings (dev/staging/prod)
- **Usage**:
  ```powershell
  .\deploy-to-azure.ps1 -Environment prod -ResourceGroup caps360-prod
  ```

#### `scripts/deploy-to-azure.sh` (Bash/Linux/macOS)
- **Purpose**: Automated deployment script for Unix-based systems
- **Features**: Same as PowerShell version but using Bash
- **Usage**:
  ```bash
  ./deploy-to-azure.sh --environment prod --resource-group caps360-prod
  ```

### 2. Documentation

#### `docs/azure-deployment-guide.md`
- **Comprehensive guide** covering:
  - Prerequisites and setup
  - Quick start instructions
  - Manual deployment steps (for reference)
  - Post-deployment configuration
  - Monitoring and diagnostics
  - Scaling strategies
  - Troubleshooting guide
  - Security best practices
  - Backup and disaster recovery
  - Cost optimization

#### `docs/deployment-checklist.md`
- **Pre-deployment checklist** with items for:
  - Azure account setup
  - Environment configuration
  - Code quality verification
  - Frontend preparation
  - Backend preparation
  - Deployment execution
  - Post-deployment verification
  - Security verification
  - CI/CD setup
  - Sign-off and rollback plan

#### `docs/azure-quick-reference.md`
- **Quick reference guide** with:
  - Quick start (< 5 minutes)
  - Common Azure commands
  - Environment variables
  - Troubleshooting procedures
  - Performance optimization tips
  - Security updates
  - Cost monitoring
  - Emergency contacts

### 3. Configuration Files

#### `frontend-web/staticwebapp.config.json`
- **Static Web Apps configuration** with:
  - API routing rules
  - SPA fallback routing
  - Security headers (CSP, X-Frame-Options, etc.)
  - CORS headers
  - Error handling (404, 400)
  - Navigation fallback

### 4. CI/CD Pipeline

#### `.github/workflows/deploy-azure.yml`
- **Automated GitHub Actions workflow** that:
  - Triggers on push to main/develop
  - Supports manual workflow dispatch
  - Builds backend and frontend
  - Runs tests and linting
  - Deploys to appropriate environment
  - Includes health checks
  - Notifies on completion

## Key Features

### 1. **Automated Deployment**
- Single command deployment
- Automatic resource creation
- Environment-specific configuration
- Zero-downtime deployments

### 2. **Environment Support**
- Development (dev)
- Staging (staging)
- Production (prod)
- Separate configurations and resources for each

### 3. **Complete Infrastructure**
- App Service Plan (Backend)
- Web App (Backend API)
- Static Web Apps (Frontend)
- PostgreSQL Support
- Application Insights
- Key Vault ready

### 4. **Security**
- Security headers configured
- CORS support
- HTTPS enforcement
- Environment variable management
- Key Vault integration ready

### 5. **Monitoring**
- Application Insights integration
- Health check endpoints
- Logging configuration
- Performance metrics

### 6. **CI/CD Integration**
- GitHub Actions workflow included
- Automated testing on push
- Automatic deployment to target environment
- Manual trigger support

## Quick Start

### 1. Prerequisites
```bash
# Install Azure CLI
az login  # Login to your Azure account
```

### 2. Prepare Environment
```bash
# Create .env files with your configuration
cp .env.example .env.prod
# Edit .env.prod with your secrets
```

### 3. Deploy
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

### 4. Verify
```bash
# Backend
curl https://caps360-backend-prod.azurewebsites.net/health

# Frontend  
curl https://caps360-web-prod.azurestaticapps.net/
```

## Script Parameters

### PowerShell: `deploy-to-azure.ps1`
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| Environment | string | Yes | dev, staging, or prod |
| ResourceGroup | string | Yes | Azure resource group name |
| SubscriptionId | string | No | Azure subscription ID |
| Location | string | No | Azure region (default: eastus) |
| SkipBuild | bool | No | Skip building apps |
| SkipFrontend | bool | No | Skip frontend deployment |
| SkipBackend | bool | No | Skip backend deployment |

### Bash: `deploy-to-azure.sh`
| Flag | Type | Required | Description |
|------|------|----------|-------------|
| --environment, -e | string | Yes | dev, staging, or prod |
| --resource-group, -g | string | Yes | Azure resource group name |
| --subscription-id, -s | string | No | Azure subscription ID |
| --location, -l | string | No | Azure region (default: eastus) |
| --skip-build | flag | No | Skip building apps |
| --skip-frontend | flag | No | Skip frontend deployment |
| --skip-backend | flag | No | Skip backend deployment |

## Deployment Stages

### Stage 1: Resource Group
- Creates or verifies Azure resource group

### Stage 2: Backend Deployment
- Creates App Service Plan
- Creates Web App (Node.js)
- Configures environment variables
- Builds application (npm run build)
- Deploys code to App Service
- Verifies deployment with health check

### Stage 3: Frontend Deployment
- Creates Static Web App
- Builds frontend (npm run build)
- Deploys to Static Web Apps
- Verifies accessibility

### Stage 4: Database (Optional)
- Verifies PostgreSQL configuration
- Applies schema migrations

### Stage 5: Monitoring
- Creates Application Insights instance
- Links to backend application
- Configures monitoring

## Environment Variables

### Backend (Required)
```
NODE_ENV=production
JWT_SECRET=<generated-secret>
SUPABASE_URL=<your-url>
SUPABASE_ANON_KEY=<your-key>
SUPABASE_SERVICE_ROLE_KEY=<your-key>
GEMINI_API_KEY=<your-key>
PAYSTACK_SECRET_KEY=<your-key>
```

### Frontend (Required)
```
VITE_API_URL=https://caps360-backend-prod.azurewebsites.net
VITE_PAYSTACK_PUBLIC_KEY=<your-key>
```

## Post-Deployment

### Next Steps
1. Verify health endpoints responding
2. Test functionality end-to-end
3. Configure custom domain (if applicable)
4. Set up CI/CD with GitHub Actions
5. Monitor Application Insights
6. Configure backup schedule

### Useful Commands
```bash
# View logs
az webapp log tail --resource-group caps360-prod --name caps360-backend-prod

# Restart app
az webapp restart --resource-group caps360-prod --name caps360-backend-prod

# View metrics
az monitor metrics list --resource-group caps360-prod

# Set environment variable
az webapp config appsettings set --resource-group caps360-prod \
  --name caps360-backend-prod --settings "KEY=value"
```

## Troubleshooting

See `docs/azure-quick-reference.md` for troubleshooting procedures.

Common issues:
- Backend not starting → Check logs and environment variables
- Frontend not loading → Verify build and Static Web App configuration
- Database connection fails → Check firewall rules and credentials
- High latency → Consider scaling up App Service Plan

## Cost Estimates

### Development Environment
- App Service Plan (B1): ~$10/month
- Static Web App (Free): $0/month
- Application Insights: Pay-as-you-go (~$5-20/month)
- **Total**: ~$15-30/month

### Production Environment
- App Service Plan (S1): ~$70/month
- Static Web App (Standard): ~$9/month
- PostgreSQL (B_Gen5_2): ~$80-150/month
- Application Insights: Pay-as-you-go (~$20-50/month)
- **Total**: ~$180-280/month

## Security Checklist

- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Secrets in Key Vault
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] SQL injection prevention active
- [ ] XSS protection enabled
- [ ] Backups enabled
- [ ] Monitoring active

## Support Resources

- [Azure App Service Documentation](https://learn.microsoft.com/en-us/azure/app-service/)
- [Static Web Apps Documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [Azure CLI Reference](https://learn.microsoft.com/en-us/cli/azure/)
- [Azure PostgreSQL Documentation](https://learn.microsoft.com/en-us/azure/postgresql/)

## Files Modified

- `scripts/deploy-to-azure.ps1` - Created
- `scripts/deploy-to-azure.sh` - Created
- `docs/azure-deployment-guide.md` - Created
- `docs/deployment-checklist.md` - Created
- `docs/azure-quick-reference.md` - Created
- `frontend-web/staticwebapp.config.json` - Created
- `.github/workflows/deploy-azure.yml` - Created

## Next Actions

1. **Review Documentation**
   - Read `docs/azure-deployment-guide.md` for comprehensive guide
   - Review `docs/deployment-checklist.md` before deployment
   - Keep `docs/azure-quick-reference.md` handy for common commands

2. **Prepare Environment**
   - Set up `.env.prod`, `.env.staging`, `.env.dev`
   - Generate JWT secret: `openssl rand -base64 32`
   - Gather API keys from services (Supabase, Gemini, Paystack)

3. **Test Deployment**
   - Run script with dev environment first
   - Verify all components deploy successfully
   - Test end-to-end functionality

4. **Set Up CI/CD**
   - Configure GitHub secrets:
     - `AZURE_CREDENTIALS`
     - `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Test GitHub Actions workflow

5. **Monitor**
   - Set up Application Insights alerts
   - Configure backup schedule
   - Enable monitoring dashboard

---

**Version**: 1.0  
**Created**: January 2025  
**Maintained by**: DevOps Team
