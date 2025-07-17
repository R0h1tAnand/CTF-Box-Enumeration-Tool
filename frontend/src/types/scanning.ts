export interface ScanConfig {
  target_ip: string;
  tools: string[];
  options?: Record<string, any>;
}

export interface ScanResult {
  id: number;
  tool: string;
  output: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  progress: number;
}

export interface ScanHistory {
  id: number;
  user_id: number;
  target_ip: string;
  tools_used: string[];
  status: string;
  started_at: string;
  completed_at?: string;
  results_path?: string;
  scan_config: ScanConfig;
}

export interface ScanProgressEvent {
  scanId: string;
  tool: string;
  progress: number;
  status: 'running' | 'completed' | 'failed';
  output?: string;
}