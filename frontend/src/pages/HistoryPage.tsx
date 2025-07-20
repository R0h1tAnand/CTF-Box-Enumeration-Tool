import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ScanHistoryList, HistoryFilters, SearchBar } from '../components/history';
import { HistoryFilters as FilterType } from '../services/historyService';
import type { ScanHistory } from '../types/scanning';
import './HistoryPage.css';

export const HistoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterType>({});
  const [selectedScan, setSelectedScan] = useState<ScanHistory | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false);
  
  // Handle filter changes
  const handleFilterChange = (newFilters: FilterType) => {
    setFilters(newFilters);
    // Clear search when filters change
    if (searchQuery) {
      setSearchQuery('');
      setIsSearchMode(false);
    }
    // Invalidate queries to trigger a refetch with new filters
    queryClient.invalidateQueries({ queryKey: ['scanHistory'] });
  };
  
  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearchMode(!!query);
    
    // Reset filters when searching
    if (query && Object.keys(filters).length > 0) {
      setFilters({});
    }
    
    // Invalidate queries to trigger a refetch with search query
    queryClient.invalidateQueries({ 
      queryKey: query ? ['scanSearch', query] : ['scanHistory'] 
    });
  };
  
  // Handle scan selection
  const handleSelectScan = (scan: ScanHistory) => {
    setSelectedScan(scan);
    // In a future task, this will open the ScanDetailModal
  };
  
  return (
    <div className="history-page">
      <div className="history-header">
        <h1>Scan History</h1>
        <p>View and manage your previous scans</p>
        
        <div className="history-search">
          <SearchBar 
            onSearch={handleSearch} 
            initialQuery={searchQuery}
            placeholder="Search by IP, hostname, or tool..."
          />
        </div>
      </div>
      
      <div className="history-content">
        <div className="history-sidebar">
          <HistoryFilters 
            onFilterChange={handleFilterChange}
            initialFilters={filters}
            disabled={isSearchMode}
          />
        </div>
        
        <div className="history-main">
          <ScanHistoryList 
            filters={filters}
            searchQuery={searchQuery}
            isSearchMode={isSearchMode}
            onSelectScan={handleSelectScan}
          />
        </div>
      </div>
      
      {/* Placeholder for ScanDetailModal - will be implemented in task 7.3 */}
      {selectedScan && (
        <div className="scan-detail-placeholder">
          <p>Scan detail modal will be implemented in task 7.3</p>
          <p>Selected scan ID: {selectedScan.id}</p>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;