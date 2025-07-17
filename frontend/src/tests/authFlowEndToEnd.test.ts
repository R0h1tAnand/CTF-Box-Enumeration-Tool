/**
 * End-to-end test for Task 3.3 authentication flow implementation
 * This test verifies the complete authentication flow works as expected
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authFlowCoordinator } from '../utils/authFlowCoordinator';
import { authManager } from '../utils/authManager';
import { authService } from '../services/authService';
import { sessionManager } from '../utils/sessionManager';

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

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    })),
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Task 3.3 End-to-End Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Authentication Lifecycle', () => {
    it('should handle complete login-to-logout flow', async () => {
      // Mock successful responses
      const mockAuthResponse = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00Z',
          is_active: true,
        },
      };

      // Mock auth service methods
      vi.spyOn(authService, 'login').mockResolvedValue(mockAuthResponse);
      vi.spyOn(authService, 'logout').mockResolvedValue();
      vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(authService, 'validateSession').mockResolvedValue(true);
      vi.spyOn(authService, 'performSecurityCheck').mockResolvedValue(true);

      // Mock session manager
      vi.spyOn(sessionManager, 'startSession').mockImplementation(() => {});
      vi.spyOn(sessionManager, 'endSession').mockImplementation(() => {});
      vi.spyOn(sessionManager, 'getSessionStats').mockReturnValue({
        duration: 5 * 60 * 1000,
        timeRemaining: 25 * 60 * 1000,
        lastActivity: new Date(),
        warningThreshold: 5 * 60 * 1000,
        isExpired: false,
        shouldWarn: false,
      });
      vi.spyOn(sessionManager, 'performSecurityCheck').mockResolvedValue(true);
      vi.spyOn(sessionManager, 'addEventListener').mockImplementation(() => {});

      // Mock auth manager
      vi.spyOn(authManager, 'initialize').mockResolvedValue();
      vi.spyOn(authManager, 'login').mockResolvedValue(mockAuthResponse);
      vi.spyOn(authManager, 'logout').mockResolvedValue();
      vi.spyOn(authManager, 'getAuthStatus').mockReturnValue({
        isAuthenticated: true,
        sessionTimeRemaining: 25 * 60 * 1000,
        lastActivity: new Date(),
        sessionDuration: 5 * 60 * 1000,
        isSessionValid: true,
      });

      // Initialize the auth flow coordinator
      await authFlowCoordinator.initialize();

      // Test login
      const credentials = { username: 'testuser', password: 'password' };
      const loginResult = await authFlowCoordinator.login(credentials);

      expect(loginResult).toEqual(mockAuthResponse);
      expect(authManager.login).toHaveBeenCalledWith(credentials);

      // Test authentication status
      const authStatus = authFlowCoordinator.getAuthenticationStatus();
      expect(authStatus.isAuthenticated).toBe(true);
      expect(authStatus.system.initialized).toBe(true);

      // Test logout
      await authFlowCoordinator.logout('user_initiated');
      expect(authManager.logout).toHaveBeenCalledWith('user_initiated');

      // Cleanup
      authFlowCoordinator.destroy();
    });

    it('should handle token refresh flow', async () => {
      // Mock token refresh
      vi.spyOn(authManager, 'refreshToken').mockResolvedValue('new-access-token');
      vi.spyOn(authManager, 'initialize').mockResolvedValue();

      await authFlowCoordinator.initialize();

      const newToken = await authFlowCoordinator.refreshToken();

      expect(newToken).toBe('new-access-token');
      expect(authManager.refreshToken).toHaveBeenCalled();

      authFlowCoordinator.destroy();
    });

    it('should handle system health checks', async () => {
      // Mock all components as healthy
      vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(authService, 'validateSession').mockResolvedValue(true);
      vi.spyOn(authService, 'getToken').mockReturnValue('valid-token');
      vi.spyOn(authService, 'isTokenValid').mockReturnValue(true);

      vi.spyOn(authManager, 'initialize').mockResolvedValue();
      vi.spyOn(authManager, 'getAuthStatus').mockReturnValue({
        isAuthenticated: true,
        sessionTimeRemaining: 25 * 60 * 1000,
        lastActivity: new Date(),
        sessionDuration: 5 * 60 * 1000,
        isSessionValid: true,
      });

      vi.spyOn(sessionManager, 'getSessionStats').mockReturnValue({
        duration: 5 * 60 * 1000,
        timeRemaining: 25 * 60 * 1000,
        lastActivity: new Date(),
        warningThreshold: 5 * 60 * 1000,
        isExpired: false,
        shouldWarn: false,
      });

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'failed_requests') return '0';
        return null;
      });

      await authFlowCoordinator.initialize();

      const healthCheck = await authFlowCoordinator.performSystemHealthCheck();

      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.components.authService).toBe(true);
      expect(healthCheck.components.authManager).toBe(true);
      expect(healthCheck.components.sessionManager).toBe(true);
      expect(healthCheck.components.authInterceptor).toBe(true);

      authFlowCoordinator.destroy();
    });

    it('should detect and handle security issues', async () => {
      // Mock security issues
      vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(authService, 'validateSession').mockResolvedValue(false); // Session invalid
      vi.spyOn(authService, 'getToken').mockReturnValue('invalid-token');
      vi.spyOn(authService, 'isTokenValid').mockReturnValue(false);

      vi.spyOn(authManager, 'initialize').mockResolvedValue();
      vi.spyOn(authManager, 'getAuthStatus').mockReturnValue({
        isAuthenticated: true,
        sessionTimeRemaining: 25 * 60 * 1000,
        lastActivity: new Date(),
        sessionDuration: 5 * 60 * 1000,
        isSessionValid: false,
      });

      vi.spyOn(sessionManager, 'getSessionStats').mockReturnValue({
        duration: 5 * 60 * 1000,
        timeRemaining: 25 * 60 * 1000,
        lastActivity: new Date(),
        warningThreshold: 5 * 60 * 1000,
        isExpired: false,
        shouldWarn: false,
      });

      // Mock high failed attempts
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'failed_requests') return '3';
        return null;
      });

      await authFlowCoordinator.initialize();

      const healthCheck = await authFlowCoordinator.performSystemHealthCheck();

      expect(healthCheck.status).toBe('critical');
      expect(healthCheck.issues.length).toBeGreaterThan(0);
      expect(healthCheck.issues.some(issue => issue.includes('session validation failed'))).toBe(true);

      authFlowCoordinator.destroy();
    });

    it('should handle session warnings', async () => {
      // Mock session warning condition
      vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(authService, 'validateSession').mockResolvedValue(true);
      vi.spyOn(authService, 'getToken').mockReturnValue('valid-token');
      vi.spyOn(authService, 'isTokenValid').mockReturnValue(true);

      vi.spyOn(authManager, 'initialize').mockResolvedValue();
      vi.spyOn(authManager, 'getAuthStatus').mockReturnValue({
        isAuthenticated: true,
        sessionTimeRemaining: 4 * 60 * 1000, // 4 minutes - should trigger warning
        lastActivity: new Date(),
        sessionDuration: 26 * 60 * 1000,
        isSessionValid: true,
      });

      vi.spyOn(sessionManager, 'getSessionStats').mockReturnValue({
        duration: 26 * 60 * 1000,
        timeRemaining: 4 * 60 * 1000, // 4 minutes
        lastActivity: new Date(),
        warningThreshold: 5 * 60 * 1000,
        isExpired: false,
        shouldWarn: true, // Should warn
      });
      vi.spyOn(sessionManager, 'addEventListener').mockImplementation(() => {});

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'failed_requests') return '0';
        return null;
      });

      await authFlowCoordinator.initialize();

      const healthCheck = await authFlowCoordinator.performSystemHealthCheck();

      expect(healthCheck.status).toBe('warning');
      expect(healthCheck.issues.some(issue => issue.includes('Session expiring soon'))).toBe(true);

      authFlowCoordinator.destroy();
    });

    it('should handle event system properly', async () => {
      vi.spyOn(authManager, 'initialize').mockResolvedValue();

      await authFlowCoordinator.initialize();

      // Test event listener registration
      const eventSpy = vi.fn();
      authFlowCoordinator.on('system-health-check', eventSpy);

      // Trigger a health check which should emit an event
      await authFlowCoordinator.performSystemHealthCheck();

      expect(eventSpy).toHaveBeenCalled();

      // Test event listener removal
      authFlowCoordinator.off('system-health-check', eventSpy);

      authFlowCoordinator.destroy();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle initialization failures gracefully', async () => {
      // Mock initialization failure
      vi.spyOn(authManager, 'initialize').mockRejectedValue(new Error('Init failed'));

      await expect(authFlowCoordinator.initialize()).rejects.toThrow('Init failed');
    });

    it('should handle login failures gracefully', async () => {
      vi.spyOn(authManager, 'initialize').mockResolvedValue();
      vi.spyOn(authManager, 'login').mockRejectedValue(new Error('Login failed'));

      await authFlowCoordinator.initialize();

      const credentials = { username: 'test', password: 'wrong' };
      await expect(authFlowCoordinator.login(credentials)).rejects.toThrow('Login failed');

      authFlowCoordinator.destroy();
    });

    it('should handle token refresh failures gracefully', async () => {
      vi.spyOn(authManager, 'initialize').mockResolvedValue();
      vi.spyOn(authManager, 'refreshToken').mockRejectedValue(new Error('Refresh failed'));

      await authFlowCoordinator.initialize();

      await expect(authFlowCoordinator.refreshToken()).rejects.toThrow('Refresh failed');

      authFlowCoordinator.destroy();
    });

    it('should handle logout failures with force cleanup', async () => {
      vi.spyOn(authManager, 'initialize').mockResolvedValue();
      vi.spyOn(authManager, 'logout')
        .mockRejectedValueOnce(new Error('Logout failed'))
        .mockResolvedValueOnce(); // Second call for force cleanup

      await authFlowCoordinator.initialize();

      // Should not throw even if logout fails
      await authFlowCoordinator.logout('test_reason');

      // Verify force cleanup was attempted
      expect(authManager.logout).toHaveBeenCalledTimes(2);
      expect(authManager.logout).toHaveBeenLastCalledWith('force_cleanup');

      authFlowCoordinator.destroy();
    });
  });

  describe('Configuration and Customization', () => {
    it('should support custom configuration', async () => {
      vi.spyOn(authManager, 'initialize').mockResolvedValue();

      const customConfig = {
        monitoringEnabled: false,
        monitoringInterval: 60000,
        healthCheckInterval: 120000,
        autoRefreshEnabled: false,
      };

      await authFlowCoordinator.initialize(customConfig);

      const status = authFlowCoordinator.getAuthenticationStatus();
      expect(status.system.monitoring).toBe(false);

      authFlowCoordinator.destroy();
    });

    it('should provide comprehensive authentication status', async () => {
      vi.spyOn(authManager, 'initialize').mockResolvedValue();
      vi.spyOn(authManager, 'getAuthStatus').mockReturnValue({
        isAuthenticated: true,
        sessionTimeRemaining: 25 * 60 * 1000,
        lastActivity: new Date(),
        sessionDuration: 5 * 60 * 1000,
        isSessionValid: true,
      });

      vi.spyOn(sessionManager, 'getSessionStats').mockReturnValue({
        duration: 5 * 60 * 1000,
        timeRemaining: 25 * 60 * 1000,
        lastActivity: new Date(),
        warningThreshold: 5 * 60 * 1000,
        isExpired: false,
        shouldWarn: false,
      });

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'failed_requests') return '1';
        return null;
      });

      vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(authService, 'getToken').mockReturnValue('valid-token');
      vi.spyOn(authService, 'isTokenValid').mockReturnValue(true);

      await authFlowCoordinator.initialize();

      const status = authFlowCoordinator.getAuthenticationStatus();

      expect(status).toHaveProperty('isAuthenticated');
      expect(status).toHaveProperty('session');
      expect(status).toHaveProperty('security');
      expect(status).toHaveProperty('system');

      expect(status.isAuthenticated).toBe(true);
      expect(status.session.timeRemaining).toBe(25 * 60 * 1000);
      expect(status.security.failedAttempts).toBe(1);
      expect(status.security.tokenValid).toBe(true);
      expect(status.system.initialized).toBe(true);

      authFlowCoordinator.destroy();
    });
  });
});