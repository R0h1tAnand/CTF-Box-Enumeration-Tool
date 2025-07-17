from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, 
    get_jwt_identity, get_jwt
)
from datetime import datetime
import re
from database import db
from models.user import User

auth_bp = Blueprint('auth', __name__)

# Store blacklisted tokens (in production, use Redis or database)
blacklisted_tokens = set()

def validate_email(email):
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    return True, "Password is valid"

@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({
                'error': True,
                'message': 'No data provided',
                'code': 'MISSING_DATA'
            }), 400
        
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validate input data
        if not username or not email or not password:
            return jsonify({
                'error': True,
                'message': 'Username, email, and password are required',
                'code': 'MISSING_FIELDS'
            }), 400
        
        # Validate username
        if len(username) < 3 or len(username) > 80:
            return jsonify({
                'error': True,
                'message': 'Username must be between 3 and 80 characters',
                'code': 'INVALID_USERNAME'
            }), 400
        
        if not re.match(r'^[a-zA-Z0-9_-]+$', username):
            return jsonify({
                'error': True,
                'message': 'Username can only contain letters, numbers, underscores, and hyphens',
                'code': 'INVALID_USERNAME_FORMAT'
            }), 400
        
        # Validate email
        if not validate_email(email):
            return jsonify({
                'error': True,
                'message': 'Invalid email format',
                'code': 'INVALID_EMAIL'
            }), 400
        
        # Validate password
        is_valid, message = validate_password(password)
        if not is_valid:
            return jsonify({
                'error': True,
                'message': message,
                'code': 'INVALID_PASSWORD'
            }), 400
        
        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return jsonify({
                'error': True,
                'message': 'Username already exists',
                'code': 'USERNAME_EXISTS'
            }), 409
        
        if User.query.filter_by(email=email).first():
            return jsonify({
                'error': True,
                'message': 'Email already registered',
                'code': 'EMAIL_EXISTS'
            }), 409
        
        # Create new user
        user = User(username=username, email=email)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'error': False,
            'message': 'User registered successfully',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': True,
            'message': 'Registration failed',
            'code': 'REGISTRATION_ERROR',
            'details': str(e)
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': True,
                'message': 'No data provided',
                'code': 'MISSING_DATA'
            }), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({
                'error': True,
                'message': 'Username and password are required',
                'code': 'MISSING_CREDENTIALS'
            }), 400
        
        # Find user by username or email
        user = User.query.filter(
            (User.username == username) | (User.email == username.lower())
        ).first()
        
        if not user or not user.check_password(password):
            return jsonify({
                'error': True,
                'message': 'Invalid credentials',
                'code': 'INVALID_CREDENTIALS'
            }), 401
        
        if not user.is_active:
            return jsonify({
                'error': True,
                'message': 'Account is disabled',
                'code': 'ACCOUNT_DISABLED'
            }), 401
        
        # Update last login
        user.update_last_login()
        
        # Create tokens (convert user.id to string for JWT)
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        return jsonify({
            'error': False,
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': True,
            'message': 'Login failed',
            'code': 'LOGIN_ERROR',
            'details': str(e)
        }), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout endpoint"""
    try:
        jti = get_jwt()['jti']
        blacklisted_tokens.add(jti)
        
        return jsonify({
            'error': False,
            'message': 'Successfully logged out'
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': True,
            'message': 'Logout failed',
            'code': 'LOGOUT_ERROR',
            'details': str(e)
        }), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Token refresh endpoint"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify user still exists and is active (convert string back to int)
        user = User.query.get(int(current_user_id))
        if not user or not user.is_active:
            return jsonify({
                'error': True,
                'message': 'User not found or inactive',
                'code': 'USER_INACTIVE'
            }), 401
        
        # Create new access token
        new_access_token = create_access_token(identity=current_user_id)
        
        return jsonify({
            'error': False,
            'message': 'Token refreshed successfully',
            'access_token': new_access_token
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': True,
            'message': 'Token refresh failed',
            'code': 'REFRESH_ERROR',
            'details': str(e)
        }), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    """Get user profile endpoint"""
    try:
        current_user_id = get_jwt_identity()
        # Convert string back to int for database query
        user = User.query.get(int(current_user_id))
        
        if not user:
            return jsonify({
                'error': True,
                'message': 'User not found',
                'code': 'USER_NOT_FOUND'
            }), 404
        
        return jsonify({
            'error': False,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': True,
            'message': 'Failed to get profile',
            'code': 'PROFILE_ERROR',
            'details': str(e)
        }), 500