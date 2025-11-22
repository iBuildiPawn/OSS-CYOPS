# Quick Deployment Guide

This guide shows the easiest ways to deploy CYOPS.

## 🚀 One-Command Deployment (Recommended)

### For Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/iBuildiPawn/OSS-CYOPS/main/deploy.sh | bash
```

### For Windows (PowerShell as Administrator)

```powershell
irm https://raw.githubusercontent.com/iBuildiPawn/OSS-CYOPS/main/deploy.ps1 | iex
```

## ✅ What the Script Does

1. ✅ Checks Docker and Docker Compose are installed
2. ✅ Creates a `cyops` directory
3. ✅ Downloads `docker-compose.yml` and `nginx.conf`
4. ✅ Generates secure random passwords for:
   - Database
   - Redis
   - JWT tokens
   - Session encryption
   - Admin account
5. ✅ Creates `.env` file with all configuration
6. ✅ Pulls pre-built Docker images from Docker Hub
7. ✅ Starts all services
8. ✅ Displays admin credentials

## 🔑 After Installation

1. Open http://localhost in your browser
2. Login with credentials shown at end of installation
3. Change admin password in Profile → Settings
4. Start using CYOPS!

## 📁 What Gets Created

```
cyops/
├── docker-compose.yml      # Container orchestration
├── .env                    # Configuration (contains passwords!)
└── nginx/
    └── nginx.conf         # Reverse proxy config
```

## 🛠️ Management Commands

```bash
# Navigate to installation directory
cd cyops

# View logs
docker compose logs -f

# Stop services
docker compose down

# Restart services
docker compose restart

# Update to latest version
docker compose pull
docker compose up -d

# View running services
docker compose ps
```

## 🔐 Security Notes

- **Passwords are auto-generated** and saved in `.env`
- Keep `.env` file secure - it contains sensitive credentials
- Change admin password after first login
- For production, update `CORS_ORIGINS` in `.env` with your domain

## 📊 Default Configuration

| Setting | Value |
|---------|-------|
| **Admin Email** | admin@cyops.local |
| **Admin Password** | Auto-generated (shown after install) |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Web Port** | 80 (http://localhost) |
| **Registry** | devsenas (Docker Hub) |

## ⚙️ Customization

To customize settings, edit the `.env` file:

```bash
cd cyops
nano .env
# Or: notepad .env (Windows)

# Restart after changes
docker compose restart
```

## 🔄 Updating CYOPS

```bash
cd cyops

# Pull latest images
docker compose pull

# Restart with new images
docker compose up -d
```

## 🗑️ Uninstallation

```bash
cd cyops

# Stop and remove containers
docker compose down

# Remove all data (⚠️ irreversible)
docker compose down -v

# Remove directory
cd ..
rm -rf cyops
```

## 💡 Troubleshooting

### Port 80 Already in Use

Edit `.env` and change ports:

```env
# Expose on different port (e.g., 8080)
# Then access at http://localhost:8080
```

Or stop conflicting service:
```bash
# Windows
net stop http

# Linux
sudo systemctl stop apache2
sudo systemctl stop nginx
```

### Docker Not Running

**Windows:** Start Docker Desktop  
**Linux:** `sudo systemctl start docker`  
**macOS:** Start Docker Desktop from Applications

### Permission Denied (Linux)

Run with sudo or add user to docker group:
```bash
sudo usermod -aG docker $USER
# Logout and login again
```

## 📖 Full Documentation

For detailed information, see:
- [README.md](README.md) - Complete documentation
- [DOCKER_REGISTRY.md](DOCKER_REGISTRY.md) - Building custom images
- [API Documentation](http://localhost/api/v1/docs) - After installation

## ❓ Support

- 🐛 [Report Issues](https://github.com/iBuildiPawn/OSS-CYOPS/issues)
- 💬 [Discussions](https://github.com/iBuildiPawn/OSS-CYOPS/discussions)
- 🐳 [Docker Hub](https://hub.docker.com/u/devsenas)
