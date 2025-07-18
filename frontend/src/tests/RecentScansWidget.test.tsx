import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { RecentScansWidget } from '../components/dashboard/RecentScansWidget';
import type { RecentScansResponse } from '../services/dashboardService';

// Mock the dashboard service
vi.mock('../services/dashboardService', () => ({
  dashboardService: {
    getRecentScans: vi.fn(),
  },
}));

// Mock React Router navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock data
const mockRecentScans: RecentScansResponse = {
  recent_scans: [
    {
      id: 1,
      target_ip: '192.168.1.1',
      tools_used: ['nmap', 'gobuster'],
      status: 'completed',
      started_at: '2024-01-01T10:00:00Z',
      completed_at: '2024-01-01T10:05:00Z',
      duration: 300,
    },
    {
      id: 2,
      target_ip: '10.0.0.1',
      tools_used: ['nmap'],
      status: 'running',
      started_at: '2024-01-01T11:00:00Z',
      completed_at: null,
      duration: null,
    },
    {
      id: 3,
      target_ip: '172.16.0.1',
      tools_used: ['dirb'],
      status: 'failed',
      started_at: '2024-01-01T09:00:00Z',
      completed_at: '2024-01-01T09:02:00Z',
      duration: 120,
      error_message: 'Connection timeout',
    },
  ],
};

describe('RecentScansWidget - Task 5.2 Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state when data is being fetched', () => {
      // Mock loading state
      vi.doMock('../hooks/useDashboard', () => ({
        useRecentScans: () => ({
          data: undefined,
          isLoading: true,
          error: null,
        }),
      }));

      renderWithProviders(<RecentScansWidget />);

      expect(screen.getByText('Recent Scans')).toBeInTheDocument();
      expect(screen.getByText('Loading recent scans...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error state when API call fails', () => {
      // Mock error state
      vi.doMock('../hooks/useDashboard', () => ({
        useRecentScans: () => ({
          data: undefined,
          isLoading: false,
          error: new Error('API Error'),
        }),
      }));

      renderWithProviders(<RecentScansWidget />);

      expect(screen.getByText('Failed to load recent scans')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no scans exist', () => {
      // Mock empty state
      vi.doMock('../hooks/useDashboard', () => ({
        useRecentScans: () => ({
          data: { recent_scans: [] },
          isLoading: false,
          error: null,
        }),
      }));

      renderWithProviders(<RecentScansWidget />);

      expect(screen.getByText('No scans yet')).toBeInTheDocument();
      expect(screen.getByText('Start Your First Scan')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('should display recent scans with proper formatting', () => {
      // Mock successful data fetch
      vi.doMock('../hooks/useDashboard', () => ({
        useRecentScans: () => ({
          data: mockRecentScans,
          isLoading: false,
          error: null,
        }),
      }));

      renderWithProviders(<RecentScansWidget />);

      // Check that scan data is displayed
      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
      expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
      expect(screen.getByText('172.16.0.1')).toBeInTheDocument();

      // Check status indicators
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('running')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();

      // Check tools
      expect(screen.getByText('nmap')).toBeInTheDocument();
      expect(screen.getByText('gobuster')).toBeInTheDocument();
      expect(screen.getByText('dirb')).toBeInTheDocument();
    });

    it('should show error message for failed scans', () => {
      // Mock successful data fetch
      vi.doMock('../hooks/useDashboard', () => ({
        useRecentScans: () => ({
          data: mockRecentScans,
          isLoading: false,
          error: null,
        }),
      }));

      renderWithProviders(<RecentScansWidget />);

      expect(screen.getByText('Connection timeout')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to scan details when scan item is clicked', () => {
      // Mock successful data fetch
      vi.doMock('../hooks/useDashboard', () => ({
        useRecentScans: () => ({
          data: mockRecentScans,
          isLoading: false,
          error: null,
        }),
      }));

      renderWithProviders(<RecentScansWidget />);

      // Find and click on a scan item
      const scanItem = screen.getByText('192.168.1.1').closest('.scan-item');
      if (scanItem) {
        fireEvent.click(scanItem);
        expect(mockNavigate).toHaveBeenCalledWith('/history?scan=1');
      }
    });

    it('should navigate to history page when View All button is clicked', () => {
      // Mock successful data fetch
      vi.doMock('../hooks/useDashboard', () => ({
        useRecentScans: () => ({
          data: mockRecentScans,
          isLoading: false,
          error: null,
        }),
      }));

      renderWithProviders(<RecentScansWidget />);

      const viewAllButton = screen.getByText('View All Scans');
      fireEvent.click(viewAllButton);
      expect(mockNavigate).toHaveBeenCalledWith('/history');
    });

    it('should navigate to scan page when Start Your First Scan is clicked', () => {
      // Mock empty state
      vi.doMock('../hooks/useDashboard', () => ({
        useRecentScans: () => ({
          data: { recent_scans: [] },
          isLoading: false,
          error: null,
        }),
      }));

      renderWithProviders(<RecentScansWidget />);

      const startScanButton = screen.getByText('Start Your First Scan');
      fireEvent.click(startScanButton);
      expect(mockNavigate).toHaveBeenCalledWith('/scan');
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard navigation for scan items', () => {
      // Mock successful data fetch
      vi.doMock('../hooks/useDashboard', () => ({
        useRecentScans: () => ({
          data: mockRecentScans,
          isLoading: false,
          error: null,
        }),
      }));

      renderWithProviders(<RecentScansWidget />);

      const scanItem = screen.getByText('192.168.1.1').closest('.scan-item');
      if (scanItem) {
        // Test Enter key
        fireEvent.keyDown(scanItem, { key: 'Enter' });
        expect(mockNavigate).toHaveBeenCalledWith('/history?scan=1');

        // Test Space key
        fireEvent.keyDown(scanItem, { key: ' ' });
        expect(mockNavigate).toHaveBeenCalledWith('/history?scan=1');
      }
    });

    it('should have proper ARIA attributes', () => {
      // Mock successful data fetch
      vi.doMock('../hooks/useDashboard', () => ({
        useRecentScans: () => ({
          data: mockRecentScans,
          isLoading: false,
          error: null,
        }),
      }));

      renderWithProviders(<RecentScansWidget />);

      const scanItems = document.querySelectorAll('.scan-item');
      scanItems.forEach(item => {
        expect(item).toHaveAttribute('role', 'button');
        expect(item).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Status Indicators', () => {
    it('should display correct status icons and colors', () => {
      // Mock successful data fetch
      vi.doMock('../hooks/useDashboard', () => ({
        useRecentScans: () => ({
          data: mockRecentScans,
          isLoading: false,
          error: null,
        }),
      }));

      renderWithProviders(<RecentScansWidget />);

      // Check that scan items have proper status classes
      const scanItems = document.querySelectorAll('.scan-item');
      expect(scanItems[0]).toHaveClass('success'); // completed
      expect(scanItems[1]).toHaveClass('warning'); // running
      expect(scanItems[2]).toHaveClass('error'); // failed
    });
  });
});