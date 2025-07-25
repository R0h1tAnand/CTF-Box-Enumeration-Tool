"""
Activity logging utility for tracking user actions.
"""
import logging
from datetime import datetime
from flask import request
from database import db
from models.activity_log import ActivityLog
from utils.cache_manager import invalidate_cache_pattern

# Configure logging
logger = logging.getLogger(__name__)

def log_activity(user_id, activity_type, description=None, ip_address=None, user_agent=None, count_only=False):
    """
    Log user activity.
    
    Args:
        user_id: User ID
        activity_type: Type of activity
        description: Description of activity
        ip_address: IP address of user
        user_agent: User agent of user
        count_only: If True, return count of activities of this type for the user
        
    Returns:
        Activity log object or count if count_only is True
    """
    try:
        # If count_only, return count of activities of this type for the user
        if count_only:
            return ActivityLog.query.filter_by(
                user_id=user_id,
                activity_type=activity_type
            ).count()
        
        # Get IP address and user agent from request if not provided
        if ip_address is None and request:
            ip_address = request.remote_addr
        
        if user_agent is None and request:
            user_agent = request.user_agent.string if request.user_agent else None
        
        # Create activity log
        activity_log = ActivityLog(
            user_id=user_id,
            activity_type=activity_type,
            description=description or '',
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=datetime.utcnow()
        )
        
        # Add to database
        db.session.add(activity_log)
        db.session.commit()
        
        # Invalidate activity logs cache
        invalidate_cache_pattern(f"activity_logs:{user_id}")
        
        return activity_log
    
    except Exception as e:
        logger.error(f"Error logging activity: {str(e)}")
        db.session.rollback()
        return None