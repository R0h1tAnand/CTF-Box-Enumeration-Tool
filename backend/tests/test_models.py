"""Unit tests for database models."""
import pytest
from datetime import datetime, timedelta
from models.user import User
from models.scan_history import ScanHistory
from models.user_settings import UserSettings
from models.activity_log import ActivityLog
from database import db

@pytest.mark.unit
class TestUserModel:
    """Test cases for User model."""
    
    def test_user_creation(self, db_session):
        """Test creating a new user."""
        user = User(
            username='testuser',
            email='test@example.com'
        )
        user.set_password('password123')
        
        db_session.add(user)
        db_session.commit()
        
        assert user.id is not None
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.is_active is True
        assert user.is_admin is False
        assert user.created_at is not None
        assert user.password_hash is not None
        assert user.password_hash != 'password123'  # Should be hashed
    
    def test_password_hashing(self, db_session):
        """Test password hashing and verification."""
        user = User(username='testuser', email='test@example.com')
        password = 'securepassword123'
        
        user.set_password(password)
        
        # Password should be hashed
        assert user.password_hash != password
        assert len(user.password_hash) > 0
        
        # Should verify correct password
        assert user.check_password(password) is True
        
        # Should reject incorrect password
        assert user.check_password('wrongpassword') is False
    
    def test_update_last_login(self, db_session):
        """Test updating last login timestamp."""
        user = User(username='testuser', email='test@example.com')
        user.set_password('password123')
        db_session.add(user)
        db_session.commit()
        
        # Initially no last login
        assert user.last_login is None
        
        # Update last login
        before_update = datetime.utcnow()
        user.update_last_login()
        after_update = datetime.utcnow()
        
        # Should have updated timestamp
        assert user.last_login is not None
        assert before_update <= user.last_login <= after_update
    
    def test_user_to_dict(self, db_session):
        """Test user serialization to dictionary."""
        user = User(
            username='testuser',
            email='test@example.com',
            is_admin=True
        )
        user.set_password('password123')
        db_session.add(user)
        db_session.commit()
        
        user_dict = user.to_dict()
        
        assert user_dict['id'] == user.id
        assert user_dict['username'] == 'testuser'
        assert user_dict['email'] == 'test@example.com'
        assert user_dict['is_active'] is True
        assert user_dict['is_admin'] is True
        assert 'password_hash' not in user_dict  # Should not include password
        assert user_dict['created_at'] is not None
    
    def test_user_relationships(self, db_session):
        """Test user model relationships."""
        user = User(username='testuser', email='test@example.com')
        user.set_password('password123')
        db_session.add(user)
        db_session.commit()
        
        # Test scan relationship
        scan = ScanHistory(
            user_id=user.id,
            target_ip='192.168.1.1',
            tools_used=['nmap'],
            status='completed'
        )
        db_session.add(scan)
        
        # Test settings relationship
        settings = UserSettings(
            user_id=user.id,
            theme='dark'
        )
        db_session.add(settings)
        db_session.commit()
        
        # Verify relationships
        assert len(user.scans) == 1
        assert user.scans[0].target_ip == '192.168.1.1'
        assert user.settings.theme == 'dark'

@pytest.mark.unit
class TestScanHistoryModel:
    """Test cases for ScanHistory model."""
    
    def test_scan_creation(self, db_session, sample_user):
        """Test creating a new scan record."""
        scan = ScanHistory(
            user_id=sample_user.id,
            target_ip='10.0.0.1',
            tools_used=['nmap', 'gobuster'],
            status='running',
            scan_config={'nmap': {'scan_type': 'basic'}}
        )
        
        db_session.add(scan)
        db_session.commit()
        
        assert scan.id is not None
        assert scan.user_id == sample_user.id
        assert scan.target_ip == '10.0.0.1'
        assert scan.tools_used == ['nmap', 'gobuster']
        assert scan.status == 'running'
        assert scan.started_at is not None
        assert scan.completed_at is None
        assert scan.scan_config == {'nmap': {'scan_type': 'basic'}}
    
    def test_scan_to_dict(self, db_session, sample_user):
        """Test scan serialization to dictionary."""
        scan = ScanHistory(
            user_id=sample_user.id,
            target_ip='192.168.1.100',
            tools_used=['dirb'],
            status='completed',
            error_message='Test error'
        )
        db_session.add(scan)
        db_session.commit()
        
        scan_dict = scan.to_dict()
        
        assert scan_dict['id'] == scan.id
        assert scan_dict['user_id'] == sample_user.id
        assert scan_dict['target_ip'] == '192.168.1.100'
        assert scan_dict['tools_used'] == ['dirb']
        assert scan_dict['status'] == 'completed'
        assert scan_dict['error_message'] == 'Test error'
        assert scan_dict['started_at'] is not None
    
    def test_update_status(self, db_session, sample_user):
        """Test updating scan status."""
        scan = ScanHistory(
            user_id=sample_user.id,
            target_ip='192.168.1.1',
            tools_used=['nmap'],
            status='running'
        )
        db_session.add(scan)
        db_session.commit()
        
        # Initially running with no completion time
        assert scan.status == 'running'
        assert scan.completed_at is None
        
        # Update to completed
        before_update = datetime.utcnow()
        scan.update_status('completed')
        after_update = datetime.utcnow()
        
        assert scan.status == 'completed'
        assert scan.completed_at is not None
        assert before_update <= scan.completed_at <= after_update
        
        # Update to failed with error message
        scan.update_status('failed', 'Connection timeout')
        assert scan.status == 'failed'
        assert scan.error_message == 'Connection timeout'
    
    def test_scan_user_relationship(self, db_session, sample_user):
        """Test scan-user relationship."""
        scan = ScanHistory(
            user_id=sample_user.id,
            target_ip='192.168.1.1',
            tools_used=['nmap'],
            status='completed'
        )
        db_session.add(scan)
        db_session.commit()
        
        # Test relationship
        assert scan.user == sample_user
        assert scan in sample_user.scans

@pytest.mark.unit
class TestUserSettingsModel:
    """Test cases for UserSettings model."""
    
    def test_settings_creation(self, db_session, sample_user):
        """Test creating user settings."""
        settings = UserSettings(
            user_id=sample_user.id,
            theme='light',
            default_tools=['nmap', 'dirb'],
            notifications_enabled=False,
            default_wordlist='/path/to/wordlist.txt',
            auto_export=True
        )
        
        db_session.add(settings)
        db_session.commit()
        
        assert settings.id is not None
        assert settings.user_id == sample_user.id
        assert settings.theme == 'light'
        assert settings.default_tools == ['nmap', 'dirb']
        assert settings.notifications_enabled is False
        assert settings.default_wordlist == '/path/to/wordlist.txt'
        assert settings.auto_export is True
    
    def test_settings_defaults(self, db_session, sample_user):
        """Test default values for user settings."""
        settings = UserSettings(user_id=sample_user.id)
        db_session.add(settings)
        db_session.commit()
        
        assert settings.theme == 'dark'
        assert settings.default_tools == ['nmap']
        assert settings.notifications_enabled is True
        assert settings.auto_export is False
    
    def test_settings_to_dict(self, db_session, sample_user):
        """Test settings serialization to dictionary."""
        settings = UserSettings(
            user_id=sample_user.id,
            theme='dark',
            default_tools=['gobuster'],
            notifications_enabled=True
        )
        db_session.add(settings)
        db_session.commit()
        
        settings_dict = settings.to_dict()
        
        assert settings_dict['id'] == settings.id
        assert settings_dict['user_id'] == sample_user.id
        assert settings_dict['theme'] == 'dark'
        assert settings_dict['default_tools'] == ['gobuster']
        assert settings_dict['notifications_enabled'] is True
    
    def test_update_settings(self, db_session, sample_user):
        """Test updating user settings."""
        settings = UserSettings(
            user_id=sample_user.id,
            theme='dark',
            notifications_enabled=True
        )
        db_session.add(settings)
        db_session.commit()
        
        # Update settings
        settings.update_settings(
            theme='light',
            notifications_enabled=False,
            auto_export=True
        )
        
        assert settings.theme == 'light'
        assert settings.notifications_enabled is False
        assert settings.auto_export is True
    
    def test_settings_user_relationship(self, db_session, sample_user):
        """Test settings-user relationship."""
        settings = UserSettings(user_id=sample_user.id)
        db_session.add(settings)
        db_session.commit()
        
        # Test relationship
        assert settings.user == sample_user
        assert sample_user.settings == settings

@pytest.mark.unit
class TestActivityLogModel:
    """Test cases for ActivityLog model."""
    
    def test_activity_log_creation(self, db_session, sample_user):
        """Test creating activity log entry."""
        activity = ActivityLog(
            user_id=sample_user.id,
            activity_type='login',
            description='User logged in successfully',
            ip_address='192.168.1.100',
            user_agent='Mozilla/5.0 Test Browser'
        )
        
        db_session.add(activity)
        db_session.commit()
        
        assert activity.id is not None
        assert activity.user_id == sample_user.id
        assert activity.activity_type == 'login'
        assert activity.description == 'User logged in successfully'
        assert activity.ip_address == '192.168.1.100'
        assert activity.user_agent == 'Mozilla/5.0 Test Browser'
        assert activity.created_at is not None
    
    def test_activity_log_to_dict(self, db_session, sample_user):
        """Test activity log serialization to dictionary."""
        activity = ActivityLog(
            user_id=sample_user.id,
            activity_type='scan_started',
            description='Started Nmap scan',
            ip_address='10.0.0.1'
        )
        db_session.add(activity)
        db_session.commit()
        
        activity_dict = activity.to_dict()
        
        assert activity_dict['id'] == activity.id
        assert activity_dict['user_id'] == sample_user.id
        assert activity_dict['activity_type'] == 'scan_started'
        assert activity_dict['description'] == 'Started Nmap scan'
        assert activity_dict['ip_address'] == '10.0.0.1'
        assert activity_dict['created_at'] is not None
    
    def test_activity_log_user_relationship(self, db_session, sample_user):
        """Test activity log-user relationship."""
        activity = ActivityLog(
            user_id=sample_user.id,
            activity_type='logout',
            description='User logged out'
        )
        db_session.add(activity)
        db_session.commit()
        
        # Test relationship
        assert activity.user == sample_user
        assert activity in sample_user.activity_logs
    
    def test_activity_log_indexing(self, db_session, sample_user):
        """Test that activity logs can be queried efficiently."""
        # Create multiple activity logs
        activities = []
        for i in range(5):
            activity = ActivityLog(
                user_id=sample_user.id,
                activity_type='test_activity',
                description=f'Test activity {i}',
                ip_address='127.0.0.1'
            )
            activities.append(activity)
            db_session.add(activity)
        
        db_session.commit()
        
        # Query by user_id and activity_type (should use composite index)
        results = ActivityLog.query.filter_by(
            user_id=sample_user.id,
            activity_type='test_activity'
        ).all()
        
        assert len(results) == 5
        
        # Query by activity_type only
        results = ActivityLog.query.filter_by(
            activity_type='test_activity'
        ).all()
        
        assert len(results) == 5