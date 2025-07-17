import { authService } from '../services/authService';

// Session configuration
const SESSION_CONFIG = {
  TIMEOUT_DURATION: 30 * 60 * 1000, // 30 minutes
  WARNING_THRESHOLD: 5 * 60 * 1000, // 5 minutes
  CHECK_INTERVAL: 30 * 1000, // 30 seconds
  ACTIVITY_EVENTS: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
  STORAGE_KEYS: {
    LAST_ACTIVITY: 'last_activity_time',
    SESSION_START: 'session_start_time',
    WARNING_SHOWN: 'session_warning_shown',
  },
};

// Session event types
export type SessionEventType = 
  | 'session_started'
  | 'session_extended' 
  | 'session_warning'
  | 'session_expired'
  | 'session_ended';

export interface SessionEvent {
  type: SessionEventType;
  timestamp: Date;
  timeRemaining?: number;
  reason?: string;
}

// Session listener callback type
export type SessionEventListener = (event: SessionEvent) => void;

class SessionManager {
  private listeners: SessionEventListener[] = [];
  private checkInterval: number | null = null;
  private activityListenersAttached = false;
  private lastActivityTime = Date.now();
  private sessionStartTime = Date.now();
  private warningShown = false;

  /**
   * Initialize session management
   */
  initialize(): void {
    this.loadSessionState();
    this.attachActivityListeners();
    this.startSessionMonitoring();
    this.setupVisibilityHandlers();
    this.emitEvent({ type: 'session_started', timestamp: new Date() });
  }

  /**
   * Setup visibility change handlers
   */
  private setupVisibilityHandlers(): void {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check session validity when tab becomes visible
        if (this.isSessionExpired()) {
          this.handleSessionExpiry();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  /**
   * Start a new session
   */
  startSession(): void {
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();
    this.warningShown = false;
    
    this.saveSessionState();
    this.attachActivityListeners();
    this.startSessionMonitoring();
    
    this.emitEvent({ type: 'session_started', timestamp: new Date() });
  }

  /**
   * End the current session
   */
  endSession(reason?: string): void {
    this.stopSessionMonitoring();
    this.removeActivityListeners();
    this.clearSessionState();
    
    this.emitEvent({ 
      type: 'session_ended', 
      timestamp: new Date(),
      reason 
    });
  }

  /**
   * Extend the current session
   */
  extendSession(): void {
    this.lastActivityTime = Date.now();
    this.warningShown = false;
    this.saveSessionState();
    
    this.emitEvent({ 
      type: 'session_extended', 
      timestamp: new Date(),
      timeRemaining: this.getTimeRemaining()
    });
  }

  /**
   * Get time remaining in current session
   */
  getTimeRemaining(): number {
    const timeSinceLastActivity = Date.now() - this.lastActivityTime;
    return Math.max(0, SESSION_CONFIG.TIMEOUT_DURATION - timeSinceLastActivity);
  }

  /**
   * Get session duration
   */
  getSessionDuration(): number {
    return Date.now() - this.sessionStartTime;
  }

  /**
   * Check if session is expired
   */
  isSessionExpired(): boolean {
    return this.getTimeRemaining() <= 0;
  }

  /**
   * Check if session warning should be shown
   */
  shouldShowWarning(): boolean {
    const timeRemaining = this.getTimeRemaining();
    return timeRemaining <= SESSION_CONFIG.WARNING_THRESHOLD && 
           timeRemaining > 0 && 
           !this.warningShown;
  }

  /**
   * Mark warning as shown
   */
  markWarningShown(): void {
    this.warningShown = true;
    localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.WARNING_SHOWN, 'true');
  }

  /**
   * Get last activity time
   */
  getLastActivityTime(): Date {
    return new Date(this.lastActivityTime);
  }

  /**
   * Add session event listener
   */
  addEventListener(listener: SessionEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove session event listener
   */
  removeEventListener(listener: SessionEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Perform session security check
   */
  async performSecurityCheck(): Promise<boolean> {
    try {
      // Check if session is expired
      if (this.isSessionExpired()) {
        this.handleSessionExpiry();
        return false;
      }

      // Check for suspicious activity patterns
      if (this.detectSuspiciousActivity()) {
        await this.handleSuspiciousActivity();
        return false;
      }

      // Validate with server
      const isValid = await authService.validateSession();
      if (!isValid) {
        this.handleInvalidSession();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session security check failed:', error);
      return false;
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    duration: number;
    timeRemaining: number;
    lastActivity: Date;
    warningThreshold: number;
    isExpired: boolean;
    shouldWarn: boolean;
  } {
    return {
      duration: this.getSessionDuration(),
      timeRemaining: this.getTimeRemaining(),
      lastActivity: this.getLastActivityTime(),
      warningThreshold: SESSION_CONFIG.WARNING_THRESHOLD,
      isExpired: this.isSessionExpired(),
      shouldWarn: this.shouldShowWarning(),
    };
  }

  /**
   * Private methods
   */
  private loadSessionState(): void {
    const lastActivity = localStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
    const sessionStart = localStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_START);
    const warningShown = localStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.WARNING_SHOWN);

    if (lastActivity) {
      this.lastActivityTime = parseInt(lastActivity);
    }

    if (sessionStart) {
      this.sessionStartTime = parseInt(sessionStart);
    }

    this.warningShown = warningShown === 'true';
  }

  private saveSessionState(): void {
    localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, this.lastActivityTime.toString());
    localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_START, this.sessionStartTime.toString());
    localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.WARNING_SHOWN, this.warningShown.toString());
  }

  private clearSessionState(): void {
    Object.values(SESSION_CONFIG.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  private attachActivityListeners(): void {
    if (this.activityListenersAttached) return;

    const updateActivity = () => {
      this.lastActivityTime = Date.now();
      this.warningShown = false;
      this.saveSessionState();
    };

    SESSION_CONFIG.ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    this.activityListenersAttached = true;
  }

  private removeActivityListeners(): void {
    if (!this.activityListenersAttached) return;

    const updateActivity = () => {
      this.lastActivityTime = Date.now();
      this.warningShown = false;
      this.saveSessionState();
    };

    SESSION_CONFIG.ACTIVITY_EVENTS.forEach(event => {
      document.removeEventListener(event, updateActivity);
    });

    this.activityListenersAttached = false;
  }

  private startSessionMonitoring(): void {
    if (this.checkInterval) return;

    this.checkInterval = window.setInterval(() => {
      this.checkSessionStatus();
    }, SESSION_CONFIG.CHECK_INTERVAL);
  }

  private stopSessionMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private checkSessionStatus(): void {
    if (this.isSessionExpired()) {
      this.handleSessionExpiry();
      return;
    }

    if (this.shouldShowWarning()) {
      this.handleSessionWarning();
    }
  }

  private handleSessionExpiry(): void {
    this.emitEvent({ 
      type: 'session_expired', 
      timestamp: new Date(),
      reason: 'timeout'
    });
    
    this.endSession('expired');
    authService.enhancedLogout('session_timeout');
  }

  private handleSessionWarning(): void {
    this.markWarningShown();
    
    this.emitEvent({ 
      type: 'session_warning', 
      timestamp: new Date(),
      timeRemaining: this.getTimeRemaining()
    });
  }

  private handleInvalidSession(): void {
    this.emitEvent({ 
      type: 'session_expired', 
      timestamp: new Date(),
      reason: 'invalid_session'
    });
    
    this.endSession('invalid');
    authService.enhancedLogout('invalid_session');
  }

  private async handleSuspiciousActivity(): Promise<void> {
    this.emitEvent({ 
      type: 'session_expired', 
      timestamp: new Date(),
      reason: 'suspicious_activity'
    });
    
    this.endSession('suspicious');
    await authService.enhancedLogout('suspicious_activity');
  }

  private detectSuspiciousActivity(): boolean {
    // Check for rapid session extensions (potential bot behavior)
    const sessionDuration = this.getSessionDuration();
    const extensionRate = sessionDuration / (Date.now() - this.lastActivityTime);
    
    if (extensionRate > 100) { // More than 100 extensions per minute
      console.warn('Suspicious activity detected: rapid session extensions');
      return true;
    }

    // Check for unusual session duration
    const maxSessionDuration = 24 * 60 * 60 * 1000; // 24 hours
    if (sessionDuration > maxSessionDuration) {
      console.warn('Suspicious activity detected: unusually long session');
      return true;
    }

    return false;
  }

  private emitEvent(event: SessionEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Session event listener error:', error);
      }
    });
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Export utility functions
export const initializeSessionManager = (): void => {
  sessionManager.initialize();
};

export const getSessionStats = () => sessionManager.getSessionStats();

export default sessionManager;