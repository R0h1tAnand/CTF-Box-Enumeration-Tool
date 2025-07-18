import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import './ScanResults.css';

interface ScanResultsProps {
  scanId: string;
  results: {
    target: string;
    status: string;
    start_time: string;
    completed_at?: string;
    tools: Record<string, {
      status: string;
      parsed_results?: any;
      output?: string;
    }>;
  };
}

export const ScanResults: React.FC<ScanResultsProps> = ({ scanId, results }) => {
  const [activeTab, setActiveTab] = useState<string>(Object.keys(results.tools)[0] || '');
  const [activeView, setActiveView] = useState<'parsed' | 'raw'>('parsed');

  const handleExport = (format: 'txt' | 'json' | 'csv') => {
    const tool = activeTab || undefined;
    const url = `/api/scans/${scanId}/export?format=${format}${tool ? `&tool=${tool}` : ''}`;
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `scan_${scanId}_${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return 'In progress';
    
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const durationMs = end - start;
    
    // Format duration
    const seconds = Math.floor(durationMs / 1000) % 60;
    const minutes = Math.floor(durationMs / (1000 * 60)) % 60;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;
  };

  const renderParsedResults = (tool: string, data: any) => {
    if (!data) return <p>No parsed results available</p>;
    
    switch (tool.toLowerCase()) {
      case 'nmap':
        return (
          <div className="scan-results__nmap">
            <h4>Open Ports</h4>
            <table className="scan-results__table">
              <thead>
                <tr>
                  <th>Port</th>
                  <th>Protocol</th>
                  <th>Service</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {data.services?.map((service: any, index: number) => (
                  <tr key={index}>
                    <td>{service.port}</td>
                    <td>{service.protocol}</td>
                    <td>{service.service}</td>
                    <td>{service.state || 'open'}</td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={4}>No open ports found</td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {data.os_detection && (
              <>
                <h4>OS Detection</h4>
                <div className="scan-results__os">
                  {data.os_detection.map((os: any, index: number) => (
                    <div key={index} className="scan-results__os-item">
                      <span className="scan-results__os-name">{os.name}</span>
                      <span className="scan-results__os-accuracy">{os.accuracy}% accuracy</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
        
      case 'gobuster':
        return (
          <div className="scan-results__gobuster">
            <h4>Directory Scan Results</h4>
            <table className="scan-results__table">
              <thead>
                <tr>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {data.findings?.map((finding: any, index: number) => (
                  <tr key={index}>
                    <td>{finding.path}</td>
                    <td>{finding.status}</td>
                    <td>{finding.size}</td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={3}>No directories found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
        
      case 'dirb':
        return (
          <div className="scan-results__dirb">
            <h4>Directories</h4>
            <table className="scan-results__table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Status</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {data.directories?.map((dir: any, index: number) => (
                  <tr key={index}>
                    <td>{dir.url}</td>
                    <td>{dir.status}</td>
                    <td>{dir.size}</td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={3}>No directories found</td>
                  </tr>
                )}
              </tbody>
            </table>
            
            <h4>Files</h4>
            <table className="scan-results__table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Status</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {data.files?.map((file: any, index: number) => (
                  <tr key={index}>
                    <td>{file.url}</td>
                    <td>{file.status}</td>
                    <td>{file.size}</td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={3}>No files found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
        
      default:
        return (
          <pre className="scan-results__json">
            {JSON.stringify(data, null, 2)}
          </pre>
        );
    }
  };

  return (
    <Card className="scan-results">
      <CardHeader>
        <CardTitle>Scan Results</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="scan-results__summary">
          <div className="scan-results__summary-item">
            <span className="scan-results__label">Target:</span>
            <span className="scan-results__value">{results.target}</span>
          </div>
          <div className="scan-results__summary-item">
            <span className="scan-results__label">Status:</span>
            <span className={`scan-results__value scan-results__status scan-results__status--${results.status}`}>
              {results.status}
            </span>
          </div>
          <div className="scan-results__summary-item">
            <span className="scan-results__label">Started:</span>
            <span className="scan-results__value">{formatDate(results.start_time)}</span>
          </div>
          <div className="scan-results__summary-item">
            <span className="scan-results__label">Completed:</span>
            <span className="scan-results__value">{formatDate(results.completed_at)}</span>
          </div>
          <div className="scan-results__summary-item">
            <span className="scan-results__label">Duration:</span>
            <span className="scan-results__value">{formatDuration(results.start_time, results.completed_at)}</span>
          </div>
        </div>
        
        <div className="scan-results__tabs">
          {Object.keys(results.tools).map(tool => (
            <button
              key={tool}
              className={`scan-results__tab ${activeTab === tool ? 'scan-results__tab--active' : ''}`}
              onClick={() => setActiveTab(tool)}
            >
              {tool}
            </button>
          ))}
        </div>
        
        <div className="scan-results__view-toggle">
          <button
            className={`scan-results__view-button ${activeView === 'parsed' ? 'scan-results__view-button--active' : ''}`}
            onClick={() => setActiveView('parsed')}
          >
            Parsed
          </button>
          <button
            className={`scan-results__view-button ${activeView === 'raw' ? 'scan-results__view-button--active' : ''}`}
            onClick={() => setActiveView('raw')}
          >
            Raw
          </button>
        </div>
        
        <motion.div
          key={`${activeTab}-${activeView}`}
          className="scan-results__content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab && results.tools[activeTab] && (
            activeView === 'parsed' ? (
              renderParsedResults(activeTab, results.tools[activeTab].parsed_results)
            ) : (
              <pre className="scan-results__raw">
                {results.tools[activeTab].output || 'No raw output available'}
              </pre>
            )
          )}
        </motion.div>
      </CardBody>
      <CardFooter>
        <div className="scan-results__export">
          <span className="scan-results__export-label">Export as:</span>
          <div className="scan-results__export-buttons">
            <Button size="sm" variant="outline" onClick={() => handleExport('txt')}>
              TXT
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExport('json')}>
              JSON
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExport('csv')}>
              CSV
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};