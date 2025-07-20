import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { historyService } from '../../services/historyService';
import { ScanHistory } from '../../types/scanning';
import { formatDate } from '../../utils/dateUtils';
import './ScanComparisonModal.css';

interface ScanComparisonModalProps {
  primaryScanId: number;
  onClose: () => void;
}

export const ScanComparisonModal: React.FC<ScanComparisonModalProps> = ({
  primaryScanId,
  onClose,
}) => {
  const [primaryScan, setPrimaryScan] = useState<ScanHistory | null>(null);
  const [compareScan, setCompareScan] = useState<ScanHistory | null>(null);
  const [availableScans, setAvailableScans] = useState<ScanHistory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [primaryResults, setPrimaryResults] = useState<string>('');
  const [compareResults, setCompareResults] = useState<string>('');
  const [differences, setDifferences] = useState<string[]>([]);

  useEffect(() => {
    loadPrimaryScan();
    loadAvailableScans();
  }, [primaryScanId]);

  useEffect(() => {
    if (primaryScan && compareScan) {
      compareScans();
    }
  }, [primaryScan, compareScan]);

  const loadPrimaryScan = async () => {
    try {
      const scan = await historyService.getScanById(primaryScanId);
      setPrimaryScan(scan);
      setPrimaryResults(JSON.stringify(scan, null, 2));
    } catch (error) {
      console.error('Failed to load primary scan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableScans = async () => {
    try {
      // Get scans with the same target IP and tools as the primary scan
      const response = await historyService.getScanHistory({
        limit: 100,
      });
      
      // Filter out the primary scan and sort by date (newest first)
      const filteredScans = response.data
        .filter(scan => scan.id !== primaryScanId)
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
      
      setAvailableScans(filteredScans);
    } catch (error) {
      console.error('Failed to load available scans:', error);
    }
  };

  const handleSelectCompareScan = async (scanId: number) => {
    try {
      const scan = await historyService.getScanById(scanId);
      setCompareScan(scan);
      setCompareResults(JSON.stringify(scan, null, 2));
    } catch (error) {
      console.error('Failed to load comparison scan:', error);
    }
  };

  const compareScans = () => {
    if (!primaryScan || !compareScan) return;
    
    // In a real implementation, this would do a more sophisticated comparison
    // For now, we'll just highlight some basic differences
    
    const primaryTools = new Set(primaryScan.tools_used);
    const compareTools = new Set(compareScan.tools_used);
    
    const toolDifferences = [];
    
    // Tools in primary but not in compare
    for (const tool of primaryTools) {
      if (!compareTools.has(tool)) {
        toolDifferences.push(`Tool "${tool}" is only in the primary scan`);
      }
    }
    
    // Tools in compare but not in primary
    for (const tool of compareTools) {
      if (!primaryTools.has(tool)) {
        toolDifferences.push(`Tool "${tool}" is only in the comparison scan`);
      }
    }
    
    // Status difference
    if (primaryScan.status !== compareScan.status) {
      toolDifferences.push(`Status differs: "${primaryScan.status}" vs "${compareScan.status}"`);
    }
    
    // Duration difference
    const primaryDuration = primaryScan.completed_at 
      ? new Date(primaryScan.completed_at).getTime() - new Date(primaryScan.started_at).getTime() 
      : 0;
    
    const compareDuration = compareScan.completed_at 
      ? new Date(compareScan.completed_at).getTime() - new Date(compareScan.started_at).getTime() 
      : 0;
    
    const durationDiff = Math.abs(primaryDuration - compareDuration);
    if (durationDiff > 1000) { // More than 1 second difference
      const diffSeconds = Math.round(durationDiff / 1000);
      toolDifferences.push(`Duration differs by ${diffSeconds} seconds`);
    }
    
    setDifferences(toolDifferences);
  };

  return (
    <AnimatePresence>
      <div className="scan-comparison-modal-overlay" onClick={onClose}>
        <motion.div 
          className="scan-comparison-modal"
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="scan-comparison-header">
            <h2>Scan Comparison</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          
          {isLoading ? (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <span>Loading scan data...</span>
            </div>
          ) : (
            <>
              <div className="scan-selection">
                <div className="primary-scan">
                  <h3>Primary Scan</h3>
                  {primaryScan && (
                    <div className="scan-info">
                      <div className="scan-target">{primaryScan.target_ip}</div>
                      <div className="scan-date">{formatDate(primaryScan.started_at)}</div>
                      <div className="scan-tools">
                        {primaryScan.tools_used.map((tool, index) => (
                          <span key={index} className="tool-badge">{tool}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="compare-scan">
                  <h3>Compare With</h3>
                  {!compareScan ? (
                    <div className="scan-selector">
                      <select 
                        className="scan-select"
                        onChange={(e) => handleSelectCompareScan(Number(e.target.value))}
                        value=""
                      >
                        <option value="" disabled>Select a scan to compare</option>
                        {availableScans.map(scan => (
                          <option key={scan.id} value={scan.id}>
                            {scan.target_ip} - {formatDate(scan.started_at)} - {scan.tools_used.join(', ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="scan-info">
                      <div className="scan-target">{compareScan.target_ip}</div>
                      <div className="scan-date">{formatDate(compareScan.started_at)}</div>
                      <div className="scan-tools">
                        {compareScan.tools_used.map((tool, index) => (
                          <span key={index} className="tool-badge">{tool}</span>
                        ))}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setCompareScan(null)}
                      >
                        Change
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {compareScan && (
                <>
                  <div className="comparison-summary">
                    <h3>Differences Summary</h3>
                    {differences.length > 0 ? (
                      <ul className="differences-list">
                        {differences.map((diff, index) => (
                          <li key={index} className="difference-item">{diff}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-differences">No significant differences detected</p>
                    )}
                  </div>
                  
                  <div className="comparison-details">
                    <div className="comparison-column">
                      <h4>Primary Scan Results</h4>
                      <pre className="results-code">{primaryResults}</pre>
                    </div>
                    <div className="comparison-column">
                      <h4>Comparison Scan Results</h4>
                      <pre className="results-code">{compareResults}</pre>
                    </div>
                  </div>
                </>
              )}
              
              <div className="scan-comparison-actions">
                <Button variant="outline" onClick={onClose}>Close</Button>
                {compareScan && (
                  <Button 
                    variant="primary" 
                    onClick={() => {
                      // Export comparison report
                      const report = {
                        primaryScan,
                        compareScan,
                        differences,
                        timestamp: new Date().toISOString()
                      };
                      
                      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `scan-comparison-${primaryScan?.id}-${compareScan?.id}.json`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    Export Comparison
                  </Button>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ScanComparisonModal;