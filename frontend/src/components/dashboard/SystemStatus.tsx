import React, { useEffect } from 'react';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '../ui';
import { ProgressBar, CircularProgress } from '../ui/ProgressBar';
import { useSystemStatus } from '../../hooks/useDashboard';
import { motion, useAnimation } from 'framer-motion';
import './SystemStatus.css';

export const SystemStatus: React.FC = () => {
  const { data: systemStatus, isLoading, error, refetch } = useSystemStatus();
  const controls = useAnimation();

  useEffect(() => {
    if (systemStatus) {
      controls.start({ opacity: 1, y: 0 });
    }
  }, [systemStatus, controls]);

  if (isLoading) {
    return (
      <Card className="system-status-widget" variant="default" hoverable>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Tool availability and health</CardDescription>
        </CardHeader>
        <CardBody>
          <div className="status-loading">
            <div className="status-skeleton">
              <div className="skeleton-circle"></div>
              <div className="skeleton-bar"></div>
            </div>
            <div className="status-skeleton">
              <div className="skeleton-circle"></div>
              <div className="skeleton-bar"></div>
            </div>
            <div className="status-skeleton">
              <div className="skeleton-circle"></div>
              <div className="skeleton-bar"></div>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="system-status-widget error" variant="default" hoverable>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Tool availability and health</CardDescription>
        </CardHeader>
        <CardBody>
          <div className="status-error">
            <span className="error-icon">🔌</span>
            <span className="error-message">Unable to load system status</span>
            <button className="retry-button" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!systemStatus) {
    return (
      <Card className="system-status-widget" variant="default" hoverable>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Tool availability and health</CardDescription>
        </CardHeader>
        <CardBody>
          <div className="status-empty">
            <span className="empty-icon">🔍</span>
            <span className="empty-message">No system status available</span>
          </div>
        </CardBody>
      </Card>
    );
  }

  const { tools, system_health, available_tools, total_tools, last_checked } = systemStatus;
  
  // Determine health status variant
  const getHealthVariant = (health: number) => {
    if (health >= 80) return 'success';
    if (health >= 50) return 'warning';
    return 'error';
  };

  // Format the last checked time
  const formatLastChecked = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch (e) {
      return 'Unknown';
    }
  };

  return (
    <Card className="system-status-widget" variant="default" hoverable>
      <CardHeader>
        <CardTitle>System Status</CardTitle>
        <CardDescription>Tool availability and health</CardDescription>
      </CardHeader>
      <CardBody>
        <div className="system-health">
          <CircularProgress 
            value={system_health} 
            variant={getHealthVariant(system_health)}
            size={100}
            strokeWidth={10}
            animated
            label={`${available_tools}/${total_tools}`}
          />
          <div className="health-details">
            <div className="health-title">System Health</div>
            <div className="health-value">{system_health}%</div>
            <div className="health-subtitle">Tools Available</div>
            <div className="last-checked">
              Last checked: {formatLastChecked(last_checked)}
            </div>
          </div>
        </div>

        <div className="tools-status">
          {Object.entries(tools).map(([toolName, toolStatus], index) => (
            <motion.div
              key={toolName}
              className={`tool-item ${toolStatus.status}`}
              initial={{ opacity: 0, y: 20 }}
              animate={controls}
              transition={{ delay: index * 0.1 }}
            >
              <div className="tool-header">
                <div className="tool-name">{toolName}</div>
                <div className={`tool-indicator ${toolStatus.status}`}>
                  <span className="status-dot"></span>
                  <span className="status-text">{toolStatus.status}</span>
                </div>
              </div>
              <div className="tool-details">
                {toolStatus.version && (
                  <div className="tool-version">v{toolStatus.version}</div>
                )}
              </div>
              <ProgressBar
                value={toolStatus.available ? 100 : 0}
                variant={toolStatus.available ? 'success' : 'error'}
                size="sm"
                animated={toolStatus.status === 'online'}
                striped={toolStatus.status === 'online'}
              />
            </motion.div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};