# Installation Guide

This guide provides step-by-step instructions for installing and configuring the Cybersecurity Toolkit Platform in both development and production environments.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Development Setup](#development-setup)
3. [Production Installation](#production-installation)
4. [Configuration](#configuration)
5. [Security Tools Setup](#security-tools-setup)
6. [Database Setup](#database-setup)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows 10+
- **Python**: 3.9 or higher
- **Node.js**: 18.0 or higher
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 5GB free space
- **Network**: Internet connection for tool downloads and updates

### Recommended Requirements
- **OS**: Ubuntu 22.04 LTS
- **Python**: 3.11
- **Node.js**: 20.x LTS
- **RAM**: 8GB or more
- **Storage**: 20GB free space
- **CPU**: Multi-core processor for concurrent scans

### Required Security Tools
- **Nmap**: Network discovery and security auditing
- **Gobuster**: Directory/file & DNS busting tool
- **Dirb**: Web content scanner

## Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd cybersecurity-toolkit-platform
```

### 2. Backend Setup

#### Install Python Dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Flask Configuration
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# Database Configuration
DATABASE_URL=sqlite:///cybersecurity_toolkit.db

# CORS Configuration
FRONTEND_URL=http://localhost:5173

# Upload Configuration
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216  # 16MB

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=app.log

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORAGE_URL=memory://

# Security Configuration
SESSION_COOKIE_SECURE=false  # Set to true in production
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Lax
```

#### Initialize Database

```bash
python init_db.py
```

#### Start Backend Server

```bash
python app.py
```

The backend will be available at `http://localhost:5000`

### 3. Frontend Setup

#### Install Node.js Dependencies

```bash
cd frontend
npm install
```

#### Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

# Application Configuration
VITE_APP_NAME=Cybersecurity Toolkit
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_REGISTRATION=true
VITE_ENABLE_GUEST_MODE=false
```

#### Start Frontend Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4. Verify Installation

1. Open `http://localhost:5173` in your browser
2. Register a new account
3. Log in and access the dashboard
4. Try running a basic scan to verify tools are working

## Production Installation

### 1. System Preparation

#### Update System

```bash
sudo apt update && sudo apt upgrade -y
```

#### Install System Dependencies

```bash
# Install Python and Node.js
sudo apt install -y python3 python3-pip python3-venv nodejs npm

# Install database (PostgreSQL recommended for production)
sudo apt install -y postgresql postgresql-contrib

# Install web server
sudo apt install -y nginx

# Install security tools
sudo apt install -y nmap gobuster dirb

# Install SSL certificate tools
sudo apt install -y certbot python3-certbot-nginx
```

#### Create Application User

```bash
sudo useradd -r -s /bin/false -d /opt/cybersecurity-toolkit toolkit
sudo mkdir -p /opt/cybersecurity-toolkit
sudo chown toolkit:toolkit /opt/cybersecurity-toolkit
```

### 2. Application Installation

#### Clone and Setup Application

```bash
sudo -u toolkit -s
cd /opt/cybersecurity-toolkit
git clone <repository-url> .

# Setup Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements-production.txt

# Setup Node.js environment
cd frontend
npm ci --production
npm run build
cd ..
```

#### Configure Production Environment

```bash
# Backend configuration
cp backend/.env.production backend/.env
# Edit backend/.env with production values

# Frontend configuration
cp frontend/.env.production frontend/.env.production
# Edit frontend/.env.production with production values
```

### 3. Database Setup

#### PostgreSQL Configuration

```bash
# Switch to postgres user
sudo -u postgres -s

# Create database and user
createuser --interactive toolkit
createdb cybersecurity_toolkit -O toolkit

# Set password
psql -c "ALTER USER toolkit PASSWORD 'your_secure_password';"

# Exit postgres user
exit
```

#### Initialize Application Database

```bash
# As toolkit user
cd /opt/cybersecurity-toolkit/backend
source ../venv/bin/activate
python init_db.py
```

### 4. SSL Certificate Setup

#### Using Let's Encrypt (Recommended)

```bash
# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run

# Setup auto-renewal cron job
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Using Self-Signed Certificate (Development/Testing)

```bash
cd /opt/cybersecurity-toolkit
sudo mkdir -p ssl
sudo openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
sudo chown -R toolkit:toolkit ssl/
```

### 5. Web Server Configuration

#### Nginx Setup

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/cybersecurity-toolkit

# Enable site
sudo ln -s /etc/nginx/sites-available/cybersecurity-toolkit /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 6. Systemd Service Setup

```bash
# Create systemd service
sudo tee /etc/systemd/system/cybersecurity-toolkit.service > /dev/null <<EOF
[Unit]
Description=Cybersecurity Toolkit Platform
After=network.target postgresql.service

[Service]
Type=simple
User=toolkit
Group=toolkit
WorkingDirectory=/opt/cybersecurity-toolkit/backend
Environment=PATH=/opt/cybersecurity-toolkit/venv/bin
ExecStart=/opt/cybersecurity-toolkit/venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 4 --worker-class eventlet app:create_app()
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable cybersecurity-toolkit
sudo systemctl start cybersecurity-toolkit
```

### 7. Firewall Configuration

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Configuration

### Environment Variables

#### Backend Configuration (.env)

```bash
# Flask Configuration
FLASK_ENV=production
SECRET_KEY=your-very-secure-secret-key-here
JWT_SECRET_KEY=your-very-secure-jwt-secret-key-here

# Database Configuration
DATABASE_URL=postgresql://toolkit:password@localhost/cybersecurity_toolkit

# Security Configuration
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Strict

# SSL Configuration
SSL_CERT_PATH=/opt/cybersecurity-toolkit/ssl/cert.pem
SSL_KEY_PATH=/opt/cybersecurity-toolkit/ssl/key.pem

# CORS Configuration
CORS_ORIGINS=https://yourdomain.com

# Upload Configuration
UPLOAD_FOLDER=/opt/cybersecurity-toolkit/uploads
MAX_CONTENT_LENGTH=16777216

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=/var/log/cybersecurity-toolkit/app.log

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=6
BACKUP_RETENTION_DAYS=30
BACKUP_LOCATION=/var/backups/cybersecurity-toolkit

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORAGE_URL=redis://localhost:6379/1
```

#### Frontend Configuration (.env.production)

```bash
# API Configuration
VITE_API_BASE_URL=https://yourdomain.com/api
VITE_SOCKET_URL=https://yourdomain.com

# Application Configuration
VITE_APP_NAME=Cybersecurity Toolkit
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_REGISTRATION=true
VITE_ENABLE_GUEST_MODE=false

# Security Configuration
VITE_ENABLE_HTTPS=true
```

## Security Tools Setup

### Nmap Installation and Configuration

```bash
# Install Nmap
sudo apt install -y nmap

# Verify installation
nmap --version

# Test basic functionality
nmap -sn 127.0.0.1
```

### Gobuster Installation and Configuration

```bash
# Install Gobuster
sudo apt install -y gobuster

# Verify installation
gobuster version

# Download wordlists
sudo mkdir -p /usr/share/wordlists
sudo wget -O /usr/share/wordlists/common.txt https://raw.githubusercontent.com/v0re/dirb/master/wordlists/common.txt
```

### Dirb Installation and Configuration

```bash
# Install Dirb
sudo apt install -y dirb

# Verify installation
which dirb

# Check wordlists
ls -la /usr/share/dirb/wordlists/
```

### Wordlist Management

```bash
# Create wordlists directory
sudo mkdir -p /opt/cybersecurity-toolkit/wordlists

# Download common wordlists
cd /opt/cybersecurity-toolkit/wordlists
sudo wget https://github.com/danielmiessler/SecLists/archive/master.zip
sudo unzip master.zip
sudo mv SecLists-master SecLists
sudo rm master.zip

# Set permissions
sudo chown -R toolkit:toolkit /opt/cybersecurity-toolkit/wordlists
```

## Database Setup

### SQLite (Development)

SQLite is used by default for development. No additional setup required.

### PostgreSQL (Production)

#### Installation

```bash
sudo apt install -y postgresql postgresql-contrib
```

#### Configuration

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/13/main/postgresql.conf
# Set: listen_addresses = 'localhost'

# Edit authentication configuration
sudo nano /etc/postgresql/13/main/pg_hba.conf
# Ensure local connections use md5 authentication

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### Database Creation

```bash
sudo -u postgres psql
CREATE DATABASE cybersecurity_toolkit;
CREATE USER toolkit WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE cybersecurity_toolkit TO toolkit;
\q
```

#### Performance Optimization

```sql
-- Connect to the database
\c cybersecurity_toolkit

-- Create indexes for better performance
CREATE INDEX idx_scan_history_user_id ON scan_history(user_id);
CREATE INDEX idx_scan_history_started_at ON scan_history(started_at);
CREATE INDEX idx_scan_history_status ON scan_history(status);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_timestamp ON activity_log(timestamp);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
```

## SSL/TLS Configuration

### Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Verify certificate
sudo certbot certificates

# Test auto-renewal
sudo certbot renew --dry-run
```

### Self-Signed Certificate (Development)

```bash
# Generate self-signed certificate
sudo openssl req -x509 -newkey rsa:4096 -keyout /opt/cybersecurity-toolkit/ssl/key.pem -out /opt/cybersecurity-toolkit/ssl/cert.pem -days 365 -nodes

# Set proper permissions
sudo chown toolkit:toolkit /opt/cybersecurity-toolkit/ssl/*
sudo chmod 600 /opt/cybersecurity-toolkit/ssl/key.pem
sudo chmod 644 /opt/cybersecurity-toolkit/ssl/cert.pem
```

## Troubleshooting

### Common Issues

#### Backend Won't Start

```bash
# Check service status
sudo systemctl status cybersecurity-toolkit

# Check logs
sudo journalctl -u cybersecurity-toolkit -f

# Check Python environment
cd /opt/cybersecurity-toolkit/backend
source ../venv/bin/activate
python -c "import flask; print('Flask OK')"
```

#### Database Connection Issues

```bash
# Test database connection
sudo -u toolkit psql -h localhost -U toolkit cybersecurity_toolkit

# Check PostgreSQL status
sudo systemctl status postgresql

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-13-main.log
```

#### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in /opt/cybersecurity-toolkit/ssl/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect yourdomain.com:443

# Check nginx SSL configuration
sudo nginx -t
```

#### Tool Execution Issues

```bash
# Check tool availability
which nmap gobuster dirb

# Test tool execution
nmap --version
gobuster version
dirb

# Check permissions
ls -la /usr/bin/nmap /usr/bin/gobuster /usr/bin/dirb
```

#### Frontend Build Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version
npm --version
```

### Log Locations

- **Application logs**: `/var/log/cybersecurity-toolkit/app.log`
- **Nginx logs**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- **System logs**: `/var/log/syslog`
- **PostgreSQL logs**: `/var/log/postgresql/postgresql-13-main.log`

### Performance Monitoring

```bash
# Monitor system resources
htop

# Monitor disk usage
df -h

# Monitor database performance
sudo -u postgres psql cybersecurity_toolkit -c "SELECT * FROM pg_stat_activity;"

# Monitor application performance
curl -s http://localhost:5000/api/auth/health
```

### Backup and Recovery

```bash
# Manual database backup
pg_dump -U toolkit -h localhost cybersecurity_toolkit > backup.sql

# Restore database
psql -U toolkit -h localhost cybersecurity_toolkit < backup.sql

# Application files backup
tar -czf app_backup.tar.gz /opt/cybersecurity-toolkit/
```

## Next Steps

After successful installation:

1. **Security Hardening**: Review and implement additional security measures
2. **Monitoring Setup**: Configure monitoring and alerting
3. **Backup Strategy**: Implement automated backup procedures
4. **User Training**: Provide user training and documentation
5. **Maintenance Plan**: Establish regular maintenance procedures

For additional help, refer to:
- [User Manual](USER_MANUAL.md)
- [API Documentation](API_DOCUMENTATION.md)
- [Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)