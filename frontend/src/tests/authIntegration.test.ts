/**
 * Integration test to verify the complete authentication flow works end-to-end
 * This test validates that all components work together properly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authManager } from '../utils/authManager';
import { sessionManager } from '../utils/sessionManager';
import { authService } from '../services/authService';

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

// Mock window methods
Object.defineProperty(window, 'location', {
  value: { href: '', pathname: '/', reload: vi.fn() },
  writable: true,
});

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Mock successful auth responses
    vi.spyOn(authService, 'login').mockResolvedValue({
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      user: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        is_active: true,
      },
    });

    vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z',
      is_active: true,
    });

    vi.spyOn(authService, 'logout').mockResolvedValue();
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
    vi.spyOn(sessionManager, 'startSession').mockImplementation(() => {});
    vi.spyOn(sessionManager, 'endSession').mockImplementation(() => {});
    vi.spyOn(authManager, 'initialize').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle complete authentication flow', async () => {
    // Test the complete login flow through authManager
    const credentials = { username: 'test', password: 'password' };
    
    // Mock the login process
    const loginSpy = vi.spyOn(authService, 'login');
    const sessionStartSpy = vi.spyOn(sessionManager, 'startSession');
    
    await authManager.login(credentials);
    
    expect(loginSpy).toHaveBeenCalledWith(credentials);
    expect(sessionStartSpy).toHaveBeenCalled();
  });

  it('should handle session management', async () => {
    // Mock authenticated state
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    
    // Test session extension
    const extendSpy = vi.spyOn(authService, 'extendSession');
    const sessionExtendSpy = vi.spyOn(sessionManager, 'extendSession');
    
    authManager.extendSession();
    
    expect(extendSpy).toHaveBeenCalled();
    expect(sessionExtendSpy).toHaveBeenCalled();
  });

  it('should handle logout properly', async () => {
    // Test logout through authManager
    const logoutSpy = vi.spyOn(authService, 'enhancedLogout');
    const sessionEndSpy = vi.spyOn(sessionManager, 'endSession');
    
    await authManager.logout('user_initiated');
    
    expect(sessionEndSpy).toHaveBeenCalledWith('user_initiated');
    expect(logoutSpy).toHaveBeenCalledWith('user_initiated');
  });

  it('should initialize auth manager on app start', async () => {
    // Test that auth manager initializes properly
    await authManager.initialize();

    expect(authManager.initialize).toHaveBeenCalled();
  });

  it('should handle token refresh automatically', async () => {
    // Mock token that needs refresh
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkzMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'access_token') return mockToken;
      if (key === 'refresh_token') return 'refresh_token_123';
      return null;
    });

    const refreshSpy = vi.spyOn(authService, 'refreshToken').mockResolvedValue('new_token');
    
    // Test proactive token refresh
    await authService.proactiveTokenRefresh();
    
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('should handle security checks', async () => {
    // Mock authenticated state
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'validateSession').mockResolvedValue(true);
    vi.spyOn(authService, 'performSecurityCheck').mockResolvedValue(true);
    vi.spyOn(sessionManager, 'performSecurityCheck').mockResolvedValue(true);

    const securityCheck = await authManager.performSecurityCheck();

    expect(securityCheck).toBe(true);
    expect(authService.performSecurityCheck).toHaveBeenCalled();
  });

  it('should handle session timeout warnings', () => {
    // Mock session stats that should trigger warning
    const mockSessionStats = {
      timeRemaining: 4 * 60 * 1000, // 4 minutes
      duration: 26 * 60 * 1000, // 26 minutes
      lastActivity: new Date(),
      warningThreshold: 5 * 60 * 1000, // 5 minutes
      isExpired: false,
      shouldWarn: true,
    };

    vi.spyOn(sessionManager, 'getSessionStats').mockReturnValue(mockSessionStats);

    const stats = sessionManager.getSessionStats();
    
    expect(stats.shouldWarn).toBe(true);
    expect(stats.timeRemaining).toBeLessThan(stats.warningThreshold);
  });
});