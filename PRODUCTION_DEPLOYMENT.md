# Production Deployment Guide

This guide covers deploying the Cybersecurity Toolkit Platform to a production environment with proper security hardening, SSL/HTTPS configuration, and backup procedures.

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Docker and Docker Compose
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)
- PostgreSQL database (optional, can use Docker)
- Redis server (optional, can use Docker)

## Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cybersecurity-toolkit-platform
   ```

2. **Configure environment variables**
   ```bash
   cp backend/.env.production backend/.env
   cp frontend/.env.production frontend/.env.production
   ```

3. **Edit configuration files**
   - Update `backend/.env` with your production values
   - Update `frontend/.env.production` with your domain
   - Generate strong secrets for SECRET_KEY and JWT_SECRET_KEY

4. **Set up SSL certificates**
   ```bash
   mkdir ssl
   # Copy your SSL certificate and key to ssl/cert.pem and ssl/key.pem
   # Or use the deployment script to generate self-signed certificates for testing
   ```

5. **Deploy with Docker Compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Manual Deployment

### 1. System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3 python3-pip python3-venv nginx postgresql postgresql-contrib redis-server

# Install security tools
sudo apt install -y nmap gobuster dirb

# Create application user
sudo useradd -r -s /bin/false -d /opt/cybersecurity-toolkit toolkit

# Create application directory
sudo mkdir -p /opt/cybersecurity-toolkit
sudo chown toolkit:toolkit /opt/cybersecurity-toolkit
```

### 2. Database Setup

```bash
# Configure PostgreSQL
sudo -u postgres createuser --interactive toolkit
sudo -u postgres createdb cybersecurity_toolkit -O toolkit

# Set password for database user
sudo -u postgres psql -c "ALTER USER toolkit PASSWORD 'your_secure_password';"
```

### 3. Application Setup

```bash
# Switch to application user
sudo -u toolkit -s

# Navigate to application directory
cd /opt/cybersecurity-toolkit

# Clone repository
git clone <repository-url> .

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements-production.txt

# Configure environment
cp backend/.env.production backend/.env
# Edit backend/.env with your configuration

# Run deployment script
cd backend
python deploy_production.py
```

### 4. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Option B: Self-signed Certificate (Development/Testing)

```bash
# Generate self-signed certificate
cd /opt/cybersecurity-toolkit/backend
python -c "
from utils.ssl_config import SSLConfig
SSLConfig.generate_self_signed_cert('/opt/cybersecurity-toolkit/ssl/cert.pem', '/opt/cybersecurity-toolkit/ssl/key.pem', 'yourdomain.com')
"
```

### 5. Nginx Configuration

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/cybersecurity-toolkit

# Enable site
sudo ln -s /etc/nginx/sites-available/cybersecurity-toolkit /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 6. Systemd Service Setup

```bash
# Create systemd service file
sudo tee /etc/systemd/system/cybersecurity-toolkit.service > /dev/null <<EOF
[Unit]
Description=Cybersecurity Toolkit Platform
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=toolkit
Group=toolkit
WorkingDirectory=/opt/cybersecurity-toolkit/backend
Environment=PATH=/opt/cybersecurity-toolkit/venv/bin
ExecStart=/opt/cybersecurity-toolkit/venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 4 --worker-class eventlet app:create_app()
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable cybersecurity-toolkit
sudo systemctl start cybersecurity-toolkit
```

## Security Configuration

### 1. Firewall Setup

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Database Security

```bash
# Secure PostgreSQL
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'strong_postgres_password';"

# Edit PostgreSQL configuration
sudo nano /etc/postgresql/13/main/postgresql.conf
# Set: listen_addresses = 'localhost'

sudo nano /etc/postgresql/13/main/pg_hba.conf
# Ensure only local connections are allowed

sudo systemctl restart postgresql
```

### 3. Redis Security

```bash
# Configure Redis
sudo nano /etc/redis/redis.conf
# Uncomment and set: requirepass your_redis_password
# Set: bind 127.0.0.1

sudo systemctl restart redis
```

## Backup Configuration

### 1. Automated Backups

The application includes automated backup functionality. Configure in your `.env` file:

```bash
BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=6
BACKUP_RETENTION_DAYS=30
BACKUP_LOCATION=/var/backups/cybersecurity-toolkit
```

### 2. Manual Backup

```bash
# Create backup directory
sudo mkdir -p /var/backups/cybersecurity-toolkit
sudo chown toolkit:toolkit /var/backups/cybersecurity-toolkit

# Manual backup via API
curl -X POST https://yourdomain.com/api/backup/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Database Backup Script

```bash
#!/bin/bash
# /opt/cybersecurity-toolkit/scripts/backup.sh

BACKUP_DIR="/var/backups/cybersecurity-toolkit"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="cybersecurity_toolkit"
DB_USER="toolkit"

# Create backup
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Remove backups older than 30 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: db_backup_$DATE.sql.gz"
```

## Monitoring and Logging

### 1. Log Configuration

Logs are configured in the application and stored in:
- Application logs: `/var/log/cybersecurity-toolkit/app.log`
- Nginx logs: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
- System logs: `/var/log/syslog`

### 2. Log Rotation

```bash
# Configure logrotate
sudo tee /etc/logrotate.d/cybersecurity-toolkit > /dev/null <<EOF
/var/log/cybersecurity-toolkit/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 toolkit toolkit
    postrotate
        systemctl reload cybersecurity-toolkit
    endscript
}
EOF
```

### 3. Health Monitoring

Set up monitoring for the health check endpoint:

```bash
# Add to crontab for basic monitoring
*/5 * * * * curl -f https://yourdomain.com/api/health || echo "Health check failed" | mail -s "Service Alert" admin@yourdomain.com
```

## Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX idx_scan_history_user_id ON scan_history(user_id);
CREATE INDEX idx_scan_history_created_at ON scan_history(started_at);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_timestamp ON activity_log(timestamp);
```

### 2. Redis Caching

Configure Redis for session storage and caching:

```bash
# In your .env file
REDIS_URL=redis://localhost:6379/0
SESSION_TYPE=redis
```

## Troubleshooting

### Common Issues

1. **SSL Certificate Issues**
   ```bash
   # Check certificate validity
   openssl x509 -in /path/to/cert.pem -text -noout
   
   # Test SSL configuration
   openssl s_client -connect yourdomain.com:443
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connection
   sudo -u toolkit psql -h localhost -U toolkit cybersecurity_toolkit
   
   # Check PostgreSQL status
   sudo systemctl status postgresql
   ```

3. **Service Issues**
   ```bash
   # Check service status
   sudo systemctl status cybersecurity-toolkit
   
   # View logs
   sudo journalctl -u cybersecurity-toolkit -f
   ```

### Log Analysis

```bash
# Check application logs
sudo tail -f /var/log/cybersecurity-toolkit/app.log

# Check nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check system logs
sudo journalctl -f
```

## Security Checklist

- [ ] Strong passwords for all accounts
- [ ] SSL/TLS certificates properly configured
- [ ] Firewall configured and enabled
- [ ] Database access restricted to localhost
- [ ] Redis password protected
- [ ] Regular security updates applied
- [ ] Backup system tested and verified
- [ ] Log monitoring configured
- [ ] Health checks implemented
- [ ] Rate limiting enabled
- [ ] Security headers configured

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review application logs
   - Check disk space
   - Verify backup integrity

2. **Monthly**
   - Update system packages
   - Review security logs
   - Test backup restoration

3. **Quarterly**
   - Security audit
   - Performance review
   - SSL certificate renewal check

### Updates

```bash
# Update application
cd /opt/cybersecurity-toolkit
sudo -u toolkit git pull
sudo -u toolkit /opt/cybersecurity-toolkit/venv/bin/pip install -r backend/requirements-production.txt
sudo systemctl restart cybersecurity-toolkit
```

## Support

For issues and support:
1. Check the troubleshooting section
2. Review application logs
3. Check system status
4. Contact system administrator

---

**Note**: This is a production deployment guide. Always test in a staging environment before deploying to production.