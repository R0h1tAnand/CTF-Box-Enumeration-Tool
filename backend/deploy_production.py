"""
Production deployment script for Cybersecurity Toolkit Platform.
"""
import os
import sys
import subprocess
import argparse
from pathlib import Path
from utils.ssl_config import SSLConfig
from utils.backup_manager import BackupManager
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ProductionDeployer:
    """Handles production deployment tasks."""
    
    def __init__(self, config_path: str = '.env'):
        self.config_path = config_path
        self.app_dir = Path(__file__).parent
    
    def deploy(self, skip_ssl: bool = False, skip_backup: bool = False):
        """
        Run complete production deployment.
        
        Args:
            skip_ssl: Skip SSL certificate setup
            skip_backup: Skip backup configuration
        """
        logger.info("Starting production deployment...")
        
        try:
            # 1. Validate environment configuration
            self._validate_environment()
            
            # 2. Set up SSL certificates
            if not skip_ssl:
                self._setup_ssl()
            
            # 3. Configure database
            self._setup_database()
            
            # 4. Set up backup system
            if not skip_backup:
                self._setup_backup_system()
            
            # 5. Set up logging directories
            self._setup_logging()
            
            # 6. Set up systemd service (Linux)
            if sys.platform.startswith('linux'):
                self._setup_systemd_service()
            
            # 7. Set up nginx configuration (optional)
            self._setup_nginx_config()
            
            logger.info("Production deployment completed successfully!")
            
        except Exception as e:
            logger.error(f"Deployment failed: {str(e)}")
            sys.exit(1)
    
    def _validate_environment(self):
        """Validate production environment configuration."""
        logger.info("Validating environment configuration...")
        
        if not os.path.exists(self.config_path):
            logger.error(f"Environment file not found: {self.config_path}")
            logger.info("Please copy .env.production to .env and configure it")
            sys.exit(1)
        
        # Load environment variables
        from dotenv import load_dotenv
        load_dotenv(self.config_path)
        
        # Check required variables
        required_vars = [
            'SECRET_KEY',
            'JWT_SECRET_KEY',
            'DATABASE_URL',
            'FLASK_ENV'
        ]
        
        missing_vars = []
        for var in required_vars:
            if not os.environ.get(var):
                missing_vars.append(var)
        
        if missing_vars:
            logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
            sys.exit(1)
        
        # Validate secret keys
        secret_key = os.environ.get('SECRET_KEY')
        jwt_secret = os.environ.get('JWT_SECRET_KEY')
        
        if len(secret_key) < 32:
            logger.error("SECRET_KEY must be at least 32 characters long")
            sys.exit(1)
        
        if len(jwt_secret) < 32:
            logger.error("JWT_SECRET_KEY must be at least 32 characters long")
            sys.exit(1)
        
        logger.info("Environment configuration validated")
    
    def _setup_ssl(self):
        """Set up SSL certificates."""
        logger.info("Setting up SSL certificates...")
        
        ssl_cert_path = os.environ.get('SSL_CERT_PATH')
        ssl_key_path = os.environ.get('SSL_KEY_PATH')
        
        if not ssl_cert_path or not ssl_key_path:
            logger.warning("SSL paths not configured, generating self-signed certificate...")
            
            # Create SSL directory
            ssl_dir = self.app_dir / 'ssl'
            ssl_dir.mkdir(exist_ok=True)
            
            cert_path = ssl_dir / 'cert.pem'
            key_path = ssl_dir / 'key.pem'
            
            if SSLConfig.generate_self_signed_cert(str(cert_path), str(key_path)):
                logger.info(f"Self-signed certificate generated at {cert_path}")
                logger.warning("WARNING: Self-signed certificates should not be used in production!")
                logger.info("Please obtain a proper SSL certificate from a trusted CA")
            else:
                logger.error("Failed to generate self-signed certificate")
                return
        else:
            # Validate existing certificates
            if not SSLConfig.validate_certificate(ssl_cert_path, ssl_key_path):
                logger.error("SSL certificate validation failed")
                sys.exit(1)
            
            logger.info("SSL certificates validated")
    
    def _setup_database(self):
        """Set up production database."""
        logger.info("Setting up database...")
        
        db_url = os.environ.get('DATABASE_URL')
        
        if db_url.startswith('sqlite:'):
            logger.warning("SQLite is not recommended for production use")
            logger.info("Consider using PostgreSQL or MySQL for better performance and reliability")
        
        # Install database dependencies
        if db_url.startswith('postgresql:'):
            self._install_package('psycopg2-binary')
        elif db_url.startswith('mysql:'):
            self._install_package('PyMySQL')
        
        logger.info("Database setup completed")
    
    def _setup_backup_system(self):
        """Set up backup system."""
        logger.info("Setting up backup system...")
        
        backup_location = os.environ.get('BACKUP_LOCATION', '/var/backups/cybersecurity-toolkit')
        
        # Create backup directory
        os.makedirs(backup_location, exist_ok=True)
        
        # Set appropriate permissions
        try:
            os.chmod(backup_location, 0o750)
        except PermissionError:
            logger.warning(f"Could not set permissions on backup directory: {backup_location}")
        
        logger.info(f"Backup system configured at {backup_location}")
    
    def _setup_logging(self):
        """Set up logging directories."""
        logger.info("Setting up logging...")
        
        log_file = os.environ.get('LOG_FILE', '/var/log/cybersecurity-toolkit/app.log')
        log_dir = os.path.dirname(log_file)
        
        # Create log directory
        os.makedirs(log_dir, exist_ok=True)
        
        # Set appropriate permissions
        try:
            os.chmod(log_dir, 0o755)
        except PermissionError:
            logger.warning(f"Could not set permissions on log directory: {log_dir}")
        
        logger.info(f"Logging configured at {log_file}")
    
    def _setup_systemd_service(self):
        """Set up systemd service for Linux systems."""
        logger.info("Setting up systemd service...")
        
        service_content = f"""[Unit]
Description=Cybersecurity Toolkit Platform
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory={self.app_dir}
Environment=PATH={sys.executable}
ExecStart={sys.executable} app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
"""
        
        service_path = '/etc/systemd/system/cybersecurity-toolkit.service'
        
        try:
            with open(service_path, 'w') as f:
                f.write(service_content)
            
            # Reload systemd and enable service
            subprocess.run(['systemctl', 'daemon-reload'], check=True)
            subprocess.run(['systemctl', 'enable', 'cybersecurity-toolkit'], check=True)
            
            logger.info("Systemd service configured")
            logger.info("Use 'systemctl start cybersecurity-toolkit' to start the service")
            
        except (PermissionError, subprocess.CalledProcessError) as e:
            logger.warning(f"Could not set up systemd service: {str(e)}")
            logger.info("You may need to run this script with sudo or set up the service manually")
    
    def _setup_nginx_config(self):
        """Generate nginx configuration template."""
        logger.info("Generating nginx configuration template...")
        
        nginx_config = """server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # Static files (if serving directly)
    location /static {
        alias /path/to/your/static/files;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
"""
        
        nginx_config_path = self.app_dir / 'nginx.conf.template'
        with open(nginx_config_path, 'w') as f:
            f.write(nginx_config)
        
        logger.info(f"Nginx configuration template created at {nginx_config_path}")
        logger.info("Please customize the template and copy it to your nginx sites-available directory")
    
    def _install_package(self, package: str):
        """Install Python package."""
        try:
            subprocess.run([sys.executable, '-m', 'pip', 'install', package], check=True)
            logger.info(f"Installed package: {package}")
        except subprocess.CalledProcessError:
            logger.warning(f"Failed to install package: {package}")

def main():
    """Main deployment function."""
    parser = argparse.ArgumentParser(description='Deploy Cybersecurity Toolkit Platform to production')
    parser.add_argument('--config', default='.env', help='Path to environment configuration file')
    parser.add_argument('--skip-ssl', action='store_true', help='Skip SSL certificate setup')
    parser.add_argument('--skip-backup', action='store_true', help='Skip backup configuration')
    
    args = parser.parse_args()
    
    deployer = ProductionDeployer(args.config)
    deployer.deploy(skip_ssl=args.skip_ssl, skip_backup=args.skip_backup)

if __name__ == '__main__':
    main()