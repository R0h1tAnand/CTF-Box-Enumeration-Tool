import { apiUtils } from './apiClient';

// Types for dashboard API responses
export interface UserStats {
  total_scans: number;
  completed_scans: number;
  failed_scans: number;
  running_scans: number;
  success_rate: number;
  recent_scans: number;
}

export interface UserInfo {
  username: string;
  email: string;
  member_since: string | null;
  last_login: string | null;
}

export interface DashboardStats {
  user: UserInfo;
  stats: UserStats;
}

export interface RecentScan {
  id: number;
  target_ip: string;
  tools_used: string[];
  status: 'running' | 'completed' | 'failed' | 'stopped';
  started_at: string | null;
  completed_at: string | null;
  duration: number | null;
  error_message?: string;
}

export interface RecentScansResponse {
  recent_scans: RecentScan[];
}

export interface ToolStatus {
  available: boolean;
  version: string | null;
  status: 'online' | 'offline';
}

export interface SystemStatus {
  tools: {
    nmap: ToolStatus;
    gobuster: ToolStatus;
    dirb: ToolStatus;
  };
  system_health: number;
  available_tools: number;
  total_tools: number;
  last_checked: string;
}

export const dashboardService = {
  // Get dashboard statistics
  async getStats(): Promise<DashboardStats> {
    return apiUtils.get<DashboardStats>('/api/dashboard/stats');
  },

  // Get recent scans
  async getRecentScans(): Promise<RecentScansResponse> {
    return apiUtils.get<RecentScansResponse>('/api/dashboard/recent-scans');
  },

  // Get system status
  async getSystemStatus(): Promise<SystemStatus> {
    return apiUtils.get<SystemStatus>('/api/dashboard/system-status');
  },
};