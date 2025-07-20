import React, { useState, useEffect } from 'react';
import './NotificationSettings.css';

interface NotificationSettingsProps {
  notificationsEnabled: boolean;
  onNotificationChange: (enabled: boolean) => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  notificationsEnabled,
  onNotificationChange
}) => {
  const [enabled, setEnabled] = useState<boolean>(notificationsEnabled);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    // Check if browser supports notifications
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  useEffect(() => {
    setEnabled(notificationsEnabled);
  }, [notificationsEnabled]);

  const handleToggleNotifications = async () => {
    const newValue = !enabled;
    setEnabled(newValue);
    
    // If enabling notifications and permission is not granted, request it
    if (newValue && permissionStatus !== 'granted' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        
        // If permission was denied, revert the toggle
        if (permission !== 'granted') {
          setEnabled(false);
          onNotificationChange(false);
          return;
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        setEnabled(false);
        onNotificationChange(false);
        return;
      }
    }
    
    onNotificationChange(newValue);
  };

  return (
    <div className="preferences-section notification-settings">
      <h3>Notification Settings</h3>
      <p>Configure how you want to be notified about scan completions and system events.</p>
      
      <div className="notification-option">
        <div className="notification-toggle">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggleNotifications}
              disabled={!('Notification' in window)}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">
            Enable browser notifications
          </span>
        </div>
        
        {!('Notification' in window) && (
          <p className="notification-warning">
            Your browser doesn't support notifications.
          </p>
        )}
        
        {permissionStatus === 'denied' && (
          <p className="notification-warning">
            Notification permission was denied. Please enable notifications in your browser settings.
          </p>
        )}
      </div>
      
      {enabled && (
        <div className="notification-options">
          <h4>Notification Events</h4>
          <div className="notification-event">
            <label>
              <input type="checkbox" checked={true} readOnly />
              Scan completion
            </label>
            <p className="event-description">
              Get notified when your scans are completed
            </p>
          </div>
          
          <div className="notification-event">
            <label>
              <input type="checkbox" checked={true} readOnly />
              Scan errors
            </label>
            <p className="event-description">
              Get notified when a scan encounters an error
            </p>
          </div>
        </div>
      )}
    </div>
  );
};