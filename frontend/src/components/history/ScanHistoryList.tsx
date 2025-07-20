import React, { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { historyService, HistoryFilters } from '../../services/historyService';
import type { ScanHistory } from '../../types/scanning';
import { highlightText } from '../../utils/highlightText';
import './ScanHistoryList.css';

interface ScanHistoryListProps {
  filters: HistoryFilters;
  searchQuery?: string;
  isSearchMode?: boolean;
  onSelectScan: (scan: ScanHistory) => void;
}

export const ScanHistoryList: React.FC<ScanHistoryListProps> = ({ 
  filters, 
  searchQuery = '', 
  isSearchMode = false, 
  onSelectScan 
}) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Use React Query's useInfiniteQuery for pagination and infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isError,
    error
  } = useInfiniteQuery({
    queryKey: isSearchMode ? ['scanSearch', searchQuery] : ['scanHistory', filters],
    queryFn: ({ pageParam = 1 }) => {
      if (isSearchMode && searchQuery) {
        return historyService.searchScans(searchQuery, pageParam, 10);
      } else {
        return historyService.getScanHistory({
          ...filters,
          page: pageParam,
          limit: 10
        });
      }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !isSearchMode || (isSearchMode && searchQuery.length > 0)
  });

  // Handle infinite scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    
    // If we're near the bottom and not already loading more, fetch next page
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasNextPage && !isLoadingMore && !isFetching) {
      setIsLoadingMore(true);
      fetchNextPage().finally(() => setIsLoadingMore(false));
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get status class for styling
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'status-completed';
      case 'running': return 'status-running';
      case 'failed': return 'status-failed';
      case 'stopped': return 'status-stopped';
      default: return '';
    }
  };

  // Calculate duration between start and end times
  const calculateDuration = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 'N/A';
    
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const durationMs = end - start;
    
    // Format duration
    if (durationMs < 0) return 'Invalid duration';
    if (durationMs < 1000) return `${durationMs}ms`;
    if (durationMs < 60000) return `${Math.round(durationMs / 1000)}s`;
    
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (isError) {
    return <div className="error-message">Error loading scan history: {(error as Error).message}</div>;
  }

  return (
    <div className="scan-history-list" onScroll={handleScroll}>
      {data?.pages.map((page, pageIndex) => (
        <React.Fragment key={pageIndex}>
          {page.data.map((scan) => (
            <div 
              key={scan.id} 
              className="scan-history-item" 
              onClick={() => onSelectScan(scan)}
            >
              <div className="scan-history-header">
                <div className="scan-target">
                  {isSearchMode && searchQuery 
                    ? highlightText(scan.target_ip, searchQuery)
                    : scan.target_ip
                  }
                </div>
                <div className={`scan-status ${getStatusClass(scan.status)}`}>
                  {scan.status}
                </div>
              </div>
              
              <div className="scan-history-details">
                <div className="scan-tools">
                  {scan.tools_used.map((tool, index) => (
                    <span key={index} className="tool-badge">
                      {isSearchMode && searchQuery 
                        ? highlightText(tool, searchQuery)
                        : tool
                      }
                    </span>
                  ))}
                </div>
                
                <div className="scan-timestamps">
                  <div>Started: {formatDate(scan.started_at)}</div>
                  {scan.completed_at && (
                    <div>
                      Completed: {formatDate(scan.completed_at)}
                      <span className="scan-duration">
                        ({calculateDuration(scan.started_at, scan.completed_at)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </React.Fragment>
      ))}
      
      {isFetching && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Loading more scans...</span>
        </div>
      )}
      
      {!isFetching && data?.pages[0].data.length === 0 && (
        <div className="empty-state">
          {isSearchMode 
            ? <p>No results found for "{searchQuery}". Try a different search term.</p>
            : <p>No scan history found matching your filters.</p>
          }
        </div>
      )}
    </div>
  );
};

export default ScanHistoryList;