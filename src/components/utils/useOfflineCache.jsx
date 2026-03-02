import { useEffect, useState } from 'react';

const DB_NAME = 'BarManagerOfflineCache';
const DB_VERSION = 1;

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores for each entity
      const stores = [
        'Employee',
        'Shift',
        'Article',
        'ShoppingList',
        'RestockItem',
        'Recipe',
        'Event',
        'Reservation',
        'CleaningTask',
        'TimeEntry',
        'ClockEntry'
      ];
      
      stores.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      });
    };
  });
};

// Cache data in IndexedDB
export const cacheData = async (storeName, data) => {
  try {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    // Clear existing data and add new
    await store.clear();
    
    if (Array.isArray(data)) {
      data.forEach(item => store.add(item));
    } else {
      store.add(data);
    }
    
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
    });
  } catch (error) {
    console.error('Cache error:', error);
    return false;
  }
};

// Get cached data from IndexedDB
export const getCachedData = async (storeName) => {
  try {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (error) {
    console.error('Get cache error:', error);
    return [];
  }
};

// Hook for offline caching with query
export const useOfflineCache = (storeName, queryHook, options = {}) => {
  const [cachedData, setCachedData] = useState(null);
  const [isLoadingCache, setIsLoadingCache] = useState(true);
  
  const query = queryHook();
  const isOnline = navigator.onLine;
  
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
  
  // Return query data if online, otherwise cached data
  return {
    data: isOnline ? query.data : (cachedData || query.data),
    isLoading: isOnline ? query.isLoading : isLoadingCache,
    error: isOnline ? query.error : null,
    isCached: !isOnline && cachedData !== null
  };
};