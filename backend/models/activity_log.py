from datetime import datetime
from database import db

class ActivityLog(db.Model):
    """Activity log model for tracking user security events."""
    
    __tablename__ = 'activity_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    activity_type = db.Column(db.String(50), nullable=False, index=True)
    description = db.Column(db.String(255), nullable=False)
    ip_address = db.Column(db.String(45), index=True)
    user_agent = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Define composite indexes for common query patterns
    __table_args__ = (
        db.Index('idx_user_activity_time', 'user_id', 'activity_type', 'created_at'),
        db.Index('idx_activity_time', 'activity_type', 'created_at'),
    )
    
    # Relationship
    user = db.relationship('User', backref=db.backref('activity_logs', lazy=True, cascade='all, delete-orphan'))
    
    def to_dict(self):
        """Convert activity log object to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'activity_type': self.activity_type,
            'description': self.description,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<ActivityLog {self.id}: {self.activity_type}>'