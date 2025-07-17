import React from 'react';
import './Footer.css';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h4>CyberToolkit</h4>
            <p>Professional cybersecurity scanning platform</p>
          </div>
          
          <div className="footer-section">
            <h4>Tools</h4>
            <ul>
              <li>Nmap Scanner</li>
              <li>Gobuster</li>
              <li>Dirb</li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Resources</h4>
            <ul>
              <li>Documentation</li>
              <li>API Reference</li>
              <li>Support</li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {currentYear} CyberToolkit. Built for cybersecurity professionals.</p>
        </div>
      </div>
    </footer>
  );
};