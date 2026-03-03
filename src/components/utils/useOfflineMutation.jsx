import { useState, useCallback, useEffect } from 'react';
import { queueMutation, syncMutations } from './offlineSync';
import { base44 } from '@/api/base44Client';

/**
 * Hook for offline-first mutations
 * Queues mutations when offline, syncs when back online
 */
export const useOfflineMutation = (entityName, mutationFn, options = {}) => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Auto-sync when back online
      syncMutations(base44).catch(err => console.error('Auto-sync failed:', err));
    };
    
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const mutate = useCallback(async (data, mutationType = 'create') => {
    setIsPending(true);
    setError(null);
    
    try {
      if (navigator.onLine) {
        // Online: Execute mutation directly
        const result = await mutationFn(data);
        setIsPending(false);
        return result;
      } else {
        // Offline: Queue mutation
        await queueMutation({
          entityName,
          type: mutationType,
          data,
          id: data?.id
        });
        setIsPending(false);
        return { queued: true };
      }
    } catch (err) {
      const errorMsg = err.message || 'Mutation failed';
      setError(errorMsg);
      
      // Queue even on error if offline
      if (!navigator.onLine) {
        await queueMutation({
          entityName,
          type: mutationType,
          data,
          id: data?.id
        });
      }
      
      setIsPending(false);
      throw err;
    }
  }, [entityName, mutationFn]);

  return {
    mutate,
    isPending,
    error,
    isOffline
  };
};