import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthPage, DashboardPage, ScanPage, HistoryPage, SettingsPage } from './pages';
import { Layout, ProtectedRoute, SessionWarning } from './components';
import { PageTransition, ToastProvider } from './components/ui';
import { authService } from './services/authService';
import { initializeSessionManager } from './utils/sessionManager';
import './App.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const AppContent: React.FC = () => {
  const { sessionWarning, extendSession, logout } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/login" element={
          <PageTransition transitionType="fade" duration={0.4}>
            <AuthPage />
          </PageTransition>
        } />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition transitionType="slide">
                  <DashboardPage />
                </PageTransition>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/scan" 
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition transitionType="zoom" duration={0.4}>
                  <ScanPage />
                </PageTransition>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/history" 
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition transitionType="slide">
                  <HistoryPage />
                </PageTransition>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings/*" 
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition transitionType="fade" duration={0.3}>
                  <SettingsPage />
                </PageTransition>
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
    <QueryClientProvider client={queryClient}>
      <Router>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <div className="app">
                <AppContent />
              </div>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
