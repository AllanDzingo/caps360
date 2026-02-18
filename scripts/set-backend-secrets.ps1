# PowerShell script to set backend secrets on Fly.io
# Run this before deploying the backend

$app = "caps360-backend"

Write-Host "Setting secrets for Fly.io app: $app" -ForegroundColor Cyan

# Paystack Configuration (only payment provider)
# Replace with your actual keys OR ensure they are set in your environment
$PAYSTACK_SECRET_KEY = $env:PAYSTACK_SECRET_KEY
$PAYSTACK_PUBLIC_KEY = $env:PAYSTACK_PUBLIC_KEY

if (-not $PAYSTACK_SECRET_KEY) {
  $PAYSTACK_SECRET_KEY = Read-Host "Enter Paystack Secret Key"
}
if (-not $PAYSTACK_PUBLIC_KEY) {
  $PAYSTACK_PUBLIC_KEY = Read-Host "Enter Paystack Public Key"
}

flyctl secrets set -a $app `
  PAYSTACK_SECRET_KEY="$PAYSTACK_SECRET_KEY" `
  PAYSTACK_PUBLIC_KEY="$PAYSTACK_PUBLIC_KEY"

Write-Host "✓ Paystack credentials set" -ForegroundColor Green

# AI Configuration
$GEMINI_API_KEY = $env:GEMINI_API_KEY
if (-not $GEMINI_API_KEY) {
  $GEMINI_API_KEY = Read-Host "Enter Gemini API Key"
}

flyctl secrets set -a $app `
  GEMINI_API_KEY="$GEMINI_API_KEY" `
  GEMINI_MODEL="gemini-1.5-flash"

Write-Host "✓ Gemini AI configuration set" -ForegroundColor Green

# Supabase Configuration
$SUPABASE_URL = "https://uldvvywrnbzlqdtnmpyk.supabase.co"
$SUPABASE_ANON_KEY = $env:SUPABASE_ANON_KEY
$SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SUPABASE_ANON_KEY) {
  $SUPABASE_ANON_KEY = Read-Host "Enter Supabase Anon Key"
}
if (-not $SUPABASE_SERVICE_ROLE_KEY) {
  $SUPABASE_SERVICE_ROLE_KEY = Read-Host "Enter Supabase Service Role Key"
}

flyctl secrets set -a $app `
  SUPABASE_URL="$SUPABASE_URL" `
  SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" `
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

Write-Host "✓ Supabase credentials set" -ForegroundColor Green

# Authentication
$JWT_SECRET = $env:JWT_SECRET
if (-not $JWT_SECRET) {
  $JWT_SECRET = Read-Host "Enter JWT Secret"
}

flyctl secrets set -a $app `
  JWT_SECRET="$JWT_SECRET" `
  JWT_EXPIRES_IN="7d"

Write-Host "✓ JWT configuration set" -ForegroundColor Green

# Subscription Plans (in cents)
flyctl secrets set -a $app `
  STUDY_HELP_PRICE="3900" `
  STANDARD_PRICE="9900" `
  PREMIUM_PRICE="14900"

Write-Host "✓ Subscription pricing set" -ForegroundColor Green

# Trial Configuration
flyctl secrets set -a $app `
  TRIAL_DURATION_DAYS="14" `
  WELCOME_PREMIUM_DAYS="14"

Write-Host "✓ Trial configuration set" -ForegroundColor Green

# Rate Limiting
flyctl secrets set -a $app `
  RATE_LIMIT_WINDOW_MS="900000" `
  RATE_LIMIT_MAX_REQUESTS="100"

Write-Host "✓ Rate limiting configuration set" -ForegroundColor Green

# Logging
flyctl secrets set -a $app `
  LOG_LEVEL="info"

Write-Host "✓ Logging configuration set" -ForegroundColor Green

Write-Host "`n✅ All backend secrets configured successfully!" -ForegroundColor Green
Write-Host "You can now deploy the backend with: flyctl deploy -a $app --config fly-backend.toml" -ForegroundColor Cyan
