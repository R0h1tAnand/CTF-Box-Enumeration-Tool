"""
Migration script to add the activity_logs table.
Run this script after adding the ActivityLog model.
"""

import os
import sys
from flask import Flask
from database import db, init_db
from config import config
from models.activity_log import ActivityLog

def create_app():
    app = Flask(__name__)
    app.config.from_object(config['default'])
    init_db(app)
    return app

def migrate_activity_logs():
    """Create the activity_logs table."""
    app = create_app()
    
    with app.app_context():
        print("Creating activity_logs table...")
        db.create_all(tables=[ActivityLog.__table__])
        print("Activity logs table created successfully.")

if __name__ == '__main__':
    migrate_activity_logs()