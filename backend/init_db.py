#!/usr/bin/env python3
"""Database initialization script for the Cybersecurity Toolkit Platform."""

import os
import sys
from datetime import datetime
from werkzeug.security import generate_password_hash

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from database import db, create_tables, drop_tables, reset_database
from models import User, ScanHistory, UserSettings

def init_database():
    """Initialize the database with tables."""
    app = create_app()
    
    with app.app_context():
        print("Creating database tables...")
        create_tables(app)
        print("Database tables created successfully!")

def reset_database_with_confirmation():
    """Reset the database after user confirmation."""
    app = create_app()
    
    response = input("This will delete all existing data. Are you sure? (yes/no): ")
    if response.lower() != 'yes':
        print("Database reset cancelled.")
        return
    
    with app.app_context():
        print("Resetting database...")
        reset_database(app)
        print("Database reset successfully!")

def create_admin_user():
    """Create an admin user for testing purposes."""
    app = create_app()
    
    with app.app_context():
        # Check if admin user already exists
        admin_user = User.query.filter_by(username='admin').first()
        if admin_user:
            print("Admin user already exists!")
            return
        
        # Create admin user
        admin = User(
            username='admin',
            email='admin@cybertoolkit.local',
            is_active=True
        )
        admin.set_password('admin123')  # Change this in production!
        
        db.session.add(admin)
        db.session.commit()
        
        # Create default settings for admin user
        admin_settings = UserSettings(
            user_id=admin.id,
            theme='dark',
            default_tools=['nmap', 'gobuster'],
            notifications_enabled=True,
            auto_export=False
        )
        
        db.session.add(admin_settings)
        db.session.commit()
        
        print(f"Admin user created successfully!")
        print(f"Username: admin")
        print(f"Password: admin123")
        print(f"Email: admin@cybertoolkit.local")

def create_sample_data():
    """Create sample data for testing purposes."""
    app = create_app()
    
    with app.app_context():
        # Check if sample user already exists
        sample_user = User.query.filter_by(username='testuser').first()
        if sample_user:
            print("Sample data already exists!")
            return
        
        # Create sample user
        user = User(
            username='testuser',
            email='test@cybertoolkit.local',
            is_active=True
        )
        user.set_password('password123')
        
        db.session.add(user)
        db.session.commit()
        
        # Create user settings
        user_settings = UserSettings(
            user_id=user.id,
            theme='light',
            default_tools=['nmap'],
            notifications_enabled=True,
            auto_export=True
        )
        
        db.session.add(user_settings)
        db.session.commit()
        
        # Create sample scan history
        sample_scan = ScanHistory(
            user_id=user.id,
            target_ip='192.168.1.1',
            tools_used=['nmap'],
            status='completed',
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
            scan_config={
                'nmap_options': '-sS -O',
                'ports': '1-1000'
            }
        )
        
        db.session.add(sample_scan)
        db.session.commit()
        
        print("Sample data created successfully!")
        print(f"Test user: testuser / password123")

def check_database_status():
    """Check the current status of the database."""
    app = create_app()
    
    with app.app_context():
        try:
            # Check if tables exist by querying them
            user_count = User.query.count()
            scan_count = ScanHistory.query.count()
            settings_count = UserSettings.query.count()
            
            print("Database Status:")
            print(f"- Users: {user_count}")
            print(f"- Scan History Records: {scan_count}")
            print(f"- User Settings: {settings_count}")
            print("Database is accessible and tables exist.")
            
        except Exception as e:
            print(f"Database error: {e}")
            print("Database may not be initialized properly.")

def main():
    """Main function to handle command line arguments."""
    if len(sys.argv) < 2:
        print("Usage: python init_db.py [command]")
        print("Commands:")
        print("  init        - Initialize database tables")
        print("  reset       - Reset database (delete all data)")
        print("  admin       - Create admin user")
        print("  sample      - Create sample data")
        print("  status      - Check database status")
        return
    
    command = sys.argv[1].lower()
    
    if command == 'init':
        init_database()
    elif command == 'reset':
        reset_database_with_confirmation()
    elif command == 'admin':
        create_admin_user()
    elif command == 'sample':
        create_sample_data()
    elif command == 'status':
        check_database_status()
    else:
        print(f"Unknown command: {command}")
        print("Use 'python init_db.py' without arguments to see available commands.")

if __name__ == '__main__':
    main()