import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserStats } from '../components/dashboard/UserStats';
import type { DashboardStats } from '../services/dashboardService';

// Mock data
const mockDashboardStats: DashboardStats = {
  user: {
    username: 'testuse
    ,
    Z',
,
  },
  stats: {
    total_scans: 42,
    ns: 35,

    running_scans: 2,
    success_rate: 83.3,
    recent_scans: 12,
  },
};

// Mock  hook
vi.moc ({
  use({
  ats,
e,
    error: null,
  }),
}));

const createTestQueryClient = () => {
  return new Quer{
    defaultOptions: {
    ries: {
  y: false,

      },
    },
  });
};

const renderWithProviders = (component: Rt) => {
  const queryClient = createTestQueryCl
  
  return r(
    <QueryClientProv
      {component}
    </QueryClientPror>
  );
};

desc=> {
  

  });

  it('should render the{
    rs />);
  
    // Check that the component ren
    expect(screen.getByText('Statistics')).toBeInTheDocument();
    expect(screen.getByTextt();
    
    // Check that stats data is displayed
    expect(screen.getByTscans
    expect(screen.getByTscans
    expect(screen.gescans
    expecans
e
    expect(screen.getByText('12')).toBeIn_scans
 });
});