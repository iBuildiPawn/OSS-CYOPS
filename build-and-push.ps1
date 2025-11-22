# Build and Push Docker Images Script for Windows PowerShell
# Usage: .\build-and-push.ps1 -Registry "myusername" -Version "v1.0.0"

param(
    [Parameter(Mandatory=$true)]
    [string]$Registry,
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "latest"
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Building and Pushing CYOPS Images" -ForegroundColor Cyan
Write-Host "Registry: $Registry" -ForegroundColor Cyan
Write-Host "Version: $Version" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Build and push backend
Write-Host ""
Write-Host "Building backend..." -ForegroundColor Yellow
docker build -t "${Registry}/cyops-backend:${Version}" -t "${Registry}/cyops-backend:latest" --target production ./backend

Write-Host "Pushing backend..." -ForegroundColor Yellow
docker push "${Registry}/cyops-backend:${Version}"
docker push "${Registry}/cyops-backend:latest"

# Build and push frontend
Write-Host ""
Write-Host "Building frontend..." -ForegroundColor Yellow
docker build -t "${Registry}/cyops-frontend:${Version}" -t "${Registry}/cyops-frontend:latest" --target production ./frontend

Write-Host "Pushing frontend..." -ForegroundColor Yellow
docker push "${Registry}/cyops-frontend:${Version}"
docker push "${Registry}/cyops-frontend:latest"

# Build and push mcp-server
Write-Host ""
Write-Host "Building mcp-server..." -ForegroundColor Yellow
docker build -t "${Registry}/cyops-mcp-server:${Version}" -t "${Registry}/cyops-mcp-server:latest" ./mcp-server

Write-Host "Pushing mcp-server..." -ForegroundColor Yellow
docker push "${Registry}/cyops-mcp-server:${Version}"
docker push "${Registry}/cyops-mcp-server:latest"

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "All images built and pushed successfully!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Images pushed:" -ForegroundColor White
Write-Host "  - ${Registry}/cyops-backend:${Version}" -ForegroundColor Gray
Write-Host "  - ${Registry}/cyops-backend:latest" -ForegroundColor Gray
Write-Host "  - ${Registry}/cyops-frontend:${Version}" -ForegroundColor Gray
Write-Host "  - ${Registry}/cyops-frontend:latest" -ForegroundColor Gray
Write-Host "  - ${Registry}/cyops-mcp-server:${Version}" -ForegroundColor Gray
Write-Host "  - ${Registry}/cyops-mcp-server:latest" -ForegroundColor Gray
Write-Host ""
Write-Host "To deploy on a new server:" -ForegroundColor White
Write-Host "  1. Copy docker-compose.registry.yml and nginx/ directory" -ForegroundColor Gray
Write-Host "  2. Create .env file with configuration" -ForegroundColor Gray
Write-Host "  3. Set environment variables and run:" -ForegroundColor Gray
Write-Host "       Set DOCKER_REGISTRY=$Registry" -ForegroundColor Gray
Write-Host "       Set IMAGE_TAG=$Version" -ForegroundColor Gray
Write-Host "       docker compose -f docker-compose.registry.yml --profile production up -d" -ForegroundColor Gray
Write-Host ""
