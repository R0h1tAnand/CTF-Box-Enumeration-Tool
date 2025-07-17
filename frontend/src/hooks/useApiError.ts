import { useState, useCallback } from 'react';
import type { ApiError } from '../services/apiClient';

interface UseApiErrorReturn {
  error: string | null;
  isLoading: boolean;
  clearError: () => void;
  handleApiCall: <T>(apiCall: () => Promise<T>) => Promise<T | null>;
}

export const useApiError = (): UseApiErrorReturn => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      return result;
    } catch (err: any) {
      const apiError = err as ApiError;
      
      // Handle different types of errors
      switch (apiError.type) {
        case 'NETWORK_ERROR':
          setError('Network connection failed. Please check your internet connection.');
          break;
        case 'SECURITY_ERROR':
          setError('Security check failed. Please log in again.');
          break;
        case 'PERMISSION_ERROR':
          setError('You do not have permission to perform this action.');
          break;
        case 'RATE_LIMIT_ERROR':
          const retryTime = apiError.retryAfter ? `${apiError.retryAfter} seconds` : 'a moment';
          setError(`Too many requests. Please try again in ${retryTime}.`);
          break;
        case 'SERVER_ERROR':
          setError('Server error. Please try again later.');
          break;
        case 'HTTP_ERROR':
          if (apiError.status === 404) {
            setError('The requested resource was not found.');
          } else {
            setError(apiError.message || 'An unexpected error occurred.');
          }
          break;
        case 'VALIDATION_ERROR':
          setError(apiError.message || 'Please check your input and try again.');
          break;
        default:
          setError('An unexpected error occurred. Please try again.');
      }
      
      console.error('API Error:', apiError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    error,
    isLoading,
    clearError,
    handleApiCall,
  };
};