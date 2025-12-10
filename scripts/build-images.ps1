param(
  [string] $BackendImage = "caps360-backend:latest",
  [string] $FrontendImage = "caps360-frontend:latest",
  [string] $DockerRegistry = $null,
  [switch] $Push
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$Root = Resolve-Path (Join-Path $ScriptDir "..")
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend-web"

Write-Host "Building backend image: $BackendImage"
docker build -t $BackendImage $BackendDir

Write-Host "Building frontend image: $FrontendImage"
docker build -t $FrontendImage $FrontendDir

if ($DockerRegistry) {
  $backendTag = "$DockerRegistry/$BackendImage"
  $frontendTag = "$DockerRegistry/$FrontendImage"
  docker tag $BackendImage $backendTag
  docker tag $FrontendImage $frontendTag

  if ($Push) {
    Write-Host "Pushing images to $DockerRegistry"
    docker push $backendTag
    docker push $frontendTag
  } else {
    Write-Host "Images tagged for registry. Use -Push to push them."
  }
}

Write-Host "Build script finished."
