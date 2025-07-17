import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sessionManager, type SessionEvent, type SessionEventListener } from '../utils/sessionManager';
import { authService } from '../services/authService';

interface EnhancedAuthState {
  // Basic auth state
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
  
  // Session state
  sessionTimeRemaining: number;
  sessionWarning: boolean;
  lastActivity: Date | null;
  sessionDuration: number;
  
  // Security state
  failedAttempts: number;
  isSecure: boolean;
  
  // Connection state
  isOnline: boolean;
  connectionQuality: 'good' | 'poor' | 'offline';
}

interface EnhancedAuthActions {
  // Basic auth actions
  login: (credentials: any) => Promise<void>;
  logout: (reason?: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  
  // Session actions
  extendSession: () => void;
  refreshToken: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  
  // Security actions
  performSecurityCheck: () => Promise<boolean>;
  clearSecurityFlags: () => void;
  
  // Utility actions
  getSessionStats: () => any;
  exportSessionData: () => any;
}

export interface UseEnhancedAuthReturn extends EnhancedAuthState, EnhancedAuthActions {}

export const useEnhancedAuth = (): UseEnhancedAuthReturn => {
  const auth = useAuth();
  
  // Enhanced state
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isSecure, setIsSecure] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');

  // Session event handler
  const handleSessionEvent: SessionEventListener = useCallback((event: SessionEvent) => {
    switch (event.type) {
      case 'session_warning':
        setSessionWarning(true);
        break;
      case 'session_extended':
        setSessionWarning(false);
        break;
      case 'session_expired':
      case 'session_ended':
        setSessionWarning(false);
        setSessionTimeRemaining(0);
        break;
    }
  }, []);

  // Initialize session manager and event listeners
  useEffect(() => {
    if (auth.isAuthenticated) {
      sessionManager.addEventListener(handleSessionEvent);
      
      return () => {
        sessionManager.removeEventListener(handleSessionEvent);
      };
    }
  }, [auth.isAuthenticated, handleSessionEvent]);

  // Update session stats periodically
  useEffect(() => {
    if (!auth.isAuthenticated) {
      setSessionTimeRemaining(0);
      setSessionDuration(0);
      setLastActivity(null);
      return;
    }

    const updateSessionStats = () => {
      const stats = sessionManager.getSessionStats();
      setSessionTimeRemaining(stats.timeRemaining);
      setSessionDuration(stats.duration);
      setLastActivity(stats.lastActivity);
      setSessionWarning(stats.shouldWarn);
    };

    updateSessionStats();
    const interval = setInterval(updateSessionStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [auth.isAuthenticated]);

  // Monitor failed attempts
  useEffect(() => {
    const updateFailedAttempts = () => {
      const attempts = parseInt(localStorage.getItem('failed_requests') || '0');
      setFailedAttempts(attempts);
    };

    updateFailedAttempts();
    const interval = setInterval(updateFailedAttempts, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionQuality('good');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality('offline');
    };

    // Test connection quality
    const testConnectionQuality = async () => {
      if (!navigator.onLine) {
        setConnectionQuality('offline');
        return;
      }

      try {
        const start = Date.now();
        await fetch('/api/health', { 
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        });
        const duration = Date.now() - start;
        
        setConnectionQuality(duration < 1000 ? 'good' : 'poor');
      } catch (error) {
        setConnectionQuality('poor');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Test connection quality periodically
    const qualityInterval = setInterval(testConnectionQuality, 60000); // Every minute
    testConnectionQuality(); // Initial test

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(qualityInterval);
    };
  }, []);

  // Enhanced actions
  const enhancedLogin = useCallback(async (credentials: any): Promise<void> => {
    try {
      await auth.login(credentials);
      sessionManager.startSession();
      setFailedAttempts(0);
      setIsSecure(true);
    } catch (error) {
      setFailedAttempts(prev => prev + 1);
      throw error;
    }
  }, [auth]);

  const enhancedLogout = useCallback(async (reason?: string): Promise<void> => {
    try {
      sessionManager.endSession(reason);
      await auth.logout();
    } catch (error) {
      console.error('Enhanced logout failed:', error);
      // Force logout even if server call fails
      sessionManager.endSession(reason || 'force_logout');
    } finally {
      setSessionWarning(false);
      setSessionTimeRemaining(0);
      setIsSecure(true);
      setFailedAttempts(0);
    }
  }, [auth]);

  const enhancedRegister = useCallback(async (userData: any): Promise<void> => {
    try {
      await auth.register(userData);
      sessionManager.startSession();
      setFailedAttempts(0);
      setIsSecure(true);
    } catch (error) {
      setFailedAttempts(prev => prev + 1);
      throw error;
    }
  }, [auth]);

  const extendSession = useCallback((): void => {
    sessionManager.extendSession();
    auth.extendSession();
  }, [auth]);

  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      await authService.refreshToken();
      setIsSecure(true);
    } catch (error) {
      setIsSecure(false);
      throw error;
    }
  }, []);

  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const isValid = await sessionManager.performSecurityCheck();
      setIsSecure(isValid);
      return isValid;
    } catch (error) {
      setIsSecure(false);
      return false;
    }
  }, []);

  const performSecurityCheck = useCallback(async (): Promise<boolean> => {
    try {
      const isValid = await authService.performSecurityCheck();
      setIsSecure(isValid);
      return isValid;
    } catch (error) {
      setIsSecure(false);
      return false;
    }
  }, []);

  const clearSecurityFlags = useCallback((): void => {
    localStorage.removeItem('failed_requests');
    setFailedAttempts(0);
    setIsSecure(true);
  }, []);

  const getSessionStats = useCallback(() => {
    return {
      ...sessionManager.getSessionStats(),
      failedAttempts,
      isSecure,
      isOnline,
      connectionQuality,
    };
  }, [failedAttempts, isSecure, isOnline, connectionQuality]);

  const exportSessionData = useCallback(() => {
    const stats = getSessionStats();
    const sessionData = {
      user: auth.user,
      sessionStats: stats,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Create downloadable JSON
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-data-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return sessionData;
  }, [auth.user, getSessionStats]);

  return {
    // Basic auth state
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    loading: auth.loading,
    
    // Enhanced session state
    sessionTimeRemaining,
    sessionWarning,
    lastActivity,
    sessionDuration,
    
    // Security state
    failedAttempts,
    isSecure,
    
    // Connection state
    isOnline,
    connectionQuality,
    
    // Enhanced actions
    login: enhancedLogin,
    logout: enhancedLogout,
    register: enhancedRegister,
    extendSession,
    refreshToken,
    validateSession,
    performSecurityCheck,
    clearSecurityFlags,
    getSessionStats,
    exportSessionData,
  };
};

export default useEnhancedAuth;