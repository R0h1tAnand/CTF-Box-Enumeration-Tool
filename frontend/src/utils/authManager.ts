import { authService } from '../services/authService';
import { sessionManager } from './sessionManager';
import type { LoginCredentials, RegisterData, AuthResponse } from '../types/auth';

/**
 * Centralized authentication manager that coordinates all auth-related functionality
 */
class AuthManager {
  private initialized = false;
  private tokenRefreshInterval: number | null = null;
  private securityCheckInterval: number | null = null;

  /**
   * Initialize the authentication manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('Initializing Authentication Manager...');

    try {
      // Initialize auth service
      authService.initialize();

      // Start automatic token refresh
      this.startAutomaticTokenRefresh();

      // Start periodic security checks
      this.startPeriodicSecurityChecks();

      // Initialize session manager if user is authenticated
      if (authService.isAuthenticated()) {
        sessionManager.initialize();
      }

      this.initialized = true;
      console.log('Authentication Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Authentication Manager:', error);
      throw error;
    }
  }

  /**
   * Enhanced login with comprehensive error handling and session setup
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('Starting login process...');
      
      // Clear any existing auth data
      this.cleanup();
      
      // Perform login
      const authResponse = await authService.login(credentials);
      
      // Initialize session management
      sessionManager.startSession();
      
      // Start automatic processes
      this.startAutomaticTokenRefresh();
      this.startPeriodicSecurityChecks();
      
      console.log('Login successful');
      return authResponse;
    } catch (error) {
      console.error('Login failed:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Enhanced registration with session setup
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      console.log('Starting registration process...');
      
      // Clear any existing auth data
      this.cleanup();
      
      // Perform registration
      const authResponse = await authService.register(userData);
      
      // Initialize session management
      sessionManager.startSession();
      
      // Start automatic processes
      this.startAutomaticTokenRefresh();
      this.startPeriodicSecurityChecks();
      
      console.log('Registration successful');
      return authResponse;
    } catch (error) {
      console.error('Registration failed:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Enhanced logout with comprehensive cleanup
   */
  async logout(reason?: string): Promise<void> {
    try {
      console.log(`Starting logout process${reason ? ` (reason: ${reason})` : ''}...`);
      
      // Stop automatic processes
      this.stopAutomaticProcesses();
      
      // End session
      sessionManager.endSession(reason);
      
      // Perform logout
      await authService.enhancedLogout(reason);
      
      console.log('Logout completed');
    } catch (error) {
      console.error('Logout error:', error);
      // Force cleanup even if logout fails
      this.forceCleanup();
    }
  }

  /**
   * Refresh token with enhanced error handling
   */
  async refreshToken(): Promise<string | null> {
    try {
      const newToken = await authService.refreshToken();
      
      if (newToken) {
        console.log('Token refreshed successfully');
        // Extend session on successful refresh
        sessionManager.extendSession();
      }
      
      return newToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // If refresh fails, logout user
      await this.logout('token_refresh_failed');
      throw error;
    }
  }

  /**
   * Perform comprehensive security check
   */
  async performSecurityCheck(): Promise<boolean> {
    try {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        return false;
      }

      // Perform auth service security check
      const authCheck = await authService.performSecurityCheck();
      if (!authCheck) {
        console.warn('Auth service security check failed');
        return false;
      }

      // Perform session manager security check
      const sessionCheck = await sessionManager.performSecurityCheck();
      if (!sessionCheck) {
        console.warn('Session manager security check failed');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Security check failed:', error);
      return false;
    }
  }

  /**
   * Extend current session
   */
  extendSession(): void {
    if (authService.isAuthenticated()) {
      authService.extendSession();
      sessionManager.extendSession();
    }
  }

  /**
   * Get current authentication status
   */
  getAuthStatus(): {
    isAuthenticated: boolean;
    sessionTimeRemaining: number;
    lastActivity: Date | null;
    sessionDuration: number;
    isSessionValid: boolean;
  } {
    const isAuthenticated = authService.isAuthenticated();
    const sessionStats = sessionManager.getSessionStats();
    
    return {
      isAuthenticated,
      sessionTimeRemaining: sessionStats.timeRemaining,
      lastActivity: sessionStats.lastActivity,
      sessionDuration: sessionStats.duration,
      isSessionValid: !sessionStats.isExpired,
    };
  }

  /**
   * Start automatic token refresh
   */
  private startAutomaticTokenRefresh(): void {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }

    // Check every 5 minutes for token refresh
    this.tokenRefreshInterval = window.setInterval(async () => {
      if (authService.isAuthenticated()) {
        try {
          await authService.proactiveTokenRefresh();
        } catch (error) {
          console.error('Automatic token refresh failed:', error);
          await this.logout('automatic_refresh_failed');
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Start periodic security checks
   */
  private startPeriodicSecurityChecks(): void {
    if (this.securityCheckInterval) {
      clearInterval(this.securityCheckInterval);
    }

    // Perform security check every 2 minutes
    this.securityCheckInterval = window.setInterval(async () => {
      if (authService.isAuthenticated()) {
        const isSecure = await this.performSecurityCheck();
        if (!isSecure) {
          console.warn('Periodic security check failed, logging out');
          await this.logout('security_check_failed');
        }
      }
    }, 2 * 60 * 1000);
  }

  /**
   * Stop all automatic processes
   */
  private stopAutomaticProcesses(): void {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }

    if (this.securityCheckInterval) {
      clearInterval(this.securityCheckInterval);
      this.securityCheckInterval = null;
    }
  }

  /**
   * Clean up authentication state
   */
  private cleanup(): void {
    this.stopAutomaticProcesses();
    authService.clearAuthData();
    authService.stopSessionTracking();
  }

  /**
   * Force cleanup (used when normal cleanup fails)
   */
  private forceCleanup(): void {
    try {
      this.cleanup();
      sessionManager.endSession('force_cleanup');
      
      // Clear all localStorage auth-related data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('token') || 
          key.includes('auth') || 
          key.includes('session') ||
          key.includes('user') ||
          key.includes('failed_requests')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('Force cleanup completed');
    } catch (error) {
      console.error('Force cleanup failed:', error);
    }
  }

  /**
   * Handle window/tab visibility changes
   */
  private handleVisibilityChange = async (): Promise<void> => {
    if (document.visibilityState === 'visible' && authService.isAuthenticated()) {
      // Validate session when tab becomes visible
      const isValid = await this.performSecurityCheck();
      if (!isValid) {
        await this.logout('session_invalid_on_focus');
      }
    }
  };

  /**
   * Handle window beforeunload event
   */
  private handleBeforeUnload = (): void => {
    // Save session state before page unload
    if (authService.isAuthenticated()) {
      const sessionStats = sessionManager.getSessionStats();
      localStorage.setItem('session_state_backup', JSON.stringify({
        lastActivity: sessionStats.lastActivity.toISOString(),
        sessionDuration: sessionStats.duration,
        timestamp: new Date().toISOString(),
      }));
    }
  };

  /**
   * Setup event listeners
   */
  setupEventListeners(): void {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  /**
   * Remove event listeners
   */
  removeEventListeners(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  /**
   * Destroy the auth manager
   */
  destroy(): void {
    this.stopAutomaticProcesses();
    this.removeEventListeners();
    this.initialized = false;
  }
}

// Export singleton instance
export const authManager = new AuthManager();

// Export utility functions
export const initializeAuth = async (): Promise<void> => {
  await authManager.initialize();
  authManager.setupEventListeners();
};

export const getAuthStatus = () => authManager.getAuthStatus();

export default authManager;