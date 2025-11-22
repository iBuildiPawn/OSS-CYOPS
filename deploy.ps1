# CYOPS One-Command Deployment Script for Windows
# Usage: irm https://raw.githubusercontent.com/iBuildiPawn/OSS-CYOPS/main/deploy.ps1 | iex

$ErrorActionPreference = "Stop"

$REGISTRY = "devsenas"
$IMAGE_TAG = "latest"
$PROJECT_DIR = "cyops"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CYOPS Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
try {
    $null = docker --version
    Write-Host "✅ Docker detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Docker is not installed" -ForegroundColor Red
    Write-Host "Please install Docker Desktop: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Yellow
    exit 1
}

# Check if Docker Compose is installed
try {
    $null = docker compose version
    Write-Host "✅ Docker Compose detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Docker Compose is not available" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Create project directory
Write-Host "📁 Creating project directory: $PROJECT_DIR" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $PROJECT_DIR | Out-Null
Set-Location $PROJECT_DIR

# Download docker-compose.yml
Write-Host "📥 Downloading docker-compose.yml..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/iBuildiPawn/OSS-CYOPS/main/docker-compose.registry.yml" -OutFile "docker-compose.yml"

# Create nginx directory and download config
Write-Host "📥 Downloading nginx configuration..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "nginx\ssl" | Out-Null
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/iBuildiPawn/OSS-CYOPS/main/nginx/nginx.conf" -OutFile "nginx\nginx.conf"

# Generate secure secrets
Write-Host "🔐 Generating secure secrets..." -ForegroundColor Yellow

function Get-RandomString {
    param([int]$Length = 32)
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

$JWT_SECRET = Get-RandomString -Length 32
$SESSION_SECRET = Get-RandomString -Length 32
$ENCRYPTION_KEY = (Get-RandomString -Length 32).Substring(0, 32)
$DB_PASSWORD = Get-RandomString -Length 16
$REDIS_PASSWORD = Get-RandomString -Length 16
$ADMIN_PASSWORD = "Admin" + (Get-RandomString -Length 6) + "!"

# Create .env file with defaults
Write-Host "📝 Creating configuration file..." -ForegroundColor Yellow

$envContent = @"
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

# API URL (empty to route through NGINX proxy - DO NOT SET A VALUE)
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
"@

Set-Content -Path ".env" -Value $envContent

Write-Host "✅ Configuration created" -ForegroundColor Green
Write-Host ""

# Pull images
Write-Host "📦 Pulling Docker images (this may take a few minutes)..." -ForegroundColor Yellow
docker compose pull

# Start services
Write-Host "🚀 Starting CYOPS services..." -ForegroundColor Yellow
docker compose --profile production up -d

# Wait for services to be healthy
Write-Host ""
Write-Host "⏳ Waiting for services to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service status
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
docker compose ps

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   ✅ CYOPS Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access CYOPS at: http://localhost" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Admin Credentials:" -ForegroundColor Yellow
Write-Host "   Email:    admin@cyops.local" -ForegroundColor White
Write-Host "   Password: $ADMIN_PASSWORD" -ForegroundColor White
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Access http://localhost in your browser" -ForegroundColor Gray
Write-Host "   2. Login with the credentials above" -ForegroundColor Gray
Write-Host "   3. Change the admin password in Profile settings" -ForegroundColor Gray
Write-Host "   4. Configure email settings if needed" -ForegroundColor Gray
Write-Host ""
Write-Host "💾 Credentials saved to: $PWD\.env" -ForegroundColor White
Write-Host ""
Write-Host "📖 Documentation: https://github.com/iBuildiPawn/OSS-CYOPS" -ForegroundColor White
Write-Host "❓ Support: https://github.com/iBuildiPawn/OSS-CYOPS/issues" -ForegroundColor White
Write-Host ""
Write-Host "To view logs: cd $PROJECT_DIR ; docker compose logs -f" -ForegroundColor Gray
Write-Host "To stop:      cd $PROJECT_DIR ; docker compose down" -ForegroundColor Gray
Write-Host "To restart:   cd $PROJECT_DIR ; docker compose restart" -ForegroundColor Gray
Write-Host ""
