# Azure DevOps Setup Guide for CAPS360

This guide will help you connect your CAPS360 repository to Azure DevOps and set up the deployment pipeline using Visual Studio or the Azure DevOps portal.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Create Azure DevOps Organization and Project](#create-azure-devops-organization-and-project)
3. [Connect Repository to Azure DevOps](#connect-repository-to-azure-devops)
4. [Set Up Azure Pipeline](#set-up-azure-pipeline)
5. [Configure Service Connections](#configure-service-connections)
6. [Configure Pipeline Variables](#configure-pipeline-variables)
7. [Deploy to Azure](#deploy-to-azure)
8. [Connect from Visual Studio](#connect-from-visual-studio)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- **Azure Account**: Active Azure subscription ([Sign up for free](https://azure.microsoft.com/free/))
- **Azure DevOps Account**: Free account at [dev.azure.com](https://dev.azure.com)
- **GitHub Repository**: CAPS360 repository with proper access
- **Visual Studio 2022** (Optional): For Visual Studio integration
- **Azure CLI**: Installed and configured ([Install Guide](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli))

### Required Azure Resources

You'll need to create these Azure resources (or have them ready):

1. **Azure App Service** (for Backend)
   - Name: e.g., `caps360-backend-prod`
   - Runtime: Node.js 20 LTS
   - Operating System: Linux

2. **Azure Static Web Apps** (for Frontend)
   - Name: e.g., `caps360-web-prod`
   - Region: Choose closest to your users

---

## Create Azure DevOps Organization and Project

### Step 1: Create Organization

1. Go to [dev.azure.com](https://dev.azure.com)
2. Sign in with your Microsoft account
3. Click **"+ New organization"**
4. Enter organization name (e.g., `caps360-org`)
5. Choose your region
6. Click **"Continue"**

### Step 2: Create Project

1. In your new organization, click **"+ New project"**
2. Enter project details:
   - **Project name**: `CAPS360`
   - **Description**: `AI-Powered Educational Platform`
   - **Visibility**: Private (recommended)
   - **Version control**: Git
   - **Work item process**: Agile
3. Click **"Create"**

---

## Connect Repository to Azure DevOps

### Option A: Import from GitHub (Recommended)

1. In your Azure DevOps project, go to **Repos**
2. If you see "Import a repository", click it
3. Select **GitHub** as the source
4. Authenticate with GitHub
5. Select the `caps360` repository
6. Click **"Import"**

### Option B: Use GitHub as External Repository

1. Keep your repository on GitHub
2. Azure Pipelines will connect directly to GitHub
3. You'll need to authorize Azure Pipelines to access your GitHub repo
4. This is configured automatically when setting up the pipeline

---

## Set Up Azure Pipeline

### Step 1: Create Pipeline

1. In Azure DevOps, navigate to **Pipelines** → **Pipelines**
2. Click **"Create Pipeline"** or **"New pipeline"**
3. Select **"GitHub"** or **"GitHub (YAML)"**
4. Authorize Azure Pipelines to access your GitHub account
5. Select your `caps360` repository
6. Choose **"Existing Azure Pipelines YAML file"**
7. Select the branch (usually `main` or `master`)
8. Path to YAML file: `/azure-pipelines.yml`
9. Click **"Continue"**

### Step 2: Review Pipeline Configuration

1. Azure DevOps will display the `azure-pipelines.yml` content
2. Review the configuration:
   - Build stages for backend and frontend
   - Deployment stages to Azure App Service and Static Web Apps
   - Required variables (will be configured next)
3. **Do not run yet** - click **"Save"** instead

### Step 3: Configure Environments

1. Go to **Pipelines** → **Environments**
2. Click **"New environment"**
3. Create environment:
   - **Name**: `production`
   - **Description**: `Production deployment environment`
   - **Resources**: None (for now)
4. Click **"Create"**

---

## Configure Service Connections

Service connections allow Azure Pipelines to deploy to your Azure resources.

### Step 1: Create Azure Service Connection

1. In Azure DevOps, go to **Project Settings** (bottom left)
2. Under **Pipelines**, select **Service connections**
3. Click **"New service connection"**
4. Select **"Azure Resource Manager"**
5. Click **"Next"**
6. Choose authentication method:
   - **Service principal (automatic)** - Recommended
7. Fill in details:
   - **Scope level**: Subscription
   - **Subscription**: Select your Azure subscription
   - **Resource group**: Select or create (e.g., `caps360-prod`)
   - **Service connection name**: `AZURE_SUBSCRIPTION_SERVICE_CONNECTION`
   - **Grant access to all pipelines**: Check this box
8. Click **"Save"**

### Step 2: Get Static Web Apps Deployment Token

1. Open Azure Portal ([portal.azure.com](https://portal.azure.com))
2. Navigate to your Static Web App resource
3. Go to **Overview** → **Manage deployment token**
4. Copy the deployment token
5. Keep it safe - you'll need it in the next step

---

## Configure Pipeline Variables

### Required Variables

1. Go to **Pipelines** → **Library**
2. Click **"+ Variable group"**
3. Create a variable group named `azure-deployment-vars`
4. Add the following variables:

#### Azure Backend Configuration
| Variable Name | Value | Secret? | Description |
|--------------|-------|---------|-------------|
| `AZURE_SUBSCRIPTION_SERVICE_CONNECTION` | (name from Step 1) | No | Service connection name |
| `AZURE_BACKEND_APP_NAME` | `caps360-backend-prod` | No | Azure App Service name |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | (token from Step 2) | **Yes** | Static Web Apps token |

5. Click on variable groups and link to your pipeline

### Alternative: Pipeline-specific Variables

You can also add variables directly to the pipeline:

1. Go to **Pipelines** → Select your pipeline
2. Click **"Edit"**
3. Click **"Variables"** (top right)
4. Click **"New variable"**
5. Add each required variable
6. Check **"Keep this value secret"** for sensitive data
7. Click **"OK"** and **"Save"**

---

## Deploy to Azure

### First Deployment

1. Go to **Pipelines** → Select your pipeline
2. Click **"Run pipeline"**
3. Select branch: `main` or `master`
4. Click **"Run"**
5. Monitor the pipeline execution:
   - **Build Stage**: Backend and frontend builds
   - **Deploy Stage**: Deployment to Azure resources

### Monitor Deployment

1. Click on the running pipeline to see real-time logs
2. Each job shows:
   - Console output
   - Task results
   - Deployment status
3. If deployment succeeds, you'll see green checkmarks
4. Access your application:
   - Backend: `https://<AZURE_BACKEND_APP_NAME>.azurewebsites.net`
   - Frontend: `https://<static-web-app-name>.azurestaticapps.net`

### Verify Deployment

```bash
# Test backend health
curl https://caps360-backend-prod.azurewebsites.net/health

# Test frontend
curl https://caps360-web-prod.azurestaticapps.net/
```

---

## Connect from Visual Studio

### Prerequisites

- Visual Studio 2022 (version 17.0 or later)
- Azure Development workload installed
- Git for Windows

### Step 1: Connect to Azure DevOps

1. Open Visual Studio 2022
2. Go to **View** → **Team Explorer**
3. Click **"Connect"** (plug icon)
4. Click **"Manage Connections"** → **"Connect to a Project"**
5. Sign in to Azure DevOps
6. Select your organization and project
7. Click **"Connect"**

### Step 2: Clone Repository

1. In Team Explorer, click **"Clone"**
2. Select the CAPS360 repository
3. Choose local path
4. Click **"Clone"**

### Step 3: View Pipelines

1. Go to **View** → **Other Windows** → **Azure DevOps**
2. Navigate to **Pipelines**
3. View pipeline status and history
4. Trigger new builds from Visual Studio

### Step 4: Make Changes and Commit

1. Make code changes in Visual Studio
2. Go to **View** → **Git Changes**
3. Stage changes
4. Write commit message
5. Click **"Commit All"**
6. Click **"Push"** to push to GitHub
7. Pipeline will automatically trigger

---

## Troubleshooting

### Common Issues

#### Issue 1: Pipeline Fails at Build Stage

**Symptoms**: Build fails with dependency errors

**Solution**:
```bash
# Check Node.js version in pipeline
- task: NodeTool@0
  inputs:
    versionSpec: '20.x'  # Ensure this matches your local version

# Clear npm cache
npm cache clean --force
npm ci
```

#### Issue 2: Azure Deployment Fails

**Symptoms**: Build succeeds but deployment fails

**Solution**:
1. Verify service connection is valid:
   - Go to **Project Settings** → **Service connections**
   - Test the connection
   - Refresh if needed

2. Check App Service configuration:
   - Ensure App Service is running
   - Verify deployment slots
   - Check application logs

3. Verify deployment token:
   - For Static Web Apps, regenerate deployment token
   - Update pipeline variable

#### Issue 3: Missing Variables

**Symptoms**: Pipeline fails with "variable not found" error

**Solution**:
1. Go to **Pipelines** → **Library**
2. Verify all required variables are set
3. Check variable names match exactly (case-sensitive)
4. Link variable group to pipeline

#### Issue 4: Permission Denied

**Symptoms**: Deployment fails with permission error

**Solution**:
1. Check service connection permissions
2. Go to Azure Portal
3. Verify service principal has:
   - Contributor role on resource group
   - Proper Azure AD permissions
4. Refresh service connection in Azure DevOps

#### Issue 5: GitHub Connection Issues

**Symptoms**: Pipeline can't access GitHub repository

**Solution**:
1. Go to **Project Settings** → **Service connections**
2. Find GitHub connection
3. Click **"Authorize"** to refresh GitHub token
4. Or create new GitHub connection

### Get Detailed Logs

```bash
# View Azure App Service logs
az webapp log tail \
  --name caps360-backend-prod \
  --resource-group caps360-prod

# Download logs for analysis
az webapp log download \
  --name caps360-backend-prod \
  --resource-group caps360-prod \
  --log-file app-logs.zip
```

### Pipeline Debugging

1. Enable system diagnostics:
   - Edit pipeline
   - Add variable: `system.debug` = `true`
   - Run pipeline again

2. Review pipeline logs:
   - Click on failed stage
   - Expand each task
   - Look for error messages

3. Test locally:
   ```bash
   # Build backend locally
   cd backend
   npm ci
   npm run build
   
   # Build frontend locally
   cd frontend-web
   npm ci
   npm run build
   ```

---

## Best Practices

### Security

1. **Use Service Connections**: Never hardcode credentials
2. **Mark Secrets as Secret**: Always mark sensitive variables
3. **Limit Access**: Grant minimum required permissions
4. **Rotate Keys**: Regularly update deployment tokens

### Pipeline Management

1. **Branch Protection**: Require pipeline success before merging
2. **Manual Approval**: Add approval gates for production
3. **Rollback Plan**: Keep previous deployment artifacts
4. **Monitoring**: Set up alerts for pipeline failures

### Development Workflow

1. **Feature Branches**: Create branches for new features
2. **Pull Requests**: Require PR reviews before merging
3. **CI/CD**: Automate testing and deployment
4. **Staging Environment**: Test in staging before production

---

## Next Steps

After successful setup:

1. ✅ **Configure Environments**
   - Set up development, staging, production
   - Add approval gates for production

2. ✅ **Enable Branch Protection**
   - Require pipeline success before merge
   - Require code reviews

3. ✅ **Set Up Monitoring**
   - Configure Application Insights
   - Set up alerts for failures
   - Monitor performance metrics

4. ✅ **Configure Automated Testing**
   - Add unit tests to pipeline
   - Set up integration tests
   - Configure code coverage reports

5. ✅ **Document Deployment Process**
   - Create runbook for deployments
   - Document rollback procedures
   - Train team members

---

## Useful Links

### Azure DevOps Documentation
- [Azure Pipelines Documentation](https://learn.microsoft.com/en-us/azure/devops/pipelines/)
- [YAML Pipeline Reference](https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/)
- [Service Connections](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints/)

### Visual Studio Integration
- [Connect to Azure DevOps](https://learn.microsoft.com/en-us/azure/devops/user-guide/connect-team-projects)
- [Use Git in Visual Studio](https://learn.microsoft.com/en-us/visualstudio/version-control/git-with-visual-studio)

### Azure Resources
- [Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/)
- [Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [Azure CLI Reference](https://learn.microsoft.com/en-us/cli/azure/)

---

## Support

For issues or questions:

1. Check [Azure DevOps Status](https://status.dev.azure.com/)
2. Review [Azure DevOps Community](https://developercommunity.visualstudio.com/AzureDevOps)
3. Contact your Azure support team
4. Email: <support@caps360.co.za>

---

**Version**: 1.0  
**Last Updated**: January 2025  
**Maintained by**: DevOps Team
