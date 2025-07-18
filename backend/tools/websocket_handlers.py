"""WebSocket handlers for real-time scan updates."""
import logging
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_jwt_extended import decode_token
from flask import request
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_websocket_handlers(socketio: SocketIO):
    """
    Initialize WebSocket event handlers.
    
    Args:
        socketio: SocketIO instance
    """
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection."""
        logger.info(f"Client connected: {request.sid}")
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection."""
        logger.info(f"Client disconnected: {request.sid}")
    
    @socketio.on('join_scan')
    def handle_join_scan(data):
        """
        Join a scan room to receive updates for a specific scan.
        
        Args:
            data: Dictionary containing scan_id and token
        """
        try:
            scan_id = data.get('scan_id')
            token = data.get('token')
            
            if not scan_id or not token:
                emit('error', {'message': 'Missing scan_id or token'})
                return
            
            # Verify token
            try:
                decoded = decode_token(token)
                user_id = decoded['sub']
            except Exception as e:
                emit('error', {'message': 'Invalid token'})
                return
            
            # Join room for this scan
            room = f"scan_{scan_id}"
            join_room(room)
            logger.info(f"Client {request.sid} joined room {room}")
            
            emit('joined_scan', {'scan_id': scan_id, 'status': 'connected'})
        
        except Exception as e:
            logger.error(f"Error in join_scan: {e}")
            emit('error', {'message': str(e)})
    
    @socketio.on('leave_scan')
    def handle_leave_scan(data):
        """
        Leave a scan room.
        
        Args:
            data: Dictionary containing scan_id
        """
        try:
            scan_id = data.get('scan_id')
            
            if not scan_id:
                emit('error', {'message': 'Missing scan_id'})
                return
            
            # Leave room for this scan
            room = f"scan_{scan_id}"
            leave_room(room)
            logger.info(f"Client {request.sid} left room {room}")
            
            emit('left_scan', {'scan_id': scan_id, 'status': 'disconnected'})
        
        except Exception as e:
            logger.error(f"Error in leave_scan: {e}")
            emit('error', {'message': str(e)})
    
    # Define function to emit scan progress updates
    def emit_scan_progress(scan_id, tool, progress, status):
        """
        Emit scan progress update to clients in the scan room.
        
        Args:
            scan_id: ID of the scan
            tool: Name of the tool
            progress: Progress percentage
            status: Status of the tool (running, completed, failed, stopped)
        """
        room = f"scan_{scan_id}"
        socketio.emit('scan_progress', {
            'scan_id': scan_id,
            'tool': tool,
            'progress': progress,
            'status': status,
            'timestamp': datetime.now().isoformat()
        }, room=room)
    
    # Return the emit_scan_progress function so it can be used by the scan manager
    return emit_scan_progress