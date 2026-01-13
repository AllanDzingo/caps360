# GitHub Actions Workflows - Disabled

## Important Notice

All GitHub Actions workflows in this directory have been **disabled** (renamed with `.disabled` extension) as part of the migration to **Azure Pipelines** for CI/CD.

## Why Were GitHub Actions Disabled?

The CAPS360 project has transitioned to using **Azure Pipelines** for continuous integration and deployment to align with:

1. **Azure Native Integration**: Better integration with Azure services (App Service, Static Web Apps, Key Vault)
2. **Visual Studio Compatibility**: Seamless integration with Visual Studio 2022 and Azure DevOps
3. **Enterprise Features**: Advanced deployment controls, environments, and approval gates
4. **Unified Platform**: Centralized CI/CD, project management, and Azure resource management

## Disabled Workflows

The following workflows have been disabled:

- **ci.yml.disabled** - Tests and linting (now handled by Azure Pipelines)
- **deploy-azure.yml.disabled** - Azure deployment (now handled by Azure Pipelines)
- **azure-backend-deploy.yml.disabled** - Backend deployment (now handled by Azure Pipelines)
- **fly-deploy.yml.disabled** - Fly.io deployment (deprecated)
- **security.yml.disabled** - Security scanning (can be re-enabled if needed)
- **dependabot-auto-merge.yml.disabled** - Dependabot auto-merge

## Current CI/CD Solution

The project now uses:

- **Azure Pipelines**: `azure-pipelines.yml` in the root directory
- **Build & Test**: Automated on commits to main/master branches
- **Deployment**: Azure App Service (backend) + Azure Static Web Apps (frontend)

## How to Access Current Pipeline

1. Go to [Azure DevOps](https://dev.azure.com)
2. Navigate to your organization and the CAPS360 project
3. Click on **Pipelines** to view build status and history
4. Click on **Environments** to see deployment environments

## Re-enabling GitHub Actions (If Needed)

If you need to re-enable any of these workflows:

1. Rename the file by removing the `.disabled` extension
   ```bash
   mv ci.yml.disabled ci.yml
   ```

2. Update any outdated configurations

3. Commit and push the changes

**Note**: Running both GitHub Actions and Azure Pipelines simultaneously may cause conflicts or duplicate deployments. Ensure you understand the implications before re-enabling.

## Migration Information

### What Changed?

| Before (GitHub Actions) | After (Azure Pipelines) |
|------------------------|-------------------------|
| `.github/workflows/*.yml` | `azure-pipelines.yml` |
| GitHub Secrets | Azure Pipeline Variables |
| GitHub Environments | Azure DevOps Environments |
| Deployment via GitHub | Deployment via Azure DevOps |

### Benefits of Azure Pipelines

1. **Better Azure Integration**: Native support for Azure services
2. **Visual Studio Integration**: Deploy and monitor from Visual Studio
3. **Advanced Features**: Approval gates, manual interventions, and release management
4. **Enterprise Support**: Better support for enterprise scenarios
5. **Unified Dashboard**: All DevOps activities in one place

## Documentation

For complete setup instructions, see:

- [Azure DevOps Setup Guide](../docs/azure-devops-setup-guide.md) - Complete setup instructions
- [Azure Deployment Guide](../docs/azure-deployment-guide.md) - Deployment procedures
- [Azure Quick Reference](../docs/azure-quick-reference.md) - Common commands

## Questions?

If you have questions about:
- **Why this change was made**: Contact the DevOps team
- **How to set up Azure Pipelines**: See [Azure DevOps Setup Guide](../docs/azure-devops-setup-guide.md)
- **Issues with deployment**: Check Azure DevOps pipeline logs

---

**Status**: GitHub Actions disabled, Azure Pipelines active  
**Effective Date**: January 2025  
**Contact**: DevOps Team
