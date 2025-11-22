#!/bin/bash

# CYOPS One-Command Deployment Script
# Usage: curl -fsSL https://raw.githubusercontent.com/iBuildiPawn/OSS-CYOPS/main/deploy.sh | bash

set -e

REGISTRY="devsenas"
IMAGE_TAG="latest"
PROJECT_DIR="cyops"

echo "========================================"
echo "   CYOPS Deployment Script"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! docker compose version &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed"
    echo "Please install Docker Compose v2"
    exit 1
fi

echo "✅ Docker and Docker Compose detected"
echo ""

# Create project directory
echo "📁 Creating project directory: $PROJECT_DIR"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Download docker-compose.yml
echo "📥 Downloading docker-compose.yml..."
curl -fsSL https://raw.githubusercontent.com/iBuildiPawn/OSS-CYOPS/main/docker-compose.registry.yml -o docker-compose.yml

# Create nginx directory and download config
echo "📥 Downloading nginx configuration..."
mkdir -p nginx/ssl
curl -fsSL https://raw.githubusercontent.com/iBuildiPawn/OSS-CYOPS/main/nginx/nginx.conf -o nginx/ssl/../nginx.conf

# Generate secure secrets
echo "🔐 Generating secure secrets..."
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32 | cut -c1-32)
DB_PASSWORD=$(openssl rand -base64 16)
REDIS_PASSWORD=$(openssl rand -base64 16)
ADMIN_PASSWORD="Admin$(openssl rand -base64 6)!"

# Create .env file with defaults
echo "📝 Creating configuration file..."
cat > .env <<EOF
# Docker Registry Configuration
DOCKER_REGISTRY=$REGISTRY
IMAGE_TAG=$IMAGE_TAG

# Database Configuration
DB_NAME=cyops_production
DB_USER=cyops_user
DB_PASSWORD=$DB_PASSWORD
DB_SSL_MODE=disable

# Redis Configuration
REDIS_PASSWORD=$REDIS_PASSWORD

# Security Configuration (Auto-generated)
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Admin Account
ADMIN_EMAIL=admin@cyops.local
ADMIN_PASSWORD=$ADMIN_PASSWORD
ADMIN_NAME=System Administrator

# Application Configuration
GO_ENV=production
NODE_ENV=production
BUILD_TARGET=production

# CORS Origins (Update with your domain)
CORS_ORIGINS=http://localhost,http://127.0.0.1

# API URL (empty for relative paths)
NEXT_PUBLIC_API_URL=

# Email Configuration (Optional - leave blank if not using)
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
FROM_EMAIL=noreply@cyops.local

# MCP Server Configuration (Optional)
CYOPS_API_KEY=
CYOPS_API_TOKEN=
EOF

echo "✅ Configuration created"
echo ""

# Pull images
echo "📦 Pulling Docker images (this may take a few minutes)..."
docker compose pull

# Start services
echo "🚀 Starting CYOPS services..."
docker compose --profile production up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

# Check service status
echo ""
echo "📊 Service Status:"
docker compose ps

echo ""
echo "========================================"
echo "   ✅ CYOPS Deployment Complete!"
echo "========================================"
echo ""
echo "🌐 Access CYOPS at: http://localhost"
echo ""
echo "🔑 Admin Credentials:"
echo "   Email:    admin@cyops.local"
echo "   Password: $ADMIN_PASSWORD"
echo ""
echo "📋 Next Steps:"
echo "   1. Access http://localhost in your browser"
echo "   2. Login with the credentials above"
echo "   3. Change the admin password in Profile settings"
echo "   4. Configure email settings if needed"
echo ""
echo "💾 Credentials saved to: $PWD/.env"
echo ""
echo "📖 Documentation: https://github.com/iBuildiPawn/OSS-CYOPS"
echo "❓ Support: https://github.com/iBuildiPawn/OSS-CYOPS/issues"
echo ""
echo "To view logs: cd $PROJECT_DIR && docker compose logs -f"
echo "To stop:      cd $PROJECT_DIR && docker compose down"
echo "To restart:   cd $PROJECT_DIR && docker compose restart"
echo ""
