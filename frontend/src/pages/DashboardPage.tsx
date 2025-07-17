import React from 'react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="dashboard-page">
      <h1>Cybersecurity Toolkit Dashboard</h1>
      <p>Welcome to your security toolkit!</p>
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Recent Scans</h3>
          <p>Your latest scanning activities will appear here.</p>
        </div>
        <div className="dashboard-card">
          <h3>Quick Actions</h3>
          <p>Start a new scan or access your tools.</p>
        </div>
        <div className="dashboard-card">
          <h3>System Status</h3>
          <p>All tools are operational and ready to use.</p>
        </div>
      </div>
    </div>
  );
};