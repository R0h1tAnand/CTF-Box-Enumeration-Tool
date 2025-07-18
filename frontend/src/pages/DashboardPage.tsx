import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WelcomeSection } from '../components/dashboard/WelcomeSection';
import { RecentScansWidget } from '../components/dashboard/RecentScansWidget';
import { UserStats } from '../components/dashboard/UserStats';
import { SystemStatus } from '../components/dashboard/SystemStatus';
import { 
  Card, 
  CardHeader, 
  CardBody, 
  CardFooter, 
  CardTitle, 
  CardDescription,
  Button
} from '../components/ui';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'scan':
        navigate('/scan');
        break;
      case 'history':
        navigate('/history');
        break;
      case 'settings':
        navigate('/settings');
        break;
      default:
        break;
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Monitor your cybersecurity toolkit activities</p>
      </div>
      
      <div className="dashboard-grid">
        {/* Welcome Section - Full width on top */}
        <div className="dashboard-welcome">
          <WelcomeSection />
        </div>

        {/* Quick Actions Card */}
        <Card className="dashboard-card quick-actions-card" variant="elevated" hoverable>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Start a new scan or access your tools</CardDescription>
          </CardHeader>
          <CardBody>
            <div className="quick-actions">
              <Button 
                variant="primary" 
                fullWidth 
                onClick={() => handleQuickAction('scan')}
                className="action-button"
              >
                🔍 Start New Scan
              </Button>
              <Button 
                variant="secondary" 
                fullWidth
                onClick={() => handleQuickAction('history')}
                className="action-button"
              >
                📊 View History
              </Button>
              <Button 
                variant="outline" 
                fullWidth
                onClick={() => handleQuickAction('settings')}
                className="action-button"
              >
                ⚙️ Settings
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* User Statistics */}
        <div className="dashboard-card stats-card">
          <UserStats />
        </div>

        {/* Recent Scans Widget */}
        <div className="dashboard-card recent-scans-card">
          <RecentScansWidget />
        </div>

        {/* System Status Widget */}
        <div className="dashboard-card system-status-card">
          <SystemStatus />
        </div>
      </div>
    </div>
  );
};