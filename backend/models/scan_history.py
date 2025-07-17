from datetime import datetime
from database import db

class ScanHistory(db.Model):
    """Model for storing scan history and results."""
    
    __tablename__ = 'scan_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    target_ip = db.Column(db.String(45), nullable=False, index=True)
    tools_used = db.Column(db.JSON)  # List of tools used in the scan
    status = db.Column(db.String(20), default='pending', index=True)  # pending, running, completed, failed, stopped
    started_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    completed_at = db.Column(db.DateTime)
    results_path = db.Column(db.String(255))  # Path to scan results file
    scan_config = db.Column(db.JSON)  # Store scan configuration for re-running
    error_message = db.Column(db.Text)  # Store error details if scan fails
    
    def to_dict(self):
        """Convert scan history object to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'target_ip': self.target_ip,
            'tools_used': self.tools_used,
            'status': self.status,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'results_path': self.results_path,
            'scan_config': self.scan_config,
            'error_message': self.error_message
        }
    
    def update_status(self, status, error_message=None):
        """Update scan status and completion time."""
        self.status = status
        if status in ['completed', 'failed', 'stopped']:
            self.completed_at = datetime.utcnow()
        if error_message:
            self.error_message = error_message
        db.session.commit()
    
    def __repr__(self):
        return f'<ScanHistory {self.id}: {self.target_ip} - {self.status}>'