"""
Backup scheduler for automated database backups.
"""
import threading
import time
import schedule
from datetime import datetime
from flask import current_app
from utils.backup_manager import BackupManager
import logging

logger = logging.getLogger(__name__)

class BackupScheduler:
    """Handles automated backup scheduling."""
    
    def __init__(self):
        self.scheduler_thread = None
        self.running = False
    
    def start(self, app):
        """Start the backup scheduler."""
        if not app.config.get('BACKUP_ENABLED', False):
            logger.info("Backup scheduler disabled in configuration")
            return
        
        backup_interval = app.config.get('BACKUP_INTERVAL_HOURS', 24)
        
        # Schedule backup job
        schedule.every(backup_interval).hours.do(self._run_backup_job, app)
        
        # Schedule cleanup job (daily)
        schedule.every().day.at("02:00").do(self._run_cleanup_job, app)
        
        # Start scheduler thread
        self.running = True
        self.scheduler_thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        self.scheduler_thread.start()
        
        logger.info(f"Backup scheduler started with {backup_interval}h interval")
    
    def stop(self):
        """Stop the backup scheduler."""
        self.running = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        schedule.clear()
        logger.info("Backup scheduler stopped")
    
    def _scheduler_loop(self):
        """Main scheduler loop."""
        while self.running:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Scheduler error: {str(e)}")
                time.sleep(60)
    
    def _run_backup_job(self, app):
        """Run backup job with application context."""
        try:
            with app.app_context():
                logger.info("Starting scheduled backup")
                backup_path = BackupManager.create_backup()
                if backup_path:
                    logger.info(f"Scheduled backup completed: {backup_path}")
                else:
                    logger.error("Scheduled backup failed")
        except Exception as e:
            logger.error(f"Scheduled backup error: {str(e)}")
    
    def _run_cleanup_job(self, app):
        """Run cleanup job with application context."""
        try:
            with app.app_context():
                logger.info("Starting backup cleanup")
                removed_count = BackupManager.cleanup_old_backups()
                logger.info(f"Backup cleanup completed: {removed_count} files removed")
        except Exception as e:
            logger.error(f"Backup cleanup error: {str(e)}")

# Global scheduler instance
backup_scheduler = BackupScheduler()