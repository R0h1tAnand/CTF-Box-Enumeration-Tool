import { useAuth as useAuthContext } from '../contexts/AuthContext';

// Re-export the useAuth hook from context for convenience
export const useAuth = useAuthContext;