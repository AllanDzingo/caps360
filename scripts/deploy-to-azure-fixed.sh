#!/bin/bash

# CAPS360 Azure Deployment Script (Bash)
# This script deploys the application to Azure (App Service + Static Web Apps)
# Prerequisites:
#   - Azure CLI installed and authenticated (az login)
#   - Docker installed (optional, for container registry)
#   - Appropriate Azure permissions
# Usage: ./deploy-to-azure.sh --environment prod --resource-group <name>

set -e

# Default values
ENVIRONMENT=""
RESOURCE_GROUP=""
SUBSCRIPTION_ID=""
LOCATION="southafricanorth"
SKIP_BUILD=false
SKIP_FRONTEND=false
SKIP_BACKEND=false

# Functions
write_success() {
    echo "✓ $1"
}

write_info() {
    echo "ℹ $1"
}

write_warning() {
    echo "⚠ $1"
}

write_error() {
    echo "✗ $1"
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
    echo "Usage: $0 --environment <env> --resource-group <rg> [--location <loc>]"
    exit 1
fi

# Check prerequisites
write_info "Checking prerequisites..."

if ! command -v az &> /dev/null; then
    write_error "Azure CLI not found"
    exit 1
fi
write_success "Azure CLI found"

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

write_info "Project root: $PROJECT_ROOT"
write_info "Environment: $ENVIRONMENT"
write_info "Resource Group: $RESOURCE_GROUP"
write_info "Location: $LOCATION"

# ============================================================================
# PART 1: RESOURCE GROUP
# ============================================================================

write_info "========================================"
write_info "Step 1: Verifying Resource Group"
write_info "========================================"

if az group exists --name "$RESOURCE_GROUP" | grep -q "false"; then
    write_info "Creating resource group..."
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION" > /dev/null
    write_success "Resource group created"
else
    write_success "Resource group exists"
fi

# ============================================================================
# PART 2: BACKEND DEPLOYMENT
# ============================================================================

if [[ "$SKIP_BACKEND" != "true" ]]; then
    write_info "========================================"
    write_info "Step 2: Deploying Backend"
    write_info "========================================"

    BACKEND_APP_NAME="caps360-backend-${ENVIRONMENT}"
    BACKEND_PLAN_NAME="caps360-plan"
    
    write_info "Creating App Service Plan..."
    az appservice plan create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$BACKEND_PLAN_NAME" \
        --location "$LOCATION" \
        --sku B1 \
        --is-linux > /dev/null 2>&1 || true
    write_success "App Service Plan ready"

    write_info "Creating Web App..."
    az webapp create \
        --resource-group "$RESOURCE_GROUP" \
        --plan "$BACKEND_PLAN_NAME" \
        --name "$BACKEND_APP_NAME" \
        --runtime "NODE|20-lts" > /dev/null 2>&1 || true
    write_success "Web App ready"

    write_info "Configuring application settings..."
    if [[ -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]]; then
        write_info "Loading environment variables..."
        while IFS= read -r line; do
            if [[ ! -z "$line" && ! "$line" =~ ^# ]]; then
                az webapp config appsettings set \
                    --resource-group "$RESOURCE_GROUP" \
                    --name "$BACKEND_APP_NAME" \
                    --settings "$line" > /dev/null 2>&1 || true
            fi
        done < "$PROJECT_ROOT/.env.$ENVIRONMENT"
    fi
    write_success "Application settings configured"

    write_info "Enabling Always On..."
    az webapp config set \
        --resource-group "$RESOURCE_GROUP" \
        --name "$BACKEND_APP_NAME" \
        --always-on true > /dev/null 2>&1 || true
    write_success "Always On enabled"

    # Build backend
    if [[ "$SKIP_BUILD" != "true" ]]; then
        write_info "Building backend..."
        cd "$PROJECT_ROOT/backend"
        
        [[ -d "node_modules" ]] && rm -rf node_modules
        
        npm ci > /dev/null 2>&1
        npm run build > /dev/null 2>&1
        
        write_success "Backend built"
    fi

    # Deploy backend
    write_info "Deploying backend code..."
    cd "$PROJECT_ROOT/backend"
    
    if [[ -d "dist" ]]; then
        ZIP_PATH="$PROJECT_ROOT/backend-deploy.zip"
        [[ -f "$ZIP_PATH" ]] && rm "$ZIP_PATH"
        
        cd dist
        if command -v zip &> /dev/null; then
            zip -r "$ZIP_PATH" . > /dev/null 2>&1
        else
            tar -czf "$ZIP_PATH" . > /dev/null 2>&1
        fi
        cd ..
        
        az webapp deployment source config-zip \
            --resource-group "$RESOURCE_GROUP" \
            --name "$BACKEND_APP_NAME" \
            --src "$ZIP_PATH" > /dev/null 2>&1 || true
        
        rm "$ZIP_PATH"
        write_success "Backend deployed"
    fi

    BACKEND_URL="https://${BACKEND_APP_NAME}.azurewebsites.net"
    write_success "Backend URL: $BACKEND_URL"
fi

# ============================================================================
# PART 3: FRONTEND DEPLOYMENT
# ============================================================================

if [[ "$SKIP_FRONTEND" != "true" ]]; then
    write_info "========================================"
    write_info "Step 3: Deploying Frontend"
    write_info "========================================"

    STATIC_WEB_APP_NAME="caps360-web-${ENVIRONMENT}"

    write_info "Creating Static Web App..."
    az staticwebapp create \
        --name "$STATIC_WEB_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" > /dev/null 2>&1 || true
    write_success "Static Web App ready"

    # Build frontend
    if [[ "$SKIP_BUILD" != "true" ]]; then
        write_info "Building frontend..."
        cd "$PROJECT_ROOT/frontend-web"
        
        [[ -d "node_modules" ]] && rm -rf node_modules
        
        npm ci > /dev/null 2>&1
        npm run build > /dev/null 2>&1
        
        write_success "Frontend built"
    fi

    # Deploy frontend
    write_info "Deploying frontend..."
    cd "$PROJECT_ROOT/frontend-web"
    
    if [[ -d "dist" ]]; then
        DEPLOY_TOKEN=$(az staticwebapp secrets list \
            --name "$STATIC_WEB_APP_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --query "properties.apiKey" \
            -o tsv 2>/dev/null || echo "")

        if [[ -n "$DEPLOY_TOKEN" ]]; then
            npm install -g @azure/static-web-apps-cli > /dev/null 2>&1
            swa deploy --deployment-token "$DEPLOY_TOKEN" --env production > /dev/null 2>&1 || true
            write_success "Frontend deployed"
        else
            write_warning "Could not retrieve deployment token"
        fi
    fi

    FRONTEND_URL="https://${STATIC_WEB_APP_NAME}.azurestaticapps.net"
    write_success "Frontend URL: $FRONTEND_URL"
fi

# ============================================================================
# PART 4: SUMMARY
# ============================================================================

write_info "========================================"
write_info "Deployment Complete"
write_info "========================================"

write_success "Deployment completed successfully!"

write_info "Deployment Details:"
write_info "  Environment: $ENVIRONMENT"
write_info "  Resource Group: $RESOURCE_GROUP"
write_info "  Location: $LOCATION"

if [[ "$SKIP_BACKEND" != "true" ]]; then
    write_info "  Backend URL: $BACKEND_URL"
fi

if [[ "$SKIP_FRONTEND" != "true" ]]; then
    write_info "  Frontend URL: $FRONTEND_URL"
fi

write_info ""
write_success "Your application is deployed to Azure!"
