import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { ProgressBar, CircularProgress } from '../ui/ProgressBar';
import { Button } from '../ui/Button';
import { LoadingAnimation } from '../ui/LoadingAnimation';
import { useScanProgress } from '../../hooks/useScanProgress';
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
  const {
    toolProgress,
    overallProgress,
    isConnected,
    isConnecting,
    error,
    reconnectAttempts,
    stopScan
  } = useScanProgress(scanId, tools, {
    onComplete,
    onError: (err) => console.error('Scan progress error:', err)
  });

  // Handle stop scan
  const handleStopScan = async () => {
    await stopScan();
    onStop();
  };

  // Get variant for progress bar based on status
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

  // Get human-readable status label
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

  // Animation variants for progress elements
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 24 
      }
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
        <motion.div 
          className="scan-progress__overall"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="scan-progress__overall-header">
            <h4>Overall Progress</h4>
            <AnimatePresence mode="wait">
              {overallProgress === 0 ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  <LoadingAnimation 
                    type="cyber" 
                    size="medium" 
                    message="Initializing scan..."
                    typingEffect={true}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  <CircularProgress 
                    value={overallProgress} 
                    size={60} 
                    strokeWidth={6}
                    variant={overallProgress === 100 ? 'success' : 'default'}
                    animated
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <ProgressBar 
            value={overallProgress} 
            showLabel 
            size="lg"
            variant={overallProgress === 100 ? 'success' : 'default'}
            striped
            animated
          />
        </motion.div>
        
        <motion.div 
          className="scan-progress__tools"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <h4>Tool Progress</h4>
          
          <AnimatePresence mode="wait">
            {Object.entries(toolProgress).map(([tool, data]) => (
              <motion.div
                key={tool}
                className="scan-progress__tool"
                variants={itemVariants}
                layout
                layoutId={`tool-${tool}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 500,
                  damping: 30
                }}
              >
                <div className="scan-progress__tool-header">
                  <h5>{tool}</h5>
                  <motion.span 
                    className={`scan-progress__status scan-progress__status--${data.status}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    {getStatusLabel(data.status)}
                  </motion.span>
                </div>
                <ProgressBar 
                  value={data.progress} 
                  showLabel 
                  variant={getStatusVariant(data.status)}
                  striped={data.status === 'running'}
                  animated={data.status === 'running'}
                />
                
                {data.status === 'running' && (
                  <motion.div 
                    className="scan-progress__tool-animation"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <LoadingAnimation 
                      type="terminal" 
                      size="small" 
                      message={`${tool} scan in progress`}
                      showMessage={false}
                    />
                  </motion.div>
                )}
                
                {data.output && (
                  <motion.div 
                    className="scan-progress__output-preview"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <pre>{data.output.split('\n').slice(-3).join('\n')}</pre>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
        
        <AnimatePresence>
          {!isConnected && (
            <motion.div 
              className="scan-progress__connection-warning"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <p>
                {isConnecting 
                  ? `WebSocket reconnecting... (Attempt ${reconnectAttempts})` 
                  : 'WebSocket connection lost. Reconnecting...'}
              </p>
              {error && <p className="scan-progress__error-message">{error.message}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </CardBody>
    </Card>
  );
};