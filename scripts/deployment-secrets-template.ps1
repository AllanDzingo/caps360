# CAPS360 Deployment Secrets Template
# Copy this file to deployment-secrets.ps1 and fill in your actual values
# NEVER commit deployment-secrets.ps1 to git!

# ===================================
# REQUIRED SECRETS
# ===================================

# JWT Secret (Generate with: -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ }))
$JWT_SECRET = "YOUR_64_CHARACTER_RANDOM_STRING_HERE"

# AI Service (Choose one - Gemini recommended for cost)
$GEMINI_API_KEY = "AIzaSyC..."  # Get from: https://makersuite.google.com/app/apikey
$OPENAI_API_KEY = ""             # Get from: https://platform.openai.com/api-keys

# ===================================
# AZURE SETTINGS
# ===================================

$ENVIRONMENT = "prod"  # Options: dev, staging, prod
$RESOURCE_GROUP = "caps360-prod"
$LOCATION = "southafricanorth"  # South African region for low latency
$FRONTEND_LOCATION = "westeurope"  # Static Web Apps region

# ===================================
# DATABASE SETTINGS (Optional - will be generated)
# ===================================

$DB_ADMIN_USERNAME = "caps360admin"
$DB_ADMIN_PASSWORD = ""  # Leave empty to auto-generate secure password
$DB_NAME = "caps360"

# ===================================
# PAYMENT PROVIDERS (Optional)
# ===================================

# Paystack - For recurring subscriptions
$PAYSTACK_SECRET_KEY = ""  # Get from: https://dashboard.paystack.com
$PAYSTACK_PUBLIC_KEY = ""

# PayFast - For one-time payments
$PAYFAST_MERCHANT_ID = ""  # Get from: https://www.payfast.co.za
$PAYFAST_MERCHANT_KEY = ""
$PAYFAST_PASSPHRASE = ""  # Optional, set in PayFast dashboard

# ===================================
# AUTHENTICATION (Optional - Supabase)
# ===================================

$SUPABASE_URL = ""  # Get from: https://supabase.com/dashboard
$SUPABASE_ANON_KEY = ""
$SUPABASE_SERVICE_ROLE_KEY = ""

# ===================================
# COMMUNICATION SERVICES (Optional)
# ===================================

# Azure Communication Services - For sending emails
$COMMUNICATION_SERVICES_CONNECTION_STRING = ""

# ===================================
# DEPLOYMENT COMMAND
# ===================================

# Uncomment and run this command after filling in the values above:

<#
.\deploy-master.ps1 `
  -Environment $ENVIRONMENT `
  -ResourceGroup $RESOURCE_GROUP `
  -Location $LOCATION `
  -FrontendLocation $FRONTEND_LOCATION `
  -JwtSecret $JWT_SECRET `
  -GeminiApiKey $GEMINI_API_KEY `
  -OpenAIApiKey $OPENAI_API_KEY `
  -PaystackSecretKey $PAYSTACK_SECRET_KEY `
  -PayfastMerchantId $PAYFAST_MERCHANT_ID `
  -PayfastMerchantKey $PAYFAST_MERCHANT_KEY `
  -PayfastPassphrase $PAYFAST_PASSPHRASE `
  -SupabaseUrl $SUPABASE_URL `
  -SupabaseAnonKey $SUPABASE_ANON_KEY `
  -SupabaseServiceRoleKey $SUPABASE_SERVICE_ROLE_KEY `
  -CommunicationServicesConnectionString $COMMUNICATION_SERVICES_CONNECTION_STRING
#>

# ===================================
# NOTES
# ===================================

# 1. Generate JWT Secret:
#    -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

# 2. You must provide either GEMINI_API_KEY or OPENAI_API_KEY (at least one)

# 3. Payment providers are optional:
#    - Paystack: For recurring monthly/annual subscriptions
#    - PayFast: For one-time trial payments

# 4. Supabase is optional (legacy auth system)

# 5. Azure Communication Services is optional (for sending emails via Azure)

# 6. Keep this file secure and never commit it to version control!

# ===================================
# SECURITY CHECKLIST
# ===================================

# [ ] JWT_SECRET is at least 64 characters
# [ ] All secrets are kept secure
# [ ] This file is in .gitignore
# [ ] Secrets will be rotated after initial deployment
# [ ] Team members have secure access to secrets (e.g., Azure Key Vault)
# [ ] Production secrets are different from dev/staging

# ===================================
# QUICK START
# ===================================

# 1. Copy this file:
#    Copy-Item deployment-secrets-template.ps1 deployment-secrets.ps1

# 2. Edit deployment-secrets.ps1 with your actual values

# 3. Run deployment:
#    . .\deployment-secrets.ps1  # Load variables
#    # Then run the deployment command at the bottom of this file

# 4. After successful deployment, store secrets securely in Azure Key Vault
