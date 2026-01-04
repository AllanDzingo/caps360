# scripts/migrate-db.ps1
param (
    [string]$SourceUrl, # Connection string for source DB (e.g., from .env)
    [string]$TargetHost, # Azure DB Host
    [string]$TargetUser, # Azure DB User
    [string]$TargetPassword # Azure DB Password
)

# Load environment variables if not provided
if (-not $SourceUrl) {
    if (Test-Path "backend/.env") {
        Write-Host "Loading .env from backend..."
        Get-Content "backend/.env" | ForEach-Object {
            if ($_ -match "^DATABASE_URL=(.*)") {
                $SourceUrl = $matches[1]
            }
        }
    }
}

if (-not $SourceUrl) {
    Write-Error "DATABASE_URL not found. Please provide -SourceUrl or set it in backend/.env"
    exit 1
}

if (-not $TargetHost) {
    $TargetHost = Read-Host "Enter Azure Database Host (FQDN)"
}
if (-not $TargetUser) {
    $TargetUser = Read-Host "Enter Azure Database User"
}
if (-not $TargetPassword) {
    $TargetPassword = Read-Host "Enter Azure Database Password" -AsSecureString
    $TargetPasswordPTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($TargetPassword)
    $TargetPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($TargetPasswordPTR)
} else {
    $TargetPasswordPlain = $TargetPassword
}

$DumpFile = "dump_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

Write-Host "Creating dump from source..." -ForegroundColor Cyan
# Using pg_dump
# Note: Ensure pg_dump is in your PATH.
$env:PGPASSWORD = $null # Clear first
# Parse source URL for pg_dump if needed, or act smartly.
# Usually pg_dump works with connection string URI directly.
& pg_dump "$SourceUrl" --file="$DumpFile" --no-owner --no-acl --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Error "Dump failed!"
    exit 1
}

Write-Host "Restoring to Azure..." -ForegroundColor Cyan
$env:PGPASSWORD = $TargetPasswordPlain
& psql --host="$TargetHost" --port=5432 --username="$TargetUser" --dbname="caps360" --file="$DumpFile"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Restore failed!"
    exit 1
}

Write-Host "Migration complete!" -ForegroundColor Green
Remove-Item $DumpFile
