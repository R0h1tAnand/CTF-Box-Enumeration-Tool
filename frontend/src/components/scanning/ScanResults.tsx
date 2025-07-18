import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark, atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import './ScanResults.css';

// Register languages for syntax highlighting
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('json', json);

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
  theme?: 'light' | 'dark';
}

export const ScanResults: React.FC<ScanResultsProps> = ({ scanId, results, theme = 'dark' }) => {
  const [activeTab, setActiveTab] = useState<string>(Object.keys(results.tools)[0] || '');
  const [activeView, setActiveView] = useState<'parsed' | 'raw'>('parsed');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredResults, setFilteredResults] = useState<any>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [showShareLink, setShowShareLink] = useState<boolean>(false);
  
  // Get the syntax highlighting style based on theme
  const syntaxStyle = theme === 'dark' ? atomOneDark : atomOneLight;

  // Filter results based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredResults(null);
      return;
    }

    try {
      const query = searchQuery.toLowerCase();
      
      if (activeView === 'parsed' && results.tools[activeTab]?.parsed_results) {
        // For parsed results, we need to filter based on the tool type
        const toolData = results.tools[activeTab].parsed_results;
        
        switch (activeTab.toLowerCase()) {
          case 'nmap':
            // Filter services
            if (toolData.services) {
              const filteredServices = toolData.services.filter((service: any) => 
                service.port?.toString().includes(query) ||
                service.protocol?.toLowerCase().includes(query) ||
                service.service?.toLowerCase().includes(query) ||
                service.state?.toLowerCase().includes(query)
              );
              
              if (filteredServices.length > 0) {
                setFilteredResults({
                  ...toolData,
                  services: filteredServices
                });
                return;
              }
            }
            
            // Filter OS detection
            if (toolData.os_detection) {
              const filteredOS = toolData.os_detection.filter((os: any) =>
                os.name?.toLowerCase().includes(query)
              );
              
              if (filteredOS.length > 0) {
                setFilteredResults({
                  ...toolData,
                  os_detection: filteredOS
                });
                return;
              }
            }
            break;
            
          case 'gobuster':
            // Filter findings
            if (toolData.findings) {
              const filteredFindings = toolData.findings.filter((finding: any) =>
                finding.path?.toLowerCase().includes(query) ||
                finding.status?.toString().includes(query) ||
                finding.size?.toString().includes(query)
              );
              
              if (filteredFindings.length > 0) {
                setFilteredResults({
                  ...toolData,
                  findings: filteredFindings
                });
                return;
              }
            }
            break;
            
          case 'dirb':
            // Filter directories
            let hasMatches = false;
            const result = { ...toolData };
            
            if (toolData.directories) {
              const filteredDirs = toolData.directories.filter((dir: any) =>
                dir.url?.toLowerCase().includes(query) ||
                dir.status?.toString().includes(query) ||
                dir.size?.toString().includes(query)
              );
              
              if (filteredDirs.length > 0) {
                result.directories = filteredDirs;
                hasMatches = true;
              }
            }
            
            // Filter files
            if (toolData.files) {
              const filteredFiles = toolData.files.filter((file: any) =>
                file.url?.toLowerCase().includes(query) ||
                file.status?.toString().includes(query) ||
                file.size?.toString().includes(query)
              );
              
              if (filteredFiles.length > 0) {
                result.files = filteredFiles;
                hasMatches = true;
              }
            }
            
            if (hasMatches) {
              setFilteredResults(result);
              return;
            }
            break;
            
          default:
            // For other tools, just check if the JSON string contains the query
            if (JSON.stringify(toolData).toLowerCase().includes(query)) {
              setFilteredResults(toolData);
              return;
            }
        }
      } else if (activeView === 'raw' && results.tools[activeTab]?.output) {
        // For raw output, search within the text
        const output = results.tools[activeTab].output;
        if (output?.toLowerCase().includes(query)) {
          // For raw output, we don't filter but highlight matches in the render function
          setFilteredResults(output);
          return;
        }
      }
      
      // No matches found
      setFilteredResults({});
    } catch (error) {
      console.error('Error filtering results:', error);
      setFilteredResults(null);
    }
  }, [searchQuery, activeTab, activeView, results.tools]);

  // Generate shareable link
  const generateShareLink = useCallback(() => {
    // Create a URL with scan ID and active tool as query parameters
    const baseUrl = window.location.origin;
    const shareableUrl = `${baseUrl}/scan/${scanId}?tool=${activeTab}&view=${activeView}`;
    setShareUrl(shareableUrl);
    setShowShareLink(true);
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareableUrl)
      .then(() => {
        // Show a toast notification or some feedback that the URL was copied
        console.log('Share URL copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy URL: ', err);
      });
  }, [scanId, activeTab, activeView]);

  // Handle copying share link
  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        // Show feedback that the URL was copied
        console.log('Share URL copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy URL: ', err);
      });
  };

  const handleExport = (format: 'txt' | 'json' | 'csv' | 'html' | 'xml') => {
    const tool = activeTab || undefined;
    let url = `/api/scans/${scanId}/export?format=${format}${tool ? `&tool=${tool}` : ''}`;
    
    // Add search filter to export if present
    if (searchQuery.trim()) {
      url += `&filter=${encodeURIComponent(searchQuery.trim())}`;
    }
    
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

  // Helper function to highlight search matches
  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query || !text) return text;
    
    const parts = String(text).split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={index} className="scan-results__highlight">{part}</span> 
        : part
    );
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
                    <td>{searchQuery ? highlightMatch(service.port, searchQuery) : service.port}</td>
                    <td>{searchQuery ? highlightMatch(service.protocol, searchQuery) : service.protocol}</td>
                    <td>{searchQuery ? highlightMatch(service.service, searchQuery) : service.service}</td>
                    <td>{searchQuery ? highlightMatch(service.state || 'open', searchQuery) : (service.state || 'open')}</td>
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
                      <span className="scan-results__os-name">
                        {searchQuery ? highlightMatch(os.name, searchQuery) : os.name}
                      </span>
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
                    <td>{searchQuery ? highlightMatch(finding.path, searchQuery) : finding.path}</td>
                    <td>{searchQuery ? highlightMatch(finding.status, searchQuery) : finding.status}</td>
                    <td>{searchQuery ? highlightMatch(finding.size, searchQuery) : finding.size}</td>
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
                    <td>{searchQuery ? highlightMatch(dir.url, searchQuery) : dir.url}</td>
                    <td>{searchQuery ? highlightMatch(dir.status, searchQuery) : dir.status}</td>
                    <td>{searchQuery ? highlightMatch(dir.size, searchQuery) : dir.size}</td>
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
                    <td>{searchQuery ? highlightMatch(file.url, searchQuery) : file.url}</td>
                    <td>{searchQuery ? highlightMatch(file.status, searchQuery) : file.status}</td>
                    <td>{searchQuery ? highlightMatch(file.size, searchQuery) : file.size}</td>
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
          <SyntaxHighlighter
            language="json"
            style={syntaxStyle}
            className="scan-results__json"
            wrapLines={true}
            showLineNumbers={true}
          >
            {JSON.stringify(data, null, 2)}
          </SyntaxHighlighter>
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
        
        <div className="scan-results__search">
          <Input
            type="text"
            placeholder="Search in results..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="scan-results__search-input"
          />
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={generateShareLink}
            className="scan-results__share-button"
          >
            Share Results
          </Button>
        </div>
        
        {showShareLink && (
          <div className="scan-results__share-link">
            <Input
              type="text"
              value={shareUrl}
              readOnly
              className="scan-results__share-input"
            />
            <Button size="sm" variant="outline" onClick={copyShareLink}>
              Copy
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowShareLink(false)}>
              Close
            </Button>
          </div>
        )}
        
        <motion.div
          key={`${activeTab}-${activeView}`}
          className="scan-results__content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab && results.tools[activeTab] && (
            activeView === 'parsed' ? (
              filteredResults !== null ? (
                // Show filtered results if search is active
                Object.keys(filteredResults).length > 0 ? (
                  renderParsedResults(activeTab, filteredResults)
                ) : (
                  <p className="scan-results__no-matches">No matches found for "{searchQuery}"</p>
                )
              ) : (
                // Show all results if no search
                renderParsedResults(activeTab, results.tools[activeTab].parsed_results)
              )
            ) : (
              // Raw output with syntax highlighting
              <SyntaxHighlighter
                language="bash"
                style={syntaxStyle}
                className="scan-results__raw"
                wrapLines={true}
                showLineNumbers={true}
              >
                {results.tools[activeTab].output || 'No raw output available'}
              </SyntaxHighlighter>
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
            <Button size="sm" variant="outline" onClick={() => handleExport('html')}>
              HTML
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExport('xml')}>
              XML
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};