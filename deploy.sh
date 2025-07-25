#!/bin/bash

# Cybersecurity Toolkit Platform Deployment Script
# This script automates the deployment process for both development and production environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="cybersecurity-toolkit"
DEPLOY_USER="toolkit"
DEPLOY_DIR="/opt/cybersecurity-toolkit"
SERVICE_NAME="cybersecurity-toolkit"
NGINX_SITE="cybersecurity-toolkit"

# Default values
ENVIRONMENT="development"
DOMAIN=""
EMAIL=""
SKIP_SSL=false
SKIP_DEPS=false
FORCE=false
BACKUP=true

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy the Cybersecurity Toolkit Platform

OPTIONS:
    -e, --environment ENV    Deployment environment (development|production) [default: development]
    -d, --domain DOMAIN      Domain name for production deployment
    -m, --email EMAIL        Email for SSL certificate (Let's Encrypt)
    --skip-ssl              Skip SSL certificate setup
    --skip-deps             Skip dependency installation
    --force                 Force deployment without confirmation
    --no-backup             Skip backup creation
    -h, --help              Show this help message

EXAMPLES:
    # Development deployment
    $0 -e development

    # Production deployment with SSL
    $0 -e production -d example.com -m admin@example.com

    # Production deployment without SSL
    $0 -e production -d example.com --skip-ssl

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -m|--email)
            EMAIL="$2"
            shift 2
            ;;
        --skip-ssl)
            SKIP_SSL=true
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --no-backup)
            BACKUP=false
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be 'development' or 'production'"
    exit 1
fi

# Validate production requirements
if [[ "$ENVIRONMENT" == "production" ]]; then
    if [[ -z "$DOMAIN" ]]; then
        print_error "Domain is required for production deployment"
        exit 1
    fi
    
    if [[ "$SKIP_SSL" == false && -z "$EMAIL" ]]; then
        print_error "Email is required for SSL certificate setup"
        exit 1
    fi
fi

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root"
        exit 1
    fi
}

# Function to check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check OS
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        print_warning "This script is designed for Linux systems"
    fi
    
    # Check required commands
    local required_commands=("python3" "node" "npm" "git")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            print_error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Check Python version
    local python_version=$(python3 --version | cut -d' ' -f2)
    local python_major=$(echo "$python_version" | cut -d'.' -f1)
    local python_minor=$(echo "$python_version" | cut -d'.' -f2)
    
    if [[ $python_major -lt 3 || ($python_major -eq 3 && $python_minor -lt 9) ]]; then
        print_error "Python 3.9 or higher is required (found: $python_version)"
        exit 1
    fi
    
    # Check Node.js version
    local node_version=$(node --version | sed 's/v//')
    local node_major=$(echo "$node_version" | cut -d'.' -f1)
    
    if [[ $node_major -lt 18 ]]; then
        print_error "Node.js 18 or higher is required (found: $node_version)"
        exit 1
    fi
    
    print_success "System requirements check passed"
}

# Function to install system dependencies
install_dependencies() {
    if [[ "$SKIP_DEPS" == true ]]; then
        print_status "Skipping dependency installation"
        return
    fi
    
    print_status "Installing system dependencies..."
    
    # Update package list
    sudo apt update
    
    # Install basic dependencies
    sudo apt install -y \
        python3-pip \
        python3-venv \
        python3-dev \
        build-essential \
        libpq-dev \
        libmariadb-dev \
        pkg-config \
        curl \
        wget \
        unzip
    
    # Install security tools
    print_status "Installing security tools..."
    sudo apt install -y nmap gobuster dirb
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        # Install production dependencies
        sudo apt install -y \
            nginx \
            postgresql \
            postgresql-contrib \
            redis-server \
            supervisor \
            logrotate
        
        # Install SSL certificate tools
        if [[ "$SKIP_SSL" == false ]]; then
            sudo apt install -y certbot python3-certbot-nginx
        fi
    fi
    
    print_success "Dependencies installed successfully"
}

# Function to create application user (production only)
create_app_user() {
    if [[ "$ENVIRONMENT" != "production" ]]; then
        return
    fi
    
    print_status "Creating application user..."
    
    if ! id "$DEPLOY_USER" &>/dev/null; then
        sudo useradd -r -s /bin/false -d "$DEPLOY_DIR" "$DEPLOY_USER"
        print_success "Created user: $DEPLOY_USER"
    else
        print_status "User $DEPLOY_USER already exists"
    fi
    
    # Create application directory
    sudo mkdir -p "$DEPLOY_DIR"
    sudo chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_DIR"
}

# Function to backup existing installation
backup_existing() {
    if [[ "$BACKUP" == false ]]; then
        return
    fi
    
    local backup_dir="/tmp/${PROJECT_NAME}_backup_$(date +%Y%m%d_%H%M%S)"
    
    if [[ "$ENVIRONMENT" == "production" && -d "$DEPLOY_DIR" ]]; then
        print_status "Creating backup of existing installation..."
        sudo mkdir -p "$backup_dir"
        sudo cp -r "$DEPLOY_DIR" "$backup_dir/"
        print_success "Backup created at: $backup_dir"
    elif [[ "$ENVIRONMENT" == "development" && -d "$SCRIPT_DIR/backend/venv" ]]; then
        print_status "Creating backup of virtual environment..."
        mkdir -p "$backup_dir"
        cp -r "$SCRIPT_DIR/backend/venv" "$backup_dir/" 2>/dev/null || true
        print_success "Backup created at: $backup_dir"
    fi
}

# Function to setup Python environment
setup_python_env() {
    print_status "Setting up Python environment..."
    
    local backend_dir
    if [[ "$ENVIRONMENT" == "production" ]]; then
        backend_dir="$DEPLOY_DIR/backend"
        cd "$DEPLOY_DIR"
    else
        backend_dir="$SCRIPT_DIR/backend"
        cd "$SCRIPT_DIR"
    fi
    
    # Create virtual environment
    if [[ ! -d "$backend_dir/venv" ]]; then
        python3 -m venv "$backend_dir/venv"
    fi
    
    # Activate virtual environment and install dependencies
    source "$backend_dir/venv/bin/activate"
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install requirements
    if [[ "$ENVIRONMENT" == "production" ]]; then
        pip install -r "$backend_dir/requirements-production.txt"
    else
        pip install -r "$backend_dir/requirements.txt"
    fi
    
    print_success "Python environment setup completed"
}

# Function to setup Node.js environment
setup_node_env() {
    print_status "Setting up Node.js environment..."
    
    local frontend_dir
    if [[ "$ENVIRONMENT" == "production" ]]; then
        frontend_dir="$DEPLOY_DIR/frontend"
    else
        frontend_dir="$SCRIPT_DIR/frontend"
    fi
    
    cd "$frontend_dir"
    
    # Install dependencies
    if [[ "$ENVIRONMENT" == "production" ]]; then
        npm ci --production
    else
        npm install
    fi
    
    # Build frontend for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        npm run build
    fi
    
    print_success "Node.js environment setup completed"
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        # PostgreSQL setup for production
        print_status "Configuring PostgreSQL..."
        
        # Start PostgreSQL service
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        
        # Create database and user
        sudo -u postgres psql -c "CREATE DATABASE ${PROJECT_NAME//-/_} OWNER ${DEPLOY_USER};" 2>/dev/null || true
        sudo -u postgres psql -c "CREATE USER ${DEPLOY_USER} WITH PASSWORD 'changeme';" 2>/dev/null || true
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${PROJECT_NAME//-/_} TO ${DEPLOY_USER};" 2>/dev/null || true
        
        print_warning "Please change the default database password in the environment configuration"
    fi
    
    # Initialize database
    local backend_dir
    if [[ "$ENVIRONMENT" == "production" ]]; then
        backend_dir="$DEPLOY_DIR/backend"
    else
        backend_dir="$SCRIPT_DIR/backend"
    fi
    
    cd "$backend_dir"
    source venv/bin/activate
    python init_db.py
    
    print_success "Database setup completed"
}

# Function to configure environment files
configure_environment() {
    print_status "Configuring environment files..."
    
    local backend_dir frontend_dir
    if [[ "$ENVIRONMENT" == "production" ]]; then
        backend_dir="$DEPLOY_DIR/backend"
        frontend_dir="$DEPLOY_DIR/frontend"
    else
        backend_dir="$SCRIPT_DIR/backend"
        frontend_dir="$SCRIPT_DIR/frontend"
    fi
    
    # Backend environment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if [[ ! -f "$backend_dir/.env" ]]; then
            cp "$backend_dir/.env.production" "$backend_dir/.env"
            
            # Update domain in environment file
            if [[ -n "$DOMAIN" ]]; then
                sed -i "s/yourdomain.com/$DOMAIN/g" "$backend_dir/.env"
            fi
        fi
    else
        if [[ ! -f "$backend_dir/.env" ]]; then
            cp "$backend_dir/.env.example" "$backend_dir/.env"
        fi
    fi
    
    # Frontend environment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if [[ ! -f "$frontend_dir/.env.production" ]]; then
            cp "$frontend_dir/.env.example" "$frontend_dir/.env.production"
            
            # Update API URL in environment file
            if [[ -n "$DOMAIN" ]]; then
                local protocol="https"
                if [[ "$SKIP_SSL" == true ]]; then
                    protocol="http"
                fi
                sed -i "s|http://localhost:5000|${protocol}://${DOMAIN}|g" "$frontend_dir/.env.production"
            fi
        fi
    else
        if [[ ! -f "$frontend_dir/.env" ]]; then
            cp "$frontend_dir/.env.example" "$frontend_dir/.env"
        fi
    fi
    
    print_success "Environment configuration completed"
}

# Function to setup SSL certificate
setup_ssl() {
    if [[ "$ENVIRONMENT" != "production" || "$SKIP_SSL" == true ]]; then
        return
    fi
    
    print_status "Setting up SSL certificate..."
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        print_error "Certbot is not installed. Install it first or use --skip-ssl"
        exit 1
    fi
    
    # Obtain SSL certificate
    sudo certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive
    
    # Setup auto-renewal
    (sudo crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | sudo crontab -
    
    print_success "SSL certificate setup completed"
}

# Function to configure web server
configure_webserver() {
    if [[ "$ENVIRONMENT" != "production" ]]; then
        return
    fi
    
    print_status "Configuring Nginx..."
    
    # Copy nginx configuration
    sudo cp "$DEPLOY_DIR/nginx.conf" "/etc/nginx/sites-available/$NGINX_SITE"
    
    # Update domain in nginx config
    if [[ -n "$DOMAIN" ]]; then
        sudo sed -i "s/yourdomain.com/$DOMAIN/g" "/etc/nginx/sites-available/$NGINX_SITE"
    fi
    
    # Enable site
    sudo ln -sf "/etc/nginx/sites-available/$NGINX_SITE" "/etc/nginx/sites-enabled/"
    
    # Remove default site
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    sudo nginx -t
    
    # Start and enable nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    print_success "Nginx configuration completed"
}

# Function to setup systemd service
setup_systemd_service() {
    if [[ "$ENVIRONMENT" != "production" ]]; then
        return
    fi
    
    print_status "Setting up systemd service..."
    
    # Create systemd service file
    sudo tee "/etc/systemd/system/$SERVICE_NAME.service" > /dev/null <<EOF
[Unit]
Description=Cybersecurity Toolkit Platform
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=$DEPLOY_USER
Group=$DEPLOY_USER
WorkingDirectory=$DEPLOY_DIR/backend
Environment=PATH=$DEPLOY_DIR/backend/venv/bin
ExecStart=$DEPLOY_DIR/backend/venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 4 --worker-class eventlet app:create_app()
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    
    print_success "Systemd service setup completed"
}

# Function to configure firewall
configure_firewall() {
    if [[ "$ENVIRONMENT" != "production" ]]; then
        return
    fi
    
    print_status "Configuring firewall..."
    
    # Install and configure UFW
    sudo apt install -y ufw
    
    # Set default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH
    sudo ufw allow ssh
    
    # Allow HTTP and HTTPS
    sudo ufw allow 'Nginx Full'
    
    # Enable firewall
    sudo ufw --force enable
    
    print_success "Firewall configuration completed"
}

# Function to setup logging
setup_logging() {
    if [[ "$ENVIRONMENT" != "production" ]]; then
        return
    fi
    
    print_status "Setting up logging..."
    
    # Create log directory
    sudo mkdir -p "/var/log/$PROJECT_NAME"
    sudo chown "$DEPLOY_USER:$DEPLOY_USER" "/var/log/$PROJECT_NAME"
    
    # Setup logrotate
    sudo tee "/etc/logrotate.d/$PROJECT_NAME" > /dev/null <<EOF
/var/log/$PROJECT_NAME/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $DEPLOY_USER $DEPLOY_USER
    postrotate
        systemctl reload $SERVICE_NAME
    endscript
}
EOF
    
    print_success "Logging setup completed"
}

# Function to start services
start_services() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        print_status "Starting services..."
        
        # Start application service
        sudo systemctl start "$SERVICE_NAME"
        
        # Restart nginx
        sudo systemctl restart nginx
        
        # Start Redis if installed
        if systemctl is-enabled redis-server &>/dev/null; then
            sudo systemctl start redis-server
        fi
        
        print_success "Services started successfully"
    else
        print_status "Development environment setup completed"
        print_status "To start the development server:"
        print_status "  Backend: cd backend && source venv/bin/activate && python app.py"
        print_status "  Frontend: cd frontend && npm run dev"
    fi
}

# Function to run post-deployment tests
run_tests() {
    print_status "Running post-deployment tests..."
    
    local backend_dir
    if [[ "$ENVIRONMENT" == "production" ]]; then
        backend_dir="$DEPLOY_DIR/backend"
    else
        backend_dir="$SCRIPT_DIR/backend"
    fi
    
    cd "$backend_dir"
    source venv/bin/activate
    
    # Test database connection
    python -c "
from database import db
from app import create_app
app = create_app()
with app.app_context():
    db.create_all()
    print('Database connection: OK')
"
    
    # Test API health endpoint
    if [[ "$ENVIRONMENT" == "production" ]]; then
        local protocol="https"
        if [[ "$SKIP_SSL" == true ]]; then
            protocol="http"
        fi
        
        if curl -f -s "${protocol}://${DOMAIN}/api/auth/health" > /dev/null; then
            print_success "API health check: OK"
        else
            print_warning "API health check failed"
        fi
    fi
    
    print_success "Post-deployment tests completed"
}

# Function to show deployment summary
show_summary() {
    print_success "Deployment completed successfully!"
    echo
    print_status "Deployment Summary:"
    print_status "  Environment: $ENVIRONMENT"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        print_status "  Domain: $DOMAIN"
        print_status "  SSL: $([ "$SKIP_SSL" == true ] && echo "Disabled" || echo "Enabled")"
        print_status "  Application URL: $([ "$SKIP_SSL" == true ] && echo "http" || echo "https")://$DOMAIN"
        print_status "  Service: $SERVICE_NAME"
        print_status "  User: $DEPLOY_USER"
        print_status "  Directory: $DEPLOY_DIR"
        echo
        print_status "Service Management:"
        print_status "  Start:   sudo systemctl start $SERVICE_NAME"
        print_status "  Stop:    sudo systemctl stop $SERVICE_NAME"
        print_status "  Restart: sudo systemctl restart $SERVICE_NAME"
        print_status "  Status:  sudo systemctl status $SERVICE_NAME"
        print_status "  Logs:    sudo journalctl -u $SERVICE_NAME -f"
    else
        print_status "  Backend:  cd backend && source venv/bin/activate && python app.py"
        print_status "  Frontend: cd frontend && npm run dev"
        print_status "  URLs:"
        print_status "    Frontend: http://localhost:5173"
        print_status "    Backend:  http://localhost:5000"
    fi
    
    echo
    print_status "Next Steps:"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        print_status "  1. Update database password in $DEPLOY_DIR/backend/.env"
        print_status "  2. Configure JWT secret keys"
        print_status "  3. Review and update security settings"
        print_status "  4. Setup monitoring and backups"
        print_status "  5. Create admin user account"
    else
        print_status "  1. Update environment variables in backend/.env"
        print_status "  2. Start the development servers"
        print_status "  3. Access the application at http://localhost:5173"
    fi
}

# Main deployment function
main() {
    print_status "Starting deployment for $ENVIRONMENT environment..."
    
    # Confirmation prompt
    if [[ "$FORCE" == false ]]; then
        echo
        print_warning "This will deploy the Cybersecurity Toolkit Platform"
        print_warning "Environment: $ENVIRONMENT"
        if [[ "$ENVIRONMENT" == "production" ]]; then
            print_warning "Domain: $DOMAIN"
            print_warning "SSL: $([ "$SKIP_SSL" == true ] && echo "Disabled" || echo "Enabled")"
        fi
        echo
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Run deployment steps
    check_root
    check_requirements
    install_dependencies
    create_app_user
    backup_existing
    
    # Copy files for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        print_status "Copying application files..."
        sudo -u "$DEPLOY_USER" cp -r "$SCRIPT_DIR"/* "$DEPLOY_DIR/"
    fi
    
    setup_python_env
    setup_node_env
    configure_environment
    setup_database
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        configure_webserver
        setup_ssl
        setup_systemd_service
        configure_firewall
        setup_logging
    fi
    
    start_services
    run_tests
    show_summary
}

# Run main function
main "$@"