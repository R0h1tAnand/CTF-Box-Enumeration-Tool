import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { historyService } from '../../services/historyService';
import { ScanHistory } from '../../types/scanning';
import { formatDate, calculateDuration } from '../../utils/dateUtils';
import './ScanDetailModal.css';

interface ScanDetailModalProps {
  scan: ScanHistory | null;
  onClose: () => void;
  onRerun: (scanId: number) => Promise<void>;
  onCompare: (scanId: number) => void;
}

export const ScanDetailModal: React.FC<ScanDetailModalProps> = ({
  scan,
  onClose,
  onRerun,
  onCompare,
}) => {
  const [scanResults, setScanResults] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRerunning, setIsRerunning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'results' | 'config'>('results');
  const [exportFormat, setExportFormat] = useState<'txt' | 'json' | 'csv'>('json');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    if (scan) {
      loadScanResults();
      generateShareUrl();
    }
  }, [scan]);

  const loadScanResults = async () => {
    if (!scan) return;
    
    setIsLoading(true);
    try {
      // In a real implementation, this would fetch the actual scan results
      // For now, we'll simulate loading results
      const results = await historyService.getScanById(scan.id);
      setScanResults(JSON.stringify(results, null, 2));
    } catch (error) {
      console.error('Failed to load scan results:', error);
      setScanResults('Error loading scan results');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRerun = async () => {
    if (!scan) return;
    
    setIsRerunning(true);
    try {
      await onRerun(scan.id);
    } catch (error) {
      console.error('Failed to rerun scan:', error);
    } finally {
      setIsRerunning(false);
    }
  };

  const handleExport = async () => {
    if (!scan) return;
    
    setIsExporting(true);
    try {
      await historyService.exportScanResults(scan.id, exportFormat);
    } catch (error) {
      console.error('Failed to export scan results:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const generateShareUrl = () => {
    if (!scan) return;
    
    // Generate a shareable URL for the scan
    const baseUrl = window.location.origin;
    const shareableUrl = `${baseUrl}/history/scan/${scan.id}`;
    setShareUrl(shareableUrl);
  };

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => console.error('Failed to copy URL:', err));
  };

  if (!scan) return null;

  return (
    <AnimatePresence>
      <div className="scan-detail-modal-overlay" onClick={onClose}>
        <motion.div 
          className="scan-detail-modal"
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="scan-detail-header">
            <h2>Scan Details</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          
          <div className="scan-detail-info">
            <div className="scan-detail-target">
              <h3>Target: {scan.target_ip}</h3>
              <span className={`scan-status status-${scan.status.toLowerCase()}`}>
                {scan.status}
              </span>
            </div>
            
            <div className="scan-detail-metadata">
              <div className="scan-detail-tools">
                <strong>Tools Used:</strong>
                <div className="tool-badges">
                  {scan.tools_used.map((tool, index) => (
                    <span key={index} className="tool-badge">{tool}</span>
                  ))}
                </div>
              </div>
              
              <div className="scan-detail-timestamps">
                <div><strong>Started:</strong> {formatDate(scan.started_at)}</div>
                {scan.completed_at && (
                  <div>
                    <strong>Completed:</strong> {formatDate(scan.completed_at)}
                    <span className="scan-duration">
                      (Duration: {calculateDuration(scan.started_at, scan.completed_at)})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="scan-detail-tabs">
            <button 
              className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
            >
              Results
            </button>
            <button 
              className={`tab-button ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              Configuration
            </button>
          </div>
          
          <div className="scan-detail-content">
            {activeTab === 'results' ? (
              <div className="scan-results">
                {isLoading ? (
                  <div className="loading-indicator">
                    <div className="spinner"></div>
                    <span>Loading results...</span>
                  </div>
                ) : (
                  <pre className="results-code">{scanResults}</pre>
                )}
              </div>
            ) : (
              <div className="scan-config">
                <h4>Scan Configuration</h4>
                <pre className="config-code">
                  {JSON.stringify(scan.scan_config, null, 2)}
                </pre>
              </div>
            )}
          </div>
          
          <div className="scan-detail-actions">
            <div className="action-group">
              <Button 
                variant="primary" 
                onClick={handleRerun}
                loading={isRerunning}
                disabled={isRerunning}
              >
                Re-run Scan
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => onCompare(scan.id)}
              >
                Compare
              </Button>
            </div>
            
            <div className="action-group export-group">
              <select 
                className="export-format-select"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'txt' | 'json' | 'csv')}
              >
                <option value="json">JSON</option>
                <option value="txt">Text</option>
                <option value="csv">CSV</option>
              </select>
              <Button 
                variant="outline" 
                onClick={handleExport}
                loading={isExporting}
                disabled={isExporting}
              >
                Export
              </Button>
            </div>
          </div>
          
          <div className="scan-detail-share">
            <h4>Share Scan Results</h4>
            <div className="share-url-container">
              <input 
                type="text" 
                className="share-url-input" 
                value={shareUrl} 
                readOnly 
              />
              <Button 
                variant="ghost" 
                onClick={handleCopyShareUrl}
              >
                {isCopied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ScanDetailModal;