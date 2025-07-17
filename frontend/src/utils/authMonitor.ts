import { authService } from '../services/authService';
import { sessionManager } from './sessionManager';

// Monitoring event types
export type MonitoringEventType = 
  | 'token-expiry-warning'
  | 'session-timeout-warning'
  | 'security-violation'
  | 'suspicious-activity'
  | 'connection-lost'
  | 'connection-restored';

export interface MonitoringEvent {
  type: MonitoringEventType;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data?: any;
  message: string;
}

export type MonitoringEventListener = (event: MonitoringEvent) => void;

// Monitoring configuration
interface MonitoringConfig {
  tokenExpiryWarningThreshold: number; // minutes before expiry
  sessionTimeoutWarningThreshold: number; // minutes before timeout
  maxFailedAttempts: number;
  suspiciousActivityThreshold: number;
  connectionCheckInterval: number; // milliseconds
}

/**
 * Authentication monitoring system
 * Continuously monitors authentication state and security conditions
 */
class AuthMonitor {
  private listeners: MonitoringEventListener[] = [];
  private monitoringInterval: number | null = null;
  private connectionCheckInterval: number | null = null;
  private isMonitoring = false;
  
  private config: MonitoringConfig = {
    tokenExpiryWarningThreshold: 10, // 10 minutes
    sessionTimeoutWarningThreshold: 5, // 5 minutes
    maxFailedAttempts: 5,
    suspiciousActivityThreshold: 10,
    connectionCheckInterval: 30000, // 30 seconds
  };

  private lastConnectionState = navigator.onLine;
  private lastFailedAttempts = 0;
  private activityPatterns: number[] = [];

  /**
   * Start monitoring authentication state
   */
  startMonitoring(interval: number = 30000): void {
    if (this.isMonitoring) {
      return;
    }

    console.log('Starting authentication monitoring...');

    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(() => {
      this.performMonitoringCheck();
    }, interval);

    // Start connection monitoring
    this.startConnectionMonitoring();

    // Setup event listeners
    this.setupEventListeners();

    console.log(`Authentication monitoring started (interval: ${interval}ms)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('Stopping authentication monitoring...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }

    this.removeEventListeners();
    this.isMonitoring = false;

    console.log('Authentication monitoring stopped');
  }

  /**
   * Add monitoring event listener
   */
  addEventListener(listener: MonitoringEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove monitoring event listener
   */
  removeEventListener(listener: MonitoringEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): {
    isMonitoring: boolean;
    lastCheck: Date | null;
    eventsEmitted: number;
    connectionState: boolean;
  } {
    return {
      isMonitoring: this.isMonitoring,
      lastCheck: new Date(), // Would track actual last check in real implementation
      eventsEmitted: 0, // Would track actual events in real implementation
      connectionState: navigator.onLine,
    };
  }

  /**
   * Perform comprehensive monitoring check
   */
  private async performMonitoringCheck(): Promise<void> {
    if (!authService.isAuthenticated()) {
      return;
    }

    try {
      // Check token expiry
      await this.checkTokenExpiry();

      // Check session timeout
      this.checkSessionTimeout();

      // Check for security violations
      this.checkSecurityViolations();

      // Check for suspicious activity
      this.checkSuspiciousActivity();

      // Update activity patterns
      this.updateActivityPatterns();

    } catch (error) {
      console.error('Monitoring check failed:', error);
    }
  }

  /**
   * Check token expiry and warn if needed
   */
  private async checkTokenExpiry(): Promise<void> {
    const token = authService.getToken();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - now;
      const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60);

      if (minutesUntilExpiry <= this.config.tokenExpiryWarningThreshold && minutesUntilExpiry > 0) {
        this.emitEvent({
          type: 'token-expiry-warning',
          timestamp: new Date(),
          severity: 'medium',
          message: `Token expires in ${minutesUntilExpiry} minutes`,
          data: { minutesUntilExpiry, expiryTime: new Date(payload.exp * 1000) },
        });
      }
    } catch (error) {
      console.warn('Token expiry check failed:', error);
    }
  }

  /**
   * Check session timeout
   */
  private checkSessionTimeout(): void {
    const sessionStats = sessionManager.getSessionStats();
    const minutesRemaining = Math.floor(sessionStats.timeRemaining / (60 * 1000));

    if (minutesRemaining <= this.config.sessionTimeoutWarningThreshold && minutesRemaining > 0) {
      this.emitEvent({
        type: 'session-timeout-warning',
        timestamp: new Date(),
        severity: 'medium',
        message: `Session expires in ${minutesRemaining} minutes`,
        data: { 
          minutesRemaining, 
          lastActivity: sessionStats.lastActivity,
          sessionDuration: sessionStats.duration 
        },
      });
    }
  }

  /**
   * Check for security violations
   */
  private checkSecurityViolations(): void {
    const failedAttempts = parseInt(localStorage.getItem('failed_requests') || '0');

    // Check for excessive failed attempts
    if (failedAttempts > this.config.maxFailedAttempts) {
      this.emitEvent({
        type: 'security-violation',
        timestamp: new Date(),
        severity: 'high',
        message: `Excessive failed attempts detected: ${failedAttempts}`,
        data: { failedAttempts, threshold: this.config.maxFailedAttempts },
      });
    }

    // Check for rapid increase in failed attempts
    if (failedAttempts > this.lastFailedAttempts + 3) {
      this.emitEvent({
        type: 'security-violation',
        timestamp: new Date(),
        severity: 'high',
        message: 'Rapid increase in failed attempts detected',
        data: { 
          currentAttempts: failedAttempts, 
          previousAttempts: this.lastFailedAttempts 
        },
      });
    }

    this.lastFailedAttempts = failedAttempts;
  }

  /**
   * Check for suspicious activity patterns
   */
  private checkSuspiciousActivity(): void {
    const sessionStats = sessionManager.getSessionStats();
    const currentTime = Date.now();

    // Check for unusually long session
    const maxSessionDuration = 8 * 60 * 60 * 1000; // 8 hours
    if (sessionStats.duration > maxSessionDuration) {
      this.emitEvent({
        type: 'suspicious-activity',
        timestamp: new Date(),
        severity: 'medium',
        message: 'Unusually long session detected',
        data: { 
          sessionDuration: sessionStats.duration,
          maxDuration: maxSessionDuration 
        },
      });
    }

    // Check for rapid activity patterns (potential bot behavior)
    const recentActivity = this.activityPatterns.filter(time => 
      currentTime - time < 60000 // Last minute
    );

    if (recentActivity.length > this.config.suspiciousActivityThreshold) {
      this.emitEvent({
        type: 'suspicious-activity',
        timestamp: new Date(),
        severity: 'high',
        message: 'Rapid activity pattern detected (potential bot behavior)',
        data: { 
          activityCount: recentActivity.length,
          threshold: this.config.suspiciousActivityThreshold 
        },
      });
    }
  }

  /**
   * Update activity patterns for analysis
   */
  private updateActivityPatterns(): void {
    const currentTime = Date.now();
    this.activityPatterns.push(currentTime);

    // Keep only last hour of activity
    const oneHourAgo = currentTime - (60 * 60 * 1000);
    this.activityPatterns = this.activityPatterns.filter(time => time > oneHourAgo);
  }

  /**
   * Start connection monitoring
   */
  private startConnectionMonitoring(): void {
    this.connectionCheckInterval = window.setInterval(() => {
      const currentConnectionState = navigator.onLine;
      
      if (currentConnectionState !== this.lastConnectionState) {
        if (currentConnectionState) {
          this.emitEvent({
            type: 'connection-restored',
            timestamp: new Date(),
            severity: 'low',
            message: 'Internet connection restored',
            data: { previousState: this.lastConnectionState },
          });
        } else {
          this.emitEvent({
            type: 'connection-lost',
            timestamp: new Date(),
            severity: 'medium',
            message: 'Internet connection lost',
            data: { previousState: this.lastConnectionState },
          });
        }
        
        this.lastConnectionState = currentConnectionState;
      }
    }, this.config.connectionCheckInterval);
  }

  /**
   * Setup event listeners for browser events
   */
  private setupEventListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Listen for visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Listen for beforeunload to detect potential session hijacking
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  /**
   * Event handlers
   */
  private handleOnline = (): void => {
    this.emitEvent({
      type: 'connection-restored',
      timestamp: new Date(),
      severity: 'low',
      message: 'Connection restored',
    });
  };

  private handleOffline = (): void => {
    this.emitEvent({
      type: 'connection-lost',
      timestamp: new Date(),
      severity: 'medium',
      message: 'Connection lost',
    });
  };

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && authService.isAuthenticated()) {
      // Perform immediate check when tab becomes visible
      this.performMonitoringCheck();
    }
  };

  private handleBeforeUnload = (): void => {
    // Save monitoring state before page unload
    if (this.isMonitoring) {
      localStorage.setItem('auth_monitor_state', JSON.stringify({
        lastCheck: new Date().toISOString(),
        activityPatterns: this.activityPatterns.slice(-10), // Keep last 10 activities
      }));
    }
  };

  /**
   * Emit monitoring event
   */
  private emitEvent(event: MonitoringEvent): void {
    console.log(`Auth Monitor Event [${event.severity.toUpperCase()}]:`, event.message);
    
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Monitoring event listener error:', error);
      }
    });
  }
}

// Export singleton instance
export const authMonitor = new AuthMonitor();

export default authMonitor;