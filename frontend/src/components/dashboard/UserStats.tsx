import React, { useEffect, useRef } from 'react';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '../ui';
import { useDashboardStats } from '../../hooks/useDashboard';
import { motion, useAnimation } from 'framer-motion';
import './UserStats.css';

export const UserStats: React.FC = () => {
  const { data: dashboardData, isLoading, error } = useDashboardStats();
  const controls = useAnimation();
  const countersInitialized = useRef(false);

  useEffect(() => {
    if (dashboardData?.stats && !countersInitialized.current) {
      controls.start({ opacity: 1, y: 0 });
      initializeCounters();
      countersInitialized.current = true;
    }
  }, [dashboardData, controls]);

  // Function to animate number counters
  const initializeCounters = () => {
    const countElements = document.querySelectorAll('.stat-value');
    
    countElements.forEach(element => {
      const target = element.getAttribute('data-value') || '0';
      const isPercentage = target.toString().includes('%');
      const targetValue = parseInt(target.replace('%', ''), 10);
      
      if (isNaN(targetValue)) return;
      
      let startValue = 0;
      const duration = 1000;
      const startTime = performance.now();
      
      const updateCounter = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuad = (t: number) => t * (2 - t);
        const easedProgress = easeOutQuad(progress);
        
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easedProgress);
        element.textContent = isPercentage ? `${currentValue}%` : currentValue.toString();
        
        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        }
      };
      
      requestAnimationFrame(updateCounter);
    });
  };

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
            <motion.div
              key={item.key}
              className={`stat-item ${item.color}`}
              initial={{ opacity: 0, y: 20 }}
              animate={controls}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div 
                className="stat-icon"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 + 0.2, type: "spring", stiffness: 200 }}
              >
                {item.icon}
              </motion.div>
              <div className="stat-content">
                <div className="stat-value" data-value={item.value}>
                  {item.value}
                </div>
                <div className="stat-label">{item.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};