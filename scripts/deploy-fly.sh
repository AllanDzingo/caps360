#!/usr/bin/env bash
set -euo pipefail

BACKEND_APP=${1:-caps360-backend}
FRONTEND_APP=${2:-caps360-frontend}

echo "🚀 CAPS360 Fly.io Deployment Script"
echo "===================================="

# Check if logged in
echo "Checking Fly.io authentication..."
if ! flyctl auth whoami &>/dev/null; then
    echo "❌ Not logged in to Fly.io. Please run: flyctl auth login"
    exit 1
fi
echo "✅ Authenticated"

# Function to check if app exists
app_exists() {
    flyctl apps list | grep -q "^$1"
}

# Create backend app if it doesn't exist
echo ""
echo "Checking backend app ($BACKEND_APP)..."
if app_exists "$BACKEND_APP"; then
    echo "✅ Backend app exists"
else
    echo "📦 Creating backend app..."
    flyctl apps create "$BACKEND_APP" --org personal || true
fi

# Create frontend app if it doesn't exist
echo ""
echo "Checking frontend app ($FRONTEND_APP)..."
if app_exists "$FRONTEND_APP"; then
    echo "✅ Frontend app exists"
else
    echo "📦 Creating frontend app..."
    flyctl apps create "$FRONTEND_APP" --org personal || true
fi

# Set backend secrets (if not already set)
echo ""
echo "⚙️  Setting backend secrets..."
echo "Note: You may need to set these manually if not already configured:"
echo "  flyctl secrets set JWT_SECRET=your-secret --app $BACKEND_APP"
echo "  flyctl secrets set GEMINI_API_KEY=your-key --app $BACKEND_APP"
echo ""
read -p "Press Enter to continue with deployment..."

# Deploy backend
echo ""
echo "🚀 Deploying backend ($BACKEND_APP)..."
cd backend
flyctl deploy -a "$BACKEND_APP" --ha=false
cd ..

# Get backend URL
BACKEND_URL=$(flyctl apps list | grep "$BACKEND_APP" | awk '{print "https://" $2 ".fly.dev"}')
echo "✅ Backend deployed: $BACKEND_URL"

# Deploy frontend
echo ""
echo "🚀 Deploying frontend ($FRONTEND_APP)..."
cd frontend-web
flyctl deploy -a "$FRONTEND_APP" --ha=false
cd ..

# Get frontend URL
FRONTEND_URL=$(flyctl apps list | grep "$FRONTEND_APP" | awk '{print "https://" $2 ".fly.dev"}')
echo "✅ Frontend deployed: $FRONTEND_URL"

# Post-deployment verification
echo ""
echo "🔍 Verifying deployments..."
echo ""

# Check backend health
echo "Checking backend health..."
sleep 5
if curl -f -s "$BACKEND_URL/health" > /dev/null; then
    echo "✅ Backend health check passed"
else
    echo "⚠️  Backend health check failed - checking logs..."
    flyctl logs -a "$BACKEND_APP" --limit 20
fi

# Check frontend
echo "Checking frontend..."
if curl -f -s "$FRONTEND_URL/health" > /dev/null; then
    echo "✅ Frontend health check passed"
else
    echo "⚠️  Frontend health check failed - checking logs..."
    flyctl logs -a "$FRONTEND_APP" --limit 20
fi

echo ""
echo "======================================"
echo "🎉 Deployment complete!"
echo ""
echo "📱 Frontend: $FRONTEND_URL"
echo "🔧 Backend:  $BACKEND_URL"
echo ""
echo "Next steps:"
echo "1. Update FRONTEND_URL secret in backend:"
echo "   flyctl secrets set FRONTEND_URL=$FRONTEND_URL --app $BACKEND_APP"
echo ""
echo "2. Check app status:"
echo "   flyctl status --app $BACKEND_APP"
echo "   flyctl status --app $FRONTEND_APP"
echo ""
echo "3. View logs:"
echo "   flyctl logs --app $BACKEND_APP"
echo "   flyctl logs --app $FRONTEND_APP"
echo ""
echo "4. Open apps:"
echo "   flyctl open --app $FRONTEND_APP"
echo "======================================"

