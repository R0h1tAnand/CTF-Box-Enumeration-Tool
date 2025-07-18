import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { ScanProgressEvent } from '../types/scanning';

interface ToolProgress {
  progress: number;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  lastUpdate: Date;
  output?: string;
}

interface UseScanProgressOptions {
  onComplete?: () => void;
  onError?: (error: any) => void;
}

interface UseScanProgressReturn {
  toolProgress: Record<string, ToolProgress>;
  overallProgress: number;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  reconnectAttempts: number;
  stopScan: () => Promise<void>;
}

/**
 * Hook for tracking scan progress via WebSocket
 */
export const useScanProgress = (
  scanId: string,
  tools: string[],
  options: UseScanProgressOptions = {}
): UseScanProgressReturn => {
  const { onComplete, onError } = options;
  
  const [toolProgress, setToolProgress] = useState<Record<string, ToolProgress>>({});
  const [overallProgress, setOverallProgress] = useState<number>(0);
  
  // Initialize WebSocket connection
  const {
    isConnected,
    isConnecting,
    error,
    reconnectAttempts,
    joinScan,
    leaveScan
  } = useWebSocket({
    onError
  });

  // Initialize tool progress
  useEffect(() => {
    const initialProgress: Record<string, ToolProgress> = {};
    
    tools.forEach(tool => {
      initialProgress[tool] = {
        progress: 0,
        status: 'running',
        lastUpdate: new Date()
      };
    });
    
    setToolProgress(initialProgress);
  }, [tools]);

  // Calculate overall progress
  useEffect(() => {
    if (Object.keys(toolProgress).length === 0) return;
    
    const totalProgress = Object.values(toolProgress).reduce((sum, tool) => sum + tool.progress, 0);
    const calculatedProgress = Math.round(totalProgress / Object.keys(toolProgress).length);
    
    setOverallProgress(calculatedProgress);
    
    // Check if all tools are completed or failed
    const allDone = Object.values(toolProgress).every(tool => 
      tool.status === 'completed' || tool.status === 'failed' || tool.status === 'stopped'
    );
    
    if (allDone && onComplete) {
      onComplete();
    }
  }, [toolProgress, onComplete]);

  // Handle progress updates
  const handleProgressUpdate = useCallback((data: ScanProgressEvent) => {
    if (data.scanId !== scanId) return;
    
    setToolProgress(prev => ({
      ...prev,
      [data.tool]: {
        progress: data.progress,
        status: data.status,
        lastUpdate: new Date(),
        output: data.output
      }
    }));
  }, [scanId]);

  // Join scan room when connected
  useEffect(() => {
    if (isConnected && scanId) {
      const token = localStorage.getItem('token');
      if (token) {
        joinScan(scanId, token);
      }
    }
  }, [isConnected, scanId, joinScan]);

  // Subscribe to scan progress events
  useEffect(() => {
    const handleScanProgress = (data: ScanProgressEvent) => {
      handleProgressUpdate(data);
    };

    // Add event listener for scan progress
    window.addEventListener('scan_progress', (e: any) => handleScanProgress(e.detail));

    // Clean up
    return () => {
      window.removeEventListener('scan_progress', (e: any) => handleScanProgress(e.detail));
      if (scanId) {
        leaveScan(scanId);
      }
    };
  }, [scanId, handleProgressUpdate, leaveScan]);

  // Stop scan function
  const stopScan = useCallback(async () => {
    try {
      const response = await fetch(`/api/scans/${scanId}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop scan');
      }
      
      // Update all running tools to stopped
      setToolProgress(prev => {
        const updated = { ...prev };
        
        Object.keys(updated).forEach(tool => {
          if (updated[tool].status === 'running') {
            updated[tool] = {
              ...updated[tool],
              status: 'stopped'
            };
          }
        });
        
        return updated;
      });
    } catch (err) {
      console.error('Error stopping scan:', err);
      if (onError) {
        onError(err);
      }
    }
  }, [scanId, onError]);

  return {
    toolProgress,
    overallProgress,
    isConnected,
    isConnecting,
    error,
    reconnectAttempts,
    stopScan
  };
};

export default useScanProgress;