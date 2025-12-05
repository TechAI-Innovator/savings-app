import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { buildApiUrl, ENDPOINTS } from '@/config/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial auth check
  const [error, setError] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Check authentication status on initial load (for page refresh/navigation)
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('🔍 AuthContext: Checking existing session...');
      try {
        const response = await fetch(buildApiUrl(ENDPOINTS.AUTH.STATUS), {
          method: 'GET',
          credentials: 'include', // Include cookies for session management
        });

        if (response.ok) {
          const data = await response.json();
          console.log('📡 AuthContext: Session check response:', data);
          if (data.authenticated) {
            console.log('✅ AuthContext: Existing session found, user is authenticated');
            setIsAuthenticated(true);
            setLastActivity(Date.now());
          } else {
            console.log('ℹ️ AuthContext: No existing session');
            setIsAuthenticated(false);
          }
        } else {
          console.log('ℹ️ AuthContext: Session check failed, user not authenticated');
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('🚨 AuthContext: Error checking session:', err);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

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
    window.addEventListener('touchstart', updateActivity); // For mobile/iPhone

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, [isAuthenticated]);

  const login = async (password: string): Promise<boolean> => {
    console.log('🔐 AuthContext: Login attempt initiated');
    try {
      console.log('🌐 AuthContext: Sending login request to backend');
      const response = await fetch(buildApiUrl(ENDPOINTS.AUTH.VERIFY), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for session management
        body: JSON.stringify({ password }),
      });

      console.log(`📡 AuthContext: Login response received - Status: ${response.status}`);
      
      if (response.ok) {
        console.log('✅ AuthContext: Login successful, updating authentication state');
        setIsAuthenticated(true);
        setError(null);
        setLastActivity(Date.now());
        console.log('🕐 AuthContext: Last activity timestamp updated');
        return true;
      } else {
        console.warn('❌ AuthContext: Login failed - incorrect password');
        setError('Incorrect password. Please try again.');
        return false;
      }
    } catch (err) {
      console.error('🚨 AuthContext: Login error:', err);
      setError('Unable to verify password. Please check your connection and try again.');
      return false;
    }
  };

  const logout = async () => {
    console.log('🚪 AuthContext: Logout initiated');
    try {
      console.log('🌐 AuthContext: Sending logout request to backend');
      // Call backend logout endpoint to clear server-side session
      const response = await fetch(buildApiUrl(ENDPOINTS.AUTH.LOGOUT), {
        method: 'POST',
        credentials: 'include', // Include cookies for session management
      });
      console.log(`📡 AuthContext: Logout response received - Status: ${response.status}`);
    } catch (err) {
      // Continue with logout even if backend call fails
      console.warn('⚠️ AuthContext: Backend logout failed:', err);
    } finally {
      // Always clear frontend state
      console.log('🧹 AuthContext: Clearing frontend authentication state');
      setIsAuthenticated(false);
      setError(null);
      console.log('✅ AuthContext: Logout completed');
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, error }}>
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
