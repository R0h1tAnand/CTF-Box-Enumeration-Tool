import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { settingsService } from '../../services/settingsService';
import './ProfileSettings.css';

export const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      // Placeholder for profile picture URL
      setProfilePictureUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`);
    }
  }, [user]);

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicture(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setProfilePictureUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadProfilePicture = async () => {
    if (!profilePicture) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const response = await settingsService.uploadProfilePicture(
        profilePicture,
        (progress) => setUploadProgress(progress)
      );
      
      setProfilePictureUrl(response.url);
      setMessage({ text: 'Profile picture uploaded successfully', type: 'success' });
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      setMessage({ text: 'Failed to upload profile picture', type: 'error' });
    } finally {
      setIsUploading(false);
      setProfilePicture(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ text: '', type: '' });
    
    try {
      await settingsService.updateProfile({ username, email });
      setMessage({ text: 'Profile updated successfully', type: 'success' });
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setMessage({ 
        text: error.response?.data?.error || 'Failed to update profile', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="profile-settings">
      <h2>Profile Settings</h2>
      
      <div className="profile-picture-section">
        <div className="profile-picture-container">
          {profilePictureUrl && (
            <img 
              src={profilePictureUrl} 
              alt="Profile" 
              className="profile-picture" 
            />
          )}
          {isUploading && (
            <div className="upload-progress-overlay">
              <div 
                className="upload-progress-bar" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
              <span className="upload-progress-text">{uploadProgress}%</span>
            </div>
          )}
        </div>
        
        <div className="profile-picture-actions">
          <input
            type="file"
            accept="image/*"
            onChange={handleProfilePictureChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <button 
            type="button" 
            className="button secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose Image
          </button>
          {profilePicture && (
            <button 
              type="button" 
              className="button primary"
              onClick={handleUploadProfilePicture}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          )}
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="profile-form">
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="button primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};