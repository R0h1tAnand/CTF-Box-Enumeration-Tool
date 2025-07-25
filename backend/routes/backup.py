"""
Backup management API routes.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.backup_manager import BackupManager
from models import User
import logging

logger = logging.getLogger(__name__)

backup_bp = Blueprint('backup', __name__)

@backup_bp.route('/create', methods=['POST'])
@jwt_required()
def create_backup():
    """Create a new database backup."""
    try:
        # Check if user is admin (you may want to implement proper admin role checking)
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': True,
                'message': 'User not found',
                'code': 'USER_NOT_FOUND'
            }), 404
        
        # For now, allow any authenticated user to create backups
        # In production, you should restrict this to admin users only
        
        backup_path = BackupManager.create_backup()
        
        if backup_path:
            return jsonify({
                'error': False,
                'message': 'Backup created successfully',
                'backup_path': backup_path
            })
        else:
            return jsonify({
                'error': True,
                'message': 'Failed to create backup',
                'code': 'BACKUP_FAILED'
            }), 500
            
    except Exception as e:
        logger.error(f"Backup creation error: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500

@backup_bp.route('/list', methods=['GET'])
@jwt_required()
def list_backups():
    """List all available backups."""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': True,
                'message': 'User not found',
                'code': 'USER_NOT_FOUND'
            }), 404
        
        backups = BackupManager.list_backups()
        
        return jsonify({
            'error': False,
            'backups': backups
        })
        
    except Exception as e:
        logger.error(f"Backup listing error: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500

@backup_bp.route('/restore', methods=['POST'])
@jwt_required()
def restore_backup():
    """Restore database from backup."""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': True,
                'message': 'User not found',
                'code': 'USER_NOT_FOUND'
            }), 404
        
        data = request.get_json()
        if not data or 'timestamp' not in data:
            return jsonify({
                'error': True,
                'message': 'Backup timestamp is required',
                'code': 'MISSING_TIMESTAMP'
            }), 400
        
        timestamp = data['timestamp']
        
        # WARNING: This is a destructive operation
        # In production, you should add additional safety checks and confirmations
        success = BackupManager.restore_backup(timestamp)
        
        if success:
            return jsonify({
                'error': False,
                'message': 'Database restored successfully'
            })
        else:
            return jsonify({
                'error': True,
                'message': 'Failed to restore backup',
                'code': 'RESTORE_FAILED'
            }), 500
            
    except Exception as e:
        logger.error(f"Backup restore error: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500

@backup_bp.route('/cleanup', methods=['POST'])
@jwt_required()
def cleanup_backups():
    """Clean up old backups."""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': True,
                'message': 'User not found',
                'code': 'USER_NOT_FOUND'
            }), 404
        
        removed_count = BackupManager.cleanup_old_backups()
        
        return jsonify({
            'error': False,
            'message': f'Cleaned up {removed_count} old backups',
            'removed_count': removed_count
        })
        
    except Exception as e:
        logger.error(f"Backup cleanup error: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500