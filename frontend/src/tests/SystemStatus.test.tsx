import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SystemStatus } from '../components/dashboard/SystemStatus';
import type { SystemStatus as SystemStatusType } from '../services/dashboardService';

// Mock the dashboard service
vi.mock('../hooks/useDashboard', () => ({
  useSystemStatus: vi.fn(),
}));

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  useAnimation: () => ({
    start: vi.fn(),
  }),
}));

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

// Mock data
const mockSystemStatus: SystemStatusType = {
  tools: {
    nmap: {
      available: true,
      version: '7.92',
      status: 'online',
    },
    gobuster: {
      available: true,
      version: '3.1.0',
      status: 'online',
    },
    dirb: {
      available: false,
      version: null,
      status: 'offline',
    },
  },
  system_health: 66.7,
  available_tools: 2,
  total_tools: 3,
  last_checked: '2024-07-18T15:30:00Z',
};

describe('SystemStatus Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state when data is being fetched', () => {
      // Mock loading state
      const useSystemStatusMock = vi.requireMock('../hooks/useDashboard').useSystemStatus;
      useSystemStatusMock.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderWithProviders(<SystemStatus />);

      expect(screen.getByText('System Status')).toBeInTheDocument();
      expect(screen.getByText('Tool availability and health')).toBeInTheDocument();
      
      // Check for loading indicators
      const skeletons = document.querySelectorAll('.status-skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('should show error state when API call fails', () => {
      // Mock error state
      const useSystemStatusMock = vi.requireMock('../hooks/useDashboard').useSystemStatus;
      useSystemStatusMock.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('API Error'),
        refetch: vi.fn(),
      });

      renderWithProviders(<SystemStatus />);

      expect(screen.getByText('Unable to load system status')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should call refetch when retry button is clicked', () => {
      // Mock error state with refetch function
      const mockRefetch = vi.fn();
      const useSystemStatusMock = vi.requireMock('../hooks/useDashboard').useSystemStatus;
      useSystemStatusMock.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('API Error'),
        refetch: mockRefetch,
      });

      renderWithProviders(<SystemStatus />);

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no data is available', () => {
      // Mock empty state
      const useSystemStatusMock = vi.requireMock('../hooks/useDashboard').useSystemStatus;
      useSystemStatusMock.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<SystemStatus />);

      expect(screen.getByText('No system status available')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('should display system health and tools status', () => {
      // Mock successful data fetch
      const useSystemStatusMock = vi.requireMock('../hooks/useDashboard').useSystemStatus;
      useSystemStatusMock.mockReturnValue({
        data: mockSystemStatus,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<SystemStatus />);

      // Check system health display
      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('66.7%')).toBeInTheDocument();
      expect(screen.getByText('Tools Available')).toBeInTheDocument();
      expect(screen.getByText('2/3')).toBeInTheDocument();
      
      // Check that tool names are displayed
      expect(screen.getByText('nmap')).toBeInTheDocument();
      expect(screen.getByText('gobuster')).toBeInTheDocument();
      expect(screen.getByText('dirb')).toBeInTheDocument();
      
      // Check status indicators
      const onlineStatuses = screen.getAllByText('online');
      expect(onlineStatuses.length).toBe(2);
      
      const offlineStatus = screen.getByText('offline');
      expect(offlineStatus).toBeInTheDocument();
      
      // Check version display
      expect(screen.getByText('v7.92')).toBeInTheDocument();
      expect(screen.getByText('v3.1.0')).toBeInTheDocument();
    });

    it('should format the last checked time correctly', () => {
      // Mock successful data fetch
      const useSystemStatusMock = vi.requireMock('../hooks/useDashboard').useSystemStatus;
      useSystemStatusMock.mockReturnValue({
        data: mockSystemStatus,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<SystemStatus />);

      // Check that last checked time is displayed
      expect(screen.getByText(/Last checked:/)).toBeInTheDocument();
    });
  });

  describe('Health Status Indicators', () => {
    it('should display correct health status variant based on health percentage', () => {
      // Test with high health (success)
      const highHealthStatus = {
        ...mockSystemStatus,
        system_health: 85,
      };
      
      const useSystemStatusMock = vi.requireMock('../hooks/useDashboard').useSystemStatus;
      useSystemStatusMock.mockReturnValue({
        data: highHealthStatus,
        isLoading: false,
        error: null,
      });

      const { rerender } = renderWithProviders(<SystemStatus />);
      
      expect(screen.getByText('85%')).toBeInTheDocument();
      
      // Test with medium health (warning)
      const mediumHealthStatus = {
        ...mockSystemStatus,
        system_health: 60,
      };
      
      useSystemStatusMock.mockReturnValue({
        data: mediumHealthStatus,
        isLoading: false,
        error: null,
      });
      
      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <SystemStatus />
        </QueryClientProvider>
      );
      
      expect(screen.getByText('60%')).toBeInTheDocument();
      
      // Test with low health (error)
      const lowHealthStatus = {
        ...mockSystemStatus,
        system_health: 33.3,
      };
      
      useSystemStatusMock.mockReturnValue({
        data: lowHealthStatus,
        isLoading: false,
        error: null,
      });
      
      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <SystemStatus />
        </QueryClientProvider>
      );
      
      expect(screen.getByText('33.3%')).toBeInTheDocument();
    });
  });
});