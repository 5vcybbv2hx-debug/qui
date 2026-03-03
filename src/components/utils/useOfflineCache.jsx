import { useEffect, useState, useCallback } from 'react';
import { cacheData, getCachedData, syncMutations } from './offlineSync';
import { base44 } from '@/api/base44Client';

/**
 * Hook for offline caching with automatic sync
 * - Reads from cache when offline
 * - Syncs mutations when back online
 */
export const useOfflineCache = (storeName, queryHook, options = {}) => {
  const [cachedData, setCachedData] = useState(null);
  const [isLoadingCache, setIsLoadingCache] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'completed', 'error'

  const query = queryHook();
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setSyncStatus('syncing');
      try {
        const result = await syncMutations(base44);
        setSyncStatus(result.failed > 0 ? 'error' : 'completed');
        // Refetch data after sync
        if (query.refetch) {
          await query.refetch();
        }
      } catch (err) {
        console.error('Sync failed:', err);
        setSyncStatus('error');
      }
    };
    
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [query]);
  
  // Load from cache on mount
  useEffect(() => {
    getCachedData(storeName).then(data => {
      setCachedData(data);
      setIsLoadingCache(false);
    });
  }, [storeName]);
  
  // Update cache when query data changes and online
  useEffect(() => {
    if (isOnline && query.data) {
      cacheData(storeName, query.data);
    }
  }, [query.data, isOnline, storeName]);
  
  // Clear sync status after completion
  useEffect(() => {
    if (syncStatus === 'completed') {
      const timer = setTimeout(() => setSyncStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);
  
  return {
    data: isOnline ? query.data : (cachedData || query.data),
    isLoading: isOnline ? query.isLoading : isLoadingCache,
    error: isOnline ? query.error : null,
    isCached: !isOnline && cachedData !== null,
    isOnline,
    syncStatus,
    refetch: query.refetch
  };
};