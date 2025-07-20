import React, { useState, useEffect } from 'react';
import { HistoryFilters as FilterType } from '../../services/historyService';
import './HistoryFilters.css';

interface HistoryFiltersProps {
  onFilterChange: (filters: FilterType) => void;
  initialFilters?: FilterType;
  disabled?: boolean;
}

export const HistoryFilters: React.FC<HistoryFiltersProps> = ({ 
  onFilterChange, 
  initialFilters = {},
  disabled = false
}) => {
  // Available tools for filtering
  const availableTools = ['nmap', 'gobuster', 'dirb'];
  
  // Available status options
  const statusOptions = ['completed', 'running', 'failed', 'stopped'];
  
  // State for filter values
  const [filters, setFilters] = useState<FilterType>({
    startDate: initialFilters.startDate || '',
    endDate: initialFilters.endDate || '',
    tools: initialFilters.tools || [],
    target: initialFilters.target || '',
    status: initialFilters.status || ''
  });
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle tool selection
  const handleToolToggle = (tool: string) => {
    setFilters(prev => {
      const currentTools = prev.tools || [];
      const updatedTools = currentTools.includes(tool)
        ? currentTools.filter(t => t !== tool)
        : [...currentTools, tool];
        
      return {
        ...prev,
        tools: updatedTools
      };
    });
  };
  
  // Apply filters
  const applyFilters = () => {
    onFilterChange(filters);
  };
  
  // Reset filters
  const resetFilters = () => {
    const resetValues: FilterType = {
      startDate: '',
      endDate: '',
      tools: [],
      target: '',
      status: ''
    };
    
    setFilters(resetValues);
    onFilterChange(resetValues);
  };
  
  // Apply filters when component mounts with initial values
  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      onFilterChange(initialFilters);
    }
  }, []);
  
  return (
    <div className={`history-filters ${disabled ? 'disabled' : ''}`}>
      {disabled && (
        <div className="filters-disabled-message">
          <p>Filters are disabled during search mode</p>
          <p>Clear your search to use filters again</p>
        </div>
      )}
      <div className="filter-section">
        <h3>Date Range</h3>
        <div className="date-filters">
          <div className="filter-group">
            <label htmlFor="startDate">From:</label>
            <input
              type="datetime-local"
              id="startDate"
              name="startDate"
              value={filters.startDate}
              onChange={handleInputChange}
              disabled={disabled}
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="endDate">To:</label>
            <input
              type="datetime-local"
              id="endDate"
              name="endDate"
              value={filters.endDate}
              onChange={handleInputChange}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
      
      <div className="filter-section">
        <h3>Tools</h3>
        <div className="tools-filter">
          {availableTools.map(tool => (
            <div 
              key={tool} 
              className={`tool-filter-item ${(filters.tools || []).includes(tool) ? 'selected' : ''}`}
              onClick={() => !disabled && handleToolToggle(tool)}
              aria-disabled={disabled}
            >
              {tool}
            </div>
          ))}
        </div>
      </div>
      
      <div className="filter-section">
        <h3>Target</h3>
        <input
          type="text"
          name="target"
          placeholder="IP address or hostname"
          value={filters.target}
          onChange={handleInputChange}
          disabled={disabled}
        />
      </div>
      
      <div className="filter-section">
        <h3>Status</h3>
        <select 
          name="status" 
          value={filters.status} 
          onChange={handleInputChange}
          disabled={disabled}
        >
          <option value="">All statuses</option>
          {statusOptions.map(status => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>
      
      <div className="filter-actions">
        <button 
          className="filter-button apply" 
          onClick={applyFilters}
          disabled={disabled}
        >
          Apply Filters
        </button>
        <button 
          className="filter-button reset" 
          onClick={resetFilters}
          disabled={disabled}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default HistoryFilters;