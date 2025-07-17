import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { authService } from '../services/authService';

// Security configuration
const SECURITY_CONFIG = {
  MAX_FAILED_REQUESTS: 5,
  TOKEN_REFRESH_BUFFER: 5 * 60, // 5 minutes before expiry
  REQUEST_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Request queue for token refresh
interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  config: InternalAxiosRequestConfig;
}

class AuthInterceptorManager {
  private isRefreshing = false;
  private requestQueue: QueuedRequest[] = [];
  private retryCount = new Map<string, number>();

  /**
   * Setup authentication interceptors for an axios instance
   */
  setupInterceptors(axiosInstance: AxiosInstance): void {
    // Request interceptor
    axiosInstance.interceptors.request.use(
      this.handleRequest.bind(this),
      this.handleRequestError.bind(this)
    );

    // Response interceptor
    axiosInstance.interceptors.response.use(
      this.handleResponse.bind(this),
      this.handleResponseError.bind(this)
    );
  }

  /**
   * Enhanced request interceptor with security checks
   */
  private async handleRequest(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
    // Skip security checks for auth endpoints
    const isAuthEndpoint = this.isAuthEndpoint(config.url || '');
    
    if (!isAuthEndpoint) {
      // Perform comprehensive security check
      const securityCheck = await this.performSecurityCheck();
      if (!securityCheck.isValid) {
        throw new Error(`Security check failed: ${securityCheck.reason}`);
      }
    }

    // Add authentication token with enhanced logic
    const token = authService.getToken();
    if (token && this.isTokenValid(token)) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    } else if (token && !isAuthEndpoint) {
      // Token exists but is invalid, try to refresh
      try {
        const newToken = await this.refreshTokenIfNeeded();
        if (newToken) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${newToken}`;
        } else {
          // No token available, logout user
          await authService.enhancedLogout('no_valid_token');
          throw new Error('Authentication required');
        }
      } catch (error) {
        console.warn('Token refresh failed during request:', error);
        await authService.enhancedLogout('token_refresh_failed');
        throw error;
      }
    } else if (!token && !isAuthEndpoint) {
      // No token for protected endpoint
      await authService.enhancedLogout('no_token');
      throw new Error('Authentication required');
    }

    // Add request metadata with enhanced tracking
    config.metadata = {
      startTime: new Date(),
      requestId: this.generateRequestId(),
    };

    // Update user activity for non-auth endpoints
    if (!isAuthEndpoint) {
      authService.extendSession();
    }

    // Add request timeout if not specified
    if (!config.timeout) {
      config.timeout = SECURITY_CONFIG.REQUEST_TIMEOUT;
    }

    return config;
  }

  /**
   * Handle request errors
   */
  private handleRequestError(error: any): Promise<never> {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }

  /**
   * Enhanced response interceptor
   */
  private handleResponse(response: AxiosResponse): AxiosResponse {
    // Log response metrics
    this.logResponseMetrics(response);

    // Reset failed requests counter on successful response
    this.resetFailedRequestsCounter();

    // Clear retry count for this request
    const requestId = response.config.metadata?.requestId;
    if (requestId) {
      this.retryCount.delete(requestId);
    }

    return response;
  }

  /**
   * Enhanced response error handler with retry logic
   */
  private async handleResponseError(error: any): Promise<any> {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      return this.handleNetworkError(error, originalRequest);
    }

    // Handle authentication errors (401)
    if (error.response.status === 401) {
      return this.handleAuthenticationError(error, originalRequest);
    }

    // Handle rate limiting (429)
    if (error.response.status === 429) {
      return this.handleRateLimitError(error, originalRequest);
    }

    // Handle server errors (5xx) with retry
    if (error.response.status >= 500) {
      return this.handleServerError(error, originalRequest);
    }

    // Handle other errors
    return this.handleGenericError(error);
  }

  /**
   * Handle network errors with retry logic
   */
  private async handleNetworkError(error: any, originalRequest: InternalAxiosRequestConfig): Promise<any> {
    const requestId = originalRequest?.metadata?.requestId || 'unknown';
    const currentRetries = this.retryCount.get(requestId) || 0;

    if (currentRetries < SECURITY_CONFIG.RETRY_ATTEMPTS) {
      this.retryCount.set(requestId, currentRetries + 1);
      
      // Wait before retrying
      await this.delay(SECURITY_CONFIG.RETRY_DELAY * (currentRetries + 1));
      
      console.warn(`Retrying network request (attempt ${currentRetries + 1}/${SECURITY_CONFIG.RETRY_ATTEMPTS})`);
      return this.retryRequest(originalRequest);
    }

    this.incrementFailedRequests();
    return Promise.reject({
      message: 'Network error. Please check your connection.',
      type: 'NETWORK_ERROR',
      originalError: error,
    });
  }

  /**
   * Handle authentication errors with token refresh
   */
  private async handleAuthenticationError(error: any, originalRequest: InternalAxiosRequestConfig & { _retry?: boolean }): Promise<any> {
    if (originalRequest._retry) {
      // Already tried to refresh, logout user
      await authService.enhancedLogout('authentication_failed');
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (this.isRefreshing) {
      // Queue the request if already refreshing
      return this.queueRequest(originalRequest);
    }

    return this.refreshTokenAndRetry(originalRequest);
  }

  /**
   * Handle rate limiting with exponential backoff
   */
  private async handleRateLimitError(error: any, originalRequest: InternalAxiosRequestConfig): Promise<any> {
    const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
    const requestId = originalRequest?.metadata?.requestId || 'unknown';
    const currentRetries = this.retryCount.get(requestId) || 0;

    if (currentRetries < SECURITY_CONFIG.RETRY_ATTEMPTS) {
      this.retryCount.set(requestId, currentRetries + 1);
      
      // Wait for the specified retry-after time
      await this.delay(retryAfter * 1000);
      
      console.warn(`Retrying rate-limited request after ${retryAfter}s`);
      return this.retryRequest(originalRequest);
    }

    return Promise.reject({
      message: `Too many requests. Please try again in ${retryAfter} seconds.`,
      status: 429,
      type: 'RATE_LIMIT_ERROR',
      retryAfter,
      originalError: error,
    });
  }

  /**
   * Handle server errors with retry logic
   */
  private async handleServerError(error: any, originalRequest: InternalAxiosRequestConfig): Promise<any> {
    const requestId = originalRequest?.metadata?.requestId || 'unknown';
    const currentRetries = this.retryCount.get(requestId) || 0;

    if (currentRetries < SECURITY_CONFIG.RETRY_ATTEMPTS) {
      this.retryCount.set(requestId, currentRetries + 1);
      
      // Exponential backoff
      const delay = SECURITY_CONFIG.RETRY_DELAY * Math.pow(2, currentRetries);
      await this.delay(delay);
      
      console.warn(`Retrying server error request (attempt ${currentRetries + 1}/${SECURITY_CONFIG.RETRY_ATTEMPTS})`);
      return this.retryRequest(originalRequest);
    }

    return Promise.reject({
      message: 'Server error. Please try again later.',
      status: error.response.status,
      type: 'SERVER_ERROR',
      originalError: error,
    });
  }

  /**
   * Handle generic errors
   */
  private handleGenericError(error: any): Promise<never> {
    // Increment failed requests for client errors
    if (error.response?.status >= 400 && error.response?.status < 500) {
      this.incrementFailedRequests();
    }

    const errorMessage = error.response?.data?.message || 
                        error.response?.statusText || 
                        'An unexpected error occurred';

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
      type: 'HTTP_ERROR',
      originalError: error,
    });
  }

  /**
   * Refresh token and retry the original request
   */
  private async refreshTokenAndRetry(originalRequest: InternalAxiosRequestConfig): Promise<any> {
    this.isRefreshing = true;

    try {
      const newToken = await authService.refreshToken();
      
      if (newToken) {
        this.processRequestQueue(newToken);
        
        // Retry the original request with new token
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        return this.retryRequest(originalRequest);
      } else {
        throw new Error('Token refresh returned null');
      }
    } catch (refreshError: any) {
      this.processRequestQueue(null, refreshError);
      
      // Only logout if the error is authentication-related
      if (refreshError?.response?.status === 401 || refreshError?.response?.status === 403) {
        await authService.enhancedLogout('token_refresh_failed');
      }
      
      throw refreshError;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Queue request during token refresh
   */
  private queueRequest(config: InternalAxiosRequestConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, config });
    });
  }

  /**
   * Process queued requests after token refresh
   */
  private processRequestQueue(token: string | null, error?: any): void {
    this.requestQueue.forEach(({ resolve, reject, config }) => {
      if (error) {
        reject(error);
      } else if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        resolve(this.retryRequest(config));
      } else {
        reject(new Error('Token refresh failed'));
      }
    });

    this.requestQueue = [];
  }

  /**
   * Retry a request
   */
  private async retryRequest(config: InternalAxiosRequestConfig): Promise<any> {
    // Import axios to create a new request
    const axios = (await import('axios')).default;
    return axios(config);
  }

  /**
   * Perform comprehensive security check
   */
  private async performSecurityCheck(): Promise<{ isValid: boolean; reason?: string }> {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      return { isValid: false, reason: 'User not authenticated' };
    }

    // Check for too many failed requests
    const failedRequests = this.getFailedRequestsCount();
    if (failedRequests > SECURITY_CONFIG.MAX_FAILED_REQUESTS) {
      await authService.enhancedLogout('too_many_failed_requests');
      return { isValid: false, reason: 'Too many failed requests' };
    }

    // Check session validity
    try {
      const isSessionValid = await authService.validateSession();
      if (!isSessionValid) {
        return { isValid: false, reason: 'Session validation failed' };
      }
    } catch (error) {
      return { isValid: false, reason: 'Session validation error' };
    }

    return { isValid: true };
  }

  /**
   * Check if token needs refresh
   */
  private async refreshTokenIfNeeded(): Promise<string | null> {
    const token = authService.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - now;

      // Refresh if token expires within buffer time
      if (timeUntilExpiry < SECURITY_CONFIG.TOKEN_REFRESH_BUFFER) {
        return await authService.refreshToken();
      }

      return token;
    } catch (error) {
      console.warn('Token parsing failed:', error);
      return await authService.refreshToken();
    }
  }

  /**
   * Utility methods
   */
  private isAuthEndpoint(url: string): boolean {
    const authEndpoints = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
    return authEndpoints.some(endpoint => url.includes(endpoint));
  }

  private isTokenValid(token: string): boolean {
    return authService.isTokenValid(token);
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logResponseMetrics(response: AxiosResponse): void {
    const endTime = new Date();
    const startTime = response.config.metadata?.startTime;
    const requestId = response.config.metadata?.requestId;

    if (startTime && requestId) {
      const duration = endTime.getTime() - startTime.getTime();
      console.debug(`API Request [${requestId}] to ${response.config.url} took ${duration}ms`);
    }
  }

  private incrementFailedRequests(): void {
    authService.incrementFailedRequests();
  }

  private resetFailedRequestsCounter(): void {
    localStorage.removeItem('failed_requests');
  }

  private getFailedRequestsCount(): number {
    return parseInt(localStorage.getItem('failed_requests') || '0');
  }
}

// Export singleton instance
export const authInterceptor = new AuthInterceptorManager();

// Export utility functions
export const setupAuthInterceptors = (axiosInstance: AxiosInstance): void => {
  authInterceptor.setupInterceptors(axiosInstance);
};

export default authInterceptor;