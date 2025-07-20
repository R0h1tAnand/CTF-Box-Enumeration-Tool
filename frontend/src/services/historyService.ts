import { apiUtils } from './apiClient';
import { ScanHistory } from '../types/scanning';

export interface HistoryFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  tools?: string[];
  target?: string;
  status?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const historyService = {
  // Get paginated scan history with optional filters
  async getScanHistory(filters: HistoryFilters = {}): Promise<PaginatedResponse<ScanHistory>> {
    const queryParams = new URLSearchParams();
    
    // Add all filters to query params
    if (filters.page) queryParams.append('page', filters.page.toString());
    if (filters.limit) queryParams.append('limit', filters.limit.toString());
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.target) queryParams.append('target', filters.target);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.tools && filters.tools.length > 0) {
      filters.tools.forEach(tool => queryParams.append('tools', tool));
    }
    
    const url = `/api/history/scans?${queryParams.toString()}`;
    return apiUtils.get<PaginatedResponse<ScanHistory>>(url);
  },
  
  // Get a specific scan by ID
  async getScanById(scanId: number): Promise<ScanHistory> {
    return apiUtils.get<ScanHistory>(`/api/history/scans/${scanId}`);
  },
  
  // Re-run a previous scan
  async rerunScan(scanId: number): Promise<{ scanId: number }> {
    return apiUtils.post<{ scanId: number }>(`/api/history/scans/${scanId}/rerun`);
  },
  
  // Delete a scan from history
  async deleteScan(scanId: number): Promise<void> {
    return apiUtils.delete<void>(`/api/history/scans/${scanId}`);
  },
  
  // Search scans with a query string
  async searchScans(query: string, page = 1, limit = 20): Promise<PaginatedResponse<ScanHistory>> {
    const queryParams = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString()
    });
    
    return apiUtils.get<PaginatedResponse<ScanHistory>>(`/api/history/search?${queryParams.toString()}`);
  },
  
  // Export scan results in different formats
  async exportScanResults(scanId: number, format: 'txt' | 'json' | 'csv'): Promise<void> {
    return apiUtils.downloadFile(`/api/history/scans/${scanId}/export?format=${format}`, `scan-${scanId}.${format}`);
  }
};

export default historyService;