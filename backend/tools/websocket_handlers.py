"""WebSocket handlers for real-time scan updates."""
import logging
import json
import traceback
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_jwt_extended import decode_token
from flask import request, current_app
from datetime import datetime
from models.scan_history import ScanHistory
from database import db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Store active client connections
active_clients = {}
client_rooms = {}

def init_websocket_handlers(socketio: SocketIO):
    """
    Initialize WebSocket event handlers.
    
    Args:
        socketio: SocketIO instance
    """
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection."""
        client_id = request.sid
        logger.info(f"Client connected: {client_id}")
        active_clients[client_id] = {
            'connected_at': datetime.now(),
            'rooms': set(),
            'user_id': None
        }
        
        # Send connection acknowledgment
        emit('connection_established', {
            'status': 'connected',
            'client_id': client_id,
            'server_time': datetime.now().isoformat()
        })
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection."""
        client_id = request.sid
        logger.info(f"Client disconnected: {client_id}")
        
        # Clean up client data
        if client_id in active_clients:
            # Leave all rooms
            for room in active_clients[client_id]['rooms']:
                leave_room(room)
                if room in client_rooms and client_id in client_rooms[room]:
                    client_rooms[room].remove(client_id)
            
            # Remove client from active clients
            del active_clients[client_id]
    
    @socketio.on('ping')
    def handle_ping():
        """Handle ping from client to keep connection alive."""
        emit('pong', {
            'server_time': datetime.now().isoformat()
        })
    
    @socketio.on('join_scan')
    def handle_join_scan(data):
        """
        Join a scan room to receive updates for a specific scan.
        
        Args:
            data: Dictionary containing scan_id and token
        """
        client_id = request.sid
        try:
            scan_id = data.get('scan_id')
            token = data.get('token')
            
            if not scan_id or not token:
                emit('error', {
                    'message': 'Missing scan_id or token',
                    'code': 'MISSING_PARAMS'
                })
                return
            
            # Verify token
            try:
                decoded = decode_token(token)
                user_id = decoded['sub']
                
                # Store user ID in client data
                if client_id in active_clients:
                    active_clients[client_id]['user_id'] = user_id
                
                # Verify scan belongs to user
                scan = ScanHistory.query.get(scan_id)
                if not scan or scan.user_id != user_id:
                    emit('error', {
                        'message': 'Unauthorized access to scan',
                        'code': 'UNAUTHORIZED'
                    })
                    return
                
            except Exception as e:
                logger.error(f"Token validation error: {e}")
                emit('error', {
                    'message': 'Invalid token',
                    'code': 'INVALID_TOKEN'
                })
                return
            
            # Join room for this scan
            room = f"scan_{scan_id}"
            join_room(room)
            logger.info(f"Client {client_id} joined room {room}")
            
            # Track room membership
            if client_id in active_clients:
                active_clients[client_id]['rooms'].add(room)
            
            if room not in client_rooms:
                client_rooms[room] = set()
            client_rooms[room].add(client_id)
            
            # Send initial scan status
            try:
                scan = ScanHistory.query.get(scan_id)
                if scan:
                    # Get scan manager from app context
                    scan_manager = current_app.scan_manager
                    
                    # Get current scan status
                    scan_status = scan_manager.get_scan_status(int(scan_id)) if scan_manager else None
                    
                    emit('joined_scan', {
                        'scan_id': scan_id,
                        'status': 'connected',
                        'current_status': scan_status or {
                            'scan_id': scan_id,
                            'status': scan.status,
                            'target': scan.target_ip,
                            'start_time': scan.started_at.isoformat() if scan.started_at else None,
                            'completed_at': scan.completed_at.isoformat() if scan.completed_at else None,
                            'overall_progress': 100 if scan.status in ["completed", "failed", "stopped"] else 0
                        }
                    })
                else:
                    emit('joined_scan', {
                        'scan_id': scan_id,
                        'status': 'connected',
                        'current_status': {
                            'scan_id': scan_id,
                            'status': 'unknown',
                            'overall_progress': 0
                        }
                    })
            except Exception as e:
                logger.error(f"Error getting scan status: {e}")
                emit('joined_scan', {
                    'scan_id': scan_id,
                    'status': 'connected'
                })
        
        except Exception as e:
            logger.error(f"Error in join_scan: {e}")
            logger.error(traceback.format_exc())
            emit('error', {
                'message': 'Failed to join scan room',
                'code': 'JOIN_FAILED',
                'details': str(e)
            })
    
    @socketio.on('leave_scan')
    def handle_leave_scan(data):
        """
        Leave a scan room.
        
        Args:
            data: Dictionary containing scan_id
        """
        client_id = request.sid
        try:
            scan_id = data.get('scan_id')
            
            if not scan_id:
                emit('error', {
                    'message': 'Missing scan_id',
                    'code': 'MISSING_PARAMS'
                })
                return
            
            # Leave room for this scan
            room = f"scan_{scan_id}"
            leave_room(room)
            logger.info(f"Client {client_id} left room {room}")
            
            # Update room membership
            if client_id in active_clients and room in active_clients[client_id]['rooms']:
                active_clients[client_id]['rooms'].remove(room)
            
            if room in client_rooms and client_id in client_rooms[room]:
                client_rooms[room].remove(client_id)
            
            emit('left_scan', {
                'scan_id': scan_id,
                'status': 'disconnected'
            })
        
        except Exception as e:
            logger.error(f"Error in leave_scan: {e}")
            emit('error', {
                'message': 'Failed to leave scan room',
                'code': 'LEAVE_FAILED',
                'details': str(e)
            })
    
    @socketio.on('get_scan_status')
    def handle_get_scan_status(data):
        """
        Get current status of a scan.
        
        Args:
            data: Dictionary containing scan_id and token
        """
        try:
            scan_id = data.get('scan_id')
            token = data.get('token')
            
            if not scan_id or not token:
                emit('error', {
                    'message': 'Missing scan_id or token',
                    'code': 'MISSING_PARAMS'
                })
                return
            
            # Verify token
            try:
                decoded = decode_token(token)
                user_id = decoded['sub']
                
                # Verify scan belongs to user
                scan = ScanHistory.query.get(scan_id)
                if not scan or scan.user_id != user_id:
                    emit('error', {
                        'message': 'Unauthorized access to scan',
                        'code': 'UNAUTHORIZED'
                    })
                    return
                
            except Exception as e:
                emit('error', {
                    'message': 'Invalid token',
                    'code': 'INVALID_TOKEN'
                })
                return
            
            # Get scan manager from app context
            scan_manager = current_app.scan_manager
            
            # Get current scan status
            if scan_manager:
                scan_status = scan_manager.get_scan_status(int(scan_id))
                emit('scan_status', scan_status)
            else:
                emit('error', {
                    'message': 'Scan manager not available',
                    'code': 'SERVICE_UNAVAILABLE'
                })
        
        except Exception as e:
            logger.error(f"Error in get_scan_status: {e}")
            emit('error', {
                'message': 'Failed to get scan status',
                'code': 'STATUS_FAILED',
                'details': str(e)
            })
    
    @socketio.on_error()
    def handle_error(e):
        """Handle WebSocket errors."""
        logger.error(f"WebSocket error: {e}")
        emit('error', {
            'message': 'WebSocket error occurred',
            'code': 'WEBSOCKET_ERROR',
            'details': str(e)
        })
    
    # Define function to emit scan progress updates with output capture
    def emit_scan_progress(scan_id, tool, progress, status, output=None):
        """
        Emit scan progress update to clients in the scan room.
        
        Args:
            scan_id: ID of the scan
            tool: Name of the tool
            progress: Progress percentage
            status: Status of the tool (running, completed, failed, stopped)
            output: Optional recent output from the tool
        """
        room = f"scan_{scan_id}"
        
        # Prepare event data
        event_data = {
            'scanId': scan_id,
            'tool': tool,
            'progress': progress,
            'status': status,
            'timestamp': datetime.now().isoformat()
        }
        
        # Add output if available (limit to last 10 lines to avoid large payloads)
        if output:
            # Split by lines and take last 10
            output_lines = output.split('\n')
            if len(output_lines) > 10:
                output_lines = output_lines[-10:]
            
            event_data['output'] = '\n'.join(output_lines)
        
        # Emit to room
        try:
            socketio.emit('scan_progress', event_data, room=room)
            
            # Log progress updates for debugging (only on significant changes)
            if progress % 10 == 0 or status != 'running':
                logger.debug(f"Emitted progress update: scan_id={scan_id}, tool={tool}, progress={progress}, status={status}")
        except Exception as e:
            logger.error(f"Error emitting scan progress: {e}")
    
    # Return the emit_scan_progress function so it can be used by the scan manager
    return emit_scan_progress