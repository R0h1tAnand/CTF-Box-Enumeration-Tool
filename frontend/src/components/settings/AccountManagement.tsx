import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { settingsService } from '../../services/settingsService';
import { DataExport } from './DataExport';
import { ActivityLog } from './ActivityLog';
import './AccountManagement.css';

export const AccountManagement: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }

    try {
      setIsDeleting(true);
      await settingsService.deleteAccount(password);
      logout();
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <div className="account-management">
      <h2>Account Management</h2>
      
      <div className="account-section">
        <h3>Data Export</h3>
        <p>Download all your data including profile information, settings, and scan history.</p>
        <DataExport />
      </div>
      
      <div className="account-section">
        <h3>Account Security</h3>
        <p>Review your recent account activity to monitor for suspicious behavior.</p>
        <ActivityLog />
      </div>
      
      <div className="account-section danger-zone">
        <h3>Danger Zone</h3>
        <p>Once you delete your account, there is no going back. Please be certain.</p>
        <button 
          className="delete-account-btn" 
          onClick={() => setShowDeleteModal(true)}
        >
          Delete Account
        </button>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="delete-account-modal">
            <h3>Delete Account</h3>
            <p>This action cannot be undone. All your data will be permanently deleted.</p>
            <p>Please enter your password to confirm:</p>
            
            {error && <div className="error-message">{error}</div>}
            
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="password-input"
            />
            
            <div className="modal-actions">
              <button 
                className="cancel-btn" 
                onClick={() => {
                  setShowDeleteModal(false);
                  setPassword('');
                  setError(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-btn" 
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};