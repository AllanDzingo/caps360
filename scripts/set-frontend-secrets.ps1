# PowerShell script to set frontend build-time environment variables on Fly.io
# Run this before deploying the frontend

param(
  [string]$backendUrl = "https://caps360-backend.fly.dev"
)

$app = "caps360-frontend"

Write-Host "Setting build-time secrets for Fly.io app: $app" -ForegroundColor Cyan
Write-Host "Backend URL: $backendUrl" -ForegroundColor Yellow

# Frontend environment variables (used during build)
flyctl secrets set -a $app `
  VITE_API_URL="$backendUrl" `
  VITE_SUPABASE_URL="https://uldvvywrnbzlqdtnmpyk.supabase.co" `
  VITE_SUPABASE_ANON_KEY="sb_publishable_xv62FtlS3pwSH8clF39pMw_wZF3WG7c" `
  VITE_PAYSTACK_PUBLIC_KEY="pk_test_3587a53505a00ddc9e83a70031d8b04cc29228cb"

Write-Host "✓ Frontend environment variables set" -ForegroundColor Green

Write-Host "`n✅ All frontend secrets configured successfully!" -ForegroundColor Green
Write-Host "You can now deploy the frontend with: flyctl deploy -a $app --config fly-frontend.toml" -ForegroundColor Cyan
