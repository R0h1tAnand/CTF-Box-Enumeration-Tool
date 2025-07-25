from flask import Flask, jsonify, request
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_restful import Api
from config import config
from database import db, init_db, create_tables
import os
import logging
from datetime import datetime
from utils.security_headers import SecurityHeaders
from utils.ssl_config import SSLConfig
from utils.backup_scheduler import backup_scheduler

# Initialize extensions
jwt = JWTManager()
socketio = SocketIO()
cors = CORS()

# Import WebSocket handlers
from tools.websocket_handlers import init_websocket_handlers

def create_app(config_name=None):
    app = Flask(__name__)
    
    # Get configuration name from environment or use default
    config_name = config_name or os.environ.get('FLASK_ENV', 'default')
    app.config.from_object(config[config_name])
    
    # Initialize extensions with app
    init_db(app)
    jwt.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
    cors.init_app(app)
    
    # Initialize security headers
    SecurityHeaders.init_app(app)
    
    # Set up cache cleaning task
    @app.before_request
    def clean_cache():
        """Clean expired cache entries periodically."""
        from utils.cache_manager import CacheManager
        import random
        
        # Clean expired cache entries with 5% probability to avoid doing it on every request
        if random.random() < 0.05:
            removed = CacheManager.clean_expired()
            if removed > 0:
                app.logger.debug(f"Cleaned {removed} expired cache entries")
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('app.log')
        ]
    )
    
    # Global request limiter
    @app.before_request
    def limit_global_requests():
        """Limit global request rate to prevent DoS attacks."""
        from utils.rate_limiter import RateLimiter
        
        # Skip for static files
        if request.path.startswith('/static'):
            return None
        
        # Get client IP
        ip = RateLimiter.get_client_ip()
        
        # Clean old requests
        RateLimiter.clean_old_requests(ip, 60)  # 1 minute window
        
        # Check if limit exceeded (100 requests per minute)
        request_count = RateLimiter.get_request_count(ip, 60)
        
        if request_count >= 100:
            return jsonify({
                'error': True,
                'message': 'Too many requests. Please try again later.',
                'code': 'RATE_LIMIT_EXCEEDED'
            }), 429
        
        # Add request to history
        RateLimiter.add_request(ip)
    
    # Initialize WebSocket handlers
    emit_scan_progress = init_websocket_handlers(socketio)
    app.config['EMIT_SCAN_PROGRESS'] = emit_scan_progress
    
    # JWT Configuration and Callbacks
    from routes.auth import blacklisted_tokens
    
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        """Check if JWT token is in blacklist."""
        jti = jwt_payload['jti']
        return jti in blacklisted_tokens
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        """Handle expired JWT tokens."""
        return jsonify({
            'error': True,
            'message': 'Token has expired',
            'code': 'TOKEN_EXPIRED'
        }), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        """Handle invalid JWT tokens."""
        return jsonify({
            'error': True,
            'message': 'Invalid token',
            'code': 'INVALID_TOKEN'
        }), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        """Handle missing JWT tokens."""
        return jsonify({
            'error': True,
            'message': 'Authorization token is required',
            'code': 'TOKEN_REQUIRED'
        }), 401
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        """Handle revoked JWT tokens."""
        return jsonify({
            'error': True,
            'message': 'Token has been revoked',
            'code': 'TOKEN_REVOKED'
        }), 401
    
    # Initialize Flask-RESTful API
    api = Api(app)
    
    # Import models to ensure they are registered with SQLAlchemy
    from models import User, ScanHistory, UserSettings
    from models.activity_log import ActivityLog
    
    # Initialize logging and monitoring
    from utils.logger_config import setup_logging
    from utils.performance_monitor import PerformanceMonitor
    from utils.error_tracker import ErrorTracker
    
    # Set up logging
    setup_logging(app)
    
    # Initialize performance monitoring
    PerformanceMonitor.init_app(app)
    
    # Initialize error tracking
    ErrorTracker.init_app(app)
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.dashboard import dashboard_bp
    from routes.scans import scans_bp
    from routes.history import history_bp
    from routes.settings import settings_bp
    from routes.admin import admin_bp
    from routes.backup import backup_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(scans_bp, url_prefix='/api/scans')
    app.register_blueprint(history_bp, url_prefix='/api/history')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(backup_bp, url_prefix='/api/backup')
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        """Health check endpoint for monitoring."""
        try:
            # Check database connection
            db.session.execute('SELECT 1')
            
            return jsonify({
                'status': 'healthy',
                'timestamp': datetime.utcnow().isoformat(),
                'version': '1.0.0',
                'environment': app.config.get('ENV', 'unknown')
            })
        except Exception as e:
            return jsonify({
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }), 503
    
    # Create database tables
    create_tables(app)
    
    # Start backup scheduler in production
    if app.config.get('ENV') == 'production':
        backup_scheduler.start(app)
    
    return app

if __name__ == '__main__':
    app = create_app()
    
    # Configure SSL for production
    ssl_context = None
    if app.config.get('ENV') == 'production':
        ssl_context = SSLConfig.configure_ssl(app)
    
    # Determine host and port
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))
    debug = app.config.get('DEBUG', False)
    
    try:
        socketio.run(
            app, 
            debug=debug, 
            host=host, 
            port=port,
            ssl_context=ssl_context
        )
    except KeyboardInterrupt:
        # Graceful shutdown
        if app.config.get('ENV') == 'production':
            backup_scheduler.stop()
        print("\nShutting down gracefully...")