import React, { useState } from 'react';
import { settingsService } from '../../services/settingsService';
import './DataExport.css';

export const DataExport: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      setError(null);
      await settingsService.exportUserData();
      setIsExporting(false);
    } catch (err: any) {
      setError('Failed to export data. Please try again.');
      setIsExporting(false);
    }
  };

  return (
    <div className="data-export">
      <div className="export-info">
        <p>Your export will include:</p>
        <ul>
          <li>Profile information</li>
          <li>Account settings</li>
          <li>Scan history (up to 100 recent scans)</li>
          <li>User preferences</li>
        </ul>
      </div>
      
      {error && <div className="export-error">{error}</div>}
      
      <button 
        className="export-button" 
        onClick={handleExportData}
        disabled={isExporting}
      >
        {isExporting ? 'Preparing Export...' : 'Export My Data'}
      </button>
    </div>
  );
};