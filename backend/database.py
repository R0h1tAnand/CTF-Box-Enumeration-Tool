"""Database initialization and configuration module."""

from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy instance
db = SQLAlchemy()

def init_db(app):
    """Initialize database with Flask app."""
    db.init_app(app)
    
def create_tables(app):
    """Create all database tables."""
    with app.app_context():
        db.create_all()

def drop_tables(app):
    """Drop all database tables."""
    with app.app_context():
        db.drop_all()

def reset_database(app):
    """Reset database by dropping and recreating all tables."""
    with app.app_context():
        db.drop_all()
        db.create_all()