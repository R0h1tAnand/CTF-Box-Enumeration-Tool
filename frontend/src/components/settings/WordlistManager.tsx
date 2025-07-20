import React, { useState, useEffect } from 'react';
import { settingsService } from '../../services/settingsService';
import './WordlistManager.css';

interface WordlistManagerProps {
  defaultWordlist: string;
  onWordlistChange: (wordlist: string) => void;
}

export const WordlistManager: React.FC<WordlistManagerProps> = ({ 
  defaultWordlist, 
  onWordlistChange 
}) => {
  const [availableWordlists, setAvailableWordlists] = useState<string[]>([]);
  const [selectedWordlist, setSelectedWordlist] = useState<string>(defaultWordlist);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchWordlists = async () => {
      try {
        const wordlists = await settingsService.getAvailableWordlists();
        setAvailableWordlists(wordlists);
      } catch (err) {
        console.error('Error fetching wordlists:', err);
        setError('Failed to load available wordlists');
      }
    };

    fetchWordlists();
  }, []);

  useEffect(() => {
    setSelectedWordlist(defaultWordlist);
  }, [defaultWordlist]);

  const handleWordlistChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wordlist = e.target.value;
    setSelectedWordlist(wordlist);
    onWordlistChange(wordlist);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (text file)
    if (file.type !== 'text/plain' && !file.name.endsWith('.txt') && !file.name.endsWith('.lst')) {
      setError('Please upload a valid wordlist file (.txt or .lst)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the maximum limit of 10MB');
      return;
    }

    try {
      setUploadingFile(true);
      setError(null);
      setSuccessMessage(null);
      
      const result = await settingsService.uploadWordlist(file, (progress) => {
        setUploadProgress(progress);
      });
      
      // Add the new wordlist to the available wordlists
      setAvailableWordlists(prev => [...prev, result.path]);
      
      // Select the newly uploaded wordlist
      setSelectedWordlist(result.path);
      onWordlistChange(result.path);
      
      setSuccessMessage('Wordlist uploaded successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Error uploading wordlist:', err);
      setError('Failed to upload wordlist. Please try again.');
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
      
      // Clear the file input
      e.target.value = '';
    }
  };

  return (
    <div className="preferences-section wordlist-manager">
      <h3>Wordlist Management</h3>
      <p>Select a default wordlist for directory brute-forcing tools.</p>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      <div className="wordlist-selection">
        <label htmlFor="default-wordlist">Default Wordlist:</label>
        <select 
          id="default-wordlist"
          value={selectedWordlist}
          onChange={handleWordlistChange}
        >
          <option value="">-- Select a wordlist --</option>
          {availableWordlists.map(wordlist => (
            <option key={wordlist} value={wordlist}>
              {wordlist.split('/').pop() || wordlist}
            </option>
          ))}
        </select>
      </div>
      
      <div className="wordlist-upload">
        <h4>Upload Custom Wordlist</h4>
        <p>Upload your own wordlist file (.txt or .lst format, max 10MB)</p>
        
        <div className="upload-controls">
          <input
            type="file"
            id="wordlist-file"
            accept=".txt,.lst"
            onChange={handleFileUpload}
            disabled={uploadingFile}
          />
          
          {uploadingFile && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span>{uploadProgress}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};