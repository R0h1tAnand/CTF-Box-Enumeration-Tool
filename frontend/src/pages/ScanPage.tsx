import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanForm, ScanProgress, ScanResults } from '../components/scanning';
import { ScanConfig } from '../types/scanning';
import './ScanPage.css';

export const ScanPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanConfig, setScanConfig] = useState<ScanConfig | null>(null);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [scanResults, setScanResults] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      await fetch(`/api/scans/${scanId}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (err) {
      console.error('Error stopping scan:', err);
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
      } else {
        setError(data.message || 'Failed to fetch scan results');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error fetching scan results:', err);
    }
  };

  const handleNewScan = () => {
    setScanId(null);
    setScanConfig(null);
    setScanCompleted(false);
    setScanResults(null);
    setError(null);
  };

  return (
    <div className="scan-page">
      <h1>Security Scan</h1>
      <p className="scan-page__description">
        Configure and run security scans using various cybersecurity tools.
      </p>
      
      {error && (
        <motion.div 
          className="scan-page__error"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <p>{error}</p>
          <button className="scan-page__error-close" onClick={() => setError(null)}>×</button>
        </motion.div>
      )}
      
      <AnimatePresence mode="wait">
        {!scanId && (
          <motion.div
            key="scan-form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ScanForm onSubmit={handleStartScan} isLoading={isLoading} />
          </motion.div>
        )}
        
        {scanId && scanConfig && !scanCompleted && (
          <motion.div
            key="scan-progress"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <ScanResults scanId={scanId} results={scanResults} />
            
            <div className="scan-page__actions">
              <button className="scan-page__new-scan" onClick={handleNewScan}>
                Start New Scan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};