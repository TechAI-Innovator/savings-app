// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// API Endpoints
export const ENDPOINTS = {
  AUTH: {
    VERIFY: import.meta.env.VITE_ENDPOINT_AUTH_VERIFY || '/auth/verify',
    LOGOUT: import.meta.env.VITE_ENDPOINT_AUTH_LOGOUT || '/auth/logout',
    STATUS: import.meta.env.VITE_ENDPOINT_AUTH_STATUS || '/auth/status',
  },
  ACCOUNT: {
    UPDATE: import.meta.env.VITE_ENDPOINT_ACCOUNT_UPDATE || '/account/update',
    HISTORY: import.meta.env.VITE_ENDPOINT_ACCOUNT_HISTORY || '/account/history',
  },
  HEALTH: import.meta.env.VITE_ENDPOINT_HEALTH || '/health',
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

