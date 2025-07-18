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
    - format: Export format (txt, json, csv)
    - tool: Specific tool to export (optional)
    
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
        if export_format not in ['txt', 'json', 'csv']:
            return jsonify({
                'error': True,
                'message': 'Unsupported export format',
                'code': 'UNSUPPORTED_FORMAT'
            }), 400
        
        # Get specific tool if specified
        tool = request.args.get('tool')
        
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
        
        # Export based on format
        if export_format == 'json':
            # Filter by tool if specified
            if tool and tool in results['tools']:
                export_data = results['tools'][tool]
            else:
                export_data = results
            
            with open(export_path, 'w') as f:
                json.dump(export_data, f, indent=2)
        
        elif export_format == 'csv':
            # CSV export is more complex and depends on the data structure
            # This is a simplified version
            with open(export_path, 'w') as f:
                f.write(f"Scan ID,{scan_id}\n")
                f.write(f"Target,{results['target']}\n")
                f.write(f"Status,{results['status']}\n")
                f.write(f"Start Time,{results['start_time']}\n")
                if 'completed_at' in results and results['completed_at']:
                    f.write(f"Completed At,{results['completed_at']}\n")
                
                f.write("\nTool Results:\n")
                
                for tool_name, tool_data in results['tools'].items():
                    if tool and tool != tool_name:
                        continue
                    
                    f.write(f"\n{tool_name.upper()}\n")
                    
                    if 'parsed_results' in tool_data:
                        parsed = tool_data['parsed_results']
                        
                        # Write parsed results based on tool
                        if tool_name == 'nmap':
                            f.write("Port,Protocol,Service\n")
                            for service in parsed.get('services', []):
                                f.write(f"{service.get('port', '')},{service.get('protocol', '')},{service.get('service', '')}\n")
                        
                        elif tool_name == 'gobuster':
                            if parsed.get('mode') == 'dir':
                                f.write("Path,Status,Size\n")
                                for finding in parsed.get('findings', []):
                                    f.write(f"{finding.get('path', '')},{finding.get('status', '')},{finding.get('size', '')}\n")
                        
                        elif tool_name == 'dirb':
                            f.write("URL,Status,Size\n")
                            for dir_entry in parsed.get('directories', []):
                                f.write(f"{dir_entry.get('url', '')},{dir_entry.get('status', '')},{dir_entry.get('size', '')}\n")
                            for file_entry in parsed.get('files', []):
                                f.write(f"{file_entry.get('url', '')},{file_entry.get('status', '')},{file_entry.get('size', '')}\n")
        
        else:  # txt format
            with open(export_path, 'w') as f:
                f.write(f"Scan ID: {scan_id}\n")
                f.write(f"Target: {results['target']}\n")
                f.write(f"Status: {results['status']}\n")
                f.write(f"Start Time: {results['start_time']}\n")
                if 'completed_at' in results and results['completed_at']:
                    f.write(f"Completed At: {results['completed_at']}\n")
                
                f.write("\nTool Results:\n")
                
                for tool_name, tool_data in results['tools'].items():
                    if tool and tool != tool_name:
                        continue
                    
                    f.write(f"\n{'=' * 20} {tool_name.upper()} {'=' * 20}\n\n")
                    
                    # If we have the original output file, include its contents
                    if 'output_file' in tool_data and os.path.exists(tool_data['output_file']):
                        with open(tool_data['output_file'], 'r') as tool_file:
                            f.write(tool_file.read())
                    
                    # Otherwise include the parsed results
                    elif 'parsed_results' in tool_data:
                        f.write(f"Parsed Results:\n{json.dumps(tool_data['parsed_results'], indent=2)}\n")
        
        # Send the file
        return send_file(
            export_path,
            as_attachment=True,
            download_name=export_filename,
            mimetype='text/plain' if export_format == 'txt' else f'application/{export_format}'
        )
    
    except Exception as e:
        logger.error(f"Error exporting scan results: {e}")
        return jsonify({
            'error': True,
            'message': f'Internal server error: {str(e)}',
            'code': 'SERVER_ERROR'
        }), 500