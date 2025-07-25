/**
 * Scan service for managing security scans
 */

import { apiClient } from './apiClient';

export interface ScanRequest {
  target: string;
  tools: Array<{
    tool_name: string;
    options: Record<string, any>;
  }>;
}

export interface ScanResponse {
  scan_id: string;
  status: string;
}

export interface ScanStatus {
  scan_id: string;
  status: string;
  progress: number;
  output?: string;
}

export const scanService = {
  /**
   * Start a new scan
   */
  async startScan(scanRequest: ScanRequest): Promise<ScanResponse> {
    const response = await apiClient.post('/scans/start', scanRequest);
    return response.data;
  },

  /**
   * Get scan status
   */
  async getScanStatus(scanId: string): Promise<ScanStatus> {
    const response = await apiClient.get(`/scans/${scanId}/status`);
    return response.data;
  },

  /**
   * Stop a running scan
   */
  async stopScan(scanId: string): Promise<void> {
    await apiClient.post(`/scans/${scanId}/stop`);
  },

  /**
   * Get scan results
   */
  async getScanResults(scanId: string): Promise<any> {
    const response = await apiClient.get(`/scans/${scanId}/results`);
    return response.data;
  },

  /**
   * Export scan results
   */
  async exportScanResults(scanId: string, format: string = 'json'): Promise<Blob> {
    const response = await apiClient.get(`/scans/${scanId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }
};