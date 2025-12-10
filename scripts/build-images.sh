#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend-web"

BACKEND_IMAGE=${BACKEND_IMAGE:-caps360-backend:latest}
FRONTEND_IMAGE=${FRONTEND_IMAGE:-caps360-frontend:latest}

echo "Building backend image: $BACKEND_IMAGE"
docker build -t "$BACKEND_IMAGE" "$BACKEND_DIR"

echo "Building frontend image: $FRONTEND_IMAGE"
docker build -t "$FRONTEND_IMAGE" "$FRONTEND_DIR"

if [[ -n "${DOCKER_REGISTRY:-}" ]]; then
  echo "Tagging images for registry $DOCKER_REGISTRY"
  docker tag "$BACKEND_IMAGE" "$DOCKER_REGISTRY/$BACKEND_IMAGE"
  docker tag "$FRONTEND_IMAGE" "$DOCKER_REGISTRY/$FRONTEND_IMAGE"

  if [[ "${DOCKER_PUSH:-false}" == "true" ]]; then
    echo "Pushing images to $DOCKER_REGISTRY"
    docker push "$DOCKER_REGISTRY/$BACKEND_IMAGE"
    docker push "$DOCKER_REGISTRY/$FRONTEND_IMAGE"
  else
    echo "Set DOCKER_PUSH=true to push tagged images to the registry"
  fi
fi

echo "Build complete."
