import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SessionWarning } from './components/SessionWarning';
import { authService } from './services/authService';
import { initializeSessionManager } from './utils/sessionManager';
import './App.css';

// Placeholder Dashboard component
const Dashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <h1>Cybersecurity Toolkit Dashboard</h1>
      <p>Welcome to your security toolkit!</p>
    </div>
  );
};

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
              <Dashboard />
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
