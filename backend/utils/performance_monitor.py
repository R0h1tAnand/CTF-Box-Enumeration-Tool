"""
Performance monitoring utilities for the application.
"""
import time
import logging
import functools
import threading
import psutil
import os
from datetime import datetime
from flask import g, request, current_app
from sqlalchemy import event
from sqlalchemy.engine import Engine

# Configure logging
logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """Performance monitoring for the application."""
    
    # Store performance metrics
    metrics = {
        'requests': {
            'total': 0,
            'success': 0,
            'error': 0,
            'avg_time': 0,
            'max_time': 0,
            'min_time': float('inf')
        },
        'database': {
            'queries': 0,
            'slow_queries': 0,
            'avg_query_time': 0,
            'max_query_time': 0
        },
        'system': {
            'cpu_percent': 0,
            'memory_percent': 0,
            'disk_usage_percent': 0,
            'start_time': datetime.now().isoformat()
        },
        'errors': {
            'total': 0,
            'by_code': {}
        }
    }
    
    # Lock for thread-safe updates
    _lock = threading.RLock()
    
    @staticmethod
    def init_app(app):
        """
        Initialize performance monitoring for a Flask application.
        
        Args:
            app: Flask application instance
        """
        # Set up request monitoring
        @app.before_request
        def before_request():
            """Record request start time."""
            g.start_time = time.time()
        
        @app.after_request
        def after_request(response):
            """Record request metrics."""
            if hasattr(g, 'start_time'):
                # Calculate request time
                request_time = time.time() - g.start_time
                
                with PerformanceMonitor._lock:
                    # Update request metrics
                    PerformanceMonitor.metrics['requests']['total'] += 1
                    
                    if response.status_code < 400:
                        PerformanceMonitor.metrics['requests']['success'] += 1
                    else:
                        PerformanceMonitor.metrics['requests']['error'] += 1
                        
                        # Update error metrics
                        PerformanceMonitor.metrics['errors']['total'] += 1
                        status_code = str(response.status_code)
                        if status_code in PerformanceMonitor.metrics['errors']['by_code']:
                            PerformanceMonitor.metrics['errors']['by_code'][status_code] += 1
                        else:
                            PerformanceMonitor.metrics['errors']['by_code'][status_code] = 1
                    
                    # Update timing metrics
                    current_avg = PerformanceMonitor.metrics['requests']['avg_time']
                    current_count = PerformanceMonitor.metrics['requests']['total']
                    
                    # Calculate new average
                    new_avg = ((current_avg * (current_count - 1)) + request_time) / current_count
                    PerformanceMonitor.metrics['requests']['avg_time'] = new_avg
                    
                    # Update max and min
                    if request_time > PerformanceMonitor.metrics['requests']['max_time']:
                        PerformanceMonitor.metrics['requests']['max_time'] = request_time
                    
                    if request_time < PerformanceMonitor.metrics['requests']['min_time']:
                        PerformanceMonitor.metrics['requests']['min_time'] = request_time
                
                # Log slow requests (> 1 second)
                if request_time > 1.0:
                    logger.warning(f"SLOW REQUEST: {request.method} {request.path} took {request_time:.3f}s")
            
            return response
        
        # Set up database query monitoring
        @event.listens_for(Engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            """Record query start time."""
            conn.info.setdefault('query_start_time', []).append(time.time())
        
        @event.listens_for(Engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            """Record query metrics."""
            query_time = time.time() - conn.info['query_start_time'].pop()
            
            with PerformanceMonitor._lock:
                # Update query metrics
                PerformanceMonitor.metrics['database']['queries'] += 1
                
                # Update slow query count
                if query_time > 0.1:  # Slow query threshold: 100ms
                    PerformanceMonitor.metrics['database']['slow_queries'] += 1
                
                # Update timing metrics
                current_avg = PerformanceMonitor.metrics['database']['avg_query_time']
                current_count = PerformanceMonitor.metrics['database']['queries']
                
                # Calculate new average
                new_avg = ((current_avg * (current_count - 1)) + query_time) / current_count
                PerformanceMonitor.metrics['database']['avg_query_time'] = new_avg
                
                # Update max
                if query_time > PerformanceMonitor.metrics['database']['max_query_time']:
                    PerformanceMonitor.metrics['database']['max_query_time'] = query_time
        
        # Set up system monitoring
        def update_system_metrics():
            """Update system metrics."""
            try:
                with PerformanceMonitor._lock:
                    # Update CPU usage
                    PerformanceMonitor.metrics['system']['cpu_percent'] = psutil.cpu_percent()
                    
                    # Update memory usage
                    memory = psutil.virtual_memory()
                    PerformanceMonitor.metrics['system']['memory_percent'] = memory.percent
                    
                    # Update disk usage
                    disk = psutil.disk_usage('/')
                    PerformanceMonitor.metrics['system']['disk_usage_percent'] = disk.percent
            except Exception as e:
                logger.error(f"Error updating system metrics: {str(e)}")
        
        # Schedule system metrics update
        @app.before_request
        def update_system_metrics_periodically():
            """Update system metrics periodically."""
            # Update with 1% probability to avoid doing it on every request
            import random
            if random.random() < 0.01:
                update_system_metrics()
        
        # Create metrics endpoint
        @app.route('/api/admin/metrics', methods=['GET'])
        def get_metrics():
            """Get performance metrics."""
            from flask import jsonify
            from flask_jwt_extended import jwt_required, get_jwt_identity
            
            @jwt_required()
            def protected_metrics():
                # Check if user is admin
                user_id = get_jwt_identity()
                from models.user import User
                user = User.query.get(user_id)
                
                if not user or not getattr(user, 'is_admin', False):
                    return jsonify({'error': 'Unauthorized'}), 403
                
                # Update system metrics before returning
                update_system_metrics()
                
                # Return metrics
                return jsonify(PerformanceMonitor.metrics)
            
            return protected_metrics()
    
    @staticmethod
    def get_metrics():
        """
        Get current performance metrics.
        
        Returns:
            Dict with performance metrics
        """
        with PerformanceMonitor._lock:
            return PerformanceMonitor.metrics.copy()
    
    @staticmethod
    def reset_metrics():
        """Reset performance metrics."""
        with PerformanceMonitor._lock:
            PerformanceMonitor.metrics = {
                'requests': {
                    'total': 0,
                    'success': 0,
                    'error': 0,
                    'avg_time': 0,
                    'max_time': 0,
                    'min_time': float('inf')
                },
                'database': {
                    'queries': 0,
                    'slow_queries': 0,
                    'avg_query_time': 0,
                    'max_query_time': 0
                },
                'system': {
                    'cpu_percent': 0,
                    'memory_percent': 0,
                    'disk_usage_percent': 0,
                    'start_time': datetime.now().isoformat()
                },
                'errors': {
                    'total': 0,
                    'by_code': {}
                }
            }

def measure_execution_time(func):
    """
    Decorator to measure function execution time.
    
    Args:
        func: Function to measure
        
    Returns:
        Decorated function
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        execution_time = time.time() - start_time
        
        # Log execution time
        logger.debug(f"{func.__name__} executed in {execution_time:.6f}s")
        
        return result
    
    return wrapper