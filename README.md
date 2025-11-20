<div align="center">

# 🛡️ CYOPS

### Cybersecurity Operations Platform

[![Production Ready](https://img.shields.io/badge/status-production%20ready-success?style=for-the-badge)](PROJECT-STATUS.md)
[![Go Version](https://img.shields.io/badge/go-1.24.0-00ADD8?style=for-the-badge&logo=go)](https://golang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

**Enterprise-grade vulnerability management and cybersecurity operations platform**

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

---

## 🌟 Overview

**CYOPS (Cybersecurity Operations Platform)** is a comprehensive, production-ready platform designed for modern cybersecurity teams to manage vulnerabilities, track assets, and conduct security assessments at scale.

### Why CYOPS?

- 🎯 **Centralized Vulnerability Management** - Track, prioritize, and remediate vulnerabilities across your entire infrastructure
- 📊 **Real-Time Asset Intelligence** - Maintain an up-to-date inventory of all your IT assets
- 🔐 **Enterprise Security** - Built-in RBAC, 2FA, audit trails, and compliance features
- ⚡ **High Performance** - Optimized to handle 10,000+ vulnerabilities with sub-50ms response times
- 🔌 **Extensible** - REST APIs, Nessus integration, and MCP server for AI assistants

### Key Capabilities

- **Vulnerability Lifecycle Management** - From discovery to remediation
- **Asset Discovery & Tracking** - Automated asset inventory management
- **Security Assessments** - Comprehensive security assessment workflows
- **Compliance Reporting** - Generate executive and audit reports
- **Third-Party Integrations** - Nessus scanner integration and API access
- **AI-Powered Operations** - Model Context Protocol (MCP) server for AI assistants

---

## ✨ Features

### 🛡️ Vulnerability Management

<table>
<tr>
<td width="50%">

**Core Features**
- ✅ Full CRUD operations with lifecycle tracking
- ✅ CVSS v3.1 calculator & scoring
- ✅ CVE ID validation & linking
- ✅ Severity classification (Info → Critical)
- ✅ Status workflow (Open → Closed)
- ✅ Advanced search & filtering
- ✅ Bulk operations support
- ✅ Custom field support

</td>
<td width="50%">

**Advanced Capabilities**
- ✅ Affected systems tracking
- ✅ Nessus XML import (.nessus files)
- ✅ Vulnerability findings management
- ✅ File attachments & screenshots
- ✅ Remediation tracking
- ✅ SLA monitoring
- ✅ Duplicate detection
- ✅ Export to CSV/JSON

</td>
</tr>
</table>

### 📦 Asset Management

- 🖥️ **Comprehensive Asset Inventory** - Track servers, workstations, network devices, and applications
- 🏷️ **Flexible Tagging System** - Organize assets with custom tags and categories
- 📊 **Criticality Levels** - Classify assets by business criticality
- 🔄 **Automated Discovery** - Auto-create assets from vulnerability scans
- 🔍 **Duplicate Prevention** - Smart validation for hostname/IP uniqueness
- 👤 **Owner Assignment** - Track asset ownership and responsibility
- 📈 **Asset Statistics** - Real-time metrics on asset status and health

### 🔒 Security Assessments

- 📋 **Assessment Management** - Create and track security assessments
- 📊 **Finding Correlation** - Link vulnerabilities to assessment findings
- 📑 **Report Generation** - Generate comprehensive assessment reports
- 🔄 **Version Control** - Track report versions and changes
- 📤 **Multiple Formats** - Export reports in PDF, DOCX, and CSV
- ✅ **Status Tracking** - Monitor assessment progress from planning to completion

### 🔐 Authentication & Authorization

<table>
<tr>
<td width="50%">

**Authentication**
- ✅ Email/password registration
- ✅ Email verification workflow
- ✅ JWT-based session management
- ✅ Password reset flow
- ✅ Remember me functionality
- ✅ Session revocation
- ✅ Active session management

</td>
<td width="50%">

**Authorization**
- ✅ Role-Based Access Control (RBAC)
- ✅ Fine-grained permissions
- ✅ Custom role creation
- ✅ Permission inheritance
- ✅ API key management
- ✅ Two-Factor Authentication (TOTP)
- ✅ Audit logging

</td>
</tr>
</table>

### 📊 Reporting & Analytics

- 📈 **Executive Dashboard** - High-level metrics for management
- 👨‍💻 **Analyst Dashboard** - Detailed technical insights
- 📋 **Compliance Reports** - Generate audit-ready reports
- 📊 **Trend Analysis** - Vulnerability trends over time
- 🎨 **Interactive Visualizations** - Charts and graphs powered by Recharts
- 📤 **Multi-Format Export** - CSV, JSON, and PDF exports

### 🔌 Integrations

- **Nessus Scanner** - Import .nessus XML files directly
- **REST API** - Complete programmatic access to all features
- **MCP Server** - Integration with AI assistants (Claude, ChatGPT)
- **Webhooks** - Real-time notifications (coming soon)
- **SIEM Integration** - Export to Splunk, ELK (planned)

---

## 🚀 Quick Start

### Prerequisites

- **Docker** 20.10+ and **Docker Compose** 2.0+
- **Git** for cloning the repository
- 4GB RAM minimum (8GB recommended)
- 10GB free disk space

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/CYOPS.git
cd CYOPS

# 2. Copy environment configuration
cp .env.example .env

# 3. (Optional) Edit .env to customize settings
nano .env

# 4. Start all services with production profile
docker compose --profile production up -d

# 5. Wait for services to be healthy (30-60 seconds)
docker compose ps
```

### Access the Platform

| Service | URL | Description |
|---------|-----|-------------|
| 🌐 **Web Application** | http://localhost | Main interface via NGINX |
| 🔌 **API Endpoint** | http://localhost/api/v1 | REST API |
| 📚 **API Documentation** | http://localhost/api/v1/docs | Swagger UI |
| 📖 **API Reference** | http://localhost/api/v1/docs/redoc | Redoc documentation |
| ❤️ **Health Check** | http://localhost/health | System health status |

### Default Credentials

```
Email: admin@example.com
Password: Admin123!@#
```

> ⚠️ **IMPORTANT**: Change the default admin password immediately after first login!

---

## 📦 Installation

### Docker Deployment (Recommended)

Docker deployment includes all required services with optimized production settings.

```bash
# Start with production profile (includes NGINX reverse proxy)
docker compose --profile production up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Stop and remove volumes (⚠️ deletes all data)
docker compose down -v
```

### Local Development Setup

For development without Docker:

#### Backend

```bash
cd backend

# Install dependencies
go mod download

# Copy environment file
cp ../.env.example ../.env

# Run database migrations
go run cmd/server/main.go migrate

# Start development server (with hot reload)
air

# Or build and run
go build -o cyops cmd/server/main.go
./cyops
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

---

## ⚙️ Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=cyops_dev
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_PASSWORD=redis_password

# Security
JWT_SECRET=your-jwt-secret-change-in-production
SESSION_SECRET=your-session-secret-change-in-production
ENCRYPTION_KEY=your-32-character-encryption-key

# Admin User (created on first startup)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin123!@#
ADMIN_NAME=System Administrator

# Application
GO_ENV=production
NODE_ENV=production
BUILD_TARGET=production

# CORS (adjust for your domain)
CORS_ORIGINS=http://localhost,https://yourdomain.com
```

### Generate Secure Secrets

```bash
# Generate random secrets
openssl rand -base64 32
```

---

## 📖 Usage

### Managing Vulnerabilities

#### Create a Vulnerability

1. Navigate to **Vulnerabilities** → **Add New**
2. Fill in required fields:
   - Title
   - Description
   - Severity (Info, Low, Medium, High, Critical)
   - CVSS Score (use built-in calculator)
3. Optionally add:
   - CVE ID
   - Affected systems
   - Attachments
   - Remediation steps
4. Click **Save**

#### Import from Nessus

1. Navigate to **Vulnerabilities** → **Import**
2. Upload your `.nessus` XML file
3. Preview imported vulnerabilities
4. Select which vulnerabilities to import
5. Click **Import Selected**

### Managing Assets

#### Add an Asset

1. Navigate to **Assets** → **Add New**
2. Specify asset details:
   - Hostname or IP Address
   - Asset Type (Server, Workstation, Network Device, Application)
   - Operating System
   - Environment (Production, Staging, Development)
   - Criticality Level
3. Add tags for organization
4. Click **Save**

### Running Assessments

1. Navigate to **Assessments** → **New Assessment**
2. Configure assessment details:
   - Name and description
   - Assessment type
   - Assessor information
   - Date range
3. Add findings as you progress
4. Generate reports at any time
5. Export final report in multiple formats

---

## 🔌 API Documentation

### Interactive API Documentation

- **Swagger UI**: http://localhost/api/v1/docs
- **Redoc**: http://localhost/api/v1/docs/redoc
- **OpenAPI Spec**: http://localhost/api/v1/docs/openapi.yaml

### Authentication

All API requests require authentication via JWT token:

```bash
# Login to get token
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!@#"
  }'

# Use token in subsequent requests
curl -X GET http://localhost/api/v1/vulnerabilities \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### API Examples

#### List Vulnerabilities

```bash
GET /api/v1/vulnerabilities?page=1&limit=50&severity=CRITICAL,HIGH
```

#### Create Vulnerability

```bash
POST /api/v1/vulnerabilities
Content-Type: application/json

{
  "title": "SQL Injection in Login Form",
  "description": "SQL injection vulnerability found in authentication endpoint",
  "severity": "CRITICAL",
  "cvss_score": 9.8,
  "cve_id": "CVE-2024-1234",
  "status": "OPEN"
}
```

#### Update Vulnerability Status

```bash
PATCH /api/v1/vulnerabilities/{id}
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "assigned_to": "analyst@example.com"
}
```

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       Client Layer                       │
│  (Web Browser, Mobile App, API Clients, AI Assistants)  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     NGINX (Port 80/443)                  │
│          (Reverse Proxy, Load Balancer, SSL/TLS)        │
└─────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Frontend   │  │   Backend    │  │  MCP Server  │
│  (Next.js)   │  │  (Go/Fiber)  │  │ (TypeScript) │
│   Port 3000  │  │  Port 8080   │  │  Port 3001   │
└──────────────┘  └──────────────┘  └──────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │    Redis     │  │ File Storage │
│   Port 5432  │  │  Port 6379   │  │   (Volume)   │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Technology Stack

#### Backend

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Language** | Go 1.24 | High-performance, concurrent backend |
| **Framework** | Fiber v2 | Fast HTTP framework |
| **Database** | PostgreSQL 16 | Primary data store |
| **Cache** | Redis 7 | Session storage & caching |
| **ORM** | GORM | Database abstraction & migrations |
| **Auth** | JWT | Stateless authentication |
| **2FA** | TOTP | Two-factor authentication |
| **Logging** | Zerolog | Structured logging |

#### Frontend

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | Next.js 16 | React-based SSR framework |
| **Language** | TypeScript | Type-safe development |
| **UI Library** | shadcn/ui | Component library |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Forms** | React Hook Form | Form management |
| **Charts** | Recharts | Data visualization |
| **HTTP Client** | Axios | API communication |
| **State** | React Query | Server state management |

#### Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Reverse Proxy** | NGINX | Load balancing, SSL termination |
| **Containerization** | Docker | Application packaging |
| **Orchestration** | Docker Compose | Multi-container deployment |

### Database Schema

Key entities and relationships:

- **Users** → Sessions, API Keys, Vulnerabilities, Assets
- **Vulnerabilities** → Findings, Attachments, Affected Systems
- **Assets** → Tags, Vulnerabilities, Owners
- **Assessments** → Reports, Findings
- **Roles** → Permissions, Users

---

## 👨‍💻 Development

### Project Structure

```
CYOPS/
├── backend/                    # Go backend application
│   ├── cmd/
│   │   └── server/            # Main application entry point
│   ├── internal/
│   │   ├── handlers/          # HTTP request handlers
│   │   ├── middleware/        # Custom middleware
│   │   ├── models/            # Database models
│   │   └── services/          # Business logic
│   ├── pkg/
│   │   ├── auth/              # Authentication utilities
│   │   ├── config/            # Configuration management
│   │   └── database/          # Database connection & migrations
│   ├── tests/
│   │   ├── unit/              # Unit tests
│   │   └── integration/       # Integration tests
│   └── openapi.yaml           # API specification
│
├── frontend/                   # Next.js frontend application
│   ├── app/                   # App router pages
│   │   ├── (auth)/           # Authentication pages
│   │   ├── (dashboard)/      # Protected dashboard pages
│   │   └── layout.tsx        # Root layout
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── vulnerabilities/  # Vulnerability components
│   │   ├── assets/           # Asset components
│   │   └── assessments/      # Assessment components
│   ├── lib/                   # Utility functions
│   │   ├── api/              # API client functions
│   │   └── validations/      # Form validation schemas
│   └── types/                 # TypeScript type definitions
│
├── mcp-server/                # Model Context Protocol server
│   ├── src/
│   │   ├── tools/            # MCP tools implementation
│   │   ├── services/         # API client services
│   │   └── schemas/          # Tool schemas
│   └── docs/                  # MCP documentation
│
├── nginx/                     # NGINX configuration
│   └── nginx.conf            # Reverse proxy config
│
└── docker-compose.yml         # Container orchestration
```

### Development Workflow

#### 1. Backend Development

```bash
cd backend

# Install Air for hot reload
go install github.com/air-verse/air@latest

# Start development server with hot reload
air

# Run tests
go test ./...

# Run specific tests with coverage
go test -v -cover ./internal/services/...

# Format code
go fmt ./...

# Lint code
golangci-lint run
```

#### 2. Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

#### 3. Database Migrations

```bash
# Migrations are auto-run on startup
# Manual migration commands:

cd backend
go run cmd/server/main.go migrate up
go run cmd/server/main.go migrate down
```

### Code Style Guidelines

#### Go

- Follow [Effective Go](https://golang.org/doc/effective_go.html)
- Use `gofmt` for formatting
- Write meaningful variable names
- Add comments for exported functions
- Keep functions small and focused

#### TypeScript/React

- Use functional components with hooks
- Prefer TypeScript interfaces over types
- Use Biome for linting and formatting
- Follow React best practices
- Implement proper error boundaries

#### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add vulnerability export feature
fix: resolve CVSS calculator rounding issue
docs: update API documentation
refactor: optimize database queries
test: add integration tests for assets
chore: update dependencies
```

---

## 🧪 Testing

### Backend Testing

```bash
cd backend

# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run specific test suites
go test ./tests/unit/...              # Unit tests
go test ./tests/integration/...       # Integration tests
go test -v ./internal/services/...    # Service tests with verbose output

# Run specific test
go test -run TestVulnerabilityService ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Frontend Testing

```bash
cd frontend

# Run tests (when implemented)
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- VulnerabilityForm
```

### Integration Testing

```bash
# Start test environment
docker compose -f docker-compose.test.yml up -d

# Run integration tests
cd backend
go test ./tests/integration/...

# Clean up
docker compose -f docker-compose.test.yml down -v
```

---

## 🚀 Deployment

### Production Deployment with Docker

```bash
# 1. Set production environment variables
cp .env.example .env
nano .env  # Edit for production settings

# 2. Generate secure secrets
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Update .env with generated secrets

# 3. Start services with production profile
docker compose --profile production up -d

# 4. Verify all services are running
docker compose ps

# 5. Check logs
docker compose logs -f

# 6. Access application
# Configure DNS to point to your server
# Access via http://yourdomain.com
```

### SSL/TLS Configuration

For HTTPS support, add SSL certificates:

```bash
# 1. Create SSL directory
mkdir -p nginx/ssl

# 2. Add your certificates
cp /path/to/fullchain.pem nginx/ssl/
cp /path/to/privkey.pem nginx/ssl/

# 3. Update nginx.conf to enable HTTPS server block

# 4. Restart NGINX
docker compose restart nginx
```

### Performance Tuning

#### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX idx_vulnerabilities_status ON vulnerabilities(status);
CREATE INDEX idx_vulnerabilities_created_at ON vulnerabilities(created_at);
CREATE INDEX idx_assets_hostname ON assets(hostname);
CREATE INDEX idx_assets_ip_address ON assets(ip_address);
```

#### NGINX Caching

Already configured in `nginx/nginx.conf`:
- Static asset caching (1 year)
- Gzip compression
- Connection pooling
- Rate limiting

---

## 🔒 Security

### Security Features

- ✅ **Encryption at Rest** - Sensitive data encrypted in database
- ✅ **Encryption in Transit** - HTTPS/TLS support
- ✅ **Password Hashing** - Bcrypt with salt
- ✅ **JWT Tokens** - Secure, stateless authentication
- ✅ **CSRF Protection** - Cross-site request forgery protection
- ✅ **XSS Prevention** - Input sanitization and output encoding
- ✅ **SQL Injection Protection** - Parameterized queries via GORM
- ✅ **Rate Limiting** - Brute-force protection
- ✅ **Security Headers** - OWASP recommended headers
- ✅ **Audit Logging** - Comprehensive activity logs

### Security Best Practices

1. **Change Default Credentials** immediately after deployment
2. **Use Strong Secrets** - Generate with `openssl rand -base64 32`
3. **Enable 2FA** for all admin accounts
4. **Regular Updates** - Keep dependencies up to date
5. **Monitor Logs** - Review audit logs regularly
6. **Backup Data** - Implement regular database backups
7. **Network Security** - Use firewall rules and VPN
8. **Access Control** - Follow principle of least privilege

### Reporting Security Issues

If you discover a security vulnerability, please email security@example.com instead of using the issue tracker.

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute

- 🐛 **Report Bugs** - Submit detailed bug reports
- 💡 **Suggest Features** - Propose new features or improvements
- 📖 **Improve Documentation** - Fix typos, clarify instructions
- 🔧 **Submit Pull Requests** - Contribute code improvements
- 🧪 **Write Tests** - Improve test coverage
- 🌍 **Translate** - Help translate the UI

### Contribution Process

1. **Fork the Repository**
   ```bash
   git clone https://github.com/yourusername/CYOPS.git
   cd CYOPS
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Your Changes**
   - Write clean, maintainable code
   - Follow coding standards
   - Add tests for new features
   - Update documentation

4. **Test Your Changes**
   ```bash
   # Backend
   cd backend && go test ./...
   
   # Frontend
   cd frontend && npm test
   ```

5. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

6. **Push to Your Fork**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Open a Pull Request**
   - Provide a clear description
   - Reference any related issues
   - Wait for review and feedback

### Development Guidelines

- Follow existing code style and patterns
- Write meaningful commit messages
- Add unit and integration tests
- Update API documentation if endpoints change
- Test thoroughly before submitting PR

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 💬 Support

### Documentation

- 📚 [API Documentation](http://localhost/api/v1/docs)
- 📖 [MCP Server Guide](mcp-server/docs/README.md)
- 🏗️ [Project Status](PROJECT-STATUS.md)

### Getting Help

- 🐛 [Issue Tracker](https://github.com/yourusername/CYOPS/issues)
- 💡 [Discussions](https://github.com/yourusername/CYOPS/discussions)
- 📧 Email Support: support@example.com

---

## 🙏 Acknowledgments

Built with amazing open-source technologies:

- [Go](https://golang.org/) - The Go Programming Language
- [Fiber](https://gofiber.io/) - Express-inspired web framework
- [Next.js](https://nextjs.org/) - The React Framework
- [PostgreSQL](https://www.postgresql.org/) - Advanced Open Source Database
- [Redis](https://redis.io/) - In-memory data store
- [shadcn/ui](https://ui.shadcn.com/) - Beautifully designed components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

Special thanks to all contributors and the open-source community!

---

## 🗺️ Roadmap

### Version 2.0 (Planned)

- [ ] Multi-tenancy support
- [ ] Advanced threat intelligence integration
- [ ] Machine learning for vulnerability prioritization
- [ ] Mobile application (iOS/Android)
- [ ] Slack/Teams notifications
- [ ] SIEM integration (Splunk, ELK)
- [ ] Container security scanning
- [ ] Compliance frameworks (PCI-DSS, HIPAA, SOC 2)

### Version 1.1 (In Progress)

- [x] Nessus scanner integration
- [x] Assessment report generation
- [x] API key management
- [x] MCP server for AI assistants
- [ ] Webhook support
- [ ] SSO integration (SAML, OAuth)
- [ ] Advanced dashboards

---

<div align="center">

**[⬆ Back to Top](#-cyops)**

Made with ❤️ by the CYOPS Team

</div>
