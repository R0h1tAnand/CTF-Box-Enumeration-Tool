/**
 * Comprehensive test suite for AuthFlowCoordinator
 * This test validates that task 3.3 requirements are fully implemented and coordinated:
 * - Automatic token refresh logic
 * - Logout functionality and token cleanup
 * - Authentication interceptors for API calls
 * - Session timeout and security checks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authFlowCoordinator } from '../utils/authFlowCoordinator';
import { authManager } from '../utils/authManager';
import { authService } from '../services/authService';
import { sessionManager } from '../utils/sessionManager';
import { authMonitor } from '../utils/authMonitor';

// Mock all dependencies
vi.mock('../utils/authManager');
vi.mock('../services/authService');
vi.mock('../utils/sessionManager');
vi.mock('../utils/authMonitor');

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock navigator
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('AuthFlowCoordinator - Task 3.3 Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('0'); // Default failed requests

    // Mock auth manager
    vi.mocked(authManager.initialize).mockResolvedValue();
    vi.mocked(authManager.login).mockResolvedValue({
      access_token: 'token',
      refresh_token: 'refresh',
      user: { id: 1, username: 'test', email: 'test@example.com', created_at: '2024-01-01', is_active: true },
    });
    vi.mocked(authManager.logout).mockResolvedValue();
    vi.mocked(authManager.register).mockResolvedValue({
      access_token: 'token',
      refresh_token: 'refresh',
      user: { id: 1, username: 'test', email: 'test@example.com', created_at: '2024-01-01', is_active: true },
    });
    vi.mocked(authManager.refreshToken).mockResolvedValue('new_token');
    vi.mocked(authManager.getAuthStatus).mockReturnValue({
      isAuthenticated: true,
      sessionTimeRemaining: 25 * 60 * 1000,
      lastActivity: new Date(),
      sessionDuration: 5 * 60 * 1000,
      isSessionValid: true,
    });

    // Mock auth service
    vi.mocked(authService.isAuthenticated).mockReturnValue(true);
    vi.mocked(authService.validateSession).mockResolvedValue(true);
    vi.mocked(authService.getToken).mockReturnValue('valid_token');
    vi.mocked(authService.isTokenValid).mockReturnValue(true);

    // Mock session manager
    vi.mocked(sessionManager.getSessionStats).mockReturnValue({
      duration: 5 * 60 * 1000,
      timeRemaining: 25 * 60 * 1000,
      lastActivity: new Date(),
      warningThreshold: 5 * 60 * 1000,
      isExpired: false,
      shouldWarn: false,
    });
    vi.mocked(sessionManager.addEventListener).mockImplementation(() => {});

    // Mock auth monitor
    vi.mocked(authMonitor.startMonitoring).mockImplementation(() => {});
    vi.mocked(authMonitor.stopMonitoring).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization and Coordination', () => {
    it('should initialize all authentication components in correct order', async () => {
      await authFlowCoordinator.initialize();

      expect(authManager.initialize).toHaveBeenCalled();
      expect(authMonitor.startMonitoring).toHaveBeenCalledWith(30000);
    });

    it('should perform system health check during initialization', async () => {
      await authFlowCoordinator.initialize();

      const healthCheck = await authFlowCoordinator.performSystemHealthCheck();
      expect(healthCheck).toHaveProperty('status');
      expect(healthCheck).toHaveProperty('components');
      expect(healthCheck.components).toHaveProperty('authService');
      expect(healthCheck.components).toHaveProperty('authManager');
      expect(healthCheck.components).toHaveProperty('sessionManager');
      expect(healthCheck.components).toHaveProperty('authInterceptor');
    });

    it('should configure monitoring based on settings', async () => {
      await authFlowCoordinator.initialize({ monitoringEnabled: false });

      expect(authMonitor.startMonitoring).not.toHaveBeenCalled();
    });
  });

  describe('Automatic Token Refresh Logic', () => {
    it('should coordinate token refresh through auth manager', async () => {
      await authFlowCoordinator.initialize();

      const newToken = await authFlowCoordinator.refreshToken();

      expect(authManager.refreshToken).toHaveBeenCalled();
      expect(newToken).toBe('new_token');
    });

    it('should emit events during token refresh process', async () => {
      await authFlowCoordinator.initialize();

      const eventSpy = vi.fn();
      authFlowCoordinator.on('token-refresh-started', eventSpy);
      authFlowCoordinator.on('token-refresh-completed', eventSpy);

      await authFlowCoordinator.refreshToken();

      expect(eventSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle token refresh failures gracefully', async () => {
      await authFlowCoordinator.initialize();
      vi.mocked(authManager.refreshToken).mockRejectedValue(new Error('Refresh failed'));

      const eventSpy = vi.fn();
      authFlowCoordinator.on('token-refresh-failed', eventSpy);

      await expect(authFlowCoordinator.refreshToken()).rejects.toThrow('Refresh failed');
      expect(eventSpy).toHaveBeenCalledWith({ error: 'Refresh failed' });
    });
  });

  describe('Logout Functionality and Token Cleanup', () => {
    it('should coordinate complete logout process', async () => {
      await authFlowCoordinator.initialize();

      const eventSpy = vi.fn();
      authFlowCoordinator.on('logout-started', eventSpy);
      authFlowCoordinator.on('logout-completed', eventSpy);

      await authFlowCoordinator.logout('user_initiated');

      expect(authManager.logout).toHaveBeenCalledWith('user_initiated');
      expect(eventSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle logout failures gracefully', async () => {
      await authFlowCoordinator.initialize();
      vi.mocked(authManager.logout).mockRejectedValue(new Error('Logout failed'));

      const eventSpy = vi.fn();
      authFlowCoordinator.on('logout-failed', eventSpy);

      await authFlowCoordinator.logout('test_reason');

      expect(eventSpy).toHaveBeenCalledWith({ 
        error: 'Logout failed', 
        reason: 'test_reason' 
      });
    });

    it('should emit logout events with proper reason tracking', async () => {
      await authFlowCoordinator.initialize();

      const eventSpy = vi.fn();
      authFlowCoordinator.on('logout-started', eventSpy);

      await authFlowCoordinator.logout('security_violation');

      expect(eventSpy).toHaveBeenCalledWith({ reason: 'security_violation' });
    });
  });

  describe('Authentication Interceptors Integration', () => {
    it('should coordinate login process with all components', async () => {
      await authFlowCoordinator.initialize();

      const credentials = { username: 'test', password: 'password' };
      await authFlowCoordinator.login(credentials);

      expect(authManager.login).toHaveBeenCalledWith(credentials);
    });

    it('should perform health check after successful login', async () => {
      await authFlowCoordinator.initialize();

      const credentials = { username: 'test', password: 'password' };
      await authFlowCoordinator.login(credentials);

      // Health check should have been performed
      expect(authService.validateSession).toHaveBeenCalled();
    });

    it('should handle login failures with proper event emission', async () => {
      await authFlowCoordinator.initialize();
      vi.mocked(authManager.login).mockRejectedValue(new Error('Login failed'));

      const eventSpy = vi.fn();
      authFlowCoordinator.on('login-failed', eventSpy);

      const credentials = { username: 'test', password: 'wrong' };
      await expect(authFlowCoordinator.login(credentials)).rejects.toThrow('Login failed');

      expect(eventSpy).toHaveBeenCalledWith({ error: 'Login failed' });
    });
  });

  describe('Session Timeout and Security Checks', () => {
    it('should perform comprehensive system health checks', async () => {
      await authFlowCoordinator.initialize();

      const healthCheck = await authFlowCoordinator.performSystemHealthCheck();

      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.components.authService).toBe(true);
      expect(healthCheck.components.authManager).toBe(true);
      expect(healthCheck.components.sessionManager).toBe(true);
      expect(healthCheck.components.authInterceptor).toBe(true);
    });

    it('should detect critical authentication issues', async () => {
      await authFlowCoordinator.initialize();

      // Mock critical issue
      vi.mocked(authService.validateSession).mockResolvedValue(false);
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);

      const healthCheck = await authFlowCoordinator.performSystemHealthCheck();

      expect(healthCheck.status).toBe('critical');
      expect(healthCheck.issues).toContain('Auth service session validation failed');
    });

    it('should detect warning conditions', async () => {
      await authFlowCoordinator.initialize();

      // Mock warning condition
      vi.mocked(sessionManager.getSessionStats).mockReturnValue({
        duration: 25 * 60 * 1000,
        timeRemaining: 4 * 60 * 1000, // Less than 5 minutes
        lastActivity: new Date(),
        warningThreshold: 5 * 60 * 1000,
        isExpired: false,
        shouldWarn: true,
      });

      const healthCheck = await authFlowCoordinator.performSystemHealthCheck();

      expect(healthCheck.status).toBe('warning');
      expect(healthCheck.issues).toContain('Session expiring soon');
    });

    it('should handle multiple failed attempts', async () => {
      await authFlowCoordinator.initialize();

      // Mock high failed attempts
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'failed_requests') return '3';
        return '0';
      });

      const healthCheck = await authFlowCoordinator.performSystemHealthCheck();

      expect(healthCheck.status).toBe('warning');
      expect(healthCheck.issues.some(issue => issue.includes('Multiple failed attempts'))).toBe(true);
    });

    it('should coordinate session event handling', async () => {
      await authFlowCoordinator.initialize();

      const eventSpy = vi.fn();
      authFlowCoordinator.on('session-warning', eventSpy);

      // Verify that session manager addEventListener was called
      expect(sessionManager.addEventListener).toHaveBeenCalled();

      // Test the event system directly
      authFlowCoordinator['emit']('session-warning', { timeRemaining: 4 * 60 * 1000 });

      expect(eventSpy).toHaveBeenCalledWith({ timeRemaining: 4 * 60 * 1000 });
    });
  });

  describe('Registration Flow', () => {
    it('should coordinate registration process', async () => {
      await authFlowCoordinator.initialize();

      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password',
        confirmPassword: 'password',
      };

      await authFlowCoordinator.register(userData);

      expect(authManager.register).toHaveBeenCalledWith(userData);
    });

    it('should perform health check after registration', async () => {
      await authFlowCoordinator.initialize();

      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password',
        confirmPassword: 'password',
      };

      await authFlowCoordinator.register(userData);

      expect(authService.validateSession).toHaveBeenCalled();
    });
  });

  describe('Authentication Status Reporting', () => {
    it('should provide comprehensive authentication status', async () => {
      await authFlowCoordinator.initialize();

      const status = authFlowCoordinator.getAuthenticationStatus();

      expect(status).toHaveProperty('isAuthenticated');
      expect(status).toHaveProperty('session');
      expect(status).toHaveProperty('security');
      expect(status).toHaveProperty('system');

      expect(status.session).toHaveProperty('timeRemaining');
      expect(status.session).toHaveProperty('duration');
      expect(status.session).toHaveProperty('lastActivity');
      expect(status.session).toHaveProperty('warningActive');

      expect(status.security).toHaveProperty('failedAttempts');
      expect(status.security).toHaveProperty('tokenValid');

      expect(status.system).toHaveProperty('initialized');
      expect(status.system).toHaveProperty('monitoring');
      expect(status.system).toHaveProperty('online');
    });

    it('should track failed attempts in status', async () => {
      await authFlowCoordinator.initialize();

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'failed_requests') return '2';
        return '0';
      });

      const status = authFlowCoordinator.getAuthenticationStatus();

      expect(status.security.failedAttempts).toBe(2);
    });
  });

  describe('Event System', () => {
    it('should support event listeners', async () => {
      await authFlowCoordinator.initialize();

      const eventSpy = vi.fn();
      authFlowCoordinator.on('test-event', eventSpy);

      // Trigger event manually for testing
      authFlowCoordinator['emit']('test-event', { data: 'test' });

      expect(eventSpy).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should support removing event listeners', async () => {
      await authFlowCoordinator.initialize();

      const eventSpy = vi.fn();
      authFlowCoordinator.on('test-event', eventSpy);
      authFlowCoordinator.off('test-event', eventSpy);

      // Trigger event manually for testing
      authFlowCoordinator['emit']('test-event', { data: 'test' });

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should properly cleanup all components', async () => {
      await authFlowCoordinator.initialize();

      authFlowCoordinator.destroy();

      expect(authMonitor.stopMonitoring).toHaveBeenCalled();
      expect(authManager.destroy).toHaveBeenCalled();
    });
  });

  describe('Visibility and Connection Handling', () => {
    it('should setup visibility change handlers', async () => {
      // Mock document.addEventListener
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      await authFlowCoordinator.initialize();

      expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });
  });
});

// Integration test for complete task 3.3 requirements
describe('Task 3.3 Requirements Integration', () => {
  it('should implement all required functionality', async () => {
    // Initialize the complete auth flow
    await authFlowCoordinator.initialize();

    // Test automatic token refresh logic
    const newToken = await authFlowCoordinator.refreshToken();
    expect(newToken).toBeDefined();

    // Test logout functionality and token cleanup
    await authFlowCoordinator.logout('test');
    expect(authManager.logout).toHaveBeenCalled();

    // Test authentication interceptors (through login)
    await authFlowCoordinator.login({ username: 'test', password: 'pass' });
    expect(authManager.login).toHaveBeenCalled();

    // Test session timeout and security checks
    const healthCheck = await authFlowCoordinator.performSystemHealthCheck();
    expect(healthCheck).toHaveProperty('status');
    expect(healthCheck).toHaveProperty('components');

    // Verify all components are coordinated
    const status = authFlowCoordinator.getAuthenticationStatus();
    expect(status.system.initialized).toBe(true);
  });
});