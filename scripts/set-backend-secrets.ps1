# PowerShell script to set backend secrets on Fly.io
# Run this before deploying the backend

$app = "caps360-backend"

Write-Host "Setting secrets for Fly.io app: $app" -ForegroundColor Cyan

# Supabase Configuration
flyctl secrets set -a $app `
  SUPABASE_URL="https://uldvvywrnbzlqdtnmpyk.supabase.co" `
  SUPABASE_ANON_KEY="sb_publishable_xv62FtlS3pwSH8clF39pMw_wZF3WG7c" `
  SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZHZ2eXdybmJ6bHFkdG5tcHlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM2OTM5MiwiZXhwIjoyMDgwOTQ1MzkyfQ.4P0foNODgnvarlViN2QCI0zVpofvYH11o4BymFfKlds"

Write-Host "✓ Supabase credentials set" -ForegroundColor Green

# Authentication
flyctl secrets set -a $app `
  JWT_SECRET="sb_secret_02tZWH7CJvPYBJUlXr3svA_yrZd39t7" `
  JWT_EXPIRES_IN="7d"

Write-Host "✓ JWT configuration set" -ForegroundColor Green

# AI Configuration
flyctl secrets set -a $app `
  GEMINI_API_KEY="AIzaSyCHvttgREd6Ru6hOuAwD6QzQqO6oKiL_nE" `
  GEMINI_MODEL="gemini-1.5-flash"

Write-Host "✓ Gemini AI configuration set" -ForegroundColor Green

# Paystack Configuration (only payment provider)
flyctl secrets set -a $app `
  PAYSTACK_SECRET_KEY="sk_test_66adb4c5bab09c5be7d2cbd1e75cbe0a53707ac0" `
  PAYSTACK_PUBLIC_KEY="pk_test_3587a53505a00ddc9e83a70031d8b04cc29228cb"

Write-Host "✓ Paystack credentials set" -ForegroundColor Green

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
