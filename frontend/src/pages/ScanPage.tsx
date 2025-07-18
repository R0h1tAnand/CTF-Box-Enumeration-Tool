import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanForm, ScanProgress, ScanResults } from '../components/scanning';
import { ScanConfig } from '../types/scanning';
import webSocketService from '../services/WebSocketService';
import './ScanPage.css';

export const ScanPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanConfig, setScanConfig] = useState<ScanConfig | null>(null);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [scanResults, setScanResults] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize WebSocket connection when component mounts
  useEffect(() => {
    // Connect to WebSocket server
    webSocketService.connect().catch(err => {
      console.error('Failed to connect to WebSocket server:', err);
    });

    // Clean up WebSocket connection when component unmounts
    return () => {
      webSocketService.disconnect();
    };
  }, []);

  const handleStartScan = async (config: ScanConfig) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/scans/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          target: config.target_ip,
          tools: config.tools.map(tool => ({
            tool_name: tool,
            options: config.options?.[tool] || {}
          }))
        })
      });
      
      const data = await response.json();
      
      if (response.ok && !data.error) {
        setScanId(data.scan_id);
        setScanConfig(config);
        
        // Ensure WebSocket is connected before joining scan room
        if (!webSocketService.isConnected()) {
          await webSocketService.connect();
        }
      } else {
        setError(data.message || 'Failed to start scan');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error starting scan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopScan = async () => {
    if (!scanId) return;
    
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
    } catch (err) {
      console.error('Error stopping scan:', err);
      setError('Failed to stop scan. Please try again.');
    }
  };

  const handleScanComplete = async () => {
    if (!scanId) return;
    
    try {
      const response = await fetch(`/api/scans/${scanId}/results`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok && !data.error) {
        setScanResults(data.data);
        setScanCompleted(true);
        
        // Leave scan room when completed
        webSocketService.leaveScan(scanId);
      } else {
        setError(data.message || 'Failed to fetch scan results');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error fetching scan results:', err);
    }
  };

  const handleNewScan = () => {
    // Leave current scan room if exists
    if (scanId) {
      webSocketService.leaveScan(scanId);
    }
    
    // Reset state
    setScanId(null);
    setScanConfig(null);
    setScanCompleted(false);
    setScanResults(null);
    setError(null);
  };

  // Page transition variants
  const pageTransition = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 30 
    }
  };

  return (
    <motion.div 
      className="scan-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Security Scan
      </motion.h1>
      
      <motion.p 
        className="scan-page__description"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        Configure and run security scans using various cybersecurity tools.
      </motion.p>
      
      <AnimatePresence>
        {error && (
          <motion.div 
            className="scan-page__error"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <p>{error}</p>
            <button 
              className="scan-page__error-close" 
              onClick={() => setError(null)}
              aria-label="Close error message"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence mode="wait">
        {!scanId && (
          <motion.div
            key="scan-form"
            {...pageTransition}
          >
            <ScanForm onSubmit={handleStartScan} isLoading={isLoading} />
          </motion.div>
        )}
        
        {scanId && scanConfig && !scanCompleted && (
          <motion.div
            key="scan-progress"
            {...pageTransition}
          >
            <ScanProgress 
              scanId={scanId} 
              tools={scanConfig.tools} 
              onStop={handleStopScan}
              onComplete={handleScanComplete}
            />
          </motion.div>
        )}
        
        {scanId && scanCompleted && scanResults && (
          <motion.div
            key="scan-results"
            {...pageTransition}
          >
            <ScanResults scanId={scanId} results={scanResults} />
            
            <motion.div 
              className="scan-page__actions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <button 
                className="scan-page__new-scan" 
                onClick={handleNewScan}
              >
                Start New Scan
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};