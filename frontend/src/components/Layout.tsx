import React from 'react';
import { Navigation } from './Navigation';
import { Footer } from './Footer';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <header className="layout-header">
        <Navigation />
      </header>
      
      <main className="layout-main">
        {children}
      </main>
      
      <Footer />
    </div>
  );
};