import React from 'react';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '../ui';
import { useDashboardStats } from '../../hooks/useDashboard';
import './UserStats.css';

export const UserStats: React.FC = () => {
  const { data: dashboardData, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <Card className="user-stats-widget" variant="default" hoverable>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
          <CardDescription>Your scanning performance</CardDescription>
        </CardHeader>
        <CardBody>
          <div className="stats-loading">
            <div className="stat-skeleton">
              <div className="skeleton-value"></div>
              <div className="skeleton-label"></div>
            </div>
            <div className="stat-skeleton">
              <div className="skeleton-value"></div>
              <div className="skeleton-label"></div>
            </div>
            <div className="stat-skeleton">
              <div className="skeleton-value"></div>
              <div className="skeleton-label"></div>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="user-stats-widget error" variant="default" hoverable>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
          <CardDescription>Your scanning performance</CardDescription>
        </CardHeader>
        <CardBody>
          <div className="stats-error">
            <span className="error-icon">📊</span>
            <span className="error-message">Unable to load statistics</span>
          </div>
        </CardBody>
      </Card>
    );
  }

  const stats = dashboardData?.stats;

  if (!stats) {
    return (
      <Card className="user-stats-widget" variant="default" hoverable>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
          <CardDescription>Your scanning performance</CardDescription>
        </CardHeader>
        <CardBody>
          <div className="stats-empty">
            <span className="empty-icon">📈</span>
            <span className="empty-message">No statistics available</span>
          </div>
        </CardBody>
      </Card>
    );
  }

  const statItems = [
    {
      key: 'total',
      value: stats.total_scans,
      label: 'Total Scans',
      icon: '🔍',
      color: 'primary',
    },
    {
      key: 'completed',
      value: stats.completed_scans,
      label: 'Completed',
      icon: '✅',
      color: 'success',
    },
    {
      key: 'success_rate',
      value: `${stats.success_rate}%`,
      label: 'Success Rate',
      icon: '📊',
      color: stats.success_rate >= 80 ? 'success' : stats.success_rate >= 60 ? 'warning' : 'error',
    },
    {
      key: 'recent',
      value: stats.recent_scans,
      label: 'This Week',
      icon: '📅',
      color: 'info',
    },
    {
      key: 'failed',
      value: stats.failed_scans,
      label: 'Failed',
      icon: '❌',
      color: 'error',
    },
    {
      key: 'running',
      value: stats.running_scans,
      label: 'Running',
      icon: '🔄',
      color: 'warning',
    },
  ];

  return (
    <Card className="user-stats-widget" variant="default" hoverable>
      <CardHeader>
        <CardTitle>Statistics</CardTitle>
        <CardDescription>Your scanning performance</CardDescription>
      </CardHeader>
      <CardBody>
        <div className="stats-grid">
          {statItems.map((item, index) => (
            <div
              key={item.key}
              className={`stat-item ${item.color}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="stat-icon">{item.icon}</div>
              <div className="stat-content">
                <div className="stat-value" data-value={item.value}>
                  {item.value}
                </div>
                <div className="stat-label">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};