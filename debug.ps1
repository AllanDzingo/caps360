Write-Host "Diagnostic Start"
$envFile = ".\frontend-web\.env"
Write-Host "Checking env file at: $envFile"
if (Test-Path $envFile) { Write-Host "Env exists" } else { Write-Host "Env MISSING" }
Write-Host "Checking flyctl..."
Get-Command flyctl | Select-Object -ExpandProperty Source
Write-Host "Diagnostic End"
