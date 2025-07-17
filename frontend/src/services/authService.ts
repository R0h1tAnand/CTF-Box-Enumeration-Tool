import axios from 'axios';
import type { LoginCredentials, RegisterData, AuthResponse, User } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create a dedicated auth API instance (separate from main API client)
const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Simple interceptor for auth API (no token refresh needed for auth endpoints)
authApi.interceptors.request.use((config) => {
  // Only add token for profile/me endpoint
  if (config.url?.includes('/auth/me')) {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Session timeout configuration (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;
let sessionTimeoutId: number | null = null;
let lastActivityTime = Date.now();
let activityListenersAttached = false;

// Activity tracking for session timeout
const updateLastActivity = () => {
  lastActivityTime = Date.now();
  resetSessionTimeout();
};

const resetSessionTimeout = () => {
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
  }
  
  sessionTimeoutId = setTimeout(() => {
    authService.logout();
    window.location.href = '/login?reason=session_timeout';
  }, SESSION_TIMEOUT);
};

// Track user activity
const trackActivity = () => {
  if (activityListenersAttached) return;
  
  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
    document.addEventListener(event, updateLastActivity, true);
  });
  
  activityListenersAttached = true;
};

// Remove activity listeners
const removeActivityListeners = () => {
  if (!activityListenersAttached) return;
  
  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
    document.removeEventListener(event, updateLastActivity, true);
  });
  
  activityListenersAttached = false;
};

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await authApi.post('/auth/login', credentials);
    const authData = response.data;
    
    // Store tokens with timestamp
    localStorage.setItem('access_token', authData.access_token);
    localStorage.setItem('refresh_token', authData.refresh_token);
    localStorage.setItem('login_timestamp', Date.now().toString());
    
    // Start session timeout tracking
    this.startSessionTracking();
    
    return authData;
  },

  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await authApi.post('/auth/register', userData);
    const authData = response.data;
    
    // Store tokens with timestamp
    localStorage.setItem('access_token', authData.access_token);
    localStorage.setItem('refresh_token', authData.refresh_token);
    localStorage.setItem('login_timestamp', Date.now().toString());
    
    // Start session timeout tracking
    this.startSessionTracking();
    
    return authData;
  },

  async getCurrentUser(): Promise<User> {
    const response = await authApi.get('/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    // Call logout endpoint to invalidate tokens on server
    if (refreshToken) {
      try {
        await authApi.post('/auth/logout', { refresh_token: refreshToken });
      } catch (error) {
        console.warn('Server logout failed:', error);
      }
    }
    
    // Clear all auth-related data
    this.clearAuthData();
    
    // Stop session tracking
    this.stopSessionTracking();
  },

  clearAuthData(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('login_timestamp');
    localStorage.removeItem('user_preferences');
  },

  async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      
      const { access_token, refresh_token: newRefreshToken } = response.data;
      
      localStorage.setItem('access_token', access_token);
      if (newRefreshToken) {
        localStorage.setItem('refresh_token', newRefreshToken);
      }
      
      return access_token;
    } catch (error) {
      this.logout();
      throw error;
    }
  },

  getToken(): string | null {
    return localStorage.getItem('access_token');
  },

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  },

  isAuthenticated(): boolean {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();
    
    if (!token || !refreshToken) {
      return false;
    }
    
    // Check if session has expired
    if (this.isSessionExpired()) {
      this.logout();
      return false;
    }
    
    return true;
  },

  isSessionExpired(): boolean {
    const loginTimestamp = localStorage.getItem('login_timestamp');
    if (!loginTimestamp) {
      return true;
    }
    
    const sessionAge = Date.now() - parseInt(loginTimestamp);
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
    
    return sessionAge > maxSessionAge;
  },

  startSessionTracking(): void {
    trackActivity();
    resetSessionTimeout();
  },

  stopSessionTracking(): void {
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId);
      sessionTimeoutId = null;
    }
    
    // Remove activity listeners
    removeActivityListeners();
  },

  getSessionTimeRemaining(): number {
    const timeSinceLastActivity = Date.now() - lastActivityTime;
    return Math.max(0, SESSION_TIMEOUT - timeSinceLastActivity);
  },

  getLastActivityTime(): Date {
    return new Date(lastActivityTime);
  },

  extendSession(): void {
    updateLastActivity();
  },

  // Security check for token validity
  async validateSession(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  },

  // Enhanced security checks
  async performSecurityCheck(): Promise<boolean> {
    // Check if tokens exist
    if (!this.isAuthenticated()) {
      return false;
    }

    // Check for suspicious activity (multiple failed requests)
    const failedRequests = parseInt(localStorage.getItem('failed_requests') || '0');
    if (failedRequests > 5) {
      console.warn('Too many failed requests detected, logging out for security');
      await this.logout();
      return false;
    }

    // Validate session with server
    try {
      const isValid = await this.validateSession();
      if (!isValid) {
        await this.logout();
        return false;
      }
      
      // Reset failed requests counter on successful validation
      localStorage.removeItem('failed_requests');
      return true;
    } catch (error) {
      this.incrementFailedRequests();
      return false;
    }
  },

  // Track failed authentication attempts
  incrementFailedRequests(): void {
    const current = parseInt(localStorage.getItem('failed_requests') || '0');
    localStorage.setItem('failed_requests', (current + 1).toString());
  },

  // Enhanced token validation with expiry check
  isTokenValid(token: string): boolean {
    if (!token) return false;
    
    try {
      // Basic JWT structure validation
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Decode payload to check expiry
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // Check if token is expired (with 5 minute buffer)
      if (payload.exp && payload.exp < (now + 300)) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('Token validation failed:', error);
      return false;
    }
  },

  // Enhanced logout with server notification and cleanup
  async enhancedLogout(reason?: string): Promise<void> {
    const refreshToken = this.getRefreshToken();
    
    // Notify server about logout
    if (refreshToken) {
      try {
        await authApi.post('/auth/logout', { 
          refresh_token: refreshToken,
          reason: reason || 'user_initiated'
        });
      } catch (error) {
        console.warn('Server logout notification failed:', error);
      }
    }
    
    // Clear all authentication data
    this.clearAuthData();
    
    // Stop session tracking
    this.stopSessionTracking();
    
    // Clear any cached data
    this.clearUserCache();
    
    // Only redirect if not already on login page to prevent redirect loops
    if (!window.location.pathname?.includes('/login')) {
      const redirectUrl = reason === 'security_violation' 
        ? '/login?reason=security_logout' 
        : '/login?reason=logged_out';
      
      window.location.href = redirectUrl;
    }
  },

  // Clear user-related cached data
  clearUserCache(): void {
    // Clear any user-specific cached data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('user_') || key.startsWith('cache_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  },

  // Proactive token refresh before expiry
  async proactiveTokenRefresh(): Promise<void> {
    const token = this.getToken();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - now;
      
      // Refresh if token expires in less than 10 minutes
      if (timeUntilExpiry < 600) {
        await this.refreshToken();
      }
    } catch (error) {
      console.warn('Proactive token refresh failed:', error);
    }
  },

  // Start proactive token refresh interval
  startProactiveRefresh(): void {
    // Check every 5 minutes
    setInterval(() => {
      if (this.isAuthenticated()) {
        this.proactiveTokenRefresh();
      }
    }, 5 * 60 * 1000);
  },

  // Initialize auth service
  initialize(): void {
    this.startProactiveRefresh();
    
    // Initialize session tracking if user is already authenticated
    if (this.isAuthenticated()) {
      this.startSessionTracking();
    }
  },
};

// Initialize auth service on module load
authService.initialize();