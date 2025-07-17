from database import db

class UserSettings(db.Model):
    """Model for storing user preferences and settings."""
    
    __tablename__ = 'user_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    theme = db.Column(db.String(10), default='dark')  # 'dark' or 'light'
    default_tools = db.Column(db.JSON, default=lambda: ['nmap'])  # Default tools to select
    notifications_enabled = db.Column(db.Boolean, default=True)
    default_wordlist = db.Column(db.String(255))  # Path to default wordlist
    auto_export = db.Column(db.Boolean, default=False)  # Auto-export scan results
    
    def to_dict(self):
        """Convert user settings object to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'theme': self.theme,
            'default_tools': self.default_tools,
            'notifications_enabled': self.notifications_enabled,
            'default_wordlist': self.default_wordlist,
            'auto_export': self.auto_export
        }
    
    def update_settings(self, **kwargs):
        """Update user settings with provided values."""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        db.session.commit()
    
    def __repr__(self):
        return f'<UserSettings for User {self.user_id}>'