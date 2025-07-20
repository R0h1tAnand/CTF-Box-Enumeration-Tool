import React, { useState } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ProfileSettings } from '../components/settings/ProfileSettings';
import { PasswordChangeForm } from '../components/settings/PasswordChangeForm';
import { ScanningPreferences } from '../components/settings/ScanningPreferences';
import { AccountManagement } from '../components/settings/AccountManagement';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>(
    location.pathname.includes('/settings/password') ? 'password' :
    location.pathname.includes('/settings/preferences') ? 'preferences' :
    location.pathname.includes('/settings/account') ? 'account' :
    'profile'
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    switch (tab) {
      case 'profile':
        navigate('/settings');
        break;
      case 'password':
        navigate('/settings/password');
        break;
      case 'preferences':
        navigate('/settings/preferences');
        break;
      case 'account':
        navigate('/settings/account');
        break;
    }
  };

  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <p>Manage your account and preferences.</p>
      
      <div className="settings-tabs">
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabChange('profile')}
        >
          Profile
        </button>
        <button 
          className={`tab-button ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => handleTabChange('password')}
        >
          Password
        </button>
        <button 
          className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => handleTabChange('preferences')}
        >
          Preferences
        </button>
        <button 
          className={`tab-button ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => handleTabChange('account')}
        >
          Account
        </button>
      </div>
      
      <div className="settings-content">
        <Routes>
          <Route path="/" element={<ProfileSettings />} />
          <Route path="/password" element={<PasswordChangeForm />} />
          <Route path="/preferences" element={<ScanningPreferences />} />
          <Route path="/account" element={<AccountManagement />} />
        </Routes>
      </div>
    </div>
  );
};