from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import json
import logging
from datetime import datetime
from models.scan_history import ScanHistory
from database import db
from tools.scan_manager import ScanManager
from tools.tool_validator import ToolValidator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scans_bp = Blueprint('scans', __name__)

# Initialize scan manager
scan_manager = None

@scans_bp.before_app_first_request
def initialize_scan_manager():
    """Initialize the scan manager with the Flask app."""
    global scan_manager
    
    # Create scan results directory if it doesn't exist
    scan_results_dir = os.path.join(current_app.root_path, 'scan_results')
    os.makedirs(scan_results_dir, exist_ok=True)
    
    scan_manager = ScanManager(
        socketio=current_app.extensions['socketio'],
        scan_results_dir=scan_results_dir
    )

@scans_bp.route('/start', methods=['POST'])
@jwt_required()
def start_scan():
    """
    Start a new scan with the specified tools.
    
    Request body:
    {
        "target": "example.com",
        "tools": [
            {
                "tool_name": "nmap",
                "options": {
                    "scan_type": "basic",
                    "ports": "1-1000"
                }
            },
            {
                "tool_name": "gobuster",
                "options": {
                    "mode": "dir",
                    "wordlist": "/path/to/wordlist.txt"
                }
            }
        ]
    }
    """
    try:
        # Get current user ID
        user_id = get_jwt_identity()
        
        # Validate request data
        data = request.get_json()
        if not data:
            return jsonify({
                'error': True,
                'message': 'No data provided',
                'code': 'NO_DATA'
            }), 400
        
        # Validate target
        target = data.get('target')
        if not target:
            return jsonify({
                'error': True,
                'message': 'Target is required',
                'code': 'MISSING_TARGET'
            }), 400
        
        # Validate tools
        tools = data.get('tools', [])
        if not tools:
            return jsonify({
                'error': True,
                'message': 'At least one tool is required',
                'code': 'NO_TOOLS'
            }), 400
        
        # Validate each tool
        for tool in tools:
            if 'tool_name' not in tool:
                return jsonify({
                    'error': True,
                    'message': 'Each tool must have a tool_name',
                    'code': 'INVALID_TOOL'
                }), 400
            
            # Check if tool is supported
            if tool['tool_name'].lower() not in ['nmap', 'gobuster', 'dirb']:
                return jsonify({
                    'error': True,
                    'message': f'Unsupported tool: {tool["tool_name"]}',
                    'code': 'UNSUPPORTED_TOOL'
                }), 400
        
        # Start the scan
        scan_id = scan_manager.start_scan(
            user_id=user_id,
            target=target,
            tools_config=tools
        )
        
        if scan_id is None:
            return jsonify({
                'error': True,
                'message': 'Failed to start scan',
                'code': 'SCAN_START_FAILED'
            }), 500
        
        # Return scan ID
        return jsonify({
            'error': False,
            'message': 'Scan started successfully',
            'scan_id': scan_id
        }), 201
    
    except Exception as e:
        logger.error(f"Error starting scan: {e}")
        return jsonify({
            'error': True,
            'message': f'Internal server error: {str(e)}',
            'code': 'SERVER_ERROR'
        }), 500

@scans_bp.route('/<int:scan_id>/status', methods=['GET'])
@jwt_required()
def get_scan_status(scan_id):
    """
    Get the status of a scan.
    
    Response:
    {
        "scan_id": 123,
        "status": "running",
        "target": "example.com",
        "start_time": "2023-01-01T12:00:00Z",
        "overall_progress": 75,
        "tools": {
            "nmap": {
                "status": "running",
                "progress": 80,
                ...
            },
            "gobuster": {
                "status": "running",
                "progress": 70,
                ...
            }
        }
    }
    """
    try:
        # Get current user ID
        user_id = get_jwt_identity()
        
        # Check if scan exists and belongs to user
        scan = ScanHistory.query.filter_by(id=scan_id, user_id=user_id).first()
        if not scan:
            return jsonify({
                'error': True,
                'message': 'Scan not found or access denied',
                'code': 'SCAN_NOT_FOUND'
            }), 404
        
        # Get scan status
        status = scan_manager.get_scan_status(scan_id)
        if not status:
            return jsonify({
                'error': True,
                'message': 'Failed to get scan status',
                'code': 'STATUS_RETRIEVAL_FAILED'
            }), 500
        
        return jsonify({
            'error': False,
            'data': status
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting scan status: {e}")
        return jsonify({
            'error': True,
            'message': f'Internal server error: {str(e)}',
            'code': 'SERVER_ERROR'
        }), 500

@scans_bp.route('/<int:scan_id>/stop', methods=['POST'])
@jwt_required()
def stop_scan(scan_id):
    """
    Stop a running scan.
    
    Response:
    {
        "error": false,
        "message": "Scan stopped successfully"
    }
    """
    try:
        # Get current user ID
        user_id = get_jwt_identity()
        
        # Check if scan exists and belongs to user
        scan = ScanHistory.query.filter_by(id=scan_id, user_id=user_id).first()
        if not scan:
            return jsonify({
                'error': True,
                'message': 'Scan not found or access denied',
                'code': 'SCAN_NOT_FOUND'
            }), 404
        
        # Check if scan is running
        if scan.status != 'running':
            return jsonify({
                'error': True,
                'message': 'Scan is not running',
                'code': 'SCAN_NOT_RUNNING'
            }), 400
        
        # Stop the scan
        success = scan_manager.stop_scan(scan_id)
        if not success:
            return jsonify({
                'error': True,
                'message': 'Failed to stop scan',
                'code': 'STOP_FAILED'
            }), 500
        
        return jsonify({
            'error': False,
            'message': 'Scan stopped successfully'
        }), 200
    
    except Exception as e:
        logger.error(f"Error stopping scan: {e}")
        return jsonify({
            'error': True,
            'message': f'Internal server error: {str(e)}',
            'code': 'SERVER_ERROR'
        }), 500

@scans_bp.route('/<int:scan_id>/results', methods=['GET'])
@jwt_required()
def get_scan_results(scan_id):
    """
    Get the results of a scan.
    
    Response:
    {
        "scan_id": 123,
        "status": "completed",
        "target": "example.com",
        "start_time": "2023-01-01T12:00:00Z",
        "completed_at": "2023-01-01T12:05:00Z",
        "tools": {
            "nmap": {
                "parsed_results": {
                    "open_ports": [80, 443],
                    ...
                },
                "output_file": "/path/to/output.txt"
            },
            ...
        }
    }
    """
    try:
        # Get current user ID
        user_id = get_jwt_identity()
        
        # Check if scan exists and belongs to user
        scan = ScanHistory.query.filter_by(id=scan_id, user_id=user_id).first()
        if not scan:
            return jsonify({
                'error': True,
                'message': 'Scan not found or access denied',
                'code': 'SCAN_NOT_FOUND'
            }), 404
        
        # Get scan results
        results = scan_manager.get_scan_results(scan_id)
        if not results:
            return jsonify({
                'error': True,
                'message': 'Failed to get scan results',
                'code': 'RESULTS_RETRIEVAL_FAILED'
            }), 500
        
        return jsonify({
            'error': False,
            'data': results
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting scan results: {e}")
        return jsonify({
            'error': True,
            'message': f'Internal server error: {str(e)}',
            'code': 'SERVER_ERROR'
        }), 500

@scans_bp.route('/<int:scan_id>/share', methods=['POST'])
@jwt_required()
def create_shareable_link(scan_id):
    """
    Create a shareable link for scan results.
    
    Request body:
    {
        "expiration": 3600,  # Optional: Link expiration in seconds (default: 24 hours)
        "tool": "nmap"       # Optional: Specific tool to share
    }
    
    Response:
    {
        "error": false,
        "data": {
            "share_id": "abc123",
            "url": "/api/scans/share/abc123",
            "expires_at": "2023-01-02T12:00:00Z"
        }
    }
    """
    try:
        # Get current user ID
        user_id = get_jwt_identity()
        
        # Check if scan exists and belongs to user
        scan = ScanHistory.query.filter_by(id=scan_id, user_id=user_id).first()
        if not scan:
            return jsonify({
                'error': True,
                'message': 'Scan not found or access denied',
                'code': 'SCAN_NOT_FOUND'
            }), 404
        
        # Get request data
        data = request.get_json() or {}
        
        # Generate a unique share ID (you could use UUID or other methods)
        import uuid
        import time
        from datetime import datetime, timedelta
        
        share_id = str(uuid.uuid4())[:8]  # Short UUID
        
        # Set expiration (default: 24 hours)
        expiration_seconds = data.get('expiration', 86400)  # 24 hours in seconds
        expires_at = datetime.utcnow() + timedelta(seconds=expiration_seconds)
        
        # Store share information in database or cache
        # For simplicity, we'll store it in a dictionary in memory
        # In a production app, this should be stored in a database
        if not hasattr(current_app, 'shared_scans'):
            current_app.shared_scans = {}
        
        current_app.shared_scans[share_id] = {
            'scan_id': scan_id,
            'tool': data.get('tool'),
            'expires_at': expires_at,
            'created_by': user_id
        }
        
        # Generate shareable URL
        share_url = f"/api/scans/share/{share_id}"
        
        return jsonify({
            'error': False,
            'data': {
                'share_id': share_id,
                'url': share_url,
                'expires_at': expires_at.isoformat()
            }
        }), 201
    
    except Exception as e:
        logger.error(f"Error creating shareable link: {e}")
        return jsonify({
            'error': True,
            'message': f'Internal server error: {str(e)}',
            'code': 'SERVER_ERROR'
        }), 500

@scans_bp.route('/share/<share_id>', methods=['GET'])
def get_shared_scan(share_id):
    """
    Get shared scan results using a share ID.
    This endpoint does not require authentication.
    
    Response:
    {
        "error": false,
        "data": {
            // Scan results
        }
    }
    """
    try:
        # Check if share ID exists
        if not hasattr(current_app, 'shared_scans') or share_id not in current_app.shared_scans:
            return jsonify({
                'error': True,
                'message': 'Shared scan not found or expired',
                'code': 'SHARE_NOT_FOUND'
            }), 404
        
        # Get share information
        share_info = current_app.shared_scans[share_id]
        
        # Check if share has expired
        if datetime.utcnow() > share_info['expires_at']:
            # Remove expired share
            del current_app.shared_scans[share_id]
            return jsonify({
                'error': True,
                'message': 'Shared scan has expired',
                'code': 'SHARE_EXPIRED'
            }), 410
        
        # Get scan results
        scan_id = share_info['scan_id']
        results = scan_manager.get_scan_results(scan_id)
        
        if not results:
            return jsonify({
                'error': True,
                'message': 'Failed to get scan results',
                'code': 'RESULTS_RETRIEVAL_FAILED'
            }), 500
        
        # Filter by tool if specified
        if share_info.get('tool') and share_info['tool'] in results['tools']:
            results = {
                'scan_id': results['scan_id'],
                'target': results['target'],
                'status': results['status'],
                'start_time': results['start_time'],
                'completed_at': results.get('completed_at'),
                'tools': {
                    share_info['tool']: results['tools'][share_info['tool']]
                }
            }
        
        return jsonify({
            'error': False,
            'data': results
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting shared scan: {e}")
        return jsonify({
            'error': True,
            'message': f'Internal server error: {str(e)}',
            'code': 'SERVER_ERROR'
        }), 500

@scans_bp.route('/tools/availability', methods=['GET'])
@jwt_required()
def get_tools_availability():
    """
    Get the availability status of all supported security tools.
    
    Response:
    {
        "error": false,
        "data": {
            "nmap": {
                "available": true,
                "message": "nmap is available"
            },
            "gobuster": {
                "available": false,
                "message": "gobuster is not installed or not in PATH"
            },
            "dirb": {
                "available": true,
                "message": "dirb is available"
            }
        }
    }
    """
    try:
        # Check tool availability
        availability = ToolValidator.check_all_tools()
        
        return jsonify({
            'error': False,
            'data': availability
        }), 200
    
    except Exception as e:
        logger.error(f"Error checking tool availability: {e}")
        return jsonify({
            'error': True,
            'message': f'Internal server error: {str(e)}',
            'code': 'SERVER_ERROR'
        }), 500

@scans_bp.route('/<int:scan_id>/export', methods=['GET'])
@jwt_required()
def export_scan_results(scan_id):
    """
    Export scan results in the specified format.
    
    Query parameters:
    - format: Export format (txt, json, csv, html, xml)
    - tool: Specific tool to export (optional)
    - filter: Filter string to include only matching results (optional)
    
    Response:
    File download
    """
    try:
        # Get current user ID
        user_id = get_jwt_identity()
        
        # Check if scan exists and belongs to user
        scan = ScanHistory.query.filter_by(id=scan_id, user_id=user_id).first()
        if not scan:
            return jsonify({
                'error': True,
                'message': 'Scan not found or access denied',
                'code': 'SCAN_NOT_FOUND'
            }), 404
        
        # Get export format
        export_format = request.args.get('format', 'txt').lower()
        if export_format not in ['txt', 'json', 'csv', 'html', 'xml']:
            return jsonify({
                'error': True,
                'message': 'Unsupported export format',
                'code': 'UNSUPPORTED_FORMAT'
            }), 400
        
        # Get specific tool if specified
        tool = request.args.get('tool')
        
        # Get filter string if specified
        filter_str = request.args.get('filter', '').lower()
        
        # Get scan results
        results = scan_manager.get_scan_results(scan_id)
        if not results:
            return jsonify({
                'error': True,
                'message': 'Failed to get scan results',
                'code': 'RESULTS_RETRIEVAL_FAILED'
            }), 500
        
        # Create export file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        export_filename = f"scan_{scan_id}_{timestamp}.{export_format}"
        export_path = os.path.join(current_app.root_path, 'scan_results', export_filename)
        
        # Filter results if filter string is provided
        filtered_results = results.copy()
        if filter_str:
            # Filter tools
            if 'tools' in filtered_results:
                filtered_tools = {}
                for tool_name, tool_data in filtered_results['tools'].items():
                    # Skip if specific tool is requested and this isn't it
                    if tool and tool != tool_name:
                        continue
                    
                    # Check if tool name matches filter
                    if filter_str in tool_name.lower():
                        filtered_tools[tool_name] = tool_data
                        continue
                    
                    # Check if parsed results match filter
                    if 'parsed_results' in tool_data:
                        parsed = tool_data['parsed_results']
                        
                        # Tool-specific filtering
                        if tool_name == 'nmap':
                            # Filter services
                            if 'services' in parsed:
                                filtered_services = []
                                for service in parsed['services']:
                                    if (filter_str in str(service.get('port', '')).lower() or
                                        filter_str in str(service.get('protocol', '')).lower() or
                                        filter_str in str(service.get('service', '')).lower() or
                                        filter_str in str(service.get('state', '')).lower()):
                                        filtered_services.append(service)
                                
                                if filtered_services:
                                    # Create a copy with filtered services
                                    filtered_parsed = parsed.copy()
                                    filtered_parsed['services'] = filtered_services
                                    filtered_tool_data = tool_data.copy()
                                    filtered_tool_data['parsed_results'] = filtered_parsed
                                    filtered_tools[tool_name] = filtered_tool_data
                        
                        elif tool_name == 'gobuster':
                            # Filter findings
                            if 'findings' in parsed:
                                filtered_findings = []
                                for finding in parsed['findings']:
                                    if (filter_str in str(finding.get('path', '')).lower() or
                                        filter_str in str(finding.get('status', '')).lower() or
                                        filter_str in str(finding.get('size', '')).lower()):
                                        filtered_findings.append(finding)
                                
                                if filtered_findings:
                                    # Create a copy with filtered findings
                                    filtered_parsed = parsed.copy()
                                    filtered_parsed['findings'] = filtered_findings
                                    filtered_tool_data = tool_data.copy()
                                    filtered_tool_data['parsed_results'] = filtered_parsed
                                    filtered_tools[tool_name] = filtered_tool_data
                        
                        elif tool_name == 'dirb':
                            # Filter directories and files
                            filtered_dirs = []
                            filtered_files = []
                            
                            if 'directories' in parsed:
                                for dir_entry in parsed['directories']:
                                    if (filter_str in str(dir_entry.get('url', '')).lower() or
                                        filter_str in str(dir_entry.get('status', '')).lower() or
                                        filter_str in str(dir_entry.get('size', '')).lower()):
                                        filtered_dirs.append(dir_entry)
                            
                            if 'files' in parsed:
                                for file_entry in parsed['files']:
                                    if (filter_str in str(file_entry.get('url', '')).lower() or
                                        filter_str in str(file_entry.get('status', '')).lower() or
                                        filter_str in str(file_entry.get('size', '')).lower()):
                                        filtered_files.append(file_entry)
                            
                            if filtered_dirs or filtered_files:
                                # Create a copy with filtered entries
                                filtered_parsed = parsed.copy()
                                if filtered_dirs:
                                    filtered_parsed['directories'] = filtered_dirs
                                if filtered_files:
                                    filtered_parsed['files'] = filtered_files
                                filtered_tool_data = tool_data.copy()
                                filtered_tool_data['parsed_results'] = filtered_parsed
                                filtered_tools[tool_name] = filtered_tool_data
                    
                    # Check if raw output matches filter
                    elif 'output' in tool_data and filter_str in tool_data['output'].lower():
                        filtered_tools[tool_name] = tool_data
                
                # Update filtered results with filtered tools
                if filtered_tools:
                    filtered_results['tools'] = filtered_tools
                else:
                    # No matches found, return empty tools
                    filtered_results['tools'] = {}
        
        # Apply tool filter if specified
        if tool and 'tools' in filtered_results:
            if tool in filtered_results['tools']:
                filtered_results['tools'] = {tool: filtered_results['tools'][tool]}
            else:
                filtered_results['tools'] = {}
        
        # Export based on format
        if export_format == 'json':
            with open(export_path, 'w') as f:
                json.dump(filtered_results, f, indent=2)
        
        elif export_format == 'csv':
            with open(export_path, 'w') as f:
                # Write scan metadata
                f.write(f"Scan ID,{scan_id}\n")
                f.write(f"Target,{filtered_results['target']}\n")
                f.write(f"Status,{filtered_results['status']}\n")
                f.write(f"Start Time,{filtered_results['start_time']}\n")
                if 'completed_at' in filtered_results and filtered_results['completed_at']:
                    f.write(f"Completed At,{filtered_results['completed_at']}\n")
                
                f.write("\n")
                
                # Write tool results
                for tool_name, tool_data in filtered_results['tools'].items():
                    f.write(f"\n{tool_name.upper()}\n")
                    
                    if 'parsed_results' in tool_data:
                        parsed = tool_data['parsed_results']
                        
                        # Write parsed results based on tool
                        if tool_name == 'nmap':
                            f.write("Port,Protocol,Service,State\n")
                            for service in parsed.get('services', []):
                                f.write(f"{service.get('port', '')},{service.get('protocol', '')},{service.get('service', '')},{service.get('state', 'open')}\n")
                            
                            # Add OS detection if available
                            if 'os_detection' in parsed and parsed['os_detection']:
                                f.write("\nOS Detection\n")
                                f.write("OS Name,Accuracy\n")
                                for os in parsed['os_detection']:
                                    f.write(f"{os.get('name', '')},{os.get('accuracy', '')}\n")
                        
                        elif tool_name == 'gobuster':
                            f.write("Path,Status,Size\n")
                            for finding in parsed.get('findings', []):
                                f.write(f"{finding.get('path', '')},{finding.get('status', '')},{finding.get('size', '')}\n")
                        
                        elif tool_name == 'dirb':
                            f.write("Type,URL,Status,Size\n")
                            for dir_entry in parsed.get('directories', []):
                                f.write(f"directory,{dir_entry.get('url', '')},{dir_entry.get('status', '')},{dir_entry.get('size', '')}\n")
                            for file_entry in parsed.get('files', []):
                                f.write(f"file,{file_entry.get('url', '')},{file_entry.get('status', '')},{file_entry.get('size', '')}\n")
        
        elif export_format == 'html':
            with open(export_path, 'w') as f:
                # Write HTML header
                f.write("""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scan Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        h1, h2, h3 { color: #2c3e50; }
        .container { max-width: 1200px; margin: 0 auto; }
        .metadata { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .metadata-item { margin-bottom: 5px; }
        .tool-section { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 5px; padding: 15px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        tr:hover { background-color: #f5f5f5; }
        .os-item { display: inline-block; background-color: #e9ecef; padding: 5px 10px; margin: 5px; border-radius: 3px; }
        pre { background-color: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; }
        .status-running { color: #007bff; }
        .status-completed { color: #28a745; }
        .status-failed { color: #dc3545; }
        .status-stopped { color: #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Scan Results</h1>
""")
                
                # Write scan metadata
                f.write('<div class="metadata">\n')
                f.write(f'<div class="metadata-item"><strong>Scan ID:</strong> {scan_id}</div>\n')
                f.write(f'<div class="metadata-item"><strong>Target:</strong> {filtered_results["target"]}</div>\n')
                
                status_class = ""
                if filtered_results["status"] == "running":
                    status_class = "status-running"
                elif filtered_results["status"] == "completed":
                    status_class = "status-completed"
                elif filtered_results["status"] == "failed":
                    status_class = "status-failed"
                elif filtered_results["status"] == "stopped":
                    status_class = "status-stopped"
                
                f.write(f'<div class="metadata-item"><strong>Status:</strong> <span class="{status_class}">{filtered_results["status"]}</span></div>\n')
                f.write(f'<div class="metadata-item"><strong>Start Time:</strong> {filtered_results["start_time"]}</div>\n')
                
                if 'completed_at' in filtered_results and filtered_results['completed_at']:
                    f.write(f'<div class="metadata-item"><strong>Completed At:</strong> {filtered_results["completed_at"]}</div>\n')
                
                f.write('</div>\n')
                
                # Write tool results
                for tool_name, tool_data in filtered_results['tools'].items():
                    f.write(f'<div class="tool-section">\n')
                    f.write(f'<h2>{tool_name.upper()}</h2>\n')
                    
                    if 'parsed_results' in tool_data:
                        parsed = tool_data['parsed_results']
                        
                        # Write parsed results based on tool
                        if tool_name == 'nmap':
                            if 'services' in parsed and parsed['services']:
                                f.write('<h3>Open Ports</h3>\n')
                                f.write('<table>\n')
                                f.write('<tr><th>Port</th><th>Protocol</th><th>Service</th><th>State</th></tr>\n')
                                
                                for service in parsed['services']:
                                    f.write('<tr>\n')
                                    f.write(f'<td>{service.get("port", "")}</td>\n')
                                    f.write(f'<td>{service.get("protocol", "")}</td>\n')
                                    f.write(f'<td>{service.get("service", "")}</td>\n')
                                    f.write(f'<td>{service.get("state", "open")}</td>\n')
                                    f.write('</tr>\n')
                                
                                f.write('</table>\n')
                            
                            if 'os_detection' in parsed and parsed['os_detection']:
                                f.write('<h3>OS Detection</h3>\n')
                                f.write('<div>\n')
                                
                                for os in parsed['os_detection']:
                                    f.write(f'<div class="os-item">{os.get("name", "")} ({os.get("accuracy", "")}% accuracy)</div>\n')
                                
                                f.write('</div>\n')
                        
                        elif tool_name == 'gobuster':
                            if 'findings' in parsed and parsed['findings']:
                                f.write('<h3>Directory Scan Results</h3>\n')
                                f.write('<table>\n')
                                f.write('<tr><th>Path</th><th>Status</th><th>Size</th></tr>\n')
                                
                                for finding in parsed['findings']:
                                    f.write('<tr>\n')
                                    f.write(f'<td>{finding.get("path", "")}</td>\n')
                                    f.write(f'<td>{finding.get("status", "")}</td>\n')
                                    f.write(f'<td>{finding.get("size", "")}</td>\n')
                                    f.write('</tr>\n')
                                
                                f.write('</table>\n')
                        
                        elif tool_name == 'dirb':
                            if 'directories' in parsed and parsed['directories']:
                                f.write('<h3>Directories</h3>\n')
                                f.write('<table>\n')
                                f.write('<tr><th>URL</th><th>Status</th><th>Size</th></tr>\n')
                                
                                for dir_entry in parsed['directories']:
                                    f.write('<tr>\n')
                                    f.write(f'<td>{dir_entry.get("url", "")}</td>\n')
                                    f.write(f'<td>{dir_entry.get("status", "")}</td>\n')
                                    f.write(f'<td>{dir_entry.get("size", "")}</td>\n')
                                    f.write('</tr>\n')
                                
                                f.write('</table>\n')
                            
                            if 'files' in parsed and parsed['files']:
                                f.write('<h3>Files</h3>\n')
                                f.write('<table>\n')
                                f.write('<tr><th>URL</th><th>Status</th><th>Size</th></tr>\n')
                                
                                for file_entry in parsed['files']:
                                    f.write('<tr>\n')
                                    f.write(f'<td>{file_entry.get("url", "")}</td>\n')
                                    f.write(f'<td>{file_entry.get("status", "")}</td>\n')
                                    f.write(f'<td>{file_entry.get("size", "")}</td>\n')
                                    f.write('</tr>\n')
                                
                                f.write('</table>\n')
                        
                        else:
                            # Generic JSON display for other tools
                            f.write('<h3>Parsed Results</h3>\n')
                            f.write('<pre>\n')
                            f.write(json.dumps(parsed, indent=2))
                            f.write('\n</pre>\n')
                    
                    # Include raw output if available
                    if 'output' in tool_data and tool_data['output']:
                        f.write('<h3>Raw Output</h3>\n')
                        f.write('<pre>\n')
                        f.write(tool_data['output'].replace('<', '&lt;').replace('>', '&gt;'))
                        f.write('\n</pre>\n')
                    
                    f.write('</div>\n')
                
                # Write HTML footer
                f.write("""
    </div>
</body>
</html>
""")
        
        elif export_format == 'xml':
            with open(export_path, 'w') as f:
                # Write XML header
                f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
                f.write('<scan_results>\n')
                
                # Write scan metadata
                f.write(f'  <scan_id>{scan_id}</scan_id>\n')
                f.write(f'  <target>{filtered_results["target"]}</target>\n')
                f.write(f'  <status>{filtered_results["status"]}</status>\n')
                f.write(f'  <start_time>{filtered_results["start_time"]}</start_time>\n')
                
                if 'completed_at' in filtered_results and filtered_results['completed_at']:
                    f.write(f'  <completed_at>{filtered_results["completed_at"]}</completed_at>\n')
                
                # Write tool results
                f.write('  <tools>\n')
                
                for tool_name, tool_data in filtered_results['tools'].items():
                    f.write(f'    <tool name="{tool_name}">\n')
                    
                    if 'parsed_results' in tool_data:
                        parsed = tool_data['parsed_results']
                        f.write('      <parsed_results>\n')
                        
                        # Write parsed results based on tool
                        if tool_name == 'nmap':
                            if 'services' in parsed and parsed['services']:
                                f.write('        <services>\n')
                                
                                for service in parsed['services']:
                                    f.write('          <service>\n')
                                    f.write(f'            <port>{service.get("port", "")}</port>\n')
                                    f.write(f'            <protocol>{service.get("protocol", "")}</protocol>\n')
                                    f.write(f'            <name>{service.get("service", "")}</name>\n')
                                    f.write(f'            <state>{service.get("state", "open")}</state>\n')
                                    f.write('          </service>\n')
                                
                                f.write('        </services>\n')
                            
                            if 'os_detection' in parsed and parsed['os_detection']:
                                f.write('        <os_detection>\n')
                                
                                for os in parsed['os_detection']:
                                    f.write('          <os>\n')
                                    f.write(f'            <name>{os.get("name", "")}</name>\n')
                                    f.write(f'            <accuracy>{os.get("accuracy", "")}</accuracy>\n')
                                    f.write('          </os>\n')
                                
                                f.write('        </os_detection>\n')
                        
                        elif tool_name == 'gobuster':
                            if 'findings' in parsed and parsed['findings']:
                                f.write('        <findings>\n')
                                
                                for finding in parsed['findings']:
                                    f.write('          <finding>\n')
                                    f.write(f'            <path>{finding.get("path", "")}</path>\n')
                                    f.write(f'            <status>{finding.get("status", "")}</status>\n')
                                    f.write(f'            <size>{finding.get("size", "")}</size>\n')
                                    f.write('          </finding>\n')
                                
                                f.write('        </findings>\n')
                        
                        elif tool_name == 'dirb':
                            if 'directories' in parsed and parsed['directories']:
                                f.write('        <directories>\n')
                                
                                for dir_entry in parsed['directories']:
                                    f.write('          <directory>\n')
                                    f.write(f'            <url>{dir_entry.get("url", "")}</url>\n')
                                    f.write(f'            <status>{dir_entry.get("status", "")}</status>\n')
                                    f.write(f'            <size>{dir_entry.get("size", "")}</size>\n')
                                    f.write('          </directory>\n')
                                
                                f.write('        </directories>\n')
                            
                            if 'files' in parsed and parsed['files']:
                                f.write('        <files>\n')
                                
                                for file_entry in parsed['files']:
                                    f.write('          <file>\n')
                                    f.write(f'            <url>{file_entry.get("url", "")}</url>\n')
                                    f.write(f'            <status>{file_entry.get("status", "")}</status>\n')
                                    f.write(f'            <size>{file_entry.get("size", "")}</size>\n')
                                    f.write('          </file>\n')
                                
                                f.write('        </files>\n')
                        
                        f.write('      </parsed_results>\n')
                    
                    # Include raw output if available
                    if 'output' in tool_data and tool_data['output']:
                        f.write('      <raw_output><![CDATA[\n')
                        f.write(tool_data['output'])
                        f.write('\n]]></raw_output>\n')
                    
                    f.write('    </tool>\n')
                
                f.write('  </tools>\n')
                f.write('</scan_results>\n')
        
        else:  # txt format
            with open(export_path, 'w') as f:
                # Write scan metadata
                f.write(f"Scan ID: {scan_id}\n")
                f.write(f"Target: {filtered_results['target']}\n")
                f.write(f"Status: {filtered_results['status']}\n")
                f.write(f"Start Time: {filtered_results['start_time']}\n")
                
                if 'completed_at' in filtered_results and filtered_results['completed_at']:
                    f.write(f"Completed At: {filtered_results['completed_at']}\n")
                
                f.write("\nTool Results:\n")
                
                # Write tool results
                for tool_name, tool_data in filtered_results['tools'].items():
                    f.write(f"\n{'=' * 20} {tool_name.upper()} {'=' * 20}\n\n")
                    
                    # If we have the original output file, include its contents
                    if 'output_file' in tool_data and os.path.exists(tool_data['output_file']):
                        with open(tool_data['output_file'], 'r') as tool_file:
                            f.write(tool_file.read())
                    
                    # Otherwise include the parsed results
                    elif 'parsed_results' in tool_data:
                        f.write(f"Parsed Results:\n{json.dumps(tool_data['parsed_results'], indent=2)}\n")
                    
                    # Include raw output if available
                    if 'output' in tool_data:
                        f.write("\nRaw Output:\n")
                        f.write(tool_data['output'])
                        f.write("\n")
        
        # Send the file
        mimetype = 'text/plain'
        if export_format == 'json':
            mimetype = 'application/json'
        elif export_format == 'csv':
            mimetype = 'text/csv'
        elif export_format == 'html':
            mimetype = 'text/html'
        elif export_format == 'xml':
            mimetype = 'application/xml'
        
        return send_file(
            export_path,
            as_attachment=True,
            download_name=export_filename,
            mimetype=mimetype
        )
    
    except Exception as e:
        logger.error(f"Error exporting scan results: {e}")
        return jsonify({
            'error': True,
            'message': f'Internal server error: {str(e)}',
            'code': 'SERVER_ERROR'
        }), 500