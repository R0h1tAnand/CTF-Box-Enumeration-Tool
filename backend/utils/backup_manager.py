"""
Database backup and recovery utilities.
"""
import os
import shutil
import sqlite3
import subprocess
import gzip
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class BackupManager:
    """Manages database backups and recovery operations."""
    
    @staticmethod
    def create_backup() -> Optional[str]:
        """
        Create a backup of the database.
        
        Returns:
            Path to the backup file if successful, None otherwise
        """
        try:
            if not current_app.config.get('BACKUP_ENABLED', False):
                logger.info("Backup is disabled in configuration")
                return None
            
            backup_location = current_app.config.get('BACKUP_LOCATION')
            if not backup_location:
                logger.error("BACKUP_LOCATION not configured")
                return None
            
            # Ensure backup directory exists
            os.makedirs(backup_location, exist_ok=True)
            
            # Get database URL
            db_url = current_app.config.get('SQLALCHEMY_DATABASE_URI')
            if not db_url:
                logger.error("Database URL not configured")
                return None
            
            # Generate backup filename with timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            if db_url.startswith('sqlite:'):
                return BackupManager._backup_sqlite(db_url, backup_location, timestamp)
            elif db_url.startswith('postgresql:'):
                return BackupManager._backup_postgresql(db_url, backup_location, timestamp)
            elif db_url.startswith('mysql:'):
                return BackupManager._backup_mysql(db_url, backup_location, timestamp)
            else:
                logger.error(f"Unsupported database type: {db_url}")
                return None
                
        except Exception as e:
            logger.error(f"Backup creation failed: {str(e)}")
            return None
    
    @staticmethod
    def _backup_sqlite(db_url: str, backup_location: str, timestamp: str) -> Optional[str]:
        """Create SQLite database backup."""
        try:
            # Extract database path from URL
            db_path = db_url.replace('sqlite:///', '').replace('sqlite://', '')
            if not os.path.exists(db_path):
                logger.error(f"Database file not found: {db_path}")
                return None
            
            # Create backup filename
            backup_filename = f"backup_sqlite_{timestamp}.db.gz"
            backup_path = os.path.join(backup_location, backup_filename)
            
            # Create compressed backup
            with open(db_path, 'rb') as f_in:
                with gzip.open(backup_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            # Create metadata file
            metadata = {
                'timestamp': timestamp,
                'database_type': 'sqlite',
                'original_path': db_path,
                'backup_size': os.path.getsize(backup_path),
                'created_at': datetime.now().isoformat()
            }
            
            metadata_path = os.path.join(backup_location, f"backup_sqlite_{timestamp}.json")
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"SQLite backup created: {backup_path}")
            return backup_path
            
        except Exception as e:
            logger.error(f"SQLite backup failed: {str(e)}")
            return None
    
    @staticmethod
    def _backup_postgresql(db_url: str, backup_location: str, timestamp: str) -> Optional[str]:
        """Create PostgreSQL database backup."""
        try:
            # Create backup filename
            backup_filename = f"backup_postgresql_{timestamp}.sql.gz"
            backup_path = os.path.join(backup_location, backup_filename)
            
            # Use pg_dump to create backup
            cmd = ['pg_dump', db_url]
            
            with gzip.open(backup_path, 'wt') as f:
                result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True)
                
            if result.returncode != 0:
                logger.error(f"pg_dump failed: {result.stderr}")
                return None
            
            # Create metadata file
            metadata = {
                'timestamp': timestamp,
                'database_type': 'postgresql',
                'database_url': db_url,
                'backup_size': os.path.getsize(backup_path),
                'created_at': datetime.now().isoformat()
            }
            
            metadata_path = os.path.join(backup_location, f"backup_postgresql_{timestamp}.json")
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"PostgreSQL backup created: {backup_path}")
            return backup_path
            
        except Exception as e:
            logger.error(f"PostgreSQL backup failed: {str(e)}")
            return None
    
    @staticmethod
    def _backup_mysql(db_url: str, backup_location: str, timestamp: str) -> Optional[str]:
        """Create MySQL database backup."""
        try:
            # Parse MySQL URL to extract connection parameters
            # Format: mysql://username:password@host:port/database
            import urllib.parse
            parsed = urllib.parse.urlparse(db_url)
            
            # Create backup filename
            backup_filename = f"backup_mysql_{timestamp}.sql.gz"
            backup_path = os.path.join(backup_location, backup_filename)
            
            # Build mysqldump command
            cmd = [
                'mysqldump',
                f'--host={parsed.hostname}',
                f'--port={parsed.port or 3306}',
                f'--user={parsed.username}',
                f'--password={parsed.password}',
                '--single-transaction',
                '--routines',
                '--triggers',
                parsed.path.lstrip('/')
            ]
            
            with gzip.open(backup_path, 'wt') as f:
                result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True)
                
            if result.returncode != 0:
                logger.error(f"mysqldump failed: {result.stderr}")
                return None
            
            # Create metadata file
            metadata = {
                'timestamp': timestamp,
                'database_type': 'mysql',
                'database_url': db_url,
                'backup_size': os.path.getsize(backup_path),
                'created_at': datetime.now().isoformat()
            }
            
            metadata_path = os.path.join(backup_location, f"backup_mysql_{timestamp}.json")
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"MySQL backup created: {backup_path}")
            return backup_path
            
        except Exception as e:
            logger.error(f"MySQL backup failed: {str(e)}")
            return None
    
    @staticmethod
    def list_backups() -> List[Dict]:
        """
        List all available backups.
        
        Returns:
            List of backup information dictionaries
        """
        try:
            backup_location = current_app.config.get('BACKUP_LOCATION')
            if not backup_location or not os.path.exists(backup_location):
                return []
            
            backups = []
            for filename in os.listdir(backup_location):
                if filename.endswith('.json') and filename.startswith('backup_'):
                    metadata_path = os.path.join(backup_location, filename)
                    try:
                        with open(metadata_path, 'r') as f:
                            metadata = json.load(f)
                            backups.append(metadata)
                    except Exception as e:
                        logger.warning(f"Failed to read backup metadata {filename}: {str(e)}")
            
            # Sort by creation time (newest first)
            backups.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            return backups
            
        except Exception as e:
            logger.error(f"Failed to list backups: {str(e)}")
            return []
    
    @staticmethod
    def cleanup_old_backups() -> int:
        """
        Remove old backups based on retention policy.
        
        Returns:
            Number of backups removed
        """
        try:
            backup_location = current_app.config.get('BACKUP_LOCATION')
            retention_days = current_app.config.get('BACKUP_RETENTION_DAYS', 30)
            
            if not backup_location or not os.path.exists(backup_location):
                return 0
            
            cutoff_date = datetime.now() - timedelta(days=retention_days)
            removed_count = 0
            
            for filename in os.listdir(backup_location):
                if filename.startswith('backup_'):
                    file_path = os.path.join(backup_location, filename)
                    
                    # Check file modification time
                    file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                    
                    if file_mtime < cutoff_date:
                        try:
                            os.remove(file_path)
                            removed_count += 1
                            logger.info(f"Removed old backup: {filename}")
                        except Exception as e:
                            logger.warning(f"Failed to remove backup {filename}: {str(e)}")
            
            return removed_count
            
        except Exception as e:
            logger.error(f"Backup cleanup failed: {str(e)}")
            return 0
    
    @staticmethod
    def restore_backup(backup_timestamp: str) -> bool:
        """
        Restore database from backup.
        
        Args:
            backup_timestamp: Timestamp of the backup to restore
            
        Returns:
            True if restore was successful, False otherwise
        """
        try:
            backup_location = current_app.config.get('BACKUP_LOCATION')
            if not backup_location:
                logger.error("BACKUP_LOCATION not configured")
                return False
            
            # Find metadata file
            metadata_path = None
            for filename in os.listdir(backup_location):
                if filename == f"backup_sqlite_{backup_timestamp}.json":
                    metadata_path = os.path.join(backup_location, filename)
                    break
                elif filename == f"backup_postgresql_{backup_timestamp}.json":
                    metadata_path = os.path.join(backup_location, filename)
                    break
                elif filename == f"backup_mysql_{backup_timestamp}.json":
                    metadata_path = os.path.join(backup_location, filename)
                    break
            
            if not metadata_path:
                logger.error(f"Backup metadata not found for timestamp: {backup_timestamp}")
                return False
            
            # Load metadata
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            db_type = metadata.get('database_type')
            
            if db_type == 'sqlite':
                return BackupManager._restore_sqlite(backup_location, backup_timestamp, metadata)
            elif db_type == 'postgresql':
                return BackupManager._restore_postgresql(backup_location, backup_timestamp, metadata)
            elif db_type == 'mysql':
                return BackupManager._restore_mysql(backup_location, backup_timestamp, metadata)
            else:
                logger.error(f"Unsupported database type for restore: {db_type}")
                return False
                
        except Exception as e:
            logger.error(f"Backup restore failed: {str(e)}")
            return False
    
    @staticmethod
    def _restore_sqlite(backup_location: str, timestamp: str, metadata: Dict) -> bool:
        """Restore SQLite database from backup."""
        try:
            backup_path = os.path.join(backup_location, f"backup_sqlite_{timestamp}.db.gz")
            if not os.path.exists(backup_path):
                logger.error(f"Backup file not found: {backup_path}")
                return False
            
            # Get current database path
            db_url = current_app.config.get('SQLALCHEMY_DATABASE_URI')
            db_path = db_url.replace('sqlite:///', '').replace('sqlite://', '')
            
            # Create backup of current database
            if os.path.exists(db_path):
                backup_current = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                shutil.copy2(db_path, backup_current)
                logger.info(f"Current database backed up to: {backup_current}")
            
            # Restore from backup
            with gzip.open(backup_path, 'rb') as f_in:
                with open(db_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            logger.info(f"SQLite database restored from backup: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"SQLite restore failed: {str(e)}")
            return False
    
    @staticmethod
    def _restore_postgresql(backup_location: str, timestamp: str, metadata: Dict) -> bool:
        """Restore PostgreSQL database from backup."""
        try:
            backup_path = os.path.join(backup_location, f"backup_postgresql_{timestamp}.sql.gz")
            if not os.path.exists(backup_path):
                logger.error(f"Backup file not found: {backup_path}")
                return False
            
            db_url = current_app.config.get('SQLALCHEMY_DATABASE_URI')
            
            # Use psql to restore backup
            with gzip.open(backup_path, 'rt') as f:
                cmd = ['psql', db_url]
                result = subprocess.run(cmd, stdin=f, stderr=subprocess.PIPE, text=True)
                
            if result.returncode != 0:
                logger.error(f"psql restore failed: {result.stderr}")
                return False
            
            logger.info(f"PostgreSQL database restored from backup: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"PostgreSQL restore failed: {str(e)}")
            return False
    
    @staticmethod
    def _restore_mysql(backup_location: str, timestamp: str, metadata: Dict) -> bool:
        """Restore MySQL database from backup."""
        try:
            backup_path = os.path.join(backup_location, f"backup_mysql_{timestamp}.sql.gz")
            if not os.path.exists(backup_path):
                logger.error(f"Backup file not found: {backup_path}")
                return False
            
            db_url = current_app.config.get('SQLALCHEMY_DATABASE_URI')
            
            # Parse MySQL URL
            import urllib.parse
            parsed = urllib.parse.urlparse(db_url)
            
            # Build mysql command
            cmd = [
                'mysql',
                f'--host={parsed.hostname}',
                f'--port={parsed.port or 3306}',
                f'--user={parsed.username}',
                f'--password={parsed.password}',
                parsed.path.lstrip('/')
            ]
            
            with gzip.open(backup_path, 'rt') as f:
                result = subprocess.run(cmd, stdin=f, stderr=subprocess.PIPE, text=True)
                
            if result.returncode != 0:
                logger.error(f"mysql restore failed: {result.stderr}")
                return False
            
            logger.info(f"MySQL database restored from backup: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"MySQL restore failed: {str(e)}")
            return False