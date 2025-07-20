import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { settingsService } from '../../services/settingsService';
import './PasswordChangeForm.css';

// Password strength levels
enum PasswordStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong'
}

interface PasswordStrengthInfo {
  level: PasswordStrength;
  message: string;
}

export const PasswordChangeForm: React.FC = () => {
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthInfo | null>(null);

  // Check password strength
  const checkPasswordStrength = (password: string): PasswordStrengthInfo => {
    // Password strength criteria
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    
    // Calculate strength score (0-4)
    const strengthScore = [
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChars
    ].filter(Boolean).length;
    
    // Determine strength level and message
    if (strengthScore <= 2) {
      return {
        level: PasswordStrength.WEAK,
        message: 'Weak password. Add uppercase, numbers, or special characters.'
      };
    } else if (strengthScore <= 3) {
      return {
        level: PasswordStrength.MEDIUM,
        message: 'Medium strength. Add more character types for a stronger password.'
      };
    } else {
      return {
        level: PasswordStrength.STRONG,
        message: 'Strong password!'
      };
    }
  };

  // Handle password input change
  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setNewPassword(password);
    
    if (password) {
      setPasswordStrength(checkPasswordStrength(password));
    } else {
      setPasswordStrength(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset message
    setMessage({ text: '', type: '' });
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'New passwords do not match', type: 'error' });
      return;
    }
    
    // Validate password strength
    if (passwordStrength?.level === PasswordStrength.WEAK) {
      setMessage({ text: 'Please choose a stronger password', type: 'error' });
      return;
    }
    
    // Show confirmation modal
    setShowConfirmModal(true);
  };

  // Handle password change confirmation
  const handleConfirmPasswordChange = async () => {
    setIsSubmitting(true);
    setShowConfirmModal(false);
    
    try {
      await settingsService.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      
      setMessage({ text: 'Password changed successfully. You will be logged out.', type: 'success' });
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStrength(null);
      
      // Log out user after 3 seconds
      setTimeout(() => {
        logout();
      }, 3000);
      
    } catch (error: any) {
      console.error('Failed to change password:', error);
      setMessage({ 
        text: error.response?.data?.error || 'Failed to change password', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel password change
  const handleCancelPasswordChange = () => {
    setShowConfirmModal(false);
  };

  return (
    <div className="password-change-form">
      <h2>Change Password</h2>
      <p>Update your password to keep your account secure.</p>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="current-password">Current Password</label>
          <input
            type="password"
            id="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="new-password">New Password</label>
          <input
            type="password"
            id="new-password"
            value={newPassword}
            onChange={handleNewPasswordChange}
            required
            minLength={8}
          />
          
          {passwordStrength && (
            <div className={`password-strength ${passwordStrength.level}`}>
              <div className="strength-bar">
                <div 
                  className={`strength-indicator ${passwordStrength.level}`}
                  style={{ 
                    width: passwordStrength.level === PasswordStrength.WEAK ? '33%' : 
                           passwordStrength.level === PasswordStrength.MEDIUM ? '66%' : '100%' 
                  }}
                ></div>
              </div>
              <p className="strength-message">{passwordStrength.message}</p>
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="confirm-password">Confirm New Password</label>
          <input
            type="password"
            id="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="password-mismatch">Passwords do not match</p>
          )}
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="button primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Changing Password...' : 'Change Password'}
          </button>
        </div>
      </form>
      
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <h3>Confirm Password Change</h3>
            <p>
              Changing your password will log you out of all active sessions.
              You will need to log in again with your new password.
            </p>
            <p>Are you sure you want to continue?</p>
            
            <div className="modal-actions">
              <button 
                className="button secondary"
                onClick={handleCancelPasswordChange}
              >
                Cancel
              </button>
              <button 
                className="button primary"
                onClick={handleConfirmPasswordChange}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};