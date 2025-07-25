"""Authentication middleware and utilities."""

from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from utils.activity_logger import log_activity

def auth_required(f):
    """
    Decorator that requires JWT authentication and provides current user.
    Usage: @auth_required instead of @jwt_required()
    The decorated function will receive current_user as first argument.
    """
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or not current_user.is_active:
            return jsonify({
                'error': True,
                'message': 'User not found or inactive',
                'code': 'USER_INACTIVE'
            }), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated_function

def admin_required(f):
    """
    Decorator that requires admin privileges.
    Note: This is a placeholder for future admin functionality.
    """
    @wraps(f)
    @auth_required
    def decorated_function(current_user, *args, **kwargs):
        # For now, all users are considered regular users
        # In the future, you can add an is_admin field to User model
        return f(current_user, *args, **kwargs)
    
    return decorated_function

def validate_user_access(user_id, current_user):
    """
    Validate that the current user can access resources for the given user_id.
    Users can only access their own resources.
    """
    if current_user.id != user_id:
        return False, jsonify({
            'error': True,
            'message': 'Access denied',
            'code': 'ACCESS_DENIED'
        }), 403
    
    return True, None, None