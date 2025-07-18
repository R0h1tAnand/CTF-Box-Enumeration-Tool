import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import type { DashboardStats, RecentScansResponse, SystemStatus } from '../services/dashboardService';

// Query keys for React Query
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  recentScans: () => [...dashboardKeys.all, 'recent-scans'] as const,
  systemStatus: () => [...dashboardKeys.all, 'system-status'] as const,
};

// Hook for dashboard statistics
export const useDashboardStats = () => {
  return useQuery<DashboardStats>({
    queryKey: dashboardKeys.stats(),
    queryFn: dashboardService.getStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

// Hook for recent scans
export const useRecentScans = () => {
  return useQuery<RecentScansResponse>({
    queryKey: dashboardKeys.recentScans(),
    queryFn: dashboardService.getRecentScans,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
};

// Hook for system status
export const useSystemStatus = () => {
  return useQuery<SystemStatus>({
    queryKey: dashboardKeys.systemStatus(),
    queryFn: dashboardService.getSystemStatus,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};