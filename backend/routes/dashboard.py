from flask import Blueprint

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get dashboard statistics"""
    return {'message': 'Dashboard stats endpoint - to be implemented'}

@dashboard_bp.route('/recent-scans', methods=['GET'])
def get_recent_scans():
    """Get recent scans for dashboard"""
    return {'message': 'Recent scans endpoint - to be implemented'}

@dashboard_bp.route('/system-status', methods=['GET'])
def get_system_status():
    """Get system status for dashboard"""
    return {'message': 'System status endpoint - to be implemented'}