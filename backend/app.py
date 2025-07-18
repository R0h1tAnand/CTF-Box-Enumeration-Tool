from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_restful import Api
from config import config
from database import db, init_db, create_tables
import os
from datetime import datetime

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
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.dashboard import dashboard_bp
    from routes.scans import scans_bp
    from routes.history import history_bp
    from routes.settings import settings_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(scans_bp, url_prefix='/api/scans')
    app.register_blueprint(history_bp, url_prefix='/api/history')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    
    # Create database tables
    create_tables(app)
    
    return app

if __name__ == '__main__':
    app = create_app()
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)