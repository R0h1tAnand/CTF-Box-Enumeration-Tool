import React from 'react';
import { Navigation } from './Navigation';
import { Footer } from './Footer';
import { ResponsiveContainer, useResponsive } from './ui';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isMobile, isTablet } = useResponsive();
  
  return (
    <div className={`layout ${isMobile ? 'layout--mobile' : ''} ${isTablet ? 'layout--tablet' : ''}`}>
      <header className="layout-header">
        <ResponsiveContainer maxWidth="full" padding="sm">
          <Navigation />
        </ResponsiveContainer>
      </header>
      
      <main className="layout-main">
        <ResponsiveContainer maxWidth="xl" padding={isMobile ? 'sm' : 'md'}>
          {children}
        </ResponsiveContainer>
      </main>
      
      <Footer />
    </div>
  );
};