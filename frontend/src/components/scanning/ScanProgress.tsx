import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Button } from '../ui/Button';
import { ScanProgressEvent } from '../../types/scanning';
import './ScanProgress.css';

interface ScanProgressProps {
  scanId: string;
  tools: string[];
  onStop: () => void;
  onComplete: () => void;
}

export const ScanProgress: React.FC<ScanProgressProps> = ({ 
  scanId, 
  tools, 
  onStop,
  onComplete
}) => {
  const [toolProgress, setToolProgress] = useState<Record<string, { 
    progress: number, 
    status: 'running' | 'completed' | 'failed' | 'stopped' 
  }>>({});
  
  const [overallProgress, setOverallProgress] = useState(0);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize tool progress
  useEffect(() => {
    const initialProgress: Record<string, { progress: number, status: 'running' | 'completed' | 'failed' | 'stopped' }> = {};
    
    tools.forEach(tool => {
      initialProgress[tool] = {
        progress: 0,
        status: 'running'
      };
    });
    
    setToolProgress(initialProgress);
  }, [tools]);

  // Calculate overall progress
  useEffect(() => {
    if (Object.keys(toolProgress).length === 0) return;
    
    const totalProgress = Object.values(toolProgress).reduce((sum, tool) => sum + tool.progress, 0);
    const calculatedProgress = totalProgress / Object.keys(toolProgress).length;
    
    setOverallProgress(calculatedProgress);
    
    // Check if all tools are completed or failed
    const allDone = Object.values(toolProgress).every(tool => 
      tool.status === 'completed' || tool.status === 'failed' || tool.status === 'stopped'
    );
    
    if (allDone) {
      onComplete();
    }
  }, [toolProgress, onComplete]);

  // Connect to WebSocket
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Create WebSocket connection
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/socket.io/?EIO=4&transport=websocket`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
      
      // Join scan room
      ws.send(JSON.stringify({
        event: 'join_scan',
        data: {
          scan_id: scanId,
          token
        }
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        // Parse Socket.IO message format
        const data = event.data;
        
        // Socket.IO v4 message format starts with a number followed by JSON
        if (data.startsWith('42')) {
          const jsonStr = data.substring(2);
          const [eventName, eventData] = JSON.parse(jsonStr);
          
          if (eventName === 'scan_progress') {
            handleProgressUpdate(eventData);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    setSocket(ws);
    
    // Clean up WebSocket connection
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          event: 'leave_scan',
          data: {
            scan_id: scanId
          }
        }));
        ws.close();
      }
    };
  }, [scanId]);

  const handleProgressUpdate = (data: ScanProgressEvent) => {
    if (data.scanId !== scanId) return;
    
    setToolProgress(prev => ({
      ...prev,
      [data.tool]: {
        progress: data.progress,
        status: data.status
      }
    }));
  };

  const handleStopScan = () => {
    onStop();
  };

  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'stopped':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'stopped':
        return 'Stopped';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card className="scan-progress">
      <CardHeader>
        <CardTitle>Scan Progress</CardTitle>
        <div className="scan-progress__actions">
          <Button 
            variant="danger" 
            size="sm" 
            onClick={handleStopScan}
            disabled={overallProgress === 100}
          >
            Stop Scan
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        <div className="scan-progress__overall">
          <h4>Overall Progress</h4>
          <ProgressBar 
            value={overallProgress} 
            showLabel 
            size="lg"
            variant={overallProgress === 100 ? 'success' : 'default'}
            striped
            animated
          />
        </div>
        
        <div className="scan-progress__tools">
          <h4>Tool Progress</h4>
          
          <AnimatePresence>
            {Object.entries(toolProgress).map(([tool, data]) => (
              <motion.div
                key={tool}
                className="scan-progress__tool"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="scan-progress__tool-header">
                  <h5>{tool}</h5>
                  <span className={`scan-progress__status scan-progress__status--${data.status}`}>
                    {getStatusLabel(data.status)}
                  </span>
                </div>
                <ProgressBar 
                  value={data.progress} 
                  showLabel 
                  variant={getStatusVariant(data.status)}
                  striped={data.status === 'running'}
                  animated={data.status === 'running'}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {!isConnected && (
          <div className="scan-progress__connection-warning">
            <p>WebSocket connection lost. Reconnecting...</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
};