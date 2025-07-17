import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import './Navigation.css';

export const Navigation: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  if (!isAuthenticated) {
    return (
      <nav className="navigation">
        <div className="nav-container">
          <Link to="/" className="nav-brand">
            <span className="brand-icon">🛡️</span>
            <span className="brand-text">CyberToolkit</span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    );
  }

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/dashboard" className="nav-brand" onClick={closeMobileMenu}>
          <span className="brand-icon">🛡️</span>
          <span className="brand-text">CyberToolkit</span>
        </Link>

        <button 
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          <span className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <div className={`nav-menu ${isMobileMenuOpen ? 'active' : ''}`}>
          <ul className="nav-links">
            <li>
              <Link 
                to="/dashboard" 
                className={`nav-link ${isActivePath('/dashboard') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                to="/scan" 
                className={`nav-link ${isActivePath('/scan') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                New Scan
              </Link>
            </li>
            <li>
              <Link 
                to="/history" 
                className={`nav-link ${isActivePath('/history') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                History
              </Link>
            </li>
            <li>
              <Link 
                to="/settings" 
                className={`nav-link ${isActivePath('/settings') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Settings
              </Link>
            </li>
          </ul>

          <div className="nav-user">
            <ThemeToggle />
            <div className="user-info">
              <span className="user-name">{user?.username}</span>
              <span className="user-email">{user?.email}</span>
            </div>
            <button 
              className="logout-btn"
              onClick={handleLogout}
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};