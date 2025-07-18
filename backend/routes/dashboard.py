from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, desc
from models import User, ScanHistory, UserSettings
from database import db
import subprocess
import shutil
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """Get dashboard statistics for the current user"""
    try:
        user_id = get_jwt_identity()
        
        # Get total scans count
        total_scans = db.session.query(func.count(ScanHistory.id)).filter_by(user_id=user_id).scalar() or 0
        
        # Get completed scans count
        completed_scans = db.session.query(func.count(ScanHistory.id)).filter_by(
            user_id=user_id, status='completed'
        ).scalar() or 0
        
        # Get failed scans count
        failed_scans = db.session.query(func.count(ScanHistory.id)).filter_by(
            user_id=user_id, status='failed'
        ).scalar() or 0
        
        # Get running scans count
        running_scans = db.session.query(func.count(ScanHistory.id)).filter_by(
            user_id=user_id, status='running'
        ).scalar() or 0
        
        # Calculate success rate
        success_rate = (completed_scans / total_scans * 100) if total_scans > 0 else 0
        
        # Get scans from last 7 days
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_scans = db.session.query(func.count(ScanHistory.id)).filter(
            ScanHistory.user_id == user_id,
            ScanHistory.started_at >= week_ago
        ).scalar() or 0
        
        # Get user info
        user = User.query.get(user_id)
        
        return jsonify({
            'user': {
                'username': user.username,
                'email': user.email,
                'member_since': user.created_at.isoformat() if user.created_at else None,
                'last_login': user.last_login.isoformat() if user.last_login else None
            },
            'stats': {
                'total_scans': total_scans,
                'completed_scans': completed_scans,
                'failed_scans': failed_scans,
                'running_scans': running_scans,
                'success_rate': round(success_rate, 1),
                'recent_scans': recent_scans
            }
        })
        
    except Exception as e:
        return jsonify({
            'error': True,
            'message': 'Failed to fetch dashboard statistics',
            'details': str(e)
        }), 500

@dashboard_bp.route('/recent-scans', methods=['GET'])
@jwt_required()
def get_recent_scans():
    """Get recent scans for dashboard (last 5 scans)"""
    try:
        user_id = get_jwt_identity()
        
        # Get last 5 scans for the user
        recent_scans = ScanHistory.query.filter_by(user_id=user_id)\
            .order_by(desc(ScanHistory.started_at))\
            .limit(5)\
            .all()
        
        scans_data = []
        for scan in recent_scans:
            # Calculate duration if completed
            duration = None
            if scan.completed_at and scan.started_at:
                duration = (scan.completed_at - scan.started_at).total_seconds()
            
            scans_data.append({
                'id': scan.id,
                'target_ip': scan.target_ip,
                'tools_used': scan.tools_used or [],
                'status': scan.status,
                'started_at': scan.started_at.isoformat() if scan.started_at else None,
                'completed_at': scan.completed_at.isoformat() if scan.completed_at else None,
                'duration': duration,
                'error_message': scan.error_message
            })
        
        return jsonify({
            'recent_scans': scans_data
        })
        
    except Exception as e:
        return jsonify({
            'error': True,
            'message': 'Failed to fetch recent scans',
            'details': str(e)
        }), 500

@dashboard_bp.route('/system-status', methods=['GET'])
@jwt_required()
def get_system_status():
    """Get system status for dashboard (tool availability)"""
    try:
        tools_status = {}
        
        # Check Nmap availability
        try:
            result = subprocess.run(['nmap', '--version'], 
                                  capture_output=True, text=True, timeout=5)
            tools_status['nmap'] = {
                'available': result.returncode == 0,
                'version': result.stdout.split('\n')[0] if result.returncode == 0 else None,
                'status': 'online' if result.returncode == 0 else 'offline'
            }
        except (subprocess.TimeoutExpired, FileNotFoundError):
            tools_status['nmap'] = {
                'available': False,
                'version': None,
                'status': 'offline'
            }
        
        # Check Gobuster availability
        try:
            result = subprocess.run(['gobuster', 'version'], 
                                  capture_output=True, text=True, timeout=5)
            tools_status['gobuster'] = {
                'available': result.returncode == 0,
                'version': result.stdout.strip() if result.returncode == 0 else None,
                'status': 'online' if result.returncode == 0 else 'offline'
            }
        except (subprocess.TimeoutExpired, FileNotFoundError):
            tools_status['gobuster'] = {
                'available': False,
                'version': None,
                'status': 'offline'
            }
        
        # Check Dirb availability
        try:
            # Dirb doesn't have a version flag, so we check if it exists
            dirb_path = shutil.which('dirb')
            tools_status['dirb'] = {
                'available': dirb_path is not None,
                'version': 'Available' if dirb_path else None,
                'status': 'online' if dirb_path else 'offline'
            }
        except Exception:
            tools_status['dirb'] = {
                'available': False,
                'version': None,
                'status': 'offline'
            }
        
        # Calculate overall system health
        available_tools = sum(1 for tool in tools_status.values() if tool['available'])
        total_tools = len(tools_status)
        system_health = (available_tools / total_tools * 100) if total_tools > 0 else 0
        
        return jsonify({
            'tools': tools_status,
            'system_health': round(system_health, 1),
            'available_tools': available_tools,
            'total_tools': total_tools,
            'last_checked': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': True,
            'message': 'Failed to fetch system status',
            'details': str(e)
        }), 500