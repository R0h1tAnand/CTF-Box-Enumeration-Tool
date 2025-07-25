# Cybersecurity Toolkit Platform Deployment Script for Windows
# PowerShell script for deploying the platform on Windows systems

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("development", "production")]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [string]$Domain = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Email = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipSSL = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDeps = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$NoBackup = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$UseDocker = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help = $false
)

# Configuration
$ProjectName = "cybersecurity-toolkit"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Colors for output
$Colors = @{
    Info = "Cyan"
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
}

# Function to print colored output
function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Colors[$Type]
}

# Function to show usage
function Show-Usage {
    Write-Host @"
Cybersecurity Toolkit Platform Deployment Script for Windows

USAGE:
    .\deploy.ps1 [OPTIONS]

OPTIONS:
    -Environment ENV        Deployment environment (development|production) [default: development]
    -Domain DOMAIN         Domain name for production deployment
    -Email EMAIL           Email for SSL certificate
    -SkipSSL              Skip SSL certificate setup
    -SkipDeps             Skip dependency installation
    -Force                Force deployment without confirmation
    -NoBackup             Skip backup creation
    -UseDocker            Use Docker for deployment
    -Help                 Show this help message

EXAMPLES:
    # Development deployment
    .\deploy.ps1 -Environment development

    # Production deployment with Docker
    .\deploy.ps1 -Environment production -Domain example.com -UseDocker

    # Development with Docker
    .\deploy.ps1 -Environment development -UseDocker

"@
}

# Show help if requested
if ($Help) {
    Show-Usage
    exit 0
}

# Validate parameters
if ($Environment -eq "production" -and -not $Domain) {
    Write-Status "Domain is required for production deployment" "Error"
    exit 1
}

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to check system requirements
function Test-Requirements {
    Write-Status "Checking system requirements..."
    
    $requirements = @()
    
    # Check PowerShell version
    if ($PSVersionTable.PSVersion.Major -lt 5) {
        $requirements += "PowerShell 5.0 or higher is required"
    }
    
    if ($UseDocker) {
        # Check Docker
        try {
            $dockerVersion = docker --version
            Write-Status "Docker found: $dockerVersion"
        } catch {
            $requirements += "Docker is required when using -UseDocker"
        }
        
        # Check Docker Compose
        try {
            $composeVersion = docker-compose --version
            Write-Status "Docker Compose found: $composeVersion"
        } catch {
            $requirements += "Docker Compose is required when using -UseDocker"
        }
    } else {
        # Check Python
        try {
            $pythonVersion = python --version 2>&1
            if ($pythonVersion -match "Python (\d+)\.(\d+)") {
                $major = [int]$matches[1]
                $minor = [int]$matches[2]
                if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 9)) {
                    $requirements += "Python 3.9 or higher is required (found: $pythonVersion)"
                } else {
                    Write-Status "Python found: $pythonVersion"
                }
            }
        } catch {
            $requirements += "Python 3.9 or higher is required"
        }
        
        # Check Node.js
        try {
            $nodeVersion = node --version
            if ($nodeVersion -match "v(\d+)") {
                $major = [int]$matches[1]
                if ($major -lt 18) {
                    $requirements += "Node.js 18 or higher is required (found: $nodeVersion)"
                } else {
                    Write-Status "Node.js found: $nodeVersion"
                }
            }
        } catch {
            $requirements += "Node.js 18 or higher is required"
        }
        
        # Check npm
        try {
            $npmVersion = npm --version
            Write-Status "npm found: v$npmVersion"
        } catch {
            $requirements += "npm is required"
        }
    }
    
    # Check Git
    try {
        $gitVersion = git --version
        Write-Status "Git found: $gitVersion"
    } catch {
        $requirements += "Git is required"
    }
    
    if ($requirements.Count -gt 0) {
        Write-Status "Missing requirements:" "Error"
        foreach ($req in $requirements) {
            Write-Status "  - $req" "Error"
        }
        exit 1
    }
    
    Write-Status "System requirements check passed" "Success"
}

# Function to install Chocolatey packages
function Install-Dependencies {
    if ($SkipDeps) {
        Write-Status "Skipping dependency installation"
        return
    }
    
    Write-Status "Installing dependencies..."
    
    # Check if Chocolatey is installed
    try {
        choco --version | Out-Null
        Write-Status "Chocolatey found"
    } catch {
        Write-Status "Installing Chocolatey..." "Warning"
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    }
    
    if (-not $UseDocker) {
        # Install Python if not found
        try {
            python --version | Out-Null
        } catch {
            Write-Status "Installing Python..."
            choco install python -y
        }
        
        # Install Node.js if not found
        try {
            node --version | Out-Null
        } catch {
            Write-Status "Installing Node.js..."
            choco install nodejs -y
        }
    }
    
    # Install Git if not found
    try {
        git --version | Out-Null
    } catch {
        Write-Status "Installing Git..."
        choco install git -y
    }
    
    if ($UseDocker) {
        # Install Docker Desktop if not found
        try {
            docker --version | Out-Null
        } catch {
            Write-Status "Installing Docker Desktop..."
            choco install docker-desktop -y
            Write-Status "Please restart your computer and run the script again after Docker Desktop is running" "Warning"
            exit 0
        }
    }
    
    Write-Status "Dependencies installation completed" "Success"
}

# Function to backup existing installation
function Backup-Existing {
    if ($NoBackup) {
        return
    }
    
    $backupDir = Join-Path $env:TEMP "$ProjectName`_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    
    if ($Environment -eq "development") {
        $venvPath = Join-Path $ScriptDir "backend\venv"
        $nodeModulesPath = Join-Path $ScriptDir "frontend\node_modules"
        
        if (Test-Path $venvPath -or Test-Path $nodeModulesPath) {
            Write-Status "Creating backup of existing installation..."
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
            
            if (Test-Path $venvPath) {
                Copy-Item -Path $venvPath -Destination $backupDir -Recurse -Force
            }
            
            if (Test-Path $nodeModulesPath) {
                Copy-Item -Path $nodeModulesPath -Destination $backupDir -Recurse -Force
            }
            
            Write-Status "Backup created at: $backupDir" "Success"
        }
    }
}

# Function to setup Python environment
function Setup-PythonEnvironment {
    if ($UseDocker) {
        return
    }
    
    Write-Status "Setting up Python environment..."
    
    $backendDir = Join-Path $ScriptDir "backend"
    $venvPath = Join-Path $backendDir "venv"
    
    Set-Location $backendDir
    
    # Create virtual environment
    if (-not (Test-Path $venvPath)) {
        python -m venv venv
    }
    
    # Activate virtual environment
    $activateScript = Join-Path $venvPath "Scripts\Activate.ps1"
    & $activateScript
    
    # Upgrade pip
    python -m pip install --upgrade pip
    
    # Install requirements
    if ($Environment -eq "production" -and (Test-Path "requirements-production.txt")) {
        pip install -r requirements-production.txt
    } else {
        pip install -r requirements.txt
    }
    
    Write-Status "Python environment setup completed" "Success"
}

# Function to setup Node.js environment
function Setup-NodeEnvironment {
    if ($UseDocker) {
        return
    }
    
    Write-Status "Setting up Node.js environment..."
    
    $frontendDir = Join-Path $ScriptDir "frontend"
    Set-Location $frontendDir
    
    # Install dependencies
    if ($Environment -eq "production") {
        npm ci --production
        npm run build
    } else {
        npm install
    }
    
    Write-Status "Node.js environment setup completed" "Success"
}

# Function to setup database
function Setup-Database {
    if ($UseDocker) {
        return
    }
    
    Write-Status "Setting up database..."
    
    $backendDir = Join-Path $ScriptDir "backend"
    Set-Location $backendDir
    
    # Activate virtual environment
    $venvPath = Join-Path $backendDir "venv"
    $activateScript = Join-Path $venvPath "Scripts\Activate.ps1"
    & $activateScript
    
    # Initialize database
    python init_db.py
    
    Write-Status "Database setup completed" "Success"
}

# Function to configure environment files
function Configure-Environment {
    Write-Status "Configuring environment files..."
    
    $backendDir = Join-Path $ScriptDir "backend"
    $frontendDir = Join-Path $ScriptDir "frontend"
    
    # Backend environment
    $backendEnvPath = Join-Path $backendDir ".env"
    if (-not (Test-Path $backendEnvPath)) {
        if ($Environment -eq "production") {
            $templatePath = Join-Path $backendDir ".env.production"
        } else {
            $templatePath = Join-Path $backendDir ".env.example"
        }
        
        if (Test-Path $templatePath) {
            Copy-Item -Path $templatePath -Destination $backendEnvPath
            
            # Update domain in environment file
            if ($Domain) {
                (Get-Content $backendEnvPath) -replace 'yourdomain.com', $Domain | Set-Content $backendEnvPath
            }
        }
    }
    
    # Frontend environment
    $frontendEnvPath = Join-Path $frontendDir ".env"
    if ($Environment -eq "production") {
        $frontendEnvPath = Join-Path $frontendDir ".env.production"
    }
    
    if (-not (Test-Path $frontendEnvPath)) {
        $templatePath = Join-Path $frontendDir ".env.example"
        
        if (Test-Path $templatePath) {
            Copy-Item -Path $templatePath -Destination $frontendEnvPath
            
            # Update API URL in environment file
            if ($Domain) {
                $protocol = if ($SkipSSL) { "http" } else { "https" }
                (Get-Content $frontendEnvPath) -replace 'http://localhost:5000', "$protocol`://$Domain" | Set-Content $frontendEnvPath
            }
        }
    }
    
    Write-Status "Environment configuration completed" "Success"
}

# Function to deploy with Docker
function Deploy-WithDocker {
    Write-Status "Deploying with Docker..."
    
    Set-Location $ScriptDir
    
    # Choose the appropriate docker-compose file
    $composeFile = if ($Environment -eq "production") { "docker-compose.prod.yml" } else { "docker-compose.dev.yml" }
    
    # Create .env file for Docker Compose
    $dockerEnvPath = Join-Path $ScriptDir ".env"
    if (-not (Test-Path $dockerEnvPath)) {
        $envContent = @"
# Docker Compose Environment Variables
DB_USER=toolkit_user
DB_PASSWORD=change_this_password
REDIS_PASSWORD=change_this_redis_password
SECRET_KEY=change_this_secret_key
JWT_SECRET_KEY=change_this_jwt_secret_key
CORS_ORIGINS=https://$Domain
"@
        Set-Content -Path $dockerEnvPath -Value $envContent
        Write-Status "Created .env file for Docker Compose. Please update the passwords!" "Warning"
    }
    
    # Create necessary directories
    $directories = @("ssl", "logs", "backups")
    foreach ($dir in $directories) {
        $dirPath = Join-Path $ScriptDir $dir
        if (-not (Test-Path $dirPath)) {
            New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
        }
    }
    
    # Build and start services
    Write-Status "Building and starting Docker services..."
    docker-compose -f $composeFile up --build -d
    
    # Wait for services to be healthy
    Write-Status "Waiting for services to be ready..."
    Start-Sleep -Seconds 30
    
    # Check service status
    docker-compose -f $composeFile ps
    
    Write-Status "Docker deployment completed" "Success"
}

# Function to start development servers
function Start-DevelopmentServers {
    if ($UseDocker) {
        return
    }
    
    Write-Status "Starting development servers..."
    
    # Start backend in a new PowerShell window
    $backendDir = Join-Path $ScriptDir "backend"
    $backendScript = @"
Set-Location '$backendDir'
& '.\venv\Scripts\Activate.ps1'
python app.py
"@
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript
    
    # Start frontend in a new PowerShell window
    $frontendDir = Join-Path $ScriptDir "frontend"
    $frontendScript = @"
Set-Location '$frontendDir'
npm run dev
"@
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript
    
    Write-Status "Development servers started in separate windows" "Success"
}

# Function to run post-deployment tests
function Test-Deployment {
    Write-Status "Running post-deployment tests..."
    
    if ($UseDocker) {
        # Test Docker services
        $services = docker-compose ps --services
        foreach ($service in $services) {
            $status = docker-compose ps $service
            Write-Status "Service $service status: $status"
        }
        
        # Test API health endpoint
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/health" -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Status "API health check: OK" "Success"
            }
        } catch {
            Write-Status "API health check failed: $($_.Exception.Message)" "Warning"
        }
    } else {
        # Test database connection
        $backendDir = Join-Path $ScriptDir "backend"
        Set-Location $backendDir
        
        $venvPath = Join-Path $backendDir "venv"
        $activateScript = Join-Path $venvPath "Scripts\Activate.ps1"
        & $activateScript
        
        try {
            $testScript = @"
from database import db
from app import create_app
app = create_app()
with app.app_context():
    db.create_all()
    print('Database connection: OK')
"@
            $testScript | python
            Write-Status "Database connection test: OK" "Success"
        } catch {
            Write-Status "Database connection test failed" "Warning"
        }
    }
    
    Write-Status "Post-deployment tests completed" "Success"
}

# Function to show deployment summary
function Show-Summary {
    Write-Status "Deployment completed successfully!" "Success"
    Write-Host ""
    Write-Status "Deployment Summary:"
    Write-Status "  Environment: $Environment"
    Write-Status "  Docker: $(if ($UseDocker) { 'Yes' } else { 'No' })"
    
    if ($Environment -eq "production") {
        Write-Status "  Domain: $Domain"
        Write-Status "  SSL: $(if ($SkipSSL) { 'Disabled' } else { 'Enabled' })"
    }
    
    Write-Host ""
    Write-Status "Access URLs:"
    
    if ($UseDocker) {
        Write-Status "  Frontend: http://localhost:$(if ($Environment -eq 'production') { '80' } else { '5173' })"
        Write-Status "  Backend API: http://localhost:5000/api"
        if ($Environment -eq "development") {
            Write-Status "  Database Admin: http://localhost:8080"
            Write-Status "  Redis Admin: http://localhost:8081"
        }
    } else {
        Write-Status "  Frontend: http://localhost:5173"
        Write-Status "  Backend API: http://localhost:5000/api"
    }
    
    Write-Host ""
    Write-Status "Next Steps:"
    
    if ($UseDocker) {
        Write-Status "  1. Update passwords in .env file"
        Write-Status "  2. Configure SSL certificates (production)"
        Write-Status "  3. Access the application in your browser"
        Write-Status ""
        Write-Status "Docker Commands:"
        Write-Status "  View logs: docker-compose logs -f"
        Write-Status "  Stop services: docker-compose down"
        Write-Status "  Restart services: docker-compose restart"
    } else {
        Write-Status "  1. Update environment variables in backend\.env"
        Write-Status "  2. Development servers should be starting automatically"
        Write-Status "  3. Access the application at http://localhost:5173"
    }
}

# Main deployment function
function Start-Deployment {
    Write-Status "Starting deployment for $Environment environment..."
    
    # Confirmation prompt
    if (-not $Force) {
        Write-Host ""
        Write-Status "This will deploy the Cybersecurity Toolkit Platform" "Warning"
        Write-Status "Environment: $Environment" "Warning"
        Write-Status "Docker: $(if ($UseDocker) { 'Yes' } else { 'No' })" "Warning"
        if ($Environment -eq "production") {
            Write-Status "Domain: $Domain" "Warning"
        }
        Write-Host ""
        $confirmation = Read-Host "Do you want to continue? (y/N)"
        if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
            Write-Status "Deployment cancelled"
            exit 0
        }
    }
    
    # Run deployment steps
    Test-Requirements
    Install-Dependencies
    Backup-Existing
    Configure-Environment
    
    if ($UseDocker) {
        Deploy-WithDocker
    } else {
        Setup-PythonEnvironment
        Setup-NodeEnvironment
        Setup-Database
        Start-DevelopmentServers
    }
    
    Test-Deployment
    Show-Summary
}

# Error handling
trap {
    Write-Status "An error occurred: $($_.Exception.Message)" "Error"
    Write-Status "Deployment failed" "Error"
    exit 1
}

# Run main function
Start-Deployment