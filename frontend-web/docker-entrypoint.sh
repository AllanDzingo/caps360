#!/bin/sh

# Create the env.js file with environment variables
# This allows for dynamic environment variables in a static build

ENV_FILE="/usr/share/nginx/html/env.js"


# Set default for VITE_API_URL if not provided
if [ -z "$VITE_API_URL" ]; then
	VITE_API_URL="https://caps360-backend.fly.dev"
fi

echo "window.__env = {" > $ENV_FILE
echo "  VITE_API_URL: \"${VITE_API_URL}\"," >> $ENV_FILE
echo "  VITE_SUPABASE_URL: \"${VITE_SUPABASE_URL}\"," >> $ENV_FILE
echo "  VITE_SUPABASE_ANON_KEY: \"${VITE_SUPABASE_ANON_KEY}\"," >> $ENV_FILE
echo "  VITE_PAYSTACK_PUBLIC_KEY: \"${VITE_PAYSTACK_PUBLIC_KEY}\"" >> $ENV_FILE
echo "};" >> $ENV_FILE

echo "Checking generated env.js:"
cat $ENV_FILE

# Execute the CMD from the Dockerfile
exec "$@"
