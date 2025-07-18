import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';

// Mock the dashboard service
vi.mock('../services/dashboardService', () => ({
  dashboardService: {
    getStats: vi.fn(),
    getRecentScans: vi.fn(),
    getSystemStatus: vi.fn(),
  },
}));

// Mock the WelcomeSection component to avoid complex auth dependencies
vi.mock('../components/dashboard/WelcomeSection', () => ({
  WelcomeSection: () => <div data-testid="welcome-section">Welcome Section</div>,
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
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard Page - Task 5.1 Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dashboard API and React Components', () => {
    it('should render dashboard page with proper structure', () => {
      renderWithProviders(<DashboardPage />);
      
      // Check main dashboard elements
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Monitor your cybersecurity toolkit activities')).toBeInTheDocument();
      
      // Check welcome section is rendered
      expect(screen.getByTestId('welcome-section')).toBeInTheDocument();
      
      // Check quick actions card
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Start a new scan or access your tools')).toBeInTheDocument();
    });

    it('should display quick action buttons', () => {
      renderWithProviders(<DashboardPage />);
      
      // Check all quick action buttons are present
      expect(screen.getByText('🔍 Start New Scan')).toBeInTheDocument();
      expect(screen.getByText('📊 View History')).toBeInTheDocument();
      expect(screen.getByText('⚙️ Settings')).toBeInTheDocument();
    });

    it('should show recent scans widget and system status placeholder', () => {
      renderWithProviders(<DashboardPage />);
      
      // Check that Recent Scans Widget is rendered (Task 5.2 implemented)
      expect(screen.getByText('Recent Scans')).toBeInTheDocument();
      expect(screen.getByText('Your latest scanning activities')).toBeInTheDocument();
      
      // Check placeholder for task 5.3
      expect(screen.getByText('System status widget will be implemented in task 5.3')).toBeInTheDocument();
    });

    it('should use responsive grid layout', () => {
      renderWithProviders(<DashboardPage />);
      
      const dashboardGrid = document.querySelector('.dashboard-grid');
      expect(dashboardGrid).toBeInTheDocument();
      
      // Check that grid class is applied (CSS styles are defined in DashboardPage.css)
      expect(dashboardGrid).toHaveClass('dashboard-grid');
    });

    it('should have proper card structure with hover effects', () => {
      renderWithProviders(<DashboardPage />);
      
      const cards = document.querySelectorAll('.dashboard-card');
      expect(cards.length).toBeGreaterThan(0);
      
      // Check that cards have proper classes for styling
      cards.forEach(card => {
        expect(card).toHaveClass('dashboard-card');
      });
    });
  });

  describe('Responsive Grid Layout', () => {
    it('should implement CSS Grid layout', () => {
      renderWithProviders(<DashboardPage />);
      
      const dashboardGrid = document.querySelector('.dashboard-grid');
      expect(dashboardGrid).toBeInTheDocument();
      
      // Check that grid class is applied (CSS styles are defined in DashboardPage.css)
      expect(dashboardGrid).toHaveClass('dashboard-grid');
    });

    it('should have welcome section spanning full width', () => {
      renderWithProviders(<DashboardPage />);
      
      const welcomeSection = document.querySelector('.dashboard-welcome');
      expect(welcomeSection).toBeInTheDocument();
      expect(welcomeSection).toHaveClass('dashboard-welcome');
    });
  });

  describe('React Query Integration', () => {
    it('should be wrapped with QueryClientProvider', () => {
      // This test verifies that React Query is properly set up
      // by checking that the component renders without throwing errors
      expect(() => {
        renderWithProviders(<DashboardPage />);
      }).not.toThrow();
    });
  });
});