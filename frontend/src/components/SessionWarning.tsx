import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SessionWarningProps {
  show?: boolean;
  onExtend?: () => void;
  onLogout?: () => void;
}

export const SessionWarning: React.FC<SessionWarningProps> = ({ 
  show: propShow, 
  onExtend: propOnExtend, 
  onLogout: propOnLogout 
}) => {
  const { sessionWarning, sessionTimeRemaining, extendSession, logout } = useAuth();
  const [timeLeft, setTimeLeft] = useState(0);

  // Use props if provided, otherwise use auth context
  const show = propShow !== undefined ? propShow : sessionWarning;
  const onExtend = propOnExtend || extendSession;
  const onLogout = propOnLogout || logout;

  useEffect(() => {
    if (!show) {
      setTimeLeft(0);
      return;
    }

    // Use sessionTimeRemaining from auth context if available
    const initialTime = sessionTimeRemaining > 0 
      ? Math.floor(sessionTimeRemaining / 1000) 
      : 5 * 60; // fallback to 5 minutes

    setTimeLeft(initialTime);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = sessionTimeRemaining > 0 
          ? Math.floor(sessionTimeRemaining / 1000) 
          : prev - 1;

        if (newTime <= 0) {
          onLogout();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [show, sessionTimeRemaining, onLogout]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleExtend = () => {
    onExtend();
    setTimeLeft(30 * 60); // Reset to 30 minutes after extending
  };

  if (!show) return null;

  return (
    <div className="session-warning-overlay">
      <div className="session-warning-modal">
        <div className="session-warning-header">
          <h3>⚠️ Session Expiring Soon</h3>
        </div>
        <div className="session-warning-content">
          <p>Your session will expire in:</p>
          <div className="session-timer">
            {formatTime(timeLeft)}
          </div>
          <p>Would you like to extend your session?</p>
          <div className="session-info">
            <small>For security reasons, inactive sessions are automatically logged out.</small>
          </div>
        </div>
        <div className="session-warning-actions">
          <button 
            className="extend-session-btn"
            onClick={handleExtend}
          >
            Extend Session
          </button>
          <button 
            className="logout-btn"
            onClick={onLogout}
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
};