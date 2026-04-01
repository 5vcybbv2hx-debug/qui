import { QueryClient } from '@tanstack/react-query';
import { STALE, GC } from './queryUtils';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			// Don't re-fetch just because the user switched tabs
			refetchOnWindowFocus: false,
			// Default stale time: 2 min — overridden per-hook where needed
			staleTime: STALE.MEDIUM,
			// Keep unused data in memory for 15 min before GC
			gcTime: GC.DEFAULT,
			// Only retry once on error — avoids hammering the API on auth issues
			retry: 1,
			retryDelay: 2000,
		},
		mutations: {
			// Don't retry mutations — side effects must not be duplicated
			retry: 0,
		},
	},
});