import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { buildApiUrl, ENDPOINTS } from '@/config/api';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Check for inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkInactivity = setInterval(() => {
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        logout();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkInactivity);
  }, [isAuthenticated, lastActivity]);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const updateActivity = () => setLastActivity(Date.now());
    
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
    };
  }, [isAuthenticated]);

  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch(buildApiUrl(ENDPOINTS.AUTH.VERIFY), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for session management
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setError(null);
        setLastActivity(Date.now());
        return true;
      } else {
        setError('Incorrect password. Please try again.');
        return false;
      }
    } catch (err) {
      setError('Unable to verify password. Please check your connection and try again.');
      return false;
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint to clear server-side session
      await fetch(buildApiUrl(ENDPOINTS.AUTH.LOGOUT), {
        method: 'POST',
        credentials: 'include', // Include cookies for session management
      });
    } catch (err) {
      // Continue with logout even if backend call fails
      console.warn('Backend logout failed:', err);
    } finally {
      // Always clear frontend state
      setIsAuthenticated(false);
      setError(null);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
