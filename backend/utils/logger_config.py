"""
Logging configuration for the application.
"""
import os
import logging
import logging.handlers
import time
from datetime import datetime
from flask import request, g, has_request_context

class RequestFormatter(logging.Formatter):
    """Custom formatter that includes request information."""
    
    def format(self, record):
        """Format log record with request information."""
        if has_request_context():
            record.url = request.url
            record.method = request.method
            record.remote_addr = request.remote_addr
            record.user_id = getattr(g, 'user_id', None)
        else:
            record.url = None
            record.method = None
            record.remote_addr = None
            record.user_id = None
        
        return super().format(record)

def setup_logging(app):
    """
    Set up logging for the application.
    
    Args:
        app: Flask application instance
    """
    # Create logs directory if it doesn't exist
    logs_dir = os.path.join(app.root_path, 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Clear existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create formatters
    console_formatter = RequestFormatter(
        '[%(asctime)s] [%(levelname)s] [%(remote_addr)s] [%(user_id)s] %(message)s'
    )
    
    file_formatter = RequestFormatter(
        '[%(asctime)s] [%(levelname)s] [%(remote_addr)s] [%(user_id)s] '
        '[%(url)s] [%(method)s] [%(name)s:%(lineno)d] %(message)s'
    )
    
    # Create console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # Create file handlers
    # General log file
    general_log_file = os.path.join(logs_dir, 'app.log')
    general_handler = logging.handlers.RotatingFileHandler(
        general_log_file, maxBytes=10485760, backupCount=10
    )
    general_handler.setLevel(logging.INFO)
    general_handler.setFormatter(file_formatter)
    root_logger.addHandler(general_handler)
    
    # Error log file
    error_log_file = os.path.join(logs_dir, 'error.log')
    error_handler = logging.handlers.RotatingFileHandler(
        error_log_file, maxBytes=10485760, backupCount=10
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(file_formatter)
    root_logger.addHandler(error_handler)
    
    # Access log file
    access_log_file = os.path.join(logs_dir, 'access.log')
    access_handler = logging.handlers.RotatingFileHandler(
        access_log_file, maxBytes=10485760, backupCount=10
    )
    access_handler.setLevel(logging.INFO)
    access_handler.setFormatter(file_formatter)
    
    # Create security log file
    security_log_file = os.path.join(logs_dir, 'security.log')
    security_handler = logging.handlers.RotatingFileHandler(
        security_log_file, maxBytes=10485760, backupCount=10
    )
    security_handler.setLevel(logging.INFO)
    security_handler.setFormatter(file_formatter)
    
    # Create loggers for specific modules
    access_logger = logging.getLogger('access')
    access_logger.setLevel(logging.INFO)
    access_logger.addHandler(access_handler)
    access_logger.propagate = False
    
    security_logger = logging.getLogger('security')
    security_logger.setLevel(logging.INFO)
    security_logger.addHandler(security_handler)
    security_logger.propagate = False
    
    # Set up request logging
    @app.before_request
    def before_request():
        """Log request start time."""
        g.start_time = time.time()
        g.user_id = None
    
    @app.after_request
    def after_request(response):
        """Log request details."""
        if hasattr(g, 'start_time'):
            elapsed = time.time() - g.start_time
            
            # Get user ID from JWT if available
            from flask_jwt_extended import get_jwt_identity
            try:
                g.user_id = get_jwt_identity()
            except:
                g.user_id = None
            
            # Log request details
            access_logger.info(
                f"{request.method} {request.path} {response.status_code} "
                f"{elapsed:.6f}s {request.remote_addr} {g.user_id}"
            )
            
            # Log security events
            if response.status_code in [401, 403, 429]:
                security_logger.warning(
                    f"Security event: {request.method} {request.path} "
                    f"{response.status_code} {request.remote_addr} {g.user_id}"
                )
        
        return response
    
    # Log application startup
    app.logger.info(f"Application started at {datetime.now().isoformat()}")
    
    return root_logger