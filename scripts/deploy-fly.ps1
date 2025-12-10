# PowerShell helper to deploy apps to Fly.io
param(
  [string] $backendApp = "caps360-backend",
  [string] $frontendApp = "caps360-frontend"
)

Write-Host "Ensure you are logged in: run 'flyctl auth login' if needed."

Write-Host "Deploying backend to Fly.io app: $backendApp"
flyctl deploy -a $backendApp --config fly-backend.toml

Write-Host "Deploying frontend to Fly.io app: $frontendApp"
flyctl deploy -a $frontendApp --config fly-frontend.toml

Write-Host "Deploy finished. Verify apps on https://fly.io/apps" 
