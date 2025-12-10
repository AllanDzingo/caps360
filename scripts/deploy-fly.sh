#!/usr/bin/env bash
set -euo pipefail

BACKEND_APP=${1:-caps360-backend}
FRONTEND_APP=${2:-caps360-frontend}

echo "Ensure you're logged in: run 'flyctl auth login' if needed."

echo "Deploying backend ($BACKEND_APP)"
flyctl deploy -a "$BACKEND_APP" --config fly-backend.toml

echo "Deploying frontend ($FRONTEND_APP)"
flyctl deploy -a "$FRONTEND_APP" --config fly-frontend.toml

echo "Deployment complete. Check https://fly.io/apps"
