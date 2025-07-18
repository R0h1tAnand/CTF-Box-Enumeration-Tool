import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, CardFooter, CardTitle, CardDescription, Button, Loading } from '../ui';
import { useRecentScans } from '../../hooks/useDashboard';
import type { RecentScan } from '../../services/dashboardService';
import './RecentScansWidget.css';

export const RecentScansWidget: React.FC = () => {
  const navigate = useNavigate();
  const { data: recentScansData, isLoading, error } = useRecentScans();

  const handleScanClick = (scanId: number) => {
    navigate(`/history?scan=${scanId}`);
  };

  const handleViewAllClick = () => {
    navigate('/history');
  };

  const formatDuration = (duration: number | null): string => {
    if (!duration) return 'N/A';
    
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getStatusIcon = (status: RecentScan['status']): string => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'running':
        return '🔄';
      case 'stopped':
        return '⏹️';
      default:
        return '⏳';
    }
  };

  const getStatusColor = (status: RecentScan['status']): string => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'warning';
      case 'stopped':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card className="recent-scans-widget" variant="default" hoverable>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>Your latest scanning activities</CardDescription>
        </CardHeader>
        <CardBody>
          <div className="recent-scans-loading">
            <Loading size="sm" />
            <span>Loading recent scans...</span>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="recent-scans-widget error" variant="default" hoverable>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>Your latest scanning activities</CardDescription>
        </CardHeader>
        <CardBody>
          <div className="recent-scans-error">
            <span className="error-icon">⚠️</span>
            <span className="error-message">Failed to load recent scans</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  const recentScans = recentScansData?.recent_scans || [];

  if (recentScans.length === 0) {
    return (
      <Card className="recent-scans-widget empty" variant="default" hoverable>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>Your latest scanning activities</CardDescription>
        </CardHeader>
        <CardBody>
          <div className="recent-scans-empty">
            <span className="empty-icon">🔍</span>
            <span className="empty-message">No scans yet</span>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => navigate('/scan')}
            >
              Start Your First Scan
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="recent-scans-widget" variant="default" hoverable>
      <CardHeader>
        <CardTitle>Recent Scans</CardTitle>
        <CardDescription>Your latest scanning activities</CardDescription>
      </CardHeader>
      <CardBody>
        <div className="recent-scans-list">
          {recentScans.map((scan) => (
            <div
              key={scan.id}
              className={`scan-item ${getStatusColor(scan.status)}`}
              onClick={() => handleScanClick(scan.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleScanClick(scan.id);
                }
              }}
            >
              <div className="scan-header">
                <div className="scan-target">
                  <span className="target-icon">🎯</span>
                  <span className="target-ip">{scan.target_ip}</span>
                </div>
                <div className="scan-status">
                  <span className="status-icon">{getStatusIcon(scan.status)}</span>
                  <span className="status-text">{scan.status}</span>
                </div>
              </div>
              
              <div className="scan-details">
                <div className="scan-tools">
                  {scan.tools_used && scan.tools_used.length > 0 ? (
                    scan.tools_used.map((tool, index) => (
                      <span key={index} className="tool-badge">
                        {tool}
                      </span>
                    ))
                  ) : (
                    <span className="tool-badge">Unknown</span>
                  )}
                </div>
                
                <div className="scan-meta">
                  <span className="scan-time">{formatDate(scan.started_at)}</span>
                  {scan.status === 'completed' && (
                    <span className="scan-duration">{formatDuration(scan.duration)}</span>
                  )}
                </div>
              </div>

              {scan.error_message && (
                <div className="scan-error">
                  <span className="error-text">{scan.error_message}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardBody>
      <CardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleViewAllClick}
          fullWidth
        >
          View All Scans
        </Button>
      </CardFooter>
    </Card>
  );
};