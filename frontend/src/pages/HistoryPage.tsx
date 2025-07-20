import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ScanHistoryList, HistoryFilters, SearchBar, ScanDetailModal, ScanComparisonModal } from '../components/history';
import { historyService, HistoryFilters as FilterType } from '../services/historyService';
import type { ScanHistory } from '../types/scanning';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './HistoryPage.css';

export const HistoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterType>({});
  const [selectedScan, setSelectedScan] = useState<ScanHistory | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false);
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [compareScanId, setCompareScanId] = useState<number | null>(null);
  
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
  };
  
  // Handle scan re-run
  const handleRerunScan = async (scanId: number) => {
    try {
      const result = await historyService.rerunScan(scanId);
      toast.success('Scan re-execution started successfully');
      
      // Navigate to the scanning page with the new scan ID
      navigate(`/scan/${result.scanId}`);
      
      // Close the modal
      setSelectedScan(null);
    } catch (error) {
      console.error('Failed to re-run scan:', error);
      toast.error('Failed to re-run scan. Please try again.');
    }
  };
  
  // Handle scan comparison
  const handleCompareScan = (scanId: number) => {
    setCompareScanId(scanId);
    setIsCompareMode(true);
    setSelectedScan(null);
  };
  
  // Close modals
  const handleCloseDetailModal = () => {
    setSelectedScan(null);
  };
  
  const handleCloseCompareModal = () => {
    setIsCompareMode(false);
    setCompareScanId(null);
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
      
      {/* Scan Detail Modal */}
      {selectedScan && (
        <ScanDetailModal
          scan={selectedScan}
          onClose={handleCloseDetailModal}
          onRerun={handleRerunScan}
          onCompare={handleCompareScan}
        />
      )}
      
      {/* Scan Comparison Modal */}
      {isCompareMode && compareScanId && (
        <ScanComparisonModal
          primaryScanId={compareScanId}
          onClose={handleCloseCompareModal}
        />
      )}
    </div>
  );
};

export default HistoryPage;