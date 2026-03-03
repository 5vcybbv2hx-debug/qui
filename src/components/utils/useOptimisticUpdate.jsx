import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Optimistic update hook
 * Shows changes immediately, reverts on error
 */
export const useOptimisticUpdate = (queryKey) => {
  const queryClient = useQueryClient();
  const [optimisticData, setOptimisticData] = useState(null);

  const applyOptimisticUpdate = useCallback((updater) => {
    // Get current data
    const previousData = queryClient.getQueryData(queryKey);
    
    // Apply optimistic update
    if (previousData && Array.isArray(previousData)) {
      const newData = previousData.map(item =>
        item.id === updater.id ? { ...item, ...updater.changes } : item
      );
      queryClient.setQueryData(queryKey, newData);
      setOptimisticData({ previousData, newData });
      return () => revertOptimisticUpdate(previousData);
    } else if (previousData) {
      const newData = { ...previousData, ...updater.changes };
      queryClient.setQueryData(queryKey, newData);
      setOptimisticData({ previousData, newData });
      return () => revertOptimisticUpdate(previousData);
    }
  }, [queryKey, queryClient]);

  const revertOptimisticUpdate = useCallback((previousData) => {
    queryClient.setQueryData(queryKey, previousData);
    setOptimisticData(null);
  }, [queryKey, queryClient]);

  const confirmOptimisticUpdate = useCallback(() => {
    setOptimisticData(null);
  }, []);

  return {
    applyOptimisticUpdate,
    revertOptimisticUpdate,
    confirmOptimisticUpdate,
    optimisticData
  };
};