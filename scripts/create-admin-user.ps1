# CAPS360 - Create Admin User
# This script creates an admin user in Firestore

Write-Host "👤 CAPS360 - Create Admin User" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$PROJECT_ID = "caps360"

Write-Host "📋 Project: $PROJECT_ID" -ForegroundColor Green
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

# Create a Node.js script to create the admin user
$createUserScript = @"
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

admin.initializeApp({
  projectId: '$PROJECT_ID'
});

const db = admin.firestore();

async function createAdminUser() {
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('$plainPassword', 10);
    
    // Create user document
    const userRef = db.collection('users').doc();
    await userRef.set({
      email: '$adminEmail',
      password: hashedPassword,
      name: '$adminName',
      role: 'admin',
      subscriptionTier: 'premium',
      subscriptionStatus: 'active',
      trialUsed: false,
      welcomePremiumUsed: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('Email:', '$adminEmail');
    console.log('User ID:', userRef.id);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
"@

# Save script temporarily
Set-Content "backend\create-admin.js" $createUserScript

# Run the script
cd backend
node create-admin.js

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
    Write-Host "   Tier:     Premium" -ForegroundColor White
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
Subscription: Premium (Active)

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
Remove-Item "create-admin.js" -ErrorAction SilentlyContinue

cd ..

Write-Host ""
Write-Host "🎉 You can now log in to the platform with your admin credentials!" -ForegroundColor Green
Write-Host ""
