"""Database initialization and configuration module."""

from flask_sqlalchemy import SQLAlchemy
import logging
import time
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize SQLAlchemy instance with query performance tracking
db = SQLAlchemy()

# Enable query performance logging
@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Log query execution time - start timer."""
    conn.info.setdefault('query_start_time', []).append(time.time())

@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Log query execution time - calculate duration."""
    total = time.time() - conn.info['query_start_time'].pop()
    
    # Log slow queries (> 100ms)
    if total > 0.1:
        logger.warning(f"SLOW QUERY: {total:.3f}s - {statement}")
    
    # Log all queries in debug mode
    logger.debug(f"Query executed in {total:.3f}s - {statement}")

def init_db(app):
    """Initialize database with Flask app."""
    # Configure SQLAlchemy for performance
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Only configure pool options for non-SQLite databases
    database_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    if not database_uri.startswith('sqlite'):
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_size': 10,
            'max_overflow': 20,
            'pool_timeout': 30,
            'pool_recycle': 1800,  # Recycle connections after 30 minutes
        }
    else:
        # SQLite-specific configuration
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_recycle': 1800,
        }
    
    db.init_app(app)
    
def create_tables(app):
    """Create all database tables."""
    with app.app_context():
        try:
            db.create_all()
            logger.info("Database tables created successfully")
        except SQLAlchemyError as e:
            logger.error(f"Error creating database tables: {str(e)}")
            raise

def drop_tables(app):
    """Drop all database tables."""
    with app.app_context():
        try:
            db.drop_all()
            logger.info("Database tables dropped successfully")
        except SQLAlchemyError as e:
            logger.error(f"Error dropping database tables: {str(e)}")
            raise

def reset_database(app):
    """Reset database by dropping and recreating all tables."""
    with app.app_context():
        try:
            db.drop_all()
            db.create_all()
            logger.info("Database reset successfully")
        except SQLAlchemyError as e:
            logger.error(f"Error resetting database: {str(e)}")
            raise

def optimize_database(app):
    """Optimize database by analyzing tables and updating statistics."""
    with app.app_context():
        try:
            # For SQLite, run VACUUM to optimize the database
            db.engine.execute("VACUUM;")
            db.engine.execute("ANALYZE;")
            logger.info("Database optimized successfully")
        except SQLAlchemyError as e:
            logger.error(f"Error optimizing database: {str(e)}")
            raise