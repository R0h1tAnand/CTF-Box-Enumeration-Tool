from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from utils.cache_manager import cached_view, CacheManager, invalidate_cache_pattern

# Configure logging
logger = logging.getLogger(__name__)

history_bp = Blueprint('history', __name__)

@history_bp.route('/scans', methods=['GET'])
@jwt_required()
@cached_view(ttl=30)  # Cache for 30 seconds
def get_scan_history():
    """Get user's scan history with pagination and filtering."""
    from models import ScanHistory
    from datetime import datetime
    from sqlalchemy import and_, func
    
    try:
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
        
        # Build base query with eager loading of relationships
        query = ScanHistory.query.filter(ScanHistory.user_id == user_id)
        
        # Apply filters if provided
        if start_date:
            try:
                start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(ScanHistory.started_at >= start_datetime)
            except ValueError:
                logger.warning(f"Invalid start date format: {start_date}")
        
        if end_date:
            try:
                end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(ScanHistory.started_at <= end_datetime)
            except ValueError:
                logger.warning(f"Invalid end date format: {end_date}")
        
        if target:
            query = query.filter(ScanHistory.target_ip.ilike(f'%{target}%'))
        
        if status:
            query = query.filter(ScanHistory.status == status)
        
        if tools:
            # Filter by tools used (JSON array contains)
            for tool in tools:
                query = query.filter(func.json_contains(
                    func.json_extract(ScanHistory.tools_used, '$[*]'),
                    f'"{tool}"'
                ))
        
        # Use a subquery for counting to improve performance
        count_subquery = query.with_entities(func.count().label('total')).scalar()
        total = count_subquery
        total_pages = (total + limit - 1) // limit if total > 0 else 0
        
        # Apply pagination and ordering with optimized query
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
    
    except Exception as e:
        logger.error(f"Error in get_scan_history: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Failed to retrieve scan history',
            'details': str(e) if current_app.debug else 'An error occurred'
        }), 500

@history_bp.route('/scans/<int:scan_id>', methods=['GET'])
@jwt_required()
@cached_view(ttl=60)  # Cache for 60 seconds
def get_scan_details(scan_id):
    """Get detailed information about a specific scan."""
    from models import ScanHistory
    import os
    import json
    
    try:
        # Get current user ID
        user_id = get_jwt_identity()
        
        # Find the scan in the database
        scan = ScanHistory.query.filter_by(id=scan_id, user_id=user_id).first()
        
        if not scan:
            return jsonify({
                'error': True,
                'message': 'Scan not found or access denied',
                'code': 'SCAN_NOT_FOUND'
            }), 404
        
        # Get the scan details
        scan_data = scan.to_dict()
        
        # If there's a results path, try to load the results
        if scan.results_path and os.path.exists(scan.results_path):
            try:
                # Use a cache key based on the file's modification time
                cache_key = f"scan_results:{scan_id}:{os.path.getmtime(scan.results_path)}"
                
                # Try to get from cache
                cached_results = CacheManager.get(cache_key)
                if cached_results:
                    scan_data['results'] = cached_results
                else:
                    # Read from file and cache
                    with open(scan.results_path, 'r') as f:
                        results = f.read()
                        scan_data['results'] = results
                        
                        # Cache the results for 5 minutes
                        CacheManager.set(cache_key, results, 300)
            except Exception as e:
                logger.error(f"Error loading scan results: {str(e)}")
                scan_data['results'] = f"Error loading results: {str(e)}"
        else:
            scan_data['results'] = "No results available"
        
        return jsonify(scan_data)
    
    except Exception as e:
        logger.error(f"Error in get_scan_details: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Failed to retrieve scan details',
            'details': str(e) if current_app.debug else 'An error occurred'
        }), 500

@history_bp.route('/search', methods=['GET'])
@jwt_required()
@cached_view(ttl=30)  # Cache for 30 seconds
def search_scans():
    """Search through scan history with full-text search."""
    from models import ScanHistory
    from database import db
    from sqlalchemy import or_, func, case
    
    try:
        # Get current user ID
        user_id = get_jwt_identity()
        
        # Get search query and pagination parameters
        query = request.args.get('q', '').strip()
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
        # Use a case statement to calculate relevance score
        relevance_score = case(
            [
                # Exact matches get highest score
                (ScanHistory.target_ip == query, 100),
                # Target starts with query
                (ScanHistory.target_ip.like(f'{query}%'), 80),
                # Target contains query
                (ScanHistory.target_ip.ilike(f'%{query}%'), 60),
                # Status matches
                (ScanHistory.status.ilike(f'%{query}%'), 40),
                # Tool matches
                (func.json_contains(
                    func.lower(func.json_extract(ScanHistory.tools_used, '$[*]')),
                    func.lower(f'"{query}"')
                ), 20)
            ],
            else_=0
        ).label('relevance')
        
        # Build the query with relevance scoring
        search_query = ScanHistory.query.with_entities(
            ScanHistory,
            relevance_score
        ).filter(
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
        
        # Use a subquery for counting to improve performance
        count_subquery = search_query.with_entities(func.count().label('total')).scalar()
        total = count_subquery
        total_pages = (total + limit - 1) // limit if total > 0 else 0
        
        # Apply pagination and ordering by relevance score
        results = search_query.order_by(relevance_score.desc(), ScanHistory.started_at.desc()) \
                             .offset((page - 1) * limit) \
                             .limit(limit) \
                             .all()
        
        # Convert results to dictionaries
        data = [scan[0].to_dict() for scan in results]
        
        # Add relevance score to each result
        for i, scan_with_score in enumerate(results):
            data[i]['relevance_score'] = scan_with_score[1]
        
        return jsonify({
            'data': data,
            'total': total,
            'page': page,
            'limit': limit,
            'totalPages': total_pages
        })
    
    except Exception as e:
        logger.error(f"Error in search_scans: {str(e)}")
        return jsonify({
            'error': True,
            'message': 'Failed to search scan history',
            'details': str(e) if current_app.debug else 'An error occurred'
        }), 500

@history_bp.route('/scans/<int:scan_id>/rerun', methods=['POST'])
@jwt_required()
def rerun_scan(scan_id):
    """Re-run a previous scan with the same configuration."""
    from models import ScanHistory
    from database import db
    from datetime import datetime
    import json
    import os
    
    # Get current user ID
    user_id = get_jwt_identity()
    
    # Find the scan in the database
    scan = ScanHistory.query.filter_by(id=scan_id, user_id=user_id).first()
    
    if not scan:
        return jsonify({'error': 'Scan not found or access denied'}), 404
    
    # Create a new scan with the same configuration
    new_scan = ScanHistory(
        user_id=user_id,
        target_ip=scan.target_ip,
        tools_used=scan.tools_used,
        status='queued',
        started_at=datetime.utcnow(),
        scan_config=scan.scan_config
    )
    
    # Save to database
    db.session.add(new_scan)
    db.session.commit()
    
    # In a real implementation, we would trigger the scan execution here
    # For now, we'll just return the new scan ID
    
    return jsonify({'scanId': new_scan.id, 'message': 'Scan queued for execution'})

@history_bp.route('/scans/<int:scan_id>/export', methods=['GET'])
@jwt_required()
def export_scan_results(scan_id):
    """Export scan results in different formats."""
    from models import ScanHistory
    from flask import send_file
    import os
    import json
    import csv
    import tempfile
    
    # Get current user ID
    user_id = get_jwt_identity()
    
    # Get requested format
    format_type = request.args.get('format', 'json')
    if format_type not in ['json', 'txt', 'csv']:
        return jsonify({'error': 'Invalid format requested'}), 400
    
    # Find the scan in the database
    scan = ScanHistory.query.filter_by(id=scan_id, user_id=user_id).first()
    
    if not scan:
        return jsonify({'error': 'Scan not found or access denied'}), 404
    
    # Get scan results
    results = {}
    if scan.results_path and os.path.exists(scan.results_path):
        try:
            with open(scan.results_path, 'r') as f:
                results = f.read()
        except Exception as e:
            return jsonify({'error': f'Error loading results: {str(e)}'}), 500
    else:
        return jsonify({'error': 'No results available for this scan'}), 404
    
    # Create temporary file for the export
    temp_file = tempfile.NamedTemporaryFile(delete=False)
    
    try:
        if format_type == 'json':
            # For JSON, we'll create a structured object with scan metadata
            export_data = {
                'scan_id': scan.id,
                'target_ip': scan.target_ip,
                'tools_used': scan.tools_used,
                'status': scan.status,
                'started_at': scan.started_at.isoformat() if scan.started_at else None,
                'completed_at': scan.completed_at.isoformat() if scan.completed_at else None,
                'results': results
            }
            
            with open(temp_file.name, 'w') as f:
                json.dump(export_data, f, indent=2)
                
            mime_type = 'application/json'
            filename = f'scan_{scan_id}.json'
            
        elif format_type == 'txt':
            # For TXT, we'll create a simple text report
            with open(temp_file.name, 'w') as f:
                f.write(f"Scan ID: {scan.id}\n")
                f.write(f"Target: {scan.target_ip}\n")
                f.write(f"Tools: {', '.join(scan.tools_used)}\n")
                f.write(f"Status: {scan.status}\n")
                f.write(f"Started: {scan.started_at}\n")
                if scan.completed_at:
                    f.write(f"Completed: {scan.completed_at}\n")
                f.write("\n--- RESULTS ---\n\n")
                f.write(results)
                
            mime_type = 'text/plain'
            filename = f'scan_{scan_id}.txt'
            
        elif format_type == 'csv':
            # For CSV, we'll create a simple CSV with basic scan info
            with open(temp_file.name, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['Scan ID', 'Target', 'Tools', 'Status', 'Started', 'Completed'])
                writer.writerow([
                    scan.id,
                    scan.target_ip,
                    ', '.join(scan.tools_used),
                    scan.status,
                    scan.started_at,
                    scan.completed_at or 'N/A'
                ])
                writer.writerow([])
                writer.writerow(['Results'])
                writer.writerow([results])
                
            mime_type = 'text/csv'
            filename = f'scan_{scan_id}.csv'
        
        # Send the file
        return send_file(
            temp_file.name,
            mimetype=mime_type,
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        # Clean up the temporary file
        os.unlink(temp_file.name)
        return jsonify({'error': f'Error exporting results: {str(e)}'}), 500