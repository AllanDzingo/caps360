#!/bin/sh
set -e

# Create runtime env.js used by the SPA to read runtime environment variables
cat > /usr/share/nginx/html/env.js <<EOF
window.__env = {
  VITE_API_URL: "${VITE_API_URL:-http://localhost:8080}"
};
EOF

# Start nginx
exec nginx -g "daemon off;"
