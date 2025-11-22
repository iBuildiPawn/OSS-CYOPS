# Troubleshooting Guide

Common issues and their solutions when deploying CYOPS.

## 🔴 Login Issues

### ERR_CONNECTION_REFUSED when trying to login

**Symptom:**
```
POST http://localhost:8080/api/v1/auth/login net::ERR_CONNECTION_REFUSED
```

**Cause:** Frontend is trying to connect directly to backend port 8080 instead of using NGINX reverse proxy.

**Solution:**

1. **If you just deployed**, re-run the deployment script:
   ```powershell
   # Windows
   irm https://raw.githubusercontent.com/iBuildiPawn/OSS-CYOPS/main/deploy.ps1 | iex
   
   # Linux/Mac
   curl -fsSL https://raw.githubusercontent.com/iBuildiPawn/OSS-CYOPS/main/deploy.sh | bash
   ```

2. **If you deployed manually**, check your `.env` file:
   ```bash
   cd cyops
   nano .env  # or notepad .env on Windows
   ```
   
   Ensure this line is empty (no value after `=`):
   ```env
   NEXT_PUBLIC_API_URL=
   ```
   
   Then restart:
   ```bash
   docker compose restart frontend
   ```

3. **Verify NGINX is running:**
   ```bash
   docker compose ps nginx
   ```
   
   Should show "Up" status. If not:
   ```bash
   docker compose --profile production up -d
   ```

---

## 🔴 Port Conflicts

### Port 80 already in use

**Symptom:**
```
Error starting userland proxy: listen tcp4 0.0.0.0:80: bind: address already in use
```

**Solution:**

**Option 1: Stop conflicting service**

Windows:
```powershell
# Check what's using port 80
netstat -ano | findstr :80
# Stop IIS if running
net stop was /y
# Or stop other web servers
```

Linux:
```bash
# Check what's using port 80
sudo lsof -i :80
# Stop Apache
sudo systemctl stop apache2
# Or stop NGINX
sudo systemctl stop nginx
```

**Option 2: Use different port**

Edit `docker-compose.yml` or `docker-compose.registry.yml`:
```yaml
nginx:
  ports:
    - "8080:80"  # Change from 80:80 to 8080:80
```

Then access at `http://localhost:8080`

---

## 🔴 Database Connection Issues

### Backend can't connect to database

**Symptom:**
```
Error: failed to connect to database
```

**Solution:**

1. **Check if PostgreSQL is running:**
   ```bash
   docker compose ps postgres
   ```

2. **Check database logs:**
   ```bash
   docker compose logs postgres
   ```

3. **Verify database credentials in `.env`:**
   ```env
   DB_HOST=postgres
   DB_PORT=5432
   DB_NAME=cyops_production
   DB_USER=cyops_user
   DB_PASSWORD=<your-password>
   ```

4. **Restart services in correct order:**
   ```bash
   docker compose restart postgres
   # Wait 10 seconds
   docker compose restart backend
   ```

---

## 🔴 Service Won't Start

### Container keeps restarting

**Solution:**

1. **Check logs for specific service:**
   ```bash
   docker compose logs backend
   docker compose logs frontend
   docker compose logs postgres
   ```

2. **Check resource usage:**
   ```bash
   docker stats
   ```
   
   Ensure you have:
   - At least 4GB RAM available
   - 10GB free disk space

3. **Recreate containers:**
   ```bash
   docker compose down
   docker compose --profile production up -d
   ```

---

## 🔴 Images Won't Pull

### Failed to pull Docker images

**Symptom:**
```
Error response from daemon: manifest not found
```

**Solution:**

1. **Check internet connection**

2. **Verify registry in `.env`:**
   ```env
   DOCKER_REGISTRY=devsenas
   IMAGE_TAG=latest
   ```

3. **Try pulling manually:**
   ```bash
   docker pull devsenas/cyops-backend:latest
   docker pull devsenas/cyops-frontend:latest
   docker pull devsenas/cyops-mcp-server:latest
   ```

4. **If still failing, build from source:**
   ```bash
   git clone https://github.com/iBuildiPawn/OSS-CYOPS.git
   cd OSS-CYOPS
   cp .env.example .env
   docker compose --profile production up -d
   ```

---

## 🔴 Permission Denied (Linux)

### Docker permission errors

**Symptom:**
```
permission denied while trying to connect to the Docker daemon
```

**Solution:**

1. **Add user to docker group:**
   ```bash
   sudo usermod -aG docker $USER
   ```

2. **Logout and login again** (or reboot)

3. **Or run with sudo:**
   ```bash
   sudo docker compose --profile production up -d
   ```

---

## 🔴 Blank Page / White Screen

### Frontend shows blank page

**Solution:**

1. **Check browser console** (F12) for errors

2. **Verify frontend is running:**
   ```bash
   docker compose ps frontend
   ```

3. **Check frontend logs:**
   ```bash
   docker compose logs frontend
   ```

4. **Clear browser cache:**
   - Press `Ctrl+Shift+Delete`
   - Clear cache and reload

5. **Restart frontend:**
   ```bash
   docker compose restart frontend
   ```

---

## 🔴 SSL/HTTPS Issues

### "Your connection is not private" warning

**This is expected** if you haven't configured SSL certificates.

**Solutions:**

1. **For testing:** Click "Advanced" → "Proceed to localhost"

2. **For production:** Add SSL certificates:
   ```bash
   cd cyops
   mkdir -p nginx/ssl
   # Copy your certificates
   cp /path/to/fullchain.pem nginx/ssl/
   cp /path/to/privkey.pem nginx/ssl/
   
   # Update nginx.conf to enable HTTPS
   # Restart NGINX
   docker compose restart nginx
   ```

3. **Use Let's Encrypt (Linux):**
   ```bash
   # Install certbot
   sudo apt install certbot
   
   # Get certificate
   sudo certbot certonly --standalone -d yourdomain.com
   
   # Certificates will be in /etc/letsencrypt/live/yourdomain.com/
   ```

---

## 🔴 Admin Login Not Working

### Can't login with admin credentials

**Solution:**

1. **Check admin password in `.env`:**
   ```bash
   cd cyops
   cat .env | grep ADMIN_PASSWORD
   ```

2. **Verify admin was created:**
   ```bash
   docker compose logs backend | grep -i admin
   ```

3. **Reset admin password:**
   ```bash
   # Stop services
   docker compose down
   
   # Edit .env and change ADMIN_PASSWORD
   nano .env
   
   # Remove database volume (⚠️ deletes all data)
   docker volume rm cyops_postgres_data
   
   # Start again
   docker compose --profile production up -d
   ```

---

## 🔴 Slow Performance

### Application is slow or unresponsive

**Solution:**

1. **Check resource usage:**
   ```bash
   docker stats
   ```

2. **Increase Docker resources:**
   - **Docker Desktop:** Settings → Resources → Increase CPU/Memory
   - **Linux:** Edit `/etc/docker/daemon.json`

3. **Check database indexes:**
   ```bash
   # Connect to database
   docker compose exec postgres psql -U cyops_user -d cyops_production
   
   # Check if indexes exist
   \di
   ```

4. **Clear Redis cache:**
   ```bash
   docker compose exec redis redis-cli FLUSHALL
   ```

---

## 🔴 Data Loss / Reset Needed

### Need to completely reset CYOPS

**⚠️ WARNING: This deletes ALL data**

```bash
cd cyops

# Stop all services
docker compose down

# Remove all volumes (deletes database, uploads, etc.)
docker compose down -v

# Remove the directory
cd ..
rm -rf cyops  # Linux/Mac
# or
Remove-Item -Recurse -Force cyops  # Windows PowerShell

# Start fresh
# Re-run deployment script
```

---

## 🔴 Update Issues

### Can't update to latest version

**Solution:**

1. **Pull latest images:**
   ```bash
   cd cyops
   docker compose pull
   ```

2. **Recreate containers:**
   ```bash
   docker compose --profile production up -d
   ```

3. **If still issues, rebuild:**
   ```bash
   docker compose down
   docker compose build --no-cache
   docker compose --profile production up -d
   ```

---

## 📊 Useful Commands

### View all logs
```bash
docker compose logs -f
```

### View specific service logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Check service status
```bash
docker compose ps
```

### Restart a service
```bash
docker compose restart backend
```

### Execute command in container
```bash
docker compose exec backend sh
docker compose exec postgres psql -U cyops_user -d cyops_production
```

### Check disk usage
```bash
docker system df
```

### Clean up unused resources
```bash
docker system prune -a
```

---

## 📞 Getting Help

If none of these solutions work:

1. **Check existing issues:**
   https://github.com/iBuildiPawn/OSS-CYOPS/issues

2. **Create a new issue with:**
   - Your OS and Docker version
   - Complete error logs: `docker compose logs > logs.txt`
   - Your `.env` file (remove sensitive data!)
   - Steps to reproduce

3. **Join discussions:**
   https://github.com/iBuildiPawn/OSS-CYOPS/discussions

---

## 🔍 Debug Mode

Enable detailed logging:

Edit `.env`:
```env
GO_ENV=development
NODE_ENV=development
```

Restart:
```bash
docker compose restart
```

View detailed logs:
```bash
docker compose logs -f
```
