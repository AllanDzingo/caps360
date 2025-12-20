# CAPS360 - Create Admin User
# This script creates an admin user in Supabase

Write-Host "👤 CAPS360 - Create Admin User (Supabase)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get admin details
Write-Host "Enter admin user details:" -ForegroundColor Yellow
Write-Host ""

$adminEmail = Read-Host "Email address"
$adminPassword = Read-Host "Password" -AsSecureString
$adminName = Read-Host "Full name"

if ([string]::IsNullOrWhiteSpace($adminEmail) -or [string]::IsNullOrWhiteSpace($adminName)) {
  Write-Host "❌ Email and name are required" -ForegroundColor Red
  exit 1
}

# Convert secure string to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPassword)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Creating admin user..." -ForegroundColor Yellow

# Create a temporary TS script to create the admin user
$createUserScript = @"
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { supabaseAdmin, Tables } from './src/config/supabase';
import { UserRole, SubscriptionTier } from './src/models/user.model';

async function createAdminUser() {
  if (!supabaseAdmin) {
      console.error('❌ Supabase Admin client not initialized. Check SUPABASE_SERVICE_ROLE_KEY.');
      process.exit(1);
  }

  try {
    const email = '$adminEmail'.toLowerCase();
    
    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
        .from(Tables.USERS)
        .select('id')
        .eq('email', email)
        .single();
        
    if (existingUser) {
        console.error('❌ User with this email already exists.');
        process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash('$plainPassword', 10);
    
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    // Split name
    const nameParts = '$adminName'.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    const dbUser = {
        id: userId,
        email: email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        role: UserRole.ADMIN,
        current_tier: SubscriptionTier.PREMIUM,
        trial_premium: false,
        welcome_premium: false,
        created_at: now,
        updated_at: now
    };

    const { error } = await supabaseAdmin
        .from(Tables.USERS)
        .insert(dbUser);
    
    if (error) {
        throw new Error(error.message);
    }
    
    console.log('✅ Admin user created successfully!');
    console.log('User ID:', userId);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
"@

# Save script temporarily in backend folder
$scriptPath = "backend\create-admin-temp.ts"
Set-Content $scriptPath $createUserScript

# Run the script using tsx
Push-Location backend
# Ensure environment variables are loaded if needed, though config/index.ts should handle .env if present
# But we might be running this from outside the context where .env is auto-loaded by simple node, 
# 'tsx' usually doesn't auto-load .env unless configured.
# We will rely on backend/src/config/index.ts calling dotenv.config()

npx tsx create-admin-temp.ts

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "✅ Admin user created successfully!" -ForegroundColor Green
  Write-Host ""
  Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
  Write-Host "📋 Admin Credentials" -ForegroundColor Cyan
  Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "   Email:    $adminEmail" -ForegroundColor White
  Write-Host "   Password: $plainPassword" -ForegroundColor White
  Write-Host "   Role:     Admin" -ForegroundColor White
  Write-Host ""
  Write-Host "⚠️  Save these credentials securely!" -ForegroundColor Red
  Write-Host ""
    
  # Save credentials to file
  $credentialsFile = @"
# CAPS360 Admin Credentials
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Email: $adminEmail
Password: $plainPassword
Role: Admin

⚠️  KEEP THIS FILE SECURE - DELETE AFTER SAVING CREDENTIALS
"@
    
  Set-Content "..\ADMIN_CREDENTIALS.txt" $credentialsFile
  Write-Host "📄 Credentials saved to ADMIN_CREDENTIALS.txt" -ForegroundColor Gray
  Write-Host ""
}
else {
  Write-Host ""
  Write-Host "❌ Failed to create admin user" -ForegroundColor Red
}

# Clean up
Remove-Item "create-admin-temp.ts" -ErrorAction SilentlyContinue
Pop-Location

Write-Host ""
Write-Host "To verify, try logging in at the frontend." -ForegroundColor Green
Write-Host ""
