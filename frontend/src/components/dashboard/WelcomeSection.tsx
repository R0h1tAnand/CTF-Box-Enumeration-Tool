import React from 'react';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '../ui';
import { FadeInUp, StaggeredList } from '../ui/FadeSlideAnimation';
import { useDashboardStats } from '../../hooks/useDashboard';
import './WelcomeSection.css';

export const WelcomeSection: React.FC = () => {
  const { data: dashboardData, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <Card className="welcome-section">
        <CardHeader>
          <div className="welcome-skeleton">
            <div className="skeleton-title"></div>
            <div className="skeleton-subtitle"></div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="welcome-section error">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Unable to load user information</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { user, stats } = dashboardData || { user: null, stats: null };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <FadeInUp delay={0.1}>
      <Card className="welcome-section" variant="elevated">
        <CardHeader>
          <CardTitle className="welcome-title">
            {getGreeting()}, {user?.username || 'User'}!
          </CardTitle>
          <CardDescription className="welcome-subtitle">
            Welcome to your cybersecurity toolkit dashboard
          </CardDescription>
        </CardHeader>
        <CardBody>
          <StaggeredList className="welcome-stats" staggerDelay={0.1}>
            <div className="stat-item">
              <span className="stat-value">{stats?.total_scans || 0}</span>
              <span className="stat-label">Total Scans</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats?.success_rate || 0}%</span>
              <span className="stat-label">Success Rate</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats?.recent_scans || 0}</span>
              <span className="stat-label">This Week</span>
            </div>
          </StaggeredList>
          <FadeInUp delay={0.4}>
            <div className="welcome-info">
              <div className="info-item">
                <span className="info-label">Member since:</span>
                <span className="info-value">{formatDate(user?.member_since || null)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Last login:</span>
                <span className="info-value">{formatDate(user?.last_login || null)}</span>
              </div>
            </div>
          </FadeInUp>
        </CardBody>
      </Card>
    </FadeInUp>
  );
};