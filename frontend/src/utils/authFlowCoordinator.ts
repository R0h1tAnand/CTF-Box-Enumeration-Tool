import { authManager } from './authManager';
import { authService } from '../services/authService';
import { sessionManager, type SessionEventListener } from './sessionManager';
import { authMonitor } from './authMonitor';
import type { LoginCredentials, RegisterData, AuthResponse } from '../types/auth';

// Event types for the auth flow coordinator
export type AuthFlowEventType = 
  | 'login-started'
  | 'login-completed'
  | 'login-failed'
  | 'logout-started'
  | 'logout-completed'
  | 'logout-failed'
  | 'token-refresh-started'
  | 'token-refresh-completed'
  | 'token-refresh-failed'
  | 'session-warning'
  | 'session-expired'
  | 'security-violation'
  | 'system-health-check';

export interface AuthFlowEvent {
  type: AuthFlowEventType;
  timestamp: Date;
  data?: any;
  error?: string;
  reason?: string;
}

export type AuthFlowEventListener = (event: AuthFlowEvent) => void;

// Configuration interface
export interface AuthFlowConfig {
  monitoringEnabled?: boolean;
  monitoringInterval?: number;
  healthCheckInterval?: number;
  autoRefreshEnabled?: boolean;
}

// System health check result
export interface SystemHealthCheck {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: Date;
  components: {
    authService: boolean;
    authManager: boolean;
    sessionManager: boolean;
    authInterceptor: boolean;
  };
  issues: string[];
  metrics: {
    sessionTimeRemaining: number;
    failedAttempts: number;
    lastActivity: Date | null;
  };
}

// Authentication status interface
export interface AuthenticationStatus {
  isAuthenticated: boolean;
  session: {
    timeRemaining: number;
    duration: number;
    lastActivity: Date | null;
    warningActive: boolean;
  };
  security: {
    failedAttempts: number;
    tokenValid: boolean;
  };
  system: {
    initialized: boolean;
    monitoring: boolean;
    online: boolean;
  };
}

/**
 * Central coordinator for all authentication flow operations
 * This class orchestrates the interaction between all auth-related components
 */
class AuthFlowCoordinator {
  private listeners: Map<AuthFlowEventType, AuthFlowEventListener[]> = new Map();
  private initialized = false;
  private config: AuthFlowConfig = {
    monitoringEnabled: true,
    monitoringInterval: 30000, // 30 seconds
    healthCheckInterval: 60000, // 1 minute
    autoRefreshEnabled: true,
  };
  private healthCheckInterval: number | null = null;

  /**
   * Initialize the authentication flow coordinator
   */
  async initialize(config?: Partial<AuthFlowConfig>): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Merge configuration
    this.config = { ...this.config, ...config };

    try {
      console.log('Initializing Authentication Flow Coordinator...');

      // Initialize auth manager first
      await authManager.initialize();

      // Setup session event listeners
      this.setupSessionEventListeners();

      // Start monitoring if enabled
      if (this.config.monitoringEnabled) {
        authMonitor.startMonitoring(this.config.monitoringInterval!);
      }

      // Start periodic health checks
      this.startPeriodicHealthChecks();

      // Setup visibility and connection handlers
      this.setupVisibilityHandlers();
      this.setupConnectionHandlers();

      this.initialized = true;
      console.log('Authentication Flow Coordinator initialized successfully');

      // Perform initial health check
      await this.performSystemHealthCheck();

    } catch (error) {
      console.error('Failed to initialize Authentication Flow Coordinator:', error);
      throw error;
    }
  }

  /**
   * Enhanced login with comprehensive coordination
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    this.emit('login-started', { credentials: { username: credentials.username } });

    try {
      const authResponse = await authManager.login(credentials);
      
      this.emit('login-completed', { user: authResponse.user });

      // Perform post-login health check
      await this.performSystemHealthCheck();

      return authResponse;
    } catch (error: any) {
      this.emit('login-failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Enhanced registration with coordination
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    this.emit('register-started', { username: userData.username });

    try {
      const authResponse = await authManager.register(userData);
      
      this.emit('register-completed', { user: authResponse.user });

      // Perform post-registration health check
      await this.performSystemHealthCheck();

      return authResponse;
    } catch (error: any) {
      this.emit('register-failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Enhanced logout with comprehensive coordination
   */
  async logout(reason?: string): Promise<void> {
    this.emit('logout-started', { reason });

    try {
      await authManager.logout(reason);
      this.emit('logout-completed', { reason });
    } catch (error: any) {
      this.emit('logout-failed', { error: error.message, reason });
      
      // Force cleanup even if logout fails
      try {
        await authManager.logout('force_cleanup');
      } catch (forceError) {
        console.error('Force cleanup also failed:', forceError);
      }
    }
  }

  /**
   * Coordinated token refresh
   */
  async refreshToken(): Promise<string | null> {
    this.emit('token-refresh-started', {});

    try {
      const newToken = await authManager.refreshToken();
      this.emit('token-refresh-completed', { tokenReceived: !!newToken });
      return newToken;
    } catch (error: any) {
      this.emit('token-refresh-failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Perform comprehensive system health check
   */
  async performSystemHealthCheck(): Promise<SystemHealthCheck> {
    const timestamp = new Date();
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check auth service
    const authServiceHealthy = authService.isAuthenticated() ? 
      await authService.validateSession().catch(() => false) : true;

    // Check auth manager
    const authManagerHealthy = authManager.getAuthStatus().isAuthenticated === authService.isAuthenticated();

    // Check session manager
    const sessionStats = sessionManager.getSessionStats();
    const sessionManagerHealthy = !sessionStats.isExpired;

    // Check auth interceptor (basic check)
    const authInterceptorHealthy = true; // Interceptor is passive, assume healthy

    // Collect metrics
    const failedAttempts = parseInt(localStorage.getItem('failed_requests') || '0');
    const tokenValid = authService.isAuthenticated() ? 
      authService.isTokenValid(authService.getToken() || '') : true;

    // Analyze issues
    if (!authServiceHealthy && authService.isAuthenticated()) {
      issues.push('Auth service session validation failed');
      status = 'critical';
    }

    if (!authManagerHealthy) {
      issues.push('Auth manager state inconsistency');
      status = 'critical';
    }

    if (!sessionManagerHealthy && authService.isAuthenticated()) {
      issues.push('Session expired');
      status = 'critical';
    }

    if (sessionStats.shouldWarn) {
      issues.push('Session expiring soon');
      if (status === 'healthy') status = 'warning';
    }

    if (failedAttempts > 0) {
      issues.push(`Multiple failed attempts detected (${failedAttempts})`);
      if (status === 'healthy') status = 'warning';
    }

    if (!tokenValid && authService.isAuthenticated()) {
      issues.push('Invalid token detected');
      status = 'critical';
    }

    const healthCheck: SystemHealthCheck = {
      status,
      timestamp,
      components: {
        authService: authServiceHealthy,
        authManager: authManagerHealthy,
        sessionManager: sessionManagerHealthy,
        authInterceptor: authInterceptorHealthy,
      },
      issues,
      metrics: {
        sessionTimeRemaining: sessionStats.timeRemaining,
        failedAttempts,
        lastActivity: sessionStats.lastActivity,
      },
    };

    this.emit('system-health-check', healthCheck);

    return healthCheck;
  }

  /**
   * Get comprehensive authentication status
   */
  getAuthenticationStatus(): AuthenticationStatus {
    const authStatus = authManager.getAuthStatus();
    const sessionStats = sessionManager.getSessionStats();
    const failedAttempts = parseInt(localStorage.getItem('failed_requests') || '0');
    const tokenValid = authService.isAuthenticated() ? 
      authService.isTokenValid(authService.getToken() || '') : true;

    return {
      isAuthenticated: authStatus.isAuthenticated,
      session: {
        timeRemaining: authStatus.sessionTimeRemaining,
        duration: authStatus.sessionDuration,
        lastActivity: authStatus.lastActivity,
        warningActive: sessionStats.shouldWarn,
      },
      security: {
        failedAttempts,
        tokenValid,
      },
      system: {
        initialized: this.initialized,
        monitoring: this.config.monitoringEnabled || false,
        online: navigator.onLine,
      },
    };
  }

  /**
   * Event system methods
   */
  on(eventType: AuthFlowEventType, listener: AuthFlowEventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  off(eventType: AuthFlowEventType, listener: AuthFlowEventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(eventType: AuthFlowEventType, data?: any): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const event: AuthFlowEvent = {
        type: eventType,
        timestamp: new Date(),
        ...data,
      };

      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Auth flow event listener error for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Setup session event listeners
   */
  private setupSessionEventListeners(): void {
    const sessionEventHandler: SessionEventListener = (event) => {
      switch (event.type) {
        case 'session_warning':
          this.emit('session-warning', { timeRemaining: event.timeRemaining });
          break;
        case 'session_expired':
          this.emit('session-expired', { reason: event.reason });
          break;
      }
    };

    sessionManager.addEventListener(sessionEventHandler);
  }

  /**
   * Start periodic health checks
   */
  private startPeriodicHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = window.setInterval(async () => {
      if (this.initialized && authService.isAuthenticated()) {
        try {
          await this.performSystemHealthCheck();
        } catch (error) {
          console.error('Periodic health check failed:', error);
        }
      }
    }, this.config.healthCheckInterval!);
  }

  /**
   * Setup visibility change handlers
   */
  private setupVisibilityHandlers(): void {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && authService.isAuthenticated()) {
        // Perform health check when tab becomes visible
        await this.performSystemHealthCheck();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  /**
   * Setup connection handlers
   */
  private setupConnectionHandlers(): void {
    const handleOnline = () => {
      if (authService.isAuthenticated()) {
        // Perform health check when connection is restored
        this.performSystemHealthCheck();
      }
    };

    const handleOffline = () => {
      // Could emit offline event if needed
      console.warn('Connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    authMonitor.stopMonitoring();
    authManager.destroy();
    
    this.listeners.clear();
    this.initialized = false;
  }
}

// Export singleton instance
export const authFlowCoordinator = new AuthFlowCoordinator();

export default authFlowCoordinator;