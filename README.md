# Cybersecurity Toolkit Platform

A comprehensive, modern web-based cybersecurity toolkit platform that provides an intuitive interface for running various security scanning tools. Built with Flask (Python) backend and React (TypeScript) frontend, featuring real-time progress tracking, dark/light themes, and professional security tool integration.

## 🚀 Quick Start

### Docker (Recommended)
```bash
git clone <repository-url>
cd cybersecurity-toolkit-platform
cp .env.example .env
docker-compose -f docker-compose.dev.yml up -d
```
Access at: http://localhost:5173

### Manual Setup
```bash
# Linux/macOS
./deploy.sh -e development

# Windows
.\deploy.ps1 -Environment development
```

📖 **Full setup instructions**: [QUICK_START.md](QUICK_START.md)

## ✨ Features

### 🔧 Security Tools Integration
- **Nmap**: Network discovery and security auditing
- **Gobuster**: Directory/file & DNS busting
- **Dirb**: Web content scanner
- **Extensible architecture** for adding new tools

### 🎨 Modern User Interface
- **Dark/Light themes** with smooth transitions
- **Real-time progress tracking** with WebSocket updates
- **Responsive design** optimized for desktop and mobile
- **Professional animations** using Framer Motion
- **Syntax highlighting** for scan results

### 🔐 Security & Authentication
- **JWT-based authentication** with refresh tokens
- **Rate limiting** and brute force protection
- **Input validation** and XSS protection
- **Session management** with automatic timeout
- **Activity logging** for security monitoring

### 📊 Dashboard & Analytics
- **Personalized dashboard** with scan statistics
- **Recent scans widget** with quick actions
- **System status monitoring** for tool availability
- **User statistics** and success rate tracking

### 📚 Scan Management
- **Comprehensive scan history** with filtering and search
- **Export capabilities** (JSON, TXT, CSV, HTML)
- **Scan sharing** with expirable links
- **Re-run previous scans** with saved configurations
- **Concurrent scanning** with resource management

### ⚙️ User Settings
- **Profile management** with avatar upload
- **Scanning preferences** and default configurations
- **Custom wordlist management** for directory scanning
- **Notification settings** and theme preferences
- **Account management** with data export

## 🏗️ Architecture

### Technology Stack

**Backend (Python)**
- **Flask** - Web framework with RESTful API
- **SQLAlchemy** - Database ORM with PostgreSQL/SQLite
- **Flask-JWT-Extended** - JWT authentication
- **Flask-SocketIO** - Real-time WebSocket communication
- **Gunicorn** - WSGI HTTP Server for production

**Frontend (TypeScript/React)**
- **React 18+** - Modern UI framework with hooks
- **TypeScript** - Type safety and better development experience
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Framer Motion** - Smooth animations and transitions

**Infrastructure**
- **Docker** - Containerization for easy deployment
- **Nginx** - Reverse proxy and static file serving
- **PostgreSQL** - Production database
- **Redis** - Caching and rate limiting
- **Let's Encrypt** - SSL certificate management

### Project Structure

```
cybersecurity-toolkit-platform/
├── 📁 backend/                    # Flask API backend
│   ├── 📁 models/                # Database models
│   ├── 📁 routes/                # API route handlers
│   ├── 📁 tools/                 # Security tool integrations
│   ├── 📁 utils/                 # Utility functions
│   ├── 📁 tests/                 # Backend tests
│   ├── 📄 app.py                 # Flask application factory
│   ├── 📄 config.py              # Configuration management
│   └── 📄 requirements.txt       # Python dependencies
├── 📁 frontend/                   # React frontend
│   ├── 📁 src/
│   │   ├── 📁 components/        # Reusable React components
│   │   ├── 📁 contexts/          # React context providers
│   │   ├── 📁 hooks/             # Custom React hooks
│   │   ├── 📁 pages/             # Page components
│   │   ├── 📁 services/          # API service functions
│   │   ├── 📁 types/             # TypeScript definitions
│   │   └── 📁 utils/             # Frontend utilities
│   ├── 📄 package.json           # Node.js dependencies
│   └── 📄 vite.config.ts         # Vite configuration
├── 📁 docs/                      # Documentation
├── 📄 docker-compose.dev.yml     # Development Docker setup
├── 📄 docker-compose.prod.yml    # Production Docker setup
├── 📄 deploy.sh                  # Linux/macOS deployment script
├── 📄 deploy.ps1                 # Windows deployment script
└── 📄 nginx.conf                 # Nginx configuration
```

## 📋 Requirements

### System Requirements
- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows 10+
- **Python**: 3.9 or higher
- **Node.js**: 18.0 or higher
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 5GB free space

### Security Tools
- **Nmap**: Network discovery and security auditing
- **Gobuster**: Directory/file & DNS busting tool
- **Dirb**: Web content scanner

## 🚀 Deployment

### Development Environment

#### Option 1: Docker (Recommended)
```bash
# Clone and start with Docker
git clone <repository-url>
cd cybersecurity-toolkit-platform
docker-compose -f docker-compose.dev.yml up -d

# Access services
# Frontend: http://localhost:5173
# Backend API: http://localhost:5000
# Database Admin: http://localhost:8080
# Redis Admin: http://localhost:8081
```

#### Option 2: Manual Setup
```bash
# Linux/macOS
chmod +x deploy.sh
./deploy.sh -e development

# Windows PowerShell
.\deploy.ps1 -Environment development
```

### Production Environment

#### Automated Deployment
```bash
# Linux/macOS with SSL
./deploy.sh -e production -d yourdomain.com -m admin@yourdomain.com

# Windows with Docker
.\deploy.ps1 -Environment production -Domain yourdomain.com -UseDocker
```

#### Docker Production
```bash
# Configure environment
cp .env.example .env
# Edit .env with production values

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

## 📖 Documentation

- **[Quick Start Guide](QUICK_START.md)** - Get up and running in minutes
- **[Installation Guide](INSTALLATION.md)** - Detailed setup instructions
- **[User Manual](USER_MANUAL.md)** - Complete user guide
- **[API Documentation](API_DOCUMENTATION.md)** - REST API reference
- **[Production Deployment](PRODUCTION_DEPLOYMENT.md)** - Production setup guide

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Flask Configuration
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# Database
DATABASE_URL=sqlite:///cybersecurity_toolkit.db

# Security
CORS_ORIGINS=http://localhost:5173
RATE_LIMIT_ENABLED=true

# Logging
LOG_LEVEL=INFO
LOG_FILE=app.log
```

#### Frontend (.env)
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

# Application
VITE_APP_NAME=Cybersecurity Toolkit
VITE_ENABLE_REGISTRATION=true
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
source venv/bin/activate
python -m pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
# Run full test suite
python test_integration.py
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow PEP 8 for Python code
- Use TypeScript for all frontend code
- Write tests for new features
- Update documentation as needed
- Ensure security best practices

## 🔒 Security

### Security Features
- JWT authentication with refresh tokens
- Rate limiting and brute force protection
- Input validation and sanitization
- XSS and CSRF protection
- Secure password hashing
- Activity logging and monitoring

### Reporting Security Issues
Please report security vulnerabilities to the maintainers privately.

## 📊 Performance

### Optimization Features
- Database query optimization with indexing
- Redis caching for frequently accessed data
- Efficient WebSocket communication
- Lazy loading and code splitting
- Optimized Docker images
- CDN-ready static assets

## 🌐 Browser Support

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Nmap Project** - Network discovery and security auditing
- **OJ Reeves** - Gobuster directory/file busting tool
- **Ramon Pinuaga** - Dirb web content scanner
- **Flask Community** - Web framework and extensions
- **React Team** - Frontend framework and ecosystem

## 📞 Support

- **Documentation**: Check the docs folder for detailed guides
- **Issues**: Report bugs and request features via GitHub issues
- **Community**: Join our community discussions
- **Email**: Contact the maintainers for urgent issues

---

**Built with ❤️ for the cybersecurity community**