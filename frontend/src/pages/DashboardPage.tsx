import React, { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardBody, 
  CardFooter, 
  CardTitle, 
  CardDescription,
  Button,
  ProgressBar,
  CircularProgress,
  Loading
} from '../components';

export const DashboardPage: React.FC = () => {
  const [scanProgress] = useState(65);
  const [isScanning, setIsScanning] = useState(false);

  const handleStartScan = () => {
    setIsScanning(true);
    // Simulate scan completion after 3 seconds
    setTimeout(() => setIsScanning(false), 3000);
  };

  return (
    <div className="dashboard-page">
      <h1>Cybersecurity Toolkit Dashboard</h1>
      <p>Welcome to your security toolkit!</p>
      
      <div className="dashboard-grid">
        <Card variant="default" hoverable>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
            <CardDescription>Your latest scanning activities</CardDescription>
          </CardHeader>
          <CardBody>
            <div style={{ marginBottom: '1rem' }}>
              <ProgressBar 
                value={scanProgress} 
                variant="success" 
                showLabel 
                label="Last Nmap Scan"
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <ProgressBar 
                value={45} 
                variant="warning" 
                showLabel 
                label="Gobuster Progress"
              />
            </div>
            <div>
              <ProgressBar 
                value={90} 
                variant="default" 
                showLabel 
                label="Dirb Scan"
              />
            </div>
          </CardBody>
          <CardFooter>
            <Button variant="outline" size="sm">View All</Button>
          </CardFooter>
        </Card>

        <Card variant="elevated" hoverable>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Start a new scan or access your tools</CardDescription>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Button 
                variant="primary" 
                fullWidth 
                loading={isScanning}
                onClick={handleStartScan}
              >
                {isScanning ? 'Scanning...' : 'Start New Scan'}
              </Button>
              <Button variant="secondary" fullWidth>
                View History
              </Button>
              <Button variant="outline" fullWidth>
                Settings
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card variant="outlined" hoverable>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Tool availability and performance</CardDescription>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <CircularProgress value={100} variant="success" size={60} />
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Nmap</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <CircularProgress value={85} variant="default" size={60} />
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Gobuster</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <CircularProgress value={95} variant="success" size={60} />
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Dirb</div>
              </div>
            </div>
            {isScanning && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <Loading variant="dots" size="sm" />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  System scanning...
                </span>
              </div>
            )}
          </CardBody>
          <CardFooter>
            <Button variant="ghost" size="sm">System Details</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};