import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage, DashboardPage, ScanPage, HistoryPage, SettingsPage } from './pages';
import { Layout, ProtectedRoute, SessionWarning } from './components';
import { authService } from './services/authService';
import { initializeSessionManager } from './utils/sessionManager';
import './App.css';

const AppContent: React.FC = () => {
  const { sessionWarning, extendSession, logout } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/scan" 
          element={
            <ProtectedRoute>
              <Layout>
                <ScanPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/history" 
          element={
            <ProtectedRoute>
              <Layout>
                <HistoryPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      
      {sessionWarning && (
        <SessionWarning
          show={sessionWarning}
          onExtend={() => extendSession?.()}
          onLogout={() => logout()}
        />
      )}
    </>
  );
};

function App() {
  // Initialize authentication services
  useEffect(() => {
    // Initialize auth service with proactive token refresh
    authService.initialize();
    
    // Initialize session manager
    initializeSessionManager();
  }, []);

  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <AppContent />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
