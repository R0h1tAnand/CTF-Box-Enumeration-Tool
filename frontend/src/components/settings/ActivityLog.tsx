import React, { useState, useEffect } from 'react';
import { settingsService } from '../../services/settingsService';
import { ActivityLog as ActivityLogType } from '../../types/settings';
import './ActivityLog.css';

export const ActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    page: 1,
    per_page: 10,
    has_next: false,
    has_prev: false
  });

  useEffect(() => {
    fetchActivityLogs();
  }, [page]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const response = await settingsService.getActivityLogs(page);
      setLogs(response.logs);
      setPagination(response.pagination);
      setError(null);
    } catch (err: any) {
      setError('Failed to load activity logs');
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'login':
        return '🔑';
      case 'logout':
        return '🚪';
      case 'password_change':
        return '🔒';
      case 'profile_update':
        return '👤';
      case 'account_created':
        return '✨';
      case 'failed_login':
        return '⚠️';
      default:
        return '📝';
    }
  };

  return (
    <div className="activity-log">
      <h4>Recent Activity</h4>
      
      {loading && <div className="loading-indicator">Loading activity logs...</div>}
      
      {error && <div className="error-message">{error}</div>}
      
      {!loading && logs.length === 0 && (
        <div className="no-logs">No activity logs found</div>
      )}
      
      {logs.length > 0 && (
        <div className="logs-container">
          {logs.map((log) => (
            <div key={log.id} className="log-item">
              <div className="log-icon">{getActivityIcon(log.activity_type)}</div>
              <div className="log-content">
                <div className="log-description">{log.description}</div>
                <div className="log-meta">
                  <span className="log-date">{formatDate(log.created_at)}</span>
                  <span className="log-ip">{log.ip_address}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {pagination.pages > 1 && (
        <div className="pagination">
          <button 
            className="pagination-btn"
            disabled={!pagination.has_prev}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span className="page-info">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button 
            className="pagination-btn"
            disabled={!pagination.has_next}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};