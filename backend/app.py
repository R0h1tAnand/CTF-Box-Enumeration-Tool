from flask import Flask
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_restful import Api
from config import config
from database import db, init_db, create_tables
import os

# Initialize extensions
jwt = JWTManager()
socketio = SocketIO()
cors = CORS()

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