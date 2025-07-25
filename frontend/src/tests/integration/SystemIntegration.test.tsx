/**
 * System-wide integration tests for the React frontend.
 * Tests complete user workflows and component interactions.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import App from '../../App';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { authService } from '../../services/authService';
import { scanService } from '../../services/scanService';
import { historyService } from '../../services/historyService';
import { settingsService } from '../../services/settingsService';

// Mock services
vi.mock('../../services/authService');
vi.mock('../../services/scanService');
vi.mock('../../services/historyService');
vi.mock('../../services/settingsService');

// Mock WebSocket
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected: true
};

vi.mock('socket.io-client', () => ({
  default: vi.fn(() => mockSocket)
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('System Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Reset all mocks
    vi.clearAllMocks();

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });

    // Default auth service mocks
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    });
    vi.mocked(authService.isAuthenticated).mockReturnValue(true);
    vi.mocked(authService.getToken).mockReturnValue('mock-token');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should complete full user workflow from login to scanning', async () => {
    // Mock login success
    vi.mocked(authService.login).mockResolvedValue({
      user: { id: 1, username: 'testuser', email: 'test@example.com' },
      token: 'mock-token'
    });

    // Mock dashboard data
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    });

    // Mock scan service
    vi.mocked(scanService.startScan).mockResolvedValue({
      scan_id: 'scan-123',
      status: 'running'
    });

    vi.mocked(scanService.getScanStatus).mockResolvedValue({
      scan_id: 'scan-123',
      status: 'completed',
      progress: 100
    });

    // Mock history service
    vi.mocked(historyService.getScans).mockResolvedValue({
      scans: [
        {
          id: 'scan-123',
          target_ip: '192.168.1.1',
          tools_used: ['nmap'],
          status: 'completed',
          started_at: new Date().toISOString()
        }
      ],
      total: 1,
      page: 1,
      pages: 1
    });

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Should redirect to dashboard for authenticated user
    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });

    // Navigate to scan page
    const scanButton = screen.getByText(/start scan/i);
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(screen.getByText(/target ip/i)).toBeInTheDocument();
    });

    // Fill scan form
    const targetInput = screen.getByLabelText(/target ip/i);
    fireEvent.change(targetInput, { target: { value: '192.168.1.1' } });

    // Select Nmap tool
    const nmapCheckbox = screen.getByLabelText(/nmap/i);
    fireEvent.click(nmapCheckbox);

    // Start scan
    const startScanButton = screen.getByText(/start scan/i);
    fireEvent.click(startScanButton);

    // Verify scan was started
    await waitFor(() => {
      expect(scanService.startScan).toHaveBeenCalledWith({
        target_ip: '192.168.1.1',
        tools: ['nmap'],
        options: expect.any(Object)
      });
    });

    // Navigate to history
    const historyButton = screen.getByText(/history/i);
    fireEvent.click(historyButton);

    await waitFor(() => {
      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    });

    // Verify history was loaded
    expect(historyService.getScans).toHaveBeenCalled();
  });

  it('should handle theme switching across all pages', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });

    // Find theme toggle button
    const themeToggle = screen.getByRole('button', { name: /theme/i });
    
    // Initial theme should be applied
    const body = document.body;
    const initialTheme = body.getAttribute('data-theme') || 'light';

    // Toggle theme
    fireEvent.click(themeToggle);

    await waitFor(() => {
      const newTheme = body.getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
    });

    // Navigate to different pages and verify theme persists
    const pages = [
      { button: /scan/i, expectedText: /target ip/i },
      { button: /history/i, expectedText: /scan history/i },
      { button: /settings/i, expectedText: /profile/i }
    ];

    for (const page of pages) {
      const pageButton = screen.getByText(page.button);
      fireEvent.click(pageButton);

      await waitFor(() => {
        expect(screen.getByText(page.expectedText)).toBeInTheDocument();
      });

      // Verify theme is still applied
      const currentTheme = body.getAttribute('data-theme');
      expect(currentTheme).not.toBe(initialTheme);
    }
  });

  it('should handle concurrent user actions', async () => {
    // Mock multiple API calls
    vi.mocked(scanService.startScan).mockResolvedValue({
      scan_id: 'scan-123',
      status: 'running'
    });

    vi.mocked(historyService.getScans).mockResolvedValue({
      scans: [],
      total: 0,
      page: 1,
      pages: 1
    });

    vi.mocked(settingsService.getPreferences).mockResolvedValue({
      theme: 'dark',
      default_tools: ['nmap'],
      notifications_enabled: true
    });

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });

    // Simulate concurrent actions
    const actions = [
      () => fireEvent.click(screen.getByText(/scan/i)),
      () => fireEvent.click(screen.getByText(/history/i)),
      () => fireEvent.click(screen.getByText(/settings/i))
    ];

    // Execute actions rapidly
    await act(async () => {
      actions.forEach(action => action());
    });

    // All actions should complete without errors
    await waitFor(() => {
      // Should be on settings page (last action)
      expect(screen.getByText(/profile/i)).toBeInTheDocument();
    });
  });

  it('should handle WebSocket real-time updates', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });

    // Navigate to scan page
    const scanButton = screen.getByText(/start scan/i);
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(screen.getByText(/target ip/i)).toBeInTheDocument();
    });

    // Simulate WebSocket scan progress update
    const progressCallback = mockSocket.on.mock.calls.find(
      call => call[0] === 'scan_progress'
    )?.[1];

    if (progressCallback) {
      act(() => {
        progressCallback({
          scan_id: 'scan-123',
          tool: 'nmap',
          progress: 50,
          status: 'running',
          output: 'Scanning ports...'
        });
      });

      // Should show progress update
      await waitFor(() => {
        expect(screen.getByText(/50%/)).toBeInTheDocument();
      });
    }
  });

  it('should handle error states gracefully', async () => {
    // Mock API errors
    vi.mocked(authService.getCurrentUser).mockRejectedValue(
      new Error('Network error')
    );

    vi.mocked(scanService.startScan).mockRejectedValue(
      new Error('Scan failed')
    );

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Should handle auth error gracefully
    await waitFor(() => {
      // Should redirect to login or show error
      expect(
        screen.getByText(/error/i) || screen.getByText(/login/i)
      ).toBeInTheDocument();
    });
  });

  it('should maintain state consistency across navigation', async () => {
    // Mock user preferences
    vi.mocked(settingsService.getPreferences).mockResolvedValue({
      theme: 'dark',
      default_tools: ['nmap', 'gobuster'],
      notifications_enabled: true
    });

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });

    // Navigate to settings
    const settingsButton = screen.getByText(/settings/i);
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText(/profile/i)).toBeInTheDocument();
    });

    // Update preferences
    vi.mocked(settingsService.updatePreferences).mockResolvedValue({
      theme: 'light',
      default_tools: ['nmap'],
      notifications_enabled: false
    });

    // Navigate back to dashboard
    const dashboardButton = screen.getByText(/dashboard/i);
    fireEvent.click(dashboardButton);

    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });

    // State should be consistent
    expect(document.body.getAttribute('data-theme')).toBe('light');
  });

  it('should handle responsive design interactions', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667
    });

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });

    // Test mobile navigation
    const mobileMenuButton = screen.queryByRole('button', { name: /menu/i });
    if (mobileMenuButton) {
      fireEvent.click(mobileMenuButton);
      
      await waitFor(() => {
        expect(screen.getByText(/scan/i)).toBeVisible();
      });
    }

    // Test touch interactions
    const scanButton = screen.getByText(/scan/i);
    fireEvent.touchStart(scanButton);
    fireEvent.touchEnd(scanButton);

    await waitFor(() => {
      expect(screen.getByText(/target ip/i)).toBeInTheDocument();
    });
  });

  it('should handle session management correctly', async () => {
    // Mock session expiration
    vi.mocked(authService.isAuthenticated).mockReturnValue(false);
    vi.mocked(authService.getCurrentUser).mockRejectedValue(
      new Error('Session expired')
    );

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Should redirect to login
    await waitFor(() => {
      expect(screen.getByText(/login/i)).toBeInTheDocument();
    });

    // Mock successful login
    vi.mocked(authService.login).mockResolvedValue({
      user: { id: 1, username: 'testuser', email: 'test@example.com' },
      token: 'new-token'
    });

    vi.mocked(authService.isAuthenticated).mockReturnValue(true);
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    });

    // Login
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(loginButton);

    // Should redirect to dashboard
    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });
  });
});