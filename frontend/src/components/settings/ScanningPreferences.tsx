import React, { useState, useEffect } from 'react';
import { settingsService } from '../../services/settingsService';
import { UserSettings } from '../../types/settings';
import { WordlistManager } from './WordlistManager';
import { NotificationSettings } from './NotificationSettings';
import './ScanningPreferences.css';

export const ScanningPreferences: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [settingsData, toolsData] = await Promise.all([
          settingsService.getPreferences(),
          settingsService.getAvailableTools()
        ]);
        setSettings(settingsData);
        setAvailableTools(toolsData);
      } catch (err) {
        setError('Failed to load preferences. Please try again.');
        console.error('Error loading preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleToolSelection = (tool: string) => {
    if (!settings) return;
    
    const updatedTools = settings.default_tools.includes(tool)
      ? settings.default_tools.filter(t => t !== tool)
      : [...settings.default_tools, tool];
    
    setSettings({
      ...settings,
      default_tools: updatedTools
    });
  };

  const handleAutoExportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    setSettings({
      ...settings,
      auto_export: e.target.checked
    });
  };

  const handleSave = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await settingsService.updatePreferences({
        default_tools: settings.default_tools,
        auto_export: settings.auto_export
      });
      
      setSuccessMessage('Scanning preferences saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError('Failed to save preferences. Please try again.');
      console.error('Error saving preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="scanning-preferences loading">Loading preferences...</div>;
  }

  return (
    <div className="scanning-preferences">
      <h2>Scanning Preferences</h2>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      <div className="preferences-section">
        <h3>Default Tools</h3>
        <p>Select the tools that will be pre-selected when starting a new scan.</p>
        
        <div className="tool-selection">
          {availableTools.map(tool => (
            <div key={tool} className="tool-option">
              <label>
                <input
                  type="checkbox"
                  checked={settings?.default_tools.includes(tool) || false}
                  onChange={() => handleToolSelection(tool)}
                />
                {tool.charAt(0).toUpperCase() + tool.slice(1)}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="preferences-section">
        <h3>Export Options</h3>
        <div className="export-option">
          <label>
            <input
              type="checkbox"
              checked={settings?.auto_export || false}
              onChange={handleAutoExportChange}
            />
            Automatically export scan results when completed
          </label>
        </div>
      </div>
      
      <WordlistManager 
        defaultWordlist={settings?.default_wordlist || ''}
        onWordlistChange={(wordlist) => {
          if (settings) {
            setSettings({
              ...settings,
              default_wordlist: wordlist
            });
          }
        }}
      />
      
      <NotificationSettings 
        notificationsEnabled={settings?.notifications_enabled || false}
        onNotificationChange={(enabled) => {
          if (settings) {
            setSettings({
              ...settings,
              notifications_enabled: enabled
            });
          }
        }}
      />
      
      <div className="preferences-actions">
        <button 
          className="save-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};