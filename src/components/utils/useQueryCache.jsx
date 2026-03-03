// Advanced Query Caching mit Stale-While-Revalidate (SWR)
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache_first',           // Nutze Cache, Background Refresh
  NETWORK_FIRST: 'network_first',       // Versuche Network, Fall back zu Cache
  STALE_WHILE_REVALIDATE: 'swr',        // Serviere Stale, Revalidate im Background
  CACHE_ONLY: 'cache_only'              // Nur Cache, kein Network
};

const CACHE_DURATIONS = {
  INSTANT: 0,
  SHORT: 60 * 1000,                     // 1 Minute
  MEDIUM: 5 * 60 * 1000,                // 5 Minuten
  LONG: 30 * 60 * 1000,                 // 30 Minuten
  VERY_LONG: 24 * 60 * 60 * 1000        // 1 Tag
};

class QueryCacheManager {
  constructor() {
    this.cache = new Map();
    this.metadata = new Map();
  }

  set(key, data, ttl = CACHE_DURATIONS.MEDIUM) {
    this.cache.set(key, data);
    this.metadata.set(key, {
      timestamp: Date.now(),
      ttl,
      hits: 0,
      size: this.estimateSize(data)
    });
  }

  get(key) {
    const meta = this.metadata.get(key);
    if (!meta) return null;

    const isExpired = Date.now() - meta.timestamp > meta.ttl;
    if (isExpired && meta.ttl > 0) {
      this.invalidate(key);
      return null;
    }

    meta.hits++;
    return this.cache.get(key);
  }

  invalidate(key) {
    this.cache.delete(key);
    this.metadata.delete(key);
  }

  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.invalidate(key);
      }
    }
  }

  estimateSize(obj) {
    const str = JSON.stringify(obj);
    return new Blob([str]).size;
  }

  getStats() {
    let totalSize = 0;
    let totalHits = 0;
    let itemCount = 0;

    for (const meta of this.metadata.values()) {
      totalSize += meta.size;
      totalHits += meta.hits;
      itemCount++;
    }

    return { itemCount, totalSize, totalHits };
  }

  clear() {
    this.cache.clear();
    this.metadata.clear();
  }
}

const cacheManager = new QueryCacheManager();

export function useQueryWithCache(
  queryKey,
  queryFn,
  {
    strategy = CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    ttl = CACHE_DURATIONS.MEDIUM,
    ...queryOptions
  } = {}
) {
  const cacheKey = JSON.stringify(queryKey);
  const [swrData, setSwrData] = useState(null);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const cached = cacheManager.get(cacheKey);

      switch (strategy) {
        case CACHE_STRATEGIES.CACHE_FIRST:
          if (cached) return cached;
          break;

        case CACHE_STRATEGIES.NETWORK_FIRST:
          try {
            const fresh = await queryFn();
            cacheManager.set(cacheKey, fresh, ttl);
            return fresh;
          } catch {
            return cached;
          }

        case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
          if (cached) setSwrData(cached);
          break;

        case CACHE_STRATEGIES.CACHE_ONLY:
          return cached;
      }

      const fresh = await queryFn();
      cacheManager.set(cacheKey, fresh, ttl);
      return fresh;
    },
    staleTime: ttl,
    gcTime: ttl * 2,
    ...queryOptions
  });

  return {
    ...query,
    swrData // Stale data für SWR Strategy
  };
}

export { QueryCacheManager, CACHE_STRATEGIES, CACHE_DURATIONS, cacheManager };