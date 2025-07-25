"""
Admin routes for monitoring and management.
"""
import os
import logging
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models.user import User
from models.activity_log import ActivityLog
from utils.performance_monitor import PerformanceMonitor
from utils.error_tracker import ErrorTracker
from utils.cache_manager import CacheManager, cached_view

# Configure logging
logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__)

def is_admin(user_id):
    """
    Check if a user is an admin.
    
    Args:
        user_id: User ID to check
        
    Returns:
        True if user is admin, False otherwise
    """
    user = User.query.get(user_id)
    return user and getattr(user, 'is_admin', False)

@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@cached_view(ttl=30)  # Cache for 30 seconds
def admin_dashboard():
    """Get admin dashboard data."""
    try:
        # Check if user is admin
        user_id = get_jwt_identity()
        if not is_admin(user_id):
            return jsonify({
                'error': True,
                'message': 'Unauthorized',
                'code': 'UNAUTHORIZED'
            }), 403
        
        # Get system metrics
        metrics = PerformanceMonitor.get_metrics()
        
        # Get error counts
        error_counts = ErrorTracker.get_error_counts()
        
        # Get cache statistics
        cache_stats = CacheManager.get_stats()
        
        # Get user statistics
        user_count = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        
        # Get recent activity logs
        recent_logs = ActivityLog.query.order_by(
            ActivityLog.created_at.desc()
        ).limit(10).all()
        
        # Get database statistics
        db_stats = {
            'users': user_count,
            'activity_logs': ActivityLog.query.count(),
            'active_users': active_users
        }
        
        # Format response
        response = {
            'metrics': metrics,
            'errors': error_counts,
            'cache': cache_stats,
            'database': db_stats,
            'recent_activity': [log.to_dict() for log in recent_logs]
        }
        
        return jsonify(response)
    
    except Exception as e:
        logger.error(f"Error in admin_dashboard: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Failed to retrieve admin dashboard data',
            'details': str(e) if current_app.debug else 'An error occurred'
        }), 500

@admin_bp.route('/logs', methods=['GET'])
@jwt_required()
def get_logs():
    """Get application logs."""
    try:
        # Check if user is admin
        user_id = get_jwt_identity()
        if not is_admin(user_id):
            return jsonify({
                'error': True,
                'message': 'Unauthorized',
                'code': 'UNAUTHORIZED'
            }), 403
        
        # Get log type
        log_type = request.args.get('type', 'app')
        
        # Get log file path
        logs_dir = os.path.join(current_app.root_path, 'logs')
        
        if log_type == 'app':
            log_file = os.path.join(logs_dir, 'app.log')
        elif log_type == 'error':
            log_file = os.path.join(logs_dir, 'error.log')
        elif log_type == 'access':
            log_file = os.path.join(logs_dir, 'access.log')
        elif log_type == 'security':
            log_file = os.path.join(logs_dir, 'security.log')
        else:
            return jsonify({
                'error': True,
                'message': 'Invalid log type',
                'code': 'INVALID_LOG_TYPE'
            }), 400
        
        # Get number of lines
        lines = int(request.args.get('lines', 100))
        if lines < 1 or lines > 1000:
            lines = 100
        
        # Read log file
        if os.path.exists(log_file):
            # Use tail to get last N lines
            with open(log_file, 'r') as f:
                # Read all lines
                all_lines = f.readlines()
                
                # Get last N lines
                log_lines = all_lines[-lines:]
                
                return jsonify({
                    'log_type': log_type,
                    'lines': log_lines,
                    'total_lines': len(all_lines)
                })
        else:
            return jsonify({
                'error': True,
                'message': 'Log file not found',
                'code': 'LOG_FILE_NOT_FOUND'
            }), 404
    
    except Exception as e:
        logger.error(f"Error in get_logs: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Failed to retrieve logs',
            'details': str(e) if current_app.debug else 'An error occurred'
        }), 500

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@cached_view(ttl=60)  # Cache for 60 seconds
def get_users():
    """Get user list."""
    try:
        # Check if user is admin
        user_id = get_jwt_identity()
        if not is_admin(user_id):
            return jsonify({
                'error': True,
                'message': 'Unauthorized',
                'code': 'UNAUTHORIZED'
            }), 403
        
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        
        # Get filter parameters
        is_active = request.args.get('is_active')
        search = request.args.get('search', '')
        
        # Build query
        query = User.query
        
        # Apply filters
        if is_active is not None:
            is_active = is_active.lower() == 'true'
            query = query.filter(User.is_active == is_active)
        
        if search:
            query = query.filter(
                (User.username.ilike(f'%{search}%')) |
                (User.email.ilike(f'%{search}%'))
            )
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        users = query.order_by(User.created_at.desc()) \
                    .offset((page - 1) * per_page) \
                    .limit(per_page) \
                    .all()
        
        # Format response
        response = {
            'users': [user.to_dict() for user in users],
            'pagination': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page
            }
        }
        
        return jsonify(response)
    
    except Exception as e:
        logger.error(f"Error in get_users: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Failed to retrieve users',
            'details': str(e) if current_app.debug else 'An error occurred'
        }), 500

@admin_bp.route('/cache/clear', methods=['POST'])
@jwt_required()
def clear_cache():
    """Clear application cache."""
    try:
        # Check if user is admin
        user_id = get_jwt_identity()
        if not is_admin(user_id):
            return jsonify({
                'error': True,
                'message': 'Unauthorized',
                'code': 'UNAUTHORIZED'
            }), 403
        
        # Get cache statistics before clearing
        before_stats = CacheManager.get_stats()
        
        # Clear cache
        CacheManager.clear()
        
        # Get cache statistics after clearing
        after_stats = CacheManager.get_stats()
        
        return jsonify({
            'message': 'Cache cleared successfully',
            'before': before_stats,
            'after': after_stats
        })
    
    except Exception as e:
        logger.error(f"Error in clear_cache: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Failed to clear cache',
            'details': str(e) if current_app.debug else 'An error occurred'
        }), 500

@admin_bp.route('/metrics/reset', methods=['POST'])
@jwt_required()
def reset_metrics():
    """Reset performance metrics."""
    try:
        # Check if user is admin
        user_id = get_jwt_identity()
        if not is_admin(user_id):
            return jsonify({
                'error': True,
                'message': 'Unauthorized',
                'code': 'UNAUTHORIZED'
            }), 403
        
        # Reset metrics
        PerformanceMonitor.reset_metrics()
        
        return jsonify({
            'message': 'Metrics reset successfully',
            'metrics': PerformanceMonitor.get_metrics()
        })
    
    except Exception as e:
        logger.error(f"Error in reset_metrics: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Failed to reset metrics',
            'details': str(e) if current_app.debug else 'An error occurred'
        }), 500