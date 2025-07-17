#!/usr/bin/env python3
"""Database migration script for the Cybersecurity Toolkit Platform."""

import os
import sys
from datetime import datetime

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from database import db
from models import User, ScanHistory, UserSettings

class DatabaseMigration:
    """Base class for database migrations."""
    
    def __init__(self, app):
        self.app = app
        self.db = db
    
    def execute(self):
        """Execute the migration."""
        raise NotImplementedError("Subclasses must implement execute method")
    
    def rollback(self):
        """Rollback the migration."""
        raise NotImplementedError("Subclasses must implement rollback method")

class Migration001_AddIndexes(DatabaseMigration):
    """Migration to add database indexes for better performance."""
    
    def execute(self):
        """Add indexes to improve query performance."""
        with self.app.app_context():
            try:
                # Add indexes using raw SQL since SQLAlchemy declarative indexes are already defined
                # This migration serves as an example for future schema changes
                
                # Check if indexes already exist (they should from model definitions)
                result = self.db.engine.execute(
                    "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'ix_%'"
                )
                existing_indexes = [row[0] for row in result]
                
                print(f"Found {len(existing_indexes)} existing indexes:")
                for idx in existing_indexes:
                    print(f"  - {idx}")
                
                print("Index migration completed (indexes already exist from model definitions)")
                return True
                
            except Exception as e:
                print(f"Migration failed: {e}")
                return False
    
    def rollback(self):
        """Remove the added indexes."""
        print("Rollback not needed for index migration")
        return True

class Migration002_AddScanResultsColumns(DatabaseMigration):
    """Example migration to add new columns to scan_history table."""
    
    def execute(self):
        """Add new columns for enhanced scan results."""
        with self.app.app_context():
            try:
                # Check if columns already exist
                inspector = db.inspect(db.engine)
                columns = [col['name'] for col in inspector.get_columns('scan_history')]
                
                if 'scan_duration' not in columns:
                    # Add scan_duration column
                    db.engine.execute(
                        'ALTER TABLE scan_history ADD COLUMN scan_duration INTEGER'
                    )
                    print("Added scan_duration column")
                
                if 'result_size' not in columns:
                    # Add result_size column
                    db.engine.execute(
                        'ALTER TABLE scan_history ADD COLUMN result_size INTEGER'
                    )
                    print("Added result_size column")
                
                print("Migration 002 completed successfully")
                return True
                
            except Exception as e:
                print(f"Migration 002 failed: {e}")
                return False
    
    def rollback(self):
        """Remove the added columns."""
        with self.app.app_context():
            try:
                # SQLite doesn't support DROP COLUMN, so we'd need to recreate the table
                # For now, just mark as not supported
                print("Rollback not supported for SQLite ALTER TABLE operations")
                return False
            except Exception as e:
                print(f"Rollback failed: {e}")
                return False

# Registry of available migrations
MIGRATIONS = {
    '001': Migration001_AddIndexes,
    '002': Migration002_AddScanResultsColumns,
}

def list_migrations():
    """List all available migrations."""
    print("Available migrations:")
    for migration_id, migration_class in MIGRATIONS.items():
        print(f"  {migration_id}: {migration_class.__doc__.strip()}")

def run_migration(migration_id):
    """Run a specific migration."""
    if migration_id not in MIGRATIONS:
        print(f"Migration {migration_id} not found")
        return False
    
    app = create_app()
    migration_class = MIGRATIONS[migration_id]
    migration = migration_class(app)
    
    print(f"Running migration {migration_id}...")
    success = migration.execute()
    
    if success:
        print(f"Migration {migration_id} completed successfully")
    else:
        print(f"Migration {migration_id} failed")
    
    return success

def rollback_migration(migration_id):
    """Rollback a specific migration."""
    if migration_id not in MIGRATIONS:
        print(f"Migration {migration_id} not found")
        return False
    
    app = create_app()
    migration_class = MIGRATIONS[migration_id]
    migration = migration_class(app)
    
    print(f"Rolling back migration {migration_id}...")
    success = migration.rollback()
    
    if success:
        print(f"Migration {migration_id} rolled back successfully")
    else:
        print(f"Migration {migration_id} rollback failed")
    
    return success

def run_all_migrations():
    """Run all available migrations."""
    print("Running all migrations...")
    
    for migration_id in sorted(MIGRATIONS.keys()):
        success = run_migration(migration_id)
        if not success:
            print(f"Stopping at failed migration {migration_id}")
            return False
    
    print("All migrations completed successfully")
    return True

def main():
    """Main function to handle command line arguments."""
    if len(sys.argv) < 2:
        print("Usage: python migrate_db.py [command] [migration_id]")
        print("Commands:")
        print("  list                    - List available migrations")
        print("  run [migration_id]      - Run specific migration")
        print("  rollback [migration_id] - Rollback specific migration")
        print("  run-all                 - Run all migrations")
        return
    
    command = sys.argv[1].lower()
    
    if command == 'list':
        list_migrations()
    elif command == 'run':
        if len(sys.argv) < 3:
            print("Please specify migration ID")
            return
        run_migration(sys.argv[2])
    elif command == 'rollback':
        if len(sys.argv) < 3:
            print("Please specify migration ID")
            return
        rollback_migration(sys.argv[2])
    elif command == 'run-all':
        run_all_migrations()
    else:
        print(f"Unknown command: {command}")

if __name__ == '__main__':
    main()