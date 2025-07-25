"""
Error tracking utilities for the application.
"""
import logging
import traceback
import json
import os
from datetime import datetime
from flask import request, g, has_request_context
from functools import wraps

# Configure logging
logger = logging.getLogger(__name__)

class ErrorTracker:
    """Error tracking for the application."""
    
    # Store error counts
    error_counts = {}
    
    @staticmethod
    def init_app(app):
        """
        Initialize error tracking for a Flask application.
        
        Args:
            app: Flask application instance
        """
        # Create error logs directory if it doesn't exist
        error_logs_dir = os.path.join(app.root_path, 'logs', 'errors')
        os.makedirs(error_logs_dir, exist_ok=True)
        
        # Set up error handler
        @app.errorhandler(Exception)
        def handle_exception(e):
            """Handle uncaught exceptions."""
            # Log the error
            ErrorTracker.log_error(e)
            
            # Return error response
            return {
                'error': True,
                'message': 'Internal server error',
                'code': 'SERVER_ERROR'
            }, 500
    
    @staticmethod
    def log_error(error, additional_info=None):
        """
        Log an error with details.
        
        Args:
            error: Exception object
            additional_info: Additional information to log
        """
        try:
            # Get error details
            error_type = type(error).__name__
            error_message = str(error)
            stack_trace = traceback.format_exc()
            
            # Update error count
            if error_type in ErrorTracker.error_counts:
                ErrorTracker.error_counts[error_type] += 1
            else:
                ErrorTracker.error_counts[error_type] = 1
            
            # Create error log entry
            error_log = {
                'timestamp': datetime.now().isoformat(),
                'error_type': error_type,
                'error_message': error_message,
                'stack_trace': stack_trace,
                'count': ErrorTracker.error_counts[error_type]
            }
            
            # Add request information if available
            if has_request_context():
                error_log['request'] = {
                    'url': request.url,
                    'method': request.method,
                    'remote_addr': request.remote_addr,
                    'user_agent': request.user_agent.string if request.user_agent else None,
                    'user_id': getattr(g, 'user_id', None)
                }
            
            # Add additional information if provided
            if additional_info:
                error_log['additional_info'] = additional_info
            
            # Log the error
            logger.error(
                f"Error: {error_type} - {error_message}\n"
                f"Stack trace: {stack_trace}\n"
                f"Count: {ErrorTracker.error_counts[error_type]}"
            )
            
            # Write error to file
            from flask import current_app
            if current_app:
                error_logs_dir = os.path.join(current_app.root_path, 'logs', 'errors')
                os.makedirs(error_logs_dir, exist_ok=True)
                
                error_file = os.path.join(
                    error_logs_dir,
                    f"{datetime.now().strftime('%Y%m%d')}_{error_type}.log"
                )
                
                with open(error_file, 'a') as f:
                    f.write(json.dumps(error_log) + '\n')
        
        except Exception as e:
            # Fallback logging if error tracking fails
            logger.error(f"Error tracking failed: {str(e)}")
            logger.error(f"Original error: {str(error)}")
    
    @staticmethod
    def get_error_counts():
        """
        Get current error counts.
        
        Returns:
            Dict with error counts
        """
        return ErrorTracker.error_counts.copy()

def catch_errors(func):
    """
    Decorator to catch and log errors.
    
    Args:
        func: Function to decorate
        
    Returns:
        Decorated function
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            # Log the error
            ErrorTracker.log_error(e)
            
            # Re-raise the exception
            raise
    
    return wrapper