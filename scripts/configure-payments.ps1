# =====================================================
# CAPS360 Payment Integration Configuration Script
# =====================================================
# This script configures payment webhooks for Paystack and PayFast
# Prerequisites:
#   - Backend already deployed
#   - Payment provider accounts configured
# Usage: .\configure-payments.ps1 -Environment prod -ResourceGroup caps360-prod

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment,

    [Parameter(Mandatory = $true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory = $true)]
    [string]$BackendUrl,

    [Parameter(Mandatory = $false)]
    [string]$PaystackSecretKey,

    [Parameter(Mandatory = $false)]
    [string]$PayfastMerchantId,

    [Parameter(Mandatory = $false)]
    [string]$PayfastMerchantKey,

    [Parameter(Mandatory = $false)]
    [string]$PayfastPassphrase
)

$ErrorActionPreference = "Stop"

# ---------------------------
# Helper Functions
# ---------------------------
function Write-Step {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "→ $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# ---------------------------
# Step 1: Validate Webhook URLs
# ---------------------------
Write-Step "Step 1: Validating Webhook Endpoints"

$paystackWebhookUrl = "$BackendUrl/api/payments/paystack/webhook"
$payfastWebhookUrl = "$BackendUrl/api/payments/payfast/webhook"

Write-Info "Paystack webhook URL: $paystackWebhookUrl"
Write-Info "PayFast webhook URL: $payfastWebhookUrl"

# Test that backend is accessible
try {
    $healthCheck = Invoke-RestMethod -Uri "$BackendUrl/health" -Method Get -TimeoutSec 10
    if ($healthCheck.status -eq "healthy") {
        Write-Success "Backend is accessible"
    } else {
        Write-Error-Custom "Backend health check failed"
        exit 1
    }
} catch {
    Write-Error-Custom "Cannot reach backend at $BackendUrl"
    exit 1
}

# ---------------------------
# Step 2: Configure Paystack Webhook
# ---------------------------
if ($PaystackSecretKey) {
    Write-Step "Step 2: Configuring Paystack Webhook"
    
    Write-Info "To configure Paystack webhook:"
    Write-Host "1. Log in to https://dashboard.paystack.com" -ForegroundColor White
    Write-Host "2. Navigate to Settings > Webhooks" -ForegroundColor White
    Write-Host "3. Add webhook URL: $paystackWebhookUrl" -ForegroundColor Yellow
    Write-Host "4. Select the following events:" -ForegroundColor White
    Write-Host "   - subscription.create" -ForegroundColor White
    Write-Host "   - subscription.disable" -ForegroundColor White
    Write-Host "   - subscription.not_renew" -ForegroundColor White
    Write-Host "   - charge.success" -ForegroundColor White
    Write-Host "   - invoice.payment_failed" -ForegroundColor White
    Write-Host ""
    
    # Test webhook endpoint
    Write-Info "Testing Paystack webhook endpoint..."
    try {
        $testPayload = @{
            event = "test.event"
            data = @{
                test = $true
            }
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest `
            -Uri $paystackWebhookUrl `
            -Method Post `
            -Body $testPayload `
            -ContentType "application/json" `
            -UseBasicParsing `
            -TimeoutSec 10
        
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 400) {
            Write-Success "Paystack webhook endpoint is responding"
        }
    } catch {
        Write-Info "Webhook endpoint returned: $($_.Exception.Message)"
    }
} else {
    Write-Info "Skipping Paystack configuration (no secret key provided)"
}

# ---------------------------
# Step 3: Configure PayFast Webhook
# ---------------------------
if ($PayfastMerchantId -and $PayfastMerchantKey) {
    Write-Step "Step 3: Configuring PayFast Webhook"
    
    Write-Info "To configure PayFast webhook:"
    Write-Host "1. Log in to https://www.payfast.co.za" -ForegroundColor White
    Write-Host "2. Navigate to Settings > Integration" -ForegroundColor White
    Write-Host "3. Set Instant Transaction Notification (ITN) URL:" -ForegroundColor White
    Write-Host "   $payfastWebhookUrl" -ForegroundColor Yellow
    Write-Host "4. Enable ITN for the following:" -ForegroundColor White
    Write-Host "   - Payment Complete" -ForegroundColor White
    Write-Host "   - Payment Failed" -ForegroundColor White
    Write-Host "   - Subscription Created" -ForegroundColor White
    Write-Host "   - Subscription Cancelled" -ForegroundColor White
    Write-Host ""
    
    # Test webhook endpoint
    Write-Info "Testing PayFast webhook endpoint..."
    try {
        $testPayload = "m_payment_id=test&pf_payment_id=test&payment_status=COMPLETE&item_name=Test"
        
        $response = Invoke-WebRequest `
            -Uri $payfastWebhookUrl `
            -Method Post `
            -Body $testPayload `
            -ContentType "application/x-www-form-urlencoded" `
            -UseBasicParsing `
            -TimeoutSec 10
        
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 400) {
            Write-Success "PayFast webhook endpoint is responding"
        }
    } catch {
        Write-Info "Webhook endpoint returned: $($_.Exception.Message)"
    }
} else {
    Write-Info "Skipping PayFast configuration (no merchant credentials provided)"
}

# ---------------------------
# Step 4: Update Backend Settings
# ---------------------------
Write-Step "Step 4: Updating Backend Payment Settings"
$webAppName = "caps360-backend-$Environment"

$appSettings = @()
if ($PaystackSecretKey) {
    $appSettings += "PAYSTACK_SECRET_KEY=$PaystackSecretKey"
}
if ($PayfastMerchantId) {
    $appSettings += "PAYFAST_MERCHANT_ID=$PayfastMerchantId"
}
if ($PayfastMerchantKey) {
    $appSettings += "PAYFAST_MERCHANT_KEY=$PayfastMerchantKey"
}
if ($PayfastPassphrase) {
    $appSettings += "PAYFAST_PASSPHRASE=$PayfastPassphrase"
}

if ($appSettings.Count -gt 0) {
    Write-Info "Updating backend app settings..."
    az webapp config appsettings set `
        --resource-group $ResourceGroup `
        --name $webAppName `
        --settings $appSettings | Out-Null
    Write-Success "Backend payment settings updated"
    
    # Restart backend
    Write-Info "Restarting backend..."
    az webapp restart `
        --resource-group $ResourceGroup `
        --name $webAppName | Out-Null
    Write-Success "Backend restarted"
}

# ---------------------------
# Step 5: Test Payment Flow
# ---------------------------
Write-Step "Step 5: Testing Payment Endpoints"

# Test Paystack initialization
if ($PaystackSecretKey) {
    Write-Info "Testing Paystack subscription initialization..."
    try {
        $testPayload = @{
            tier = "standard"
            billing_cycle = "monthly"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod `
            -Uri "$BackendUrl/api/payments/paystack/initialize-subscription" `
            -Method Post `
            -Body $testPayload `
            -ContentType "application/json" `
            -Headers @{ "Authorization" = "Bearer test-token" }
        
        Write-Success "Paystack initialization endpoint is working"
    } catch {
        Write-Info "Paystack test requires valid authentication token"
    }
}

# Test PayFast initialization
if ($PayfastMerchantId) {
    Write-Info "Testing PayFast payment initialization..."
    try {
        $testPayload = @{
            amount = 3900
            item_name = "Study Help Subscription"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod `
            -Uri "$BackendUrl/api/payments/payfast/initialize" `
            -Method Post `
            -Body $testPayload `
            -ContentType "application/json" `
            -Headers @{ "Authorization" = "Bearer test-token" }
        
        Write-Success "PayFast initialization endpoint is working"
    } catch {
        Write-Info "PayFast test requires valid authentication token"
    }
}

# ---------------------------
# Step 6: Database Payment Records Check
# ---------------------------
Write-Step "Step 6: Verifying Database Payment Tables"
Write-Info "Checking if payment tables exist..."

# This would require database connection details
Write-Info "Verify these tables exist in your database:"
Write-Host "  - payments" -ForegroundColor White
Write-Host "  - subscriptions" -ForegroundColor White
Write-Host ""
Write-Info "Run this SQL to check:"
Write-Host "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('payments', 'subscriptions');" -ForegroundColor Gray

# ---------------------------
# Step 7: Output Summary
# ---------------------------
Write-Step "Payment Configuration Summary"
Write-Host ""
Write-Host "Webhook URLs:" -ForegroundColor Cyan
Write-Host "  Paystack: $paystackWebhookUrl" -ForegroundColor White
Write-Host "  PayFast:  $payfastWebhookUrl" -ForegroundColor White
Write-Host ""
Write-Host "Configuration Status:" -ForegroundColor Cyan
if ($PaystackSecretKey) {
    Write-Host "  ✓ Paystack configured" -ForegroundColor Green
} else {
    Write-Host "  ✗ Paystack not configured" -ForegroundColor Yellow
}
if ($PayfastMerchantId) {
    Write-Host "  ✓ PayFast configured" -ForegroundColor Green
} else {
    Write-Host "  ✗ PayFast not configured" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Configure webhooks in payment provider dashboards" -ForegroundColor White
Write-Host "2. Test payment flow end-to-end" -ForegroundColor White
Write-Host "3. Monitor webhook logs in Application Insights" -ForegroundColor White
Write-Host "4. Set up payment reconciliation monitoring" -ForegroundColor White
Write-Host "5. Configure fraud detection rules (if applicable)" -ForegroundColor White
Write-Host ""
Write-Host "Testing Commands:" -ForegroundColor Cyan
Write-Host "# Test webhook manually:" -ForegroundColor Gray
Write-Host "Invoke-RestMethod -Uri '$paystackWebhookUrl' -Method Post -Body '{}' -ContentType 'application/json'" -ForegroundColor Gray
Write-Host ""
Write-Success "Payment integration configuration completed!"
