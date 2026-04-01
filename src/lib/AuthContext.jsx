import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, fetchAppPublicSettings } from '@/lib/sdkAdapter';
import { normalizeError, logError } from '@/lib/errorHandler';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // Fetch app public settings via stable adapter
      try {
        const appId = import.meta.env.VITE_BASE44_APP_ID;
        const token = localStorage.getItem('base44_token');
        
        const publicSettings = await fetchAppPublicSettings(appId, token);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        const normalized = normalizeError(appError);
        logError('checkAppState', appError, true);
        
        setAuthError({
          type: normalized.type,
          message: normalized.message
        });
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      const normalized = normalizeError(error);
      logError('checkAppState', error, true);
      setAuthError({
        type: normalized.type,
        message: normalized.message
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await authAPI.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      const normalized = normalizeError(error);
      logError('checkUserAuth', error, true);
      
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      if (normalized.type === 'auth_required') {
        setAuthError({
          type: 'auth_required',
          message: normalized.message
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      authAPI.logout(window.location.href);
    } else {
      authAPI.logout();
    }
  };

  const navigateToLogin = () => {
    authAPI.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export adapter for external use
export { authAPI } from '@/lib/sdkAdapter';