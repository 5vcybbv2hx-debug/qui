import { useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Global error handler hook
 * Centralized error handling with toast feedback
 */
export const useErrorHandler = () => {
  const handleError = useCallback((error, context = '') => {
    // Log error
    console.error(`[${context}]`, error);

    // Analytics
    if (window.__analyticsTrack) {
      window.__analyticsTrack({
        eventName: 'error_handled',
        properties: {
          context,
          message: error?.message || 'Unknown error',
          stack: error?.stack
        }
      });
    }

    // User feedback
    const message = error?.response?.data?.message || 
                   error?.message || 
                   'Ein Fehler ist aufgetreten';
    
    toast.error(message, {
      description: context && `Bereich: ${context}`,
      duration: 4000
    });

    return error;
  }, []);

  const handleSuccess = useCallback((message, context = '') => {
    toast.success(message, {
      description: context && `${context}`,
      duration: 2000
    });
  }, []);

  const handleWarning = useCallback((message, context = '') => {
    toast.warning(message, {
      description: context && `${context}`,
      duration: 3000
    });
  }, []);

  return {
    handleError,
    handleSuccess,
    handleWarning
  };
};