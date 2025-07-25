# Quick Start Guide

Get the Cybersecurity Toolkit Platform up and running in minutes!

## Prerequisites

### For Docker Deployment (Recommended)
- **Docker**: 20.10 or higher
- **Docker Compose**: 2.0 or higher
- **Git**: Latest version

### For Manual Deployment
- **Python**: 3.9 or higher
- **Node.js**: 18.0 or higher
- **npm**: 8.0 or higher
- **Git**: Latest version

## Quick Start Options

### Option 1: Docker Deployment (Easiest)

#### Linux/macOS
```bash
# Clone the repository
git clone <repository-url>
cd cybersecurity-toolkit-platform

# Copy environment template
cp .env.example .env

# Edit .env file with your settings
nano .env

# Start with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Access the application
open http://localhost:5173
```

#### Windows (PowerShell)
```powershell
# Clone the repository
git clone <repository-url>
cd cybersecurity-toolkit-platform

# Run deployment script
.\deploy.ps1 -Environment development -UseDocker

# Access the application
start http://localhost:5173
```

### Option 2: Manual Development Setup

#### Linux/macOS
```bash
# Clone the repository
git clone <repository-url>
cd cybersecurity-toolkit-platform

# Run deployment script
chmod +x deploy.sh
./deploy.sh -e development

# Or manual setup:
# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python init_db.py
python app.py &

# Frontend setup (in new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

#### Windows (PowerShell)
```powershell
# Clone the repository
git clone <repository-url>
cd cybersecurity-toolkit-platform

# Run deployment script
.\deploy.ps1 -Environment development

# Or manual setup:
# Backend setup
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python init_db.py
python app.py

# Frontend setup (in new PowerShell window)
cd frontend
npm install
copy .env.example .env
npm run dev
```

## First Time Setup

### 1. Access the Application
- Open your browser and go to `http://localhost:5173`
- You should see the login/registration page

### 2. Create Your First Account
- Click "Register" 
- Fill in your details:
  - Username: Choose a unique username
  - Email: Your email address
  - Password: Strong password (min 8 chars, uppercase, lowercase, number)
- Click "Create Account"

### 3. Login and Explore
- Login with your new credentials
- You'll be redirected to the dashboard
- Explore the different sections:
  - **Dashboard**: Overview and quick actions
  - **Scan**: Start new security scans
  - **History**: View previous scans
  - **Settings**: Configure your preferences

### 4. Run Your First Scan
- Go to the "Scan" page
- Enter a target (e.g., `scanme.nmap.org`)
- Select tools (Nmap is recommended for first scan)
- Configure options or use defaults
- Click "Start Scan"
- Watch real-time progress
- View results when complete

## Environment Configuration

### Backend (.env)
```bash
# Basic configuration
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# Database (SQLite for development)
DATABASE_URL=sqlite:///cybersecurity_toolkit.db

# CORS (allow frontend access)
FRONTEND_URL=http://localhost:5173

# Logging
LOG_LEVEL=INFO
LOG_FILE=app.log
```

### Frontend (.env)
```bash
# API configuration
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

# App configuration
VITE_APP_NAME=Cybersecurity Toolkit
VITE_ENABLE_REGISTRATION=true
```

### Docker (.env)
```bash
# Database credentials
DB_USER=toolkit_user
DB_PASSWORD=secure_password_here

# Redis password
REDIS_PASSWORD=secure_redis_password_here

# Application secrets
SECRET_KEY=secure_secret_key_here
JWT_SECRET_KEY=secure_jwt_secret_key_here

# CORS origins
CORS_ORIGINS=http://localhost:5173
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
netstat -tulpn | grep :5000  # Linux
netstat -ano | findstr :5000  # Windows

# Kill the process or change port in configuration
```

#### Python Virtual Environment Issues
```bash
# Linux/macOS
rm -rf backend/venv
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Windows
Remove-Item -Recurse -Force backend\venv
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

#### Node.js Dependencies Issues
```bash
# Clear npm cache and reinstall
cd frontend
rm -rf node_modules package-lock.json  # Linux/macOS
Remove-Item -Recurse -Force node_modules, package-lock.json  # Windows
npm install
```

#### Database Connection Issues
```bash
# Reset database
cd backend
rm -f cybersecurity_toolkit.db  # Linux/macOS
Remove-Item cybersecurity_toolkit.db  # Windows
python init_db.py
```

#### Docker Issues
```bash
# Reset Docker environment
docker-compose down -v
docker-compose up --build -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### Security Tools Not Found

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install nmap gobuster dirb
```

#### macOS
```bash
brew install nmap gobuster dirb
```

#### Windows
```powershell
# Using Chocolatey
choco install nmap

# Or download manually:
# Nmap: https://nmap.org/download.html
# Gobuster: https://github.com/OJ/gobuster/releases
# Dirb: Included with Kali Linux tools
```

## Default Credentials

### Development Database
- **Type**: SQLite
- **File**: `backend/cybersecurity_toolkit.db`
- **No credentials required**

### Docker Services
- **PostgreSQL**: 
  - Host: localhost:5432
  - Database: cybersecurity_toolkit
  - User: toolkit_user
  - Password: (set in .env)
- **Redis**: 
  - Host: localhost:6379
  - Password: (set in .env)
- **Adminer** (dev only): http://localhost:8080
- **Redis Commander** (dev only): http://localhost:8081

## Next Steps

### For Development
1. **Explore the Code**: Familiarize yourself with the project structure
2. **Run Tests**: Execute the test suite to ensure everything works
3. **Make Changes**: Start developing new features
4. **Read Documentation**: Check out the full documentation

### For Production
1. **Security Review**: Update all default passwords and secrets
2. **SSL Setup**: Configure HTTPS certificates
3. **Domain Configuration**: Set up your domain and DNS
4. **Monitoring**: Implement logging and monitoring
5. **Backups**: Set up automated backups

## Useful Commands

### Development
```bash
# Backend
cd backend
source venv/bin/activate  # Linux/macOS
.\venv\Scripts\Activate.ps1  # Windows
python app.py

# Frontend
cd frontend
npm run dev

# Run tests
cd backend
python -m pytest
cd ../frontend
npm test
```

### Docker
```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f [service-name]

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build -d

# Execute commands in container
docker-compose exec app bash
```

### Production
```bash
# Deploy to production
./deploy.sh -e production -d yourdomain.com -m admin@yourdomain.com

# Check service status
sudo systemctl status cybersecurity-toolkit

# View logs
sudo journalctl -u cybersecurity-toolkit -f

# Restart service
sudo systemctl restart cybersecurity-toolkit
```

## Getting Help

### Documentation
- **Installation Guide**: [INSTALLATION.md](INSTALLATION.md)
- **User Manual**: [USER_MANUAL.md](USER_MANUAL.md)
- **API Documentation**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Production Deployment**: [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)

### Support
- **Issues**: Check the troubleshooting section above
- **Logs**: Check application logs for error details
- **Community**: Join our community forum (if available)
- **Bug Reports**: Submit issues to the project repository

---

**Happy Scanning!** 🔒🛡️