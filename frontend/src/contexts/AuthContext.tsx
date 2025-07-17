import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, LoginCredentials, RegisterData, AuthContextType } from '../types/auth';
import { authService } from '../services/authService';
import { authManager } from '../utils/authManager';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Initialize the auth manager
        await authManager.initialize();
        
        if (authService.isAuthenticated()) {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        await authManager.logout('initialization_failed');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Enhanced session timeout warning and tracking
  useEffect(() => {
    if (!user) {
      setSessionTimeRemaining(0);
      setLastActivity(null);
      return;
    }

    const updateSessionInfo = () => {
      const authStatus = authManager.getAuthStatus();
      const warningThreshold = 5 * 60 * 1000; // 5 minutes

      setSessionTimeRemaining(authStatus.sessionTimeRemaining);
      setLastActivity(authStatus.lastActivity);

      if (authStatus.sessionTimeRemaining <= warningThreshold && authStatus.sessionTimeRemaining > 0) {
        setSessionWarning(true);
      } else {
        setSessionWarning(false);
      }

      // Auto-logout if session expired
      if (authStatus.sessionTimeRemaining <= 0 || !authStatus.isSessionValid) {
        logout();
      }
    };

    // Update immediately and then every 30 seconds for more responsive UI
    updateSessionInfo();
    const interval = setInterval(updateSessionInfo, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle session validation on window focus and visibility changes
  useEffect(() => {
    const handleFocus = async () => {
      if (user && authService.isAuthenticated()) {
        try {
          const isValid = await authManager.performSecurityCheck();
          if (!isValid) {
            await logout();
          }
        } catch (error) {
          console.error('Session validation failed:', error);
          await logout();
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user && authService.isAuthenticated()) {
        try {
          const isValid = await authManager.performSecurityCheck();
          if (!isValid) {
            await logout();
          }
        } catch (error) {
          console.error('Visibility change validation failed:', error);
          await logout();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      const authResponse = await authManager.login(credentials);
      setUser(authResponse.user);
      setSessionWarning(false);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (userData: RegisterData): Promise<void> => {
    try {
      const authResponse = await authManager.register(userData);
      setUser(authResponse.user);
      setSessionWarning(false);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authManager.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setSessionWarning(false);
    }
  };

  const extendSession = (): void => {
    authManager.extendSession();
    setSessionWarning(false);
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading,
    sessionWarning,
    extendSession,
    sessionTimeRemaining,
    lastActivity,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};