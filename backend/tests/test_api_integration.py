"""Integration tests for API endpoints."""
import pytest
import json
import tempfile
from unittest.mock import patch, MagicMock
from models.user import User
from models.scan_history import ScanHistory
from models.user_settings import UserSettings
from models.activity_log import ActivityLog
from database import db

@pytest.mark.integration
class TestAuthAPI:
    """Integration tests for authentication API endpoints."""
    
    def test_register_success(self, client, db_session):
        """Test successful user registration."""
        user_data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'SecurePassword123'
        }
        
        response = client.post('/api/auth/register', 
                             data=json.dumps(user_data),
                             content_type='application/json')
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['message'] == 'User registered successfully'
        
        # Verify user was created in database
        user = User.query.filter_by(username='newuser').first()
        assert user is not None
        assert user.email == 'newuser@example.com'
    
    def test_register_duplicate_username(self, client, db_session, sample_user):
        """Test registration with duplicate username."""
        user_data = {
            'username': sample_user.username,
            'email': 'different@example.com',
            'password': 'securepassword123'
        }
        
        response = client.post('/api/auth/register',
                             data=json.dumps(user_data),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] is True
        assert 'username' in data['message'].lower()
    
    def test_register_invalid_data(self, client, db_session):
        """Test registration with invalid data."""
        user_data = {
            'username': '',  # Empty username
            'email': 'invalid-email',  # Invalid email
            'password': '123'  # Too short password
        }
        
        response = client.post('/api/auth/register',
                             data=json.dumps(user_data),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] is True
    
    def test_login_success(self, client, db_session, sample_user):
        """Test successful login."""
        login_data = {
            'username': sample_user.username,
            'password': 'testpassword123'
        }
        
        response = client.post('/api/auth/login',
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert data['user']['username'] == sample_user.username
    
    def test_login_invalid_credentials(self, client, db_session, sample_user):
        """Test login with invalid credentials."""
        login_data = {
            'username': sample_user.username,
            'password': 'wrongpassword'
        }
        
        response = client.post('/api/auth/login',
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['error'] is True
        assert 'invalid' in data['message'].lower()
    
    def test_login_nonexistent_user(self, client, db_session):
        """Test login with non-existent user."""
        login_data = {
            'username': 'nonexistent',
            'password': 'password123'
        }
        
        response = client.post('/api/auth/login',
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['error'] is True
    
    def test_logout(self, client, auth_headers):
        """Test user logout."""
        response = client.post('/api/auth/logout', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Successfully logged out'
    
    def test_refresh_token(self, client, sample_user):
        """Test token refresh."""
        # First login to get refresh token
        login_data = {
            'username': sample_user.username,
            'password': 'testpassword123'
        }
        
        login_response = client.post('/api/auth/login',
                                   data=json.dumps(login_data),
                                   content_type='application/json')
        
        refresh_token = login_response.get_json()['refresh_token']
        
        # Use refresh token to get new access token
        response = client.post('/api/auth/refresh',
                             headers={'Authorization': f'Bearer {refresh_token}'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'access_token' in data

@pytest.mark.integration
class TestDashboardAPI:
    """Integration tests for dashboard API endpoints."""
    
    def test_dashboard_stats(self, client, auth_headers, sample_user, sample_scan):
        """Test getting dashboard statistics."""
        response = client.get('/api/dashboard/stats', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'total_scans' in data
        assert 'recent_scans' in data
        assert 'success_rate' in data
        assert data['total_scans'] >= 1  # At least the sample scan
    
    def test_dashboard_recent_scans(self, client, auth_headers, sample_user, sample_scan):
        """Test getting recent scans."""
        response = client.get('/api/dashboard/recent-scans', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'scans' in data
        assert len(data['scans']) >= 1
        assert data['scans'][0]['target_ip'] == sample_scan.target_ip
    
    def test_dashboard_system_status(self, client, auth_headers):
        """Test getting system status."""
        response = client.get('/api/dashboard/system-status', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'tools' in data
        assert isinstance(data['tools'], dict)
    
    def test_dashboard_unauthorized(self, client):
        """Test dashboard access without authentication."""
        response = client.get('/api/dashboard/stats')
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['error'] is True

@pytest.mark.integration
class TestScansAPI:
    """Integration tests for scans API endpoints."""
    
    @patch('tools.scan_manager.ScanManager')
    def test_start_scan(self, mock_scan_manager, client, auth_headers, sample_user):
        """Test starting a new scan."""
        # Mock scan manager
        mock_manager_instance = MagicMock()
        mock_manager_instance.start_scan.return_value = 1
        mock_scan_manager.return_value = mock_manager_instance
        
        scan_data = {
            'target': '192.168.1.100',
            'tools': [
                {
                    'tool_name': 'nmap',
                    'options': {'scan_type': 'basic'}
                }
            ]
        }
        
        response = client.post('/api/scans/start',
                             data=json.dumps(scan_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'scan_id' in data
        assert data['scan_id'] == 1
    
    @patch('tools.scan_manager.ScanManager')
    def test_start_scan_invalid_target(self, mock_scan_manager, client, auth_headers):
        """Test starting scan with invalid target."""
        scan_data = {
            'target': '999.999.999.999',  # Invalid IP
            'tools': [
                {
                    'tool_name': 'nmap',
                    'options': {'scan_type': 'basic'}
                }
            ]
        }
        
        response = client.post('/api/scans/start',
                             data=json.dumps(scan_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] is True
        assert 'target' in data['message'].lower()
    
    @patch('tools.scan_manager.ScanManager')
    def test_get_scan_status(self, mock_scan_manager, client, auth_headers, sample_scan):
        """Test getting scan status."""
        # Mock scan manager
        mock_manager_instance = MagicMock()
        mock_manager_instance.get_scan_status.return_value = {
            'scan_id': sample_scan.id,
            'status': 'completed',
            'progress': 100
        }
        mock_scan_manager.return_value = mock_manager_instance
        
        response = client.get(f'/api/scans/{sample_scan.id}/status', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['scan_id'] == sample_scan.id
        assert data['status'] == 'completed'
    
    @patch('tools.scan_manager.ScanManager')
    def test_stop_scan(self, mock_scan_manager, client, auth_headers, sample_scan):
        """Test stopping a running scan."""
        # Mock scan manager
        mock_manager_instance = MagicMock()
        mock_manager_instance.stop_scan.return_value = True
        mock_scan_manager.return_value = mock_manager_instance
        
        response = client.post(f'/api/scans/{sample_scan.id}/stop', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Scan stopped successfully'
    
    def test_scan_unauthorized(self, client):
        """Test scan operations without authentication."""
        response = client.post('/api/scans/start',
                             data=json.dumps({'target': '192.168.1.1', 'tools': []}),
                             content_type='application/json')
        
        assert response.status_code == 401

@pytest.mark.integration
class TestHistoryAPI:
    """Integration tests for history API endpoints."""
    
    def test_get_scan_history(self, client, auth_headers, sample_user, sample_scan):
        """Test getting scan history."""
        response = client.get('/api/history/scans', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'scans' in data
        assert 'total' in data
        assert 'page' in data
        assert len(data['scans']) >= 1
        assert data['scans'][0]['target_ip'] == sample_scan.target_ip
    
    def test_get_scan_history_pagination(self, client, auth_headers, sample_user):
        """Test scan history pagination."""
        # Create multiple scans
        for i in range(5):
            scan = ScanHistory(
                user_id=sample_user.id,
                target_ip=f'192.168.1.{i+1}',
                tools_used=['nmap'],
                status='completed'
            )
            db.session.add(scan)
        db.session.commit()
        
        response = client.get('/api/history/scans?page=1&limit=3', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['scans']) <= 3
        assert data['page'] == 1
        assert data['total'] >= 5
    
    def test_get_scan_history_filter(self, client, auth_headers, sample_user):
        """Test scan history filtering."""
        # Create scans with different statuses
        completed_scan = ScanHistory(
            user_id=sample_user.id,
            target_ip='192.168.1.10',
            tools_used=['nmap'],
            status='completed'
        )
        failed_scan = ScanHistory(
            user_id=sample_user.id,
            target_ip='192.168.1.11',
            tools_used=['nmap'],
            status='failed'
        )
        db.session.add_all([completed_scan, failed_scan])
        db.session.commit()
        
        response = client.get('/api/history/scans?status=completed', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        for scan in data['scans']:
            assert scan['status'] == 'completed'
    
    def test_get_scan_detail(self, client, auth_headers, sample_scan):
        """Test getting detailed scan information."""
        response = client.get(f'/api/history/scans/{sample_scan.id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['id'] == sample_scan.id
        assert data['target_ip'] == sample_scan.target_ip
        assert data['tools_used'] == sample_scan.tools_used
    
    def test_delete_scan_history(self, client, auth_headers, sample_user):
        """Test deleting scan from history."""
        # Create a scan to delete
        scan = ScanHistory(
            user_id=sample_user.id,
            target_ip='192.168.1.99',
            tools_used=['nmap'],
            status='completed'
        )
        db.session.add(scan)
        db.session.commit()
        scan_id = scan.id
        
        response = client.delete(f'/api/history/scans/{scan_id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Scan deleted successfully'
        
        # Verify scan was deleted
        deleted_scan = ScanHistory.query.get(scan_id)
        assert deleted_scan is None
    
    def test_search_scan_history(self, client, auth_headers, sample_user):
        """Test searching scan history."""
        # Create scans with different targets
        scan1 = ScanHistory(
            user_id=sample_user.id,
            target_ip='192.168.1.50',
            tools_used=['nmap'],
            status='completed'
        )
        scan2 = ScanHistory(
            user_id=sample_user.id,
            target_ip='10.0.0.1',
            tools_used=['gobuster'],
            status='completed'
        )
        db.session.add_all([scan1, scan2])
        db.session.commit()
        
        response = client.get('/api/history/search?q=192.168', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'results' in data
        # Should find scan1 but not scan2
        found_targets = [scan['target_ip'] for scan in data['results']]
        assert '192.168.1.50' in found_targets
        assert '10.0.0.1' not in found_targets

@pytest.mark.integration
class TestSettingsAPI:
    """Integration tests for settings API endpoints."""
    
    def test_get_user_profile(self, client, auth_headers, sample_user):
        """Test getting user profile."""
        response = client.get('/api/settings/profile', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['username'] == sample_user.username
        assert data['email'] == sample_user.email
        assert 'password_hash' not in data  # Should not expose password
    
    def test_update_user_profile(self, client, auth_headers, sample_user):
        """Test updating user profile."""
        update_data = {
            'email': 'newemail@example.com'
        }
        
        response = client.put('/api/settings/profile',
                            data=json.dumps(update_data),
                            content_type='application/json',
                            headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Profile updated successfully'
        
        # Verify update in database
        updated_user = User.query.get(sample_user.id)
        assert updated_user.email == 'newemail@example.com'
    
    def test_change_password(self, client, auth_headers, sample_user):
        """Test changing user password."""
        password_data = {
            'current_password': 'testpassword123',
            'new_password': 'newsecurepassword456'
        }
        
        response = client.post('/api/settings/password',
                             data=json.dumps(password_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Password changed successfully'
        
        # Verify password was changed
        updated_user = User.query.get(sample_user.id)
        assert updated_user.check_password('newsecurepassword456') is True
        assert updated_user.check_password('testpassword123') is False
    
    def test_change_password_wrong_current(self, client, auth_headers, sample_user):
        """Test changing password with wrong current password."""
        password_data = {
            'current_password': 'wrongpassword',
            'new_password': 'newsecurepassword456'
        }
        
        response = client.post('/api/settings/password',
                             data=json.dumps(password_data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] is True
        assert 'current password' in data['message'].lower()
    
    def test_get_user_preferences(self, client, auth_headers, sample_user, sample_user_settings):
        """Test getting user preferences."""
        response = client.get('/api/settings/preferences', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['theme'] == sample_user_settings.theme
        assert data['default_tools'] == sample_user_settings.default_tools
        assert data['notifications_enabled'] == sample_user_settings.notifications_enabled
    
    def test_update_user_preferences(self, client, auth_headers, sample_user):
        """Test updating user preferences."""
        preferences_data = {
            'theme': 'light',
            'default_tools': ['gobuster', 'dirb'],
            'notifications_enabled': False
        }
        
        response = client.put('/api/settings/preferences',
                            data=json.dumps(preferences_data),
                            content_type='application/json',
                            headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Preferences updated successfully'
        
        # Verify update in database
        settings = UserSettings.query.filter_by(user_id=sample_user.id).first()
        assert settings.theme == 'light'
        assert settings.default_tools == ['gobuster', 'dirb']
        assert settings.notifications_enabled is False
    
    def test_delete_account(self, client, auth_headers, sample_user):
        """Test account deletion."""
        delete_data = {
            'password': 'testpassword123',
            'confirmation': 'DELETE'
        }
        
        response = client.delete('/api/settings/account',
                               data=json.dumps(delete_data),
                               content_type='application/json',
                               headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Account deleted successfully'
        
        # Verify user was deleted
        deleted_user = User.query.get(sample_user.id)
        assert deleted_user is None

@pytest.mark.integration
class TestRateLimiting:
    """Integration tests for rate limiting."""
    
    def test_rate_limiting_login(self, client, db_session, sample_user):
        """Test rate limiting on login endpoint."""
        login_data = {
            'username': sample_user.username,
            'password': 'wrongpassword'
        }
        
        # Make multiple failed login attempts
        responses = []
        for i in range(6):  # Assuming rate limit is 5 attempts
            response = client.post('/api/auth/login',
                                 data=json.dumps(login_data),
                                 content_type='application/json')
            responses.append(response)
        
        # First few should be 401 (unauthorized)
        for response in responses[:5]:
            assert response.status_code == 401
        
        # Last one should be 429 (rate limited)
        assert responses[-1].status_code == 429
        data = responses[-1].get_json()
        assert data['code'] == 'RATE_LIMIT_EXCEEDED'
    
    def test_rate_limiting_global(self, client, auth_headers):
        """Test global rate limiting."""
        # Make many requests quickly
        responses = []
        for i in range(102):  # Assuming global limit is 100 per minute
            response = client.get('/api/dashboard/stats', headers=auth_headers)
            responses.append(response)
        
        # Last few should be rate limited
        assert responses[-1].status_code == 429

@pytest.mark.integration
class TestErrorHandling:
    """Integration tests for error handling."""
    
    def test_404_endpoint(self, client):
        """Test 404 error for non-existent endpoint."""
        response = client.get('/api/nonexistent')
        
        assert response.status_code == 404
    
    def test_405_method_not_allowed(self, client):
        """Test 405 error for wrong HTTP method."""
        response = client.put('/api/auth/login')  # Should be POST
        
        assert response.status_code == 405
    
    def test_400_bad_json(self, client):
        """Test 400 error for malformed JSON."""
        response = client.post('/api/auth/login',
                             data='invalid json',
                             content_type='application/json')
        
        assert response.status_code == 400
    
    def test_unauthorized_access(self, client):
        """Test unauthorized access to protected endpoints."""
        protected_endpoints = [
            '/api/dashboard/stats',
            '/api/scans/start',
            '/api/history/scans',
            '/api/settings/profile'
        ]
        
        for endpoint in protected_endpoints:
            response = client.get(endpoint)
            assert response.status_code == 401
            
            data = response.get_json()
            assert data['error'] is True