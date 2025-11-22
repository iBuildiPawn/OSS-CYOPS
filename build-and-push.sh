#!/bin/bash

# Build and Push Docker Images Script
# Usage: ./build-and-push.sh <registry-username> <version>
# Example: ./build-and-push.sh myusername v1.0.0

set -e

# Check arguments
if [ -z "$1" ]; then
    echo "Error: Docker registry username/URL required"
    echo "Usage: ./build-and-push.sh <registry-username> <version>"
    echo "Example: ./build-and-push.sh myusername v1.0.0"
    exit 1
fi

REGISTRY=$1
VERSION=${2:-latest}

echo "======================================"
echo "Building and Pushing CYOPS Images"
echo "Registry: $REGISTRY"
echo "Version: $VERSION"
echo "======================================"

# Build and push backend
echo ""
echo "📦 Building backend..."
docker build -t $REGISTRY/cyops-backend:$VERSION -t $REGISTRY/cyops-backend:latest --target production ./backend

echo "⬆️  Pushing backend..."
docker push $REGISTRY/cyops-backend:$VERSION
docker push $REGISTRY/cyops-backend:latest

# Build and push frontend
echo ""
echo "📦 Building frontend..."
docker build -t $REGISTRY/cyops-frontend:$VERSION -t $REGISTRY/cyops-frontend:latest --target production ./frontend

echo "⬆️  Pushing frontend..."
docker push $REGISTRY/cyops-frontend:$VERSION
docker push $REGISTRY/cyops-frontend:latest

# Build and push mcp-server
echo ""
echo "📦 Building mcp-server..."
docker build -t $REGISTRY/cyops-mcp-server:$VERSION -t $REGISTRY/cyops-mcp-server:latest ./mcp-server

echo "⬆️  Pushing mcp-server..."
docker push $REGISTRY/cyops-mcp-server:$VERSION
docker push $REGISTRY/cyops-mcp-server:latest

echo ""
echo "======================================"
echo "✅ All images built and pushed successfully!"
echo "======================================"
echo ""
echo "Images pushed:"
echo "  - $REGISTRY/cyops-backend:$VERSION"
echo "  - $REGISTRY/cyops-backend:latest"
echo "  - $REGISTRY/cyops-frontend:$VERSION"
echo "  - $REGISTRY/cyops-frontend:latest"
echo "  - $REGISTRY/cyops-mcp-server:$VERSION"
echo "  - $REGISTRY/cyops-mcp-server:latest"
echo ""
echo "To deploy on a new server:"
echo "  1. Copy docker-compose.registry.yml and nginx/ directory"
echo "  2. Create .env file with configuration"
echo "  3. Run: DOCKER_REGISTRY=$REGISTRY IMAGE_TAG=$VERSION docker compose -f docker-compose.registry.yml --profile production up -d"
echo ""
