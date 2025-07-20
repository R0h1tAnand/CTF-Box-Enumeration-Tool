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
  Button,
  ResponsiveGrid,
  ResponsiveText,
  useResponsive
} from '../components/ui';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();

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
      <div className="dashboard-header space-y-2">
        <ResponsiveText 
          as="h1" 
          size={{ 
            mobile: 'xl', 
            tablet: '2xl', 
            desktop: '3xl' 
          }}
          weight="bold"
          className="dashboard-title"
        >
          Dashboard
        </ResponsiveText>
        <ResponsiveText 
          size={{ 
            mobile: 'sm', 
            tablet: 'base', 
            desktop: 'lg' 
          }}
          className="dashboard-subtitle"
        >
          Monitor your cybersecurity toolkit activities
        </ResponsiveText>
      </div>
      
      <div className="dashboard-content space-y-6">
        {/* Welcome Section - Full width on top */}
        <WelcomeSection />

        <ResponsiveGrid 
          columns={{ 
            mobile: 1, 
            tablet: 2, 
            desktop: 3 
          }}
          gap={isMobile ? 'md' : 'lg'}
          className="dashboard-grid"
        >
          {/* Quick Actions Card */}
          <Card className="dashboard-card quick-actions-card" variant="elevated" hoverable>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Start a new scan or access your tools</CardDescription>
            </CardHeader>
            <CardBody>
              <div className="quick-actions space-y-3">
                <Button 
                  variant="primary" 
                  fullWidth 
                  size={isMobile ? 'lg' : 'md'}
                  onClick={() => handleQuickAction('scan')}
                  className="action-button"
                >
                  🔍 Start New Scan
                </Button>
                <Button 
                  variant="secondary" 
                  fullWidth
                  size={isMobile ? 'lg' : 'md'}
                  onClick={() => handleQuickAction('history')}
                  className="action-button"
                >
                  📊 View History
                </Button>
                <Button 
                  variant="outline" 
                  fullWidth
                  size={isMobile ? 'lg' : 'md'}
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
          <div className={`dashboard-card recent-scans-card ${isMobile ? 'col-span-full' : ''}`}>
            <RecentScansWidget />
          </div>

          {/* System Status Widget */}
          <div className="dashboard-card system-status-card">
            <SystemStatus />
          </div>
        </ResponsiveGrid>
      </div>
    </div>
  );
};