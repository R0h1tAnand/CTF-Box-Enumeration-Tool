import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { SessionWarning } from './SessionWarning';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresAuth?: boolean;
  requiresValidSession?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiresAuth = true,
  requiresValidSession = true 
}) => {
  const { isAuthenticated, loading, sessionWarning } = useAuth();
  const location = useLocation();
  const [sessionValid, setSessionValid] = useState(true);
  const [validating, setValidating] = useState(false);

  // Perform session validation on route access
  useEffect(() => {
    const validateSession = async () => {
      if (!isAuthenticated || !requiresValidSession) {
        return;
      }

      setValidating(true);
      try {
        const isValid = await authService.performSecurityCheck();
        setSessionValid(isValid);
        
        if (!isValid) {
          console.warn('Session validation failed, redirecting to login');
        }
      } catch (error) {
        console.error('Session validation error:', error);
        setSessionValid(false);
      } finally {
        setValidating(false);
      }
    };

    validateSession();
  }, [isAuthenticated, requiresValidSession, location.pathname]);

  // Show loading spinner while validating
  if (loading || validating) {
    return (
      <div className="auth-loading-container">
        <div className="auth-loading-spinner">
          <div className="spinner-ring"></div>
        </div>
        <div className="auth-loading-text">
          {validating ? 'Validating session...' : 'Loading...'}
        </div>
      </div>
    );
  }

  // Check authentication requirement
  if (requiresAuth && !isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check session validity
  if (requiresAuth && isAuthenticated && !sessionValid) {
    // Session is invalid, redirect to login with reason
    return <Navigate to="/login?reason=session_invalid" state={{ from: location }} replace />;
  }

  return (
    <>
      {children}
      {sessionWarning && <SessionWarning />}
    </>
  );
};