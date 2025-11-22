# Docker Registry Deployment Guide

This guide explains how to build, tag, and push Docker images to a registry (Docker Hub or private registry) so you can deploy without cloning the repository.

## Prerequisites

- Docker installed and running
- Docker registry account (e.g., Docker Hub account)
- Logged into Docker registry: `docker login`

## Services to Publish

The project has 3 custom-built services that need to be published:
1. **backend** - Go/Gin API server
2. **frontend** - Next.js web application
3. **mcp-server** - Model Context Protocol server

## Step 1: Build and Tag Images

Replace `yourusername` with your Docker Hub username or registry URL.

### Build Backend Image
```bash
docker build -t yourusername/cyops-backend:latest -t yourusername/cyops-backend:v1.0.0 --target production ./backend
```

### Build Frontend Image
```bash
docker build -t yourusername/cyops-frontend:latest -t yourusername/cyops-frontend:v1.0.0 --target production ./frontend
```

### Build MCP Server Image
```bash
docker build -t yourusername/cyops-mcp-server:latest -t yourusername/cyops-mcp-server:v1.0.0 ./mcp-server
```

## Step 2: Push Images to Registry

### Push Backend
```bash
docker push yourusername/cyops-backend:latest
docker push yourusername/cyops-backend:v1.0.0
```

### Push Frontend
```bash
docker push yourusername/cyops-frontend:latest
docker push yourusername/cyops-frontend:v1.0.0
```

### Push MCP Server
```bash
docker push yourusername/cyops-mcp-server:latest
docker push yourusername/cyops-mcp-server:v1.0.0
```

## Step 3: Use Pre-built Images

Use the `docker-compose.registry.yml` file for deployment with pre-built images:

```bash
docker compose -f docker-compose.registry.yml --profile production up -d
```

## Automated Build Script

For convenience, you can use the included build script:

### Linux/Mac
```bash
chmod +x ./build-and-push.sh
./build-and-push.sh yourusername v1.0.0
```

### Windows PowerShell
```powershell
.\build-and-push.ps1 -Registry "yourusername" -Version "v1.0.0"
```

## Private Registry

If using a private registry instead of Docker Hub:

```bash
# Login to private registry
docker login registry.example.com

# Build with private registry URL
docker build -t registry.example.com/cyops-backend:latest ./backend

# Push to private registry
docker push registry.example.com/cyops-backend:latest
```

## Environment Variables

Before deploying, create a `.env` file with required configuration:

```env
# Database
DB_NAME=cyops_production
DB_USER=cyops_user
DB_PASSWORD=your_secure_password

# Security (REQUIRED - generate secure random values)
JWT_SECRET=your_jwt_secret_min_32_chars
SESSION_SECRET=your_session_secret_min_32_chars
ENCRYPTION_KEY=your_32_char_encryption_key

# Admin Account
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=YourSecurePassword123!
ADMIN_NAME=System Administrator

# CORS Origins (your domain)
CORS_ORIGINS=https://yourdomain.com

# Optional: Redis password
REDIS_PASSWORD=your_redis_password

# Optional: SMTP for email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@yourcompany.com
```

## Deployment on New Server

1. Install Docker and Docker Compose on the target server
2. Create a project directory: `mkdir cyops && cd cyops`
3. Copy `docker-compose.registry.yml` to the server as `docker-compose.yml`
4. Copy `nginx/` directory (configuration files)
5. Create `.env` file with your configuration
6. Start services: `docker compose --profile production up -d`

## Version Management

Always tag images with both:
- `latest` - for latest stable version
- Semantic version (e.g., `v1.0.0`, `v1.1.0`) - for specific releases

This allows you to:
- Roll back to previous versions if needed
- Track which version is deployed
- Test new versions before promoting to `latest`

## Multi-Architecture Builds (Optional)

To support both AMD64 and ARM64 (e.g., Apple Silicon, AWS Graviton):

```bash
# Create a builder
docker buildx create --use

# Build and push multi-arch image
docker buildx build --platform linux/amd64,linux/arm64 \
  -t yourusername/cyops-backend:latest \
  --push ./backend
```

## CI/CD Integration

You can automate this process using GitHub Actions, GitLab CI, or other CI/CD tools to automatically build and push images on each release.

Example GitHub Actions workflow is available in `.github/workflows/docker-publish.yml` (if configured).
