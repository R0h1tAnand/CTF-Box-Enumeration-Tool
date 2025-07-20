from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

history_bp = Blueprint('history', __name__)

@history_bp.route('/scans', methods=['GET'])
@jwt_required()
def get_scan_history():
    """Get user's scan history with pagination and filtering."""
    from models import ScanHistory
    from datetime import datetime
    from sqlalchemy import and_
    
    # Get current user ID
    user_id = get_jwt_identity()
    
    # Get pagination parameters
    page = int(request.args.get('page', 1))
    limit = min(int(request.args.get('limit', 20)), 100)  # Cap at 100 items per page
    
    # Get filter parameters
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    target = request.args.get('target')
    status = request.args.get('status')
    tools = request.args.getlist('tools')
    
    # Build base query
    query = ScanHistory.query.filter(ScanHistory.user_id == user_id)
    
    # Apply filters if provided
    if start_date:
        try:
            start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(ScanHistory.started_at >= start_datetime)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(ScanHistory.started_at <= end_datetime)
        except ValueError:
            pass
    
    if target:
        query = query.filter(ScanHistory.target_ip.ilike(f'%{target}%'))
    
    if status:
        query = query.filter(ScanHistory.status == status)
    
    # Count total results before applying pagination
    total = query.count()
    total_pages = (total + limit - 1) // limit if total > 0 else 0
    
    # Apply pagination and ordering
    results = query.order_by(ScanHistory.started_at.desc()) \
                  .offset((page - 1) * limit) \
                  .limit(limit) \
                  .all()
    
    # Convert results to dictionaries
    data = [scan.to_dict() for scan in results]
    
    return jsonify({
        'data': data,
        'total': total,
        'page': page,
        'limit': limit,
        'totalPages': total_pages
    })

@history_bp.route('/scans/<int:scan_id>', methods=['GET'])
@jwt_required()
def get_scan_details(scan_id):
    """Get detailed information about a specific scan."""
    # Placeholder implementation - will be completed in later tasks
    return jsonify({
        'id': scan_id,
        'status': 'completed',
        'results': {}
    })

@history_bp.route('/search', methods=['GET'])
@jwt_required()
def search_scans():
    """Search through scan history with full-text search."""
    from models import ScanHistory
    from database import db
    from sqlalchemy import or_, func
    
    # Get current user ID
    user_id = get_jwt_identity()
    
    # Get search query and pagination parameters
    query = request.args.get('q', '')
    page = int(request.args.get('page', 1))
    limit = min(int(request.args.get('limit', 20)), 100)  # Cap at 100 items per page
    
    if not query:
        return jsonify({
            'data': [],
            'total': 0,
            'page': page,
            'limit': limit,
            'totalPages': 0
        })
    
    # Build search query with relevance scoring
    search_query = ScanHistory.query.filter(
        ScanHistory.user_id == user_id,
        or_(
            ScanHistory.target_ip.ilike(f'%{query}%'),
            ScanHistory.status.ilike(f'%{query}%'),
            # Search in JSON fields (tools_used array)
            func.json_contains(
                func.lower(func.json_extract(ScanHistory.tools_used, '$[*]')),
                func.lower(f'"{query}"')
            )
        )
    )
    
    # Count total results
    total = search_query.count()
    total_pages = (total + limit - 1) // limit if total > 0 else 0
    
    # Apply pagination
    results = search_query.order_by(ScanHistory.started_at.desc()) \
                         .offset((page - 1) * limit) \
                         .limit(limit) \
                         .all()
    
    # Convert results to dictionaries
    data = [scan.to_dict() for scan in results]
    
    return jsonify({
        'data': data,
        'total': total,
        'page': page,
        'limit': limit,
        'totalPages': total_pages
    })