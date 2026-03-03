import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class PermissionsCacheManager {
  constructor() {
    this.cache = null;
    this.cachedAt = null;
    this.subscribers = new Set();
  }

  isValid() {
    return this.cache && Date.now() - this.cachedAt < CACHE_DURATION;
  }

  async getPermissions() {
    if (this.isValid()) {
      return this.cache;
    }

    try {
      const user = await base44.auth.me();
      const employee = await base44.entities.Employee.filter(
        { email: user.email },
        '',
        1
      );

      this.cache = {
        ...this.buildDefaultPermissions(),
        ...(employee[0]?.permissions || {})
      };
      this.cachedAt = Date.now();

      this.notifySubscribers();
      return this.cache;
    } catch (error) {
      console.error('Permission fetch failed:', error);
      return this.buildDefaultPermissions();
    }
  }

  buildDefaultPermissions() {
    return {
      canViewDashboard: true,
      canViewShifts: true,
      canEditShifts: false,
      canViewReservations: true,
      canEditReservations: false,
      canViewShopping: true,
      canEditShopping: false,
      canViewRestock: true,
      canEditRestock: false,
      canViewCleaning: true,
      canEditCleaning: false,
      canViewTodos: true,
      canEditTodos: false,
      canViewEmployees: true,
      canEditEmployees: false,
      canViewAnalytics: false,
      canViewPriceCalculator: false,
      canClockOutOthers: false,
      canViewOnboarding: false,
      canViewInventory: false,
      canViewWastage: false,
      isManager: false,
      isAdmin: false
    };
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    this.subscribers.forEach(cb => cb(this.cache));
  }

  invalidate() {
    this.cache = null;
    this.cachedAt = null;
  }
}

const permissionsManager = new PermissionsCacheManager();

export const usePermissions = () => {
  const [permissions, setPermissions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const loadPermissions = async () => {
      const perms = await permissionsManager.getPermissions();
      if (isMountedRef.current) {
        setPermissions(perms);
        setIsLoading(false);
      }
    };

    loadPermissions();

    const unsubscribe = permissionsManager.subscribe((perms) => {
      if (isMountedRef.current) {
        setPermissions(perms);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  return permissions || permissionsManager.buildDefaultPermissions();
};

export const invalidatePermissionsCache = () => {
  permissionsManager.invalidate();
};