import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoginForm, RegisterForm } from '../components';
import { useAuth } from '../contexts/AuthContext';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Redirect to intended page or dashboard if already authenticated
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const handleAuthSuccess = () => {
    const from = location.state?.from?.pathname || '/dashboard';
    window.location.href = from; // Force navigation to trigger re-render
  };

  return (
    <div className="auth-page">
      {isLogin ? (
        <LoginForm
          onSuccess={handleAuthSuccess}
          onSwitchToRegister={() => setIsLogin(false)}
        />
      ) : (
        <RegisterForm
          onSuccess={handleAuthSuccess}
          onSwitchToLogin={() => setIsLogin(true)}
        />
      )}
    </div>
  );
};