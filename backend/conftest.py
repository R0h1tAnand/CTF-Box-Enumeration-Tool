"""Test configuration and fixtures."""
import os
import tempfile
import pytest
from flask import Flask
from flask_jwt_extended import JWTManager
from database import db
from models.user import User
from models.scan_history import ScanHistory
from models.user_settings import UserSettings
from models.activity_log import ActivityLog

@pytest.fixture(scope='session')
def app():
    """Create application for the tests."""
    # Use in-memory SQLite database for tests
    test_config = {
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'JWT_SECRET_KEY': 'test-secret-key',
        'WTF_CSRF_ENABLED': False,
        'SECRET_KEY': 'test-secret'
    }
    
    # Create Flask app
    test_app = Flask(__name__)
    test_app.config.update(test_config)
    
    # Initialize database
    db.init_app(test_app)
    
    # Initialize JWT
    jwt = JWTManager(test_app)
    
    # Register blueprints for testing
    try:
        from routes.auth import auth_bp
        from routes.dashboard import dashboard_bp
        from routes.scans import scans_bp
        from routes.history import history_bp
        from routes.settings import settings_bp
        
        test_app.register_blueprint(auth_bp, url_prefix='/api/auth')
        test_app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
        test_app.register_blueprint(scans_bp, url_prefix='/api/scans')
        test_app.register_blueprint(history_bp, url_prefix='/api/history')
        test_app.register_blueprint(settings_bp, url_prefix='/api/settings')
    except ImportError:
        # Routes might not be available in test environment
        pass
    
    with test_app.app_context():
        db.create_all()
        yield test_app

@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()

@pytest.fixture
def runner(app):
    """Create test runner."""
    return app.test_cli_runner()

@pytest.fixture
def db_session(app):
    """Create database session for tests."""
    with app.app_context():
        # Clear all tables
        db.session.remove()
        db.drop_all()
        db.create_all()
        yield db.session
        db.session.remove()

@pytest.fixture
def sample_user(db_session):
    """Create a sample user for testing."""
    user = User(
        username='testuser',
        email='test@example.com'
    )
    user.set_password('testpassword123')
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def admin_user(db_session):
    """Create an admin user for testing."""
    user = User(
        username='admin',
        email='admin@example.com',
        is_admin=True
    )
    user.set_password('adminpassword123')
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def sample_scan(db_session, sample_user):
    """Create a sample scan for testing."""
    scan = ScanHistory(
        user_id=sample_user.id,
        target_ip='192.168.1.1',
        tools_used=['nmap'],
        status='completed',
        scan_config={'nmap': {'scan_type': 'basic'}}
    )
    db_session.add(scan)
    db_session.commit()
    return scan

@pytest.fixture
def sample_user_settings(db_session, sample_user):
    """Create sample user settings for testing."""
    settings = UserSettings(
        user_id=sample_user.id,
        theme='dark',
        default_tools=['nmap', 'gobuster'],
        notifications_enabled=True
    )
    db_session.add(settings)
    db_session.commit()
    return settings

@pytest.fixture
def sample_activity_log(db_session, sample_user):
    """Create sample activity log for testing."""
    activity = ActivityLog(
        user_id=sample_user.id,
        activity_type='login',
        description='User logged in',
        ip_address='127.0.0.1',
        user_agent='Test Agent'
    )
    db_session.add(activity)
    db_session.commit()
    return activity

@pytest.fixture
def auth_headers(client, sample_user):
    """Get authentication headers for API requests."""
    response = client.post('/api/auth/login', json={
        'username': sample_user.username,
        'password': 'testpassword123'
    })
    
    if response.status_code == 200:
        token = response.json['access_token']
        return {'Authorization': f'Bearer {token}'}
    
    return {}

@pytest.fixture
def temp_scan_dir():
    """Create temporary directory for scan results."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    # Cleanup is handled by tempfile module