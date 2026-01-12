#!/bin/bash

# CAPS360 Azure Deployment Script (Bash)
# This script deploys the application to Azure (App Service + Static Web Apps)
# Prerequisites:
#   - Azure CLI installed and authenticated (az login)
#   - Docker installed (optional, for container registry)
#   - Appropriate Azure permissions
# Usage: ./deploy-to-azure.sh --environment prod --resource-group <name> --subscription-id <id>

set -e

# Default values
ENVIRONMENT=""
RESOURCE_GROUP=""
SUBSCRIPTION_ID=""
LOCATION="eastus"
SKIP_BUILD=false
SKIP_FRONTEND=false
SKIP_BACKEND=false

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
write_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

write_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

write_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

write_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --resource-group|-g)
            RESOURCE_GROUP="$2"
            shift 2
            ;;
        --subscription-id|-s)
            SUBSCRIPTION_ID="$2"
            shift 2
            ;;
        --location|-l)
            LOCATION="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        --skip-backend)
            SKIP_BACKEND=true
            shift
            ;;
        *)
            write_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate required arguments
if [[ -z "$ENVIRONMENT" || -z "$RESOURCE_GROUP" ]]; then
    write_error "Missing required arguments"
    echo "Usage: $0 --environment <env> --resource-group <rg> [--subscription-id <id>] [--location <loc>]"
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    write_error "Environment must be dev, staging, or prod"
    exit 1
fi

# Check prerequisites
write_info "Checking prerequisites..."

if ! command -v az &> /dev/null; then
    write_error "Azure CLI not found. Please install it first."
    exit 1
fi
write_success "Azure CLI found"

if ! command -v docker &> /dev/null; then
    write_warning "Docker not found - will skip container operations"
fi

# Set subscription if provided
if [[ -n "$SUBSCRIPTION_ID" ]]; then
    write_info "Setting Azure subscription to $SUBSCRIPTION_ID..."
    az account set --subscription "$SUBSCRIPTION_ID"
    write_success "Subscription set"
fi

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

write_info "Project root: $PROJECT_ROOT"
write_info "Environment: $ENVIRONMENT"
write_info "Resource Group: $RESOURCE_GROUP"
write_info "Location: $LOCATION"

# ============================================================================
# PART 1: RESOURCE GROUP AND BASIC INFRASTRUCTURE
# ============================================================================

write_info "========================================"
write_info "Step 1: Creating/Verifying Resource Group"
write_info "========================================"

if az group exists --name "$RESOURCE_GROUP" | grep -q "false"; then
    write_info "Creating resource group '$RESOURCE_GROUP' in $LOCATION..."
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
    write_success "Resource group created"
else
    write_success "Resource group '$RESOURCE_GROUP' already exists"
fi

# ============================================================================
# PART 2: BACKEND DEPLOYMENT
# ============================================================================

if [[ "$SKIP_BACKEND" != "true" ]]; then
    write_info "========================================"
    write_info "Step 2: Deploying Backend"
    write_info "========================================"

    BACKEND_APP_NAME="caps360-backend-${ENVIRONMENT}"
    BACKEND_PLAN_NAME="caps360-plan-${ENVIRONMENT}"
    
    # Create App Service Plan
    write_info "Creating App Service Plan '$BACKEND_PLAN_NAME'..."
    az appservice plan create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$BACKEND_PLAN_NAME" \
        --location "$LOCATION" \
        --sku B2 \
        --is-linux \
        --number-of-workers 1 > /dev/null
    write_success "App Service Plan created"

    # Create Web App for Backend
    write_info "Creating Web App '$BACKEND_APP_NAME'..."
    az webapp create \
        --resource-group "$RESOURCE_GROUP" \
        --plan "$BACKEND_PLAN_NAME" \
        --name "$BACKEND_APP_NAME" \
        --runtime "NODE|20-lts" > /dev/null
    write_success "Web App created"

    # Configure application settings
    write_info "Configuring application settings..."
    SETTINGS=("NODE_ENV=$ENVIRONMENT" "DEPLOYMENT_ENVIRONMENT=$ENVIRONMENT")
    
    # Load environment variables if they exist
    if [[ -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]]; then
        write_info "Loading environment variables from .env.$ENVIRONMENT..."
        while IFS= read -r line; do
            if [[ ! -z "$line" && ! "$line" =~ ^# ]]; then
                SETTINGS+=("$line")
            fi
        done < "$PROJECT_ROOT/.env.$ENVIRONMENT"
    fi

    for setting in "${SETTINGS[@]}"; do
        az webapp config appsettings set \
            --resource-group "$RESOURCE_GROUP" \
            --name "$BACKEND_APP_NAME" \
            --settings "$setting" > /dev/null
    done
    write_success "Application settings configured"

    # Enable Always On
    write_info "Enabling Always On..."
    az webapp config set \
        --resource-group "$RESOURCE_GROUP" \
        --name "$BACKEND_APP_NAME" \
        --always-on true > /dev/null
    write_success "Always On enabled"

    # Build backend if needed
    if [[ "$SKIP_BUILD" != "true" ]]; then
        write_info "Building backend..."
        pushd "$PROJECT_ROOT/backend" > /dev/null
        
        if [[ -d "node_modules" ]]; then
            write_info "Cleaning node_modules..."
            rm -rf node_modules
        fi
        
        npm ci
        npm run build
        
        popd > /dev/null
        write_success "Backend built"
    fi

    # Deploy backend code
    write_info "Deploying backend code to Azure App Service..."
    pushd "$PROJECT_ROOT/backend" > /dev/null
    
    if [[ -d "dist" ]]; then
        # Create deployment package
        ZIP_PATH="$PROJECT_ROOT/backend-deploy.zip"
        [[ -f "$ZIP_PATH" ]] && rm "$ZIP_PATH"
        
        cd dist
        zip -r "$ZIP_PATH" . > /dev/null
        cd ..
        
        # Deploy
        az webapp deployment source config-zip \
            --resource-group "$RESOURCE_GROUP" \
            --name "$BACKEND_APP_NAME" \
            --src "$ZIP_PATH" > /dev/null
        
        rm "$ZIP_PATH"
        write_success "Backend deployed to Azure App Service"
    fi

    popd > /dev/null

    BACKEND_URL="https://${BACKEND_APP_NAME}.azurewebsites.net"
    write_success "Backend deployed at: $BACKEND_URL"
fi

# ============================================================================
# PART 3: FRONTEND DEPLOYMENT
# ============================================================================

if [[ "$SKIP_FRONTEND" != "true" ]]; then
    write_info "========================================"
    write_info "Step 3: Deploying Frontend"
    write_info "========================================"

    STATIC_WEB_APP_NAME="caps360-web-${ENVIRONMENT}"

    # Create Static Web App
    write_info "Creating Static Web App '$STATIC_WEB_APP_NAME'..."
    az staticwebapp create \
        --name "$STATIC_WEB_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" > /dev/null
    write_success "Static Web App created"

    # Build frontend if needed
    if [[ "$SKIP_BUILD" != "true" ]]; then
        write_info "Building frontend..."
        pushd "$PROJECT_ROOT/frontend-web" > /dev/null
        
        if [[ -d "node_modules" ]]; then
            write_info "Cleaning node_modules..."
            rm -rf node_modules
        fi
        
        npm ci
        npm run build
        
        popd > /dev/null
        write_success "Frontend built"
    fi

    # Deploy frontend
    write_info "Deploying frontend to Static Web App..."
    pushd "$PROJECT_ROOT/frontend-web" > /dev/null
    
    if [[ -d "dist" ]]; then
        DEPLOY_TOKEN=$(az staticwebapp secrets list \
            --name "$STATIC_WEB_APP_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --query "properties.apiKey" \
            -o tsv)

        if [[ -n "$DEPLOY_TOKEN" ]]; then
            npm install -g @azure/static-web-apps-cli
            swa deploy --deployment-token "$DEPLOY_TOKEN" --env production
            write_success "Frontend deployed to Static Web App"
        else
            write_warning "Could not retrieve deployment token for Static Web App"
        fi
    fi

    popd > /dev/null

    FRONTEND_URL="https://${STATIC_WEB_APP_NAME}.azurestaticapps.net"
    write_success "Frontend deployed at: $FRONTEND_URL"
fi

# ============================================================================
# PART 4: DATABASE SETUP
# ============================================================================

write_info "========================================"
write_info "Step 4: Database Configuration"
write_info "========================================"

DB_SERVER_NAME="caps360-db-${ENVIRONMENT}"

if ! az postgres server show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DB_SERVER_NAME" &> /dev/null; then
    write_warning "Azure PostgreSQL server not found. Ensure database is configured separately."
    write_info "To create one, run:"
    write_info "az postgres server create --resource-group $RESOURCE_GROUP --name $DB_SERVER_NAME --location $LOCATION --admin-user caps360admin --admin-password <password> --sku-name B_Gen5_1"
else
    write_success "Database server found: $DB_SERVER_NAME"
fi

# ============================================================================
# PART 5: MONITORING AND DIAGNOSTICS
# ============================================================================

write_info "========================================"
write_info "Step 5: Configuring Monitoring"
write_info "========================================"

APP_INSIGHTS_NAME="caps360-insights-${ENVIRONMENT}"

write_info "Creating Application Insights instance '$APP_INSIGHTS_NAME'..."
INSIGHTS_KEY=$(az monitor app-insights component create \
    --app "$APP_INSIGHTS_NAME" \
    --location "$LOCATION" \
    --resource-group "$RESOURCE_GROUP" \
    --query "instrumentationKey" \
    -o tsv 2>/dev/null || echo "")

if [[ -n "$INSIGHTS_KEY" ]]; then
    write_success "Application Insights created"
    
    if [[ "$SKIP_BACKEND" != "true" ]]; then
        az webapp config appsettings set \
            --resource-group "$RESOURCE_GROUP" \
            --name "$BACKEND_APP_NAME" \
            --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$INSIGHTS_KEY" > /dev/null
        write_success "Application Insights linked to backend"
    fi
else
    write_warning "Could not create Application Insights instance"
fi

# ============================================================================
# PART 6: DEPLOYMENT SUMMARY
# ============================================================================

write_info "========================================"
write_info "Step 6: Deployment Summary"
write_info "========================================"

write_success "Deployment completed successfully!"

write_info "Deployment Details:"
write_info "  Environment: $ENVIRONMENT"
write_info "  Resource Group: $RESOURCE_GROUP"
write_info "  Location: $LOCATION"

if [[ "$SKIP_BACKEND" != "true" ]]; then
    write_info "  Backend URL: $BACKEND_URL"
    write_info "  Backend App Name: $BACKEND_APP_NAME"
fi

if [[ "$SKIP_FRONTEND" != "true" ]]; then
    write_info "  Frontend URL: $FRONTEND_URL"
    write_info "  Static Web App Name: $STATIC_WEB_APP_NAME"
fi

echo ""
write_warning "Next Steps:"
write_info "1. Verify deployment health by visiting the URLs above"
write_info "2. Configure custom domain if needed"
write_info "3. Set up SSL/TLS certificates"
write_info "4. Configure CI/CD pipeline in Azure DevOps or GitHub Actions"
write_info "5. Monitor logs and metrics in Application Insights"

echo ""
write_info "Useful Commands:"
write_info "  View backend logs:     az webapp log tail --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME"
write_info "  View frontend logs:    az staticwebapp logs list --resource-group $RESOURCE_GROUP --name $STATIC_WEB_APP_NAME"
write_info "  Monitor health:        az monitor metrics list --resource-group $RESOURCE_GROUP"
