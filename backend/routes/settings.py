import os
import logging
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename
from database import db
from models.user import User
from models.user_settings import UserSettings
from models.activity_log import ActivityLog
from utils.cache_manager import cached_view, CacheManager, invalidate_cache_pattern

# Configure logging
logger = logging.getLogger(__name__)

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/profile', methods=['GET'])
@jwt_required()
@cached_view(ttl=60)  # Cache for 60 seconds
def get_profile():
    """Get user profile information."""
    try:
        user_id = get_jwt_identity()
        
        # Try to get from cache
        cache_key = f"user_profile:{user_id}"
        cached_profile = CacheManager.get(cache_key)
        
        if cached_profile:
            return jsonify(cached_profile)
        
        # Get from database
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'error': True,
                'message': 'User not found',
                'code': 'USER_NOT_FOUND'
            }), 404
        
        # Get user data
        user_data = user.to_dict()
        
        # Cache the result
        CacheManager.set(cache_key, user_data, 60)
        
        return jsonify(user_data)
    
    except Exception as e:
        logger.error(f"Error in get_profile: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Failed to retrieve profile',
            'details': str(e) if current_app.debug else 'An error occurred'
        }), 500

@settings_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile information."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'error': True,
                'message': 'User not found',
                'code': 'USER_NOT_FOUND'
            }), 404
        
        data = request.get_json()
        changes = []
        
        # Validate username uniqueness if changed
        if 'username' in data and data['username'] != user.username:
            existing_user = User.query.filter_by(username=data['username']).first()
            if existing_user:
                return jsonify({
                    'error': True,
                    'message': 'Username already taken',
                    'code': 'USERNAME_TAKEN'
                }), 400
            old_username = user.username
            user.username = data['username']
            changes.append(f"Username changed from {old_username} to {user.username}")
        
        # Validate email uniqueness if changed
        if 'email' in data and data['email'] != user.email:
            existing_user = User.query.filter_by(email=data['email']).first()
            if existing_user:
                return jsonify({
                    'error': True,
                    'message': 'Email already taken',
                    'code': 'EMAIL_TAKEN'
                }), 400
            old_email = user.email
            user.email = data['email']
            changes.append(f"Email changed from {old_email} to {user.email}")
        
        db.session.commit()
        
        # Log profile update activity
        if changes:
            log_activity(user_id, 'profile_update', f"Profile updated: {', '.join(changes)}")
        
        # Invalidate user profile cache
        invalidate_cache_pattern(f"user_profile:{user_id}")
        
        return jsonify({
            'error': False,
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        })
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in update_profile: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Failed to update profile',
            'details': str(e) if current_app.debug else 'An error occurred'
        }), 500

@settings_bp.route('/profile/picture', methods=['POST'])
@jwt_required()
def upload_profile_picture():
    """Upload user profile picture."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        # Create uploads directory if it doesn't exist
        uploads_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'profile_pictures')
        os.makedirs(uploads_dir, exist_ok=True)
        
        # Secure the filename and save the file
        filename = secure_filename(f"user_{user_id}_{file.filename}")
        file_path = os.path.join(uploads_dir, filename)
        file.save(file_path)
        
        # Store the file path in the user settings
        # This would typically be stored in a separate profile table or user settings
        # For now, we'll just return the URL
        
        return jsonify({
            'message': 'Profile picture uploaded successfully',
            'url': f"/uploads/profile_pictures/{filename}"
        })
    
    return jsonify({'error': 'Failed to upload file'}), 500

@settings_bp.route('/password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    # Validate current password
    if not check_password_hash(user.password_hash, data.get('current_password', '')):
        # Log failed password change attempt
        log_activity(user_id, 'failed_password_change', 'Failed password change attempt due to incorrect current password')
        return jsonify({'error': 'Current password is incorrect'}), 400
    
    # Update password
    user.set_password(data.get('new_password'))
    db.session.commit()
    
    # Log successful password change
    log_activity(user_id, 'password_change', 'Password changed successfully')
    
    return jsonify({
        'message': 'Password changed successfully'
    })

@settings_bp.route('/preferences', methods=['GET'])
@jwt_required()
@cached_view(ttl=300)  # Cache for 5 minutes
def get_preferences():
    """Get user preferences."""
    try:
        user_id = get_jwt_identity()
        
        # Try to get from cache
        cache_key = f"user_preferences:{user_id}"
        cached_preferences = CacheManager.get(cache_key)
        
        if cached_preferences:
            return jsonify(cached_preferences)
        
        # Get user settings or create if not exists
        settings = UserSettings.query.filter_by(user_id=user_id).first()
        
        if not settings:
            # Create default settings for user
            settings = UserSettings(user_id=user_id)
            db.session.add(settings)
            db.session.commit()
        
        # Get settings data
        settings_data = settings.to_dict()
        
        # Cache the result
        CacheManager.set(cache_key, settings_data, 300)
        
        return jsonify(settings_data)
    
    except Exception as e:
        logger.error(f"Error in get_preferences: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Failed to retrieve preferences',
            'details': str(e) if current_app.debug else 'An error occurred'
        }), 500

@settings_bp.route('/preferences', methods=['PUT'])
@jwt_required()
def update_preferences():
    """Update user preferences."""
    try:
        user_id = get_jwt_identity()
        
        # Get user settings or create if not exists
        settings = UserSettings.query.filter_by(user_id=user_id).first()
        
        if not settings:
            settings = UserSettings(user_id=user_id)
            db.session.add(settings)
        
        data = request.get_json()
        
        # Update settings with provided values
        if 'theme' in data:
            settings.theme = data['theme']
        
        if 'default_tools' in data:
            settings.default_tools = data['default_tools']
        
        if 'notifications_enabled' in data:
            settings.notifications_enabled = data['notifications_enabled']
        
        if 'default_wordlist' in data:
            settings.default_wordlist = data['default_wordlist']
        
        if 'auto_export' in data:
            settings.auto_export = data['auto_export']
        
        db.session.commit()
        
        # Invalidate preferences cache
        invalidate_cache_pattern(f"user_preferences:{user_id}")
        
        return jsonify({
            'error': False,
            'message': 'Preferences updated successfully',
            'settings': settings.to_dict()
        })
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in update_preferences: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Failed to update preferences',
            'details': str(e) if current_app.debug else 'An error occurred'
        }), 500
@settings_bp.route('/account/delete', methods=['POST'])
@jwt_required()
def delete_account():
    """Delete user account."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    # Validate password before deletion
    if not check_password_hash(user.password_hash, data.get('password', '')):
        # Log failed deletion attempt
        log_activity(user_id, 'failed_account_deletion', 'Failed account deletion attempt due to incorrect password')
        return jsonify({'error': 'Password is incorrect'}), 400
    
    # Log successful account deletion
    log_activity(user_id, 'account_deletion', 'Account deleted successfully')
    
    # Delete user (cascade will delete related records)
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({
        'message': 'Account deleted successfully'
    })

@settings_bp.route('/tools/available', methods=['GET'])
@jwt_required()
@cached_view(ttl=3600)  # Cache for 1 hour
def get_available_tools():
    """Get list of available security tools."""
    try:
        from tools.tool_validator import ToolValidator
        
        # Try to get from cache
        cache_key = "available_tools"
        cached_tools = CacheManager.get(cache_key)
        
        if cached_tools:
            return jsonify(cached_tools)
        
        # Get from tool validator
        available_tools = ToolValidator.get_available_tools()
        
        # Cache the result
        CacheManager.set(cache_key, available_tools, 3600)
        
        return jsonify(available_tools)
    
    except Exception as e:
        logger.error(f"Error in get_available_tools: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Failed to retrieve available tools',
            'details': str(e) if current_app.debug else 'An error occurred'
        }), 500

@settings_bp.route('/wordlists', methods=['GET'])
@jwt_required()
def get_available_wordlists():
    """Get list of available wordlists."""
    import os
    from flask import current_app
    
    # Create wordlists directory if it doesn't exist
    wordlists_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'wordlists')
    os.makedirs(wordlists_dir, exist_ok=True)
    
    # Get default system wordlists
    system_wordlists = []
    
    # Common wordlist paths on Linux systems
    linux_wordlist_paths = [
        '/usr/share/wordlists',
        '/usr/share/dirb/wordlists',
        '/usr/share/dirbuster/wordlists'
    ]
    
    # Check if any system wordlists exist
    for path in linux_wordlist_paths:
        if os.path.exists(path):
            for root, _, files in os.walk(path):
                for file in files:
                    if file.endswith('.txt') or file.endswith('.lst'):
                        system_wordlists.append(os.path.join(root, file))
    
    # Get user uploaded wordlists
    user_id = get_jwt_identity()
    user_wordlists_dir = os.path.join(wordlists_dir, f'user_{user_id}')
    
    if not os.path.exists(user_wordlists_dir):
        os.makedirs(user_wordlists_dir, exist_ok=True)
    
    user_wordlists = []
    for file in os.listdir(user_wordlists_dir):
        if file.endswith('.txt') or file.endswith('.lst'):
            user_wordlists.append(os.path.join('wordlists', f'user_{user_id}', file))
    
    # Combine system and user wordlists
    all_wordlists = system_wordlists + user_wordlists
    
    return jsonify(all_wordlists)

@settings_bp.route('/wordlists/upload', methods=['POST'])
@jwt_required()
def upload_wordlist():
    """Upload a custom wordlist."""
    user_id = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        # Validate file type
        if not (file.filename.endswith('.txt') or file.filename.endswith('.lst')):
            return jsonify({'error': 'Invalid file type. Only .txt and .lst files are allowed'}), 400
        
        # Create wordlists directory if it doesn't exist
        wordlists_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'wordlists', f'user_{user_id}')
        os.makedirs(wordlists_dir, exist_ok=True)
        
        # Secure the filename and save the file
        filename = secure_filename(file.filename)
        file_path = os.path.join(wordlists_dir, filename)
        file.save(file_path)
        
        # Return the relative path to be stored in user settings
        relative_path = os.path.join('wordlists', f'user_{user_id}', filename)
        
        return jsonify({
            'message': 'Wordlist uploaded successfully',
            'path': relative_path
        })
    
    return jsonify({'error': 'Failed to upload file'}), 500

@settings_bp.route('/account/export', methods=['GET'])
@jwt_required()
def export_user_data():
    """Export user data."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get user data
    user_data = user.to_dict()
    
    # Get user settings
    settings = UserSettings.query.filter_by(user_id=user_id).first()
    if settings:
        user_data['settings'] = settings.to_dict()
    
    # Get scan history (limited to avoid large responses)
    from models.scan_history import ScanHistory
    scans = ScanHistory.query.filter_by(user_id=user_id).order_by(ScanHistory.started_at.desc()).limit(100).all()
    user_data['scan_history'] = [scan.to_dict() for scan in scans]
    
    # Log data export activity
    log_activity(user_id, 'data_export', 'User data exported')
    
    return jsonify(user_data)

@settings_bp.route('/account/activity', methods=['GET'])
@jwt_required()
@cached_view(ttl=30)  # Cache for 30 seconds
def get_activity_logs():
    """Get user activity logs."""
    try:
        user_id = get_jwt_identity()
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 50)  # Limit to 50 items per page
        
        # Use optimized query with eager loading
        query = ActivityLog.query.filter_by(user_id=user_id)
        
        # Get total count using optimized query
        total = query.count()
        
        # Calculate pagination values
        total_pages = (total + per_page - 1) // per_page if total > 0 else 0
        has_next = page < total_pages
        has_prev = page > 1
        
        # Apply pagination and ordering
        logs = query.order_by(ActivityLog.created_at.desc()) \
                   .offset((page - 1) * per_page) \
                   .limit(per_page) \
                   .all()
        
        # Format response
        response = {
            'logs': [log.to_dict() for log in logs],
            'pagination': {
                'total': total,
                'pages': total_pages,
                'page': page,
                'per_page': per_page,
                'has_next': has_next,
                'has_prev': has_prev
            }
        }
    
    except Exception as e:
        logger.error(f"Error in get_activity_logs: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Failed to retrieve activity logs',
            'details': str(e) if current_app.debug else 'An error occurred'
        }), 500
    
    return jsonify(response)