import { useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Global analytics wrapper
 * Track user actions and errors
 */
export const useAnalytics = () => {
  const track = useCallback((eventName, properties = {}) => {
    try {
      base44.analytics.track({
        eventName,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      });
    } catch (err) {
      console.error('Analytics track failed:', err);
    }
  }, []);

  // Track page views
  useEffect(() => {
    const pathname = window.location.pathname;
    track('page_view', { pathname });
  }, [track]);

  // Track errors globally
  useEffect(() => {
    window.__analyticsTrack = track;
  }, [track]);

  return { track };
};

/**
 * Common analytics events
 */
export const analyticsEvents = {
  // User actions
  userLoggedIn: () => ({ eventName: 'user_logged_in' }),
  userLoggedOut: () => ({ eventName: 'user_logged_out' }),
  
  // Mutations
  entityCreated: (entityName) => ({ eventName: 'entity_created', properties: { entityName } }),
  entityUpdated: (entityName) => ({ eventName: 'entity_updated', properties: { entityName } }),
  entityDeleted: (entityName) => ({ eventName: 'entity_deleted', properties: { entityName } }),
  
  // Features
  offlineModeActivated: () => ({ eventName: 'offline_mode_activated' }),
  syncCompleted: (count) => ({ eventName: 'sync_completed', properties: { syncedCount: count } }),
  backupCreated: () => ({ eventName: 'backup_created' }),
  
  // Errors
  errorOccurred: (context, message) => ({
    eventName: 'error_occurred',
    properties: { context, message }
  })
};