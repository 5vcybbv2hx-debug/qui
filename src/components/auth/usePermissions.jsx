import { useState, useEffect } from 'react';
import { loadPermissions, clearPermissionsCache, invalidatePermissionsCache } from './permissionsCache';
import { PERMISSION_MATRIX } from './roleConfig';

export { clearPermissionsCache, invalidatePermissionsCache };

/**
 * @typedef {Object} PermissionsState
 * @property {boolean} [canViewDashboard]
 * @property {boolean} [canViewShifts]
 * @property {boolean} [canEditShifts]
 * @property {boolean} [canViewReservations]
 * @property {boolean} [canEditReservations]
 * @property {boolean} [canViewTodos]
 * @property {boolean} [canEditTodos]
 * @property {boolean} [canViewArticles]
 * @property {boolean} [canEditArticles]
 * @property {string|null} role - User role (admin, manager, user)
 * @property {string|null} employeeRole - Employee role (Aushilfe, Vollzeit, Manager)
 * @property {string|null} employeeName
 * @property {string|null} employeeId
 * @property {boolean} isLoading
 * @property {boolean} isAdmin
 * @property {boolean} isManager
 * @property {boolean} isTerminal
 */

// Build default (all-false) state from the matrix so it stays in sync automatically
const defaultPermissions = Object.fromEntries(
    Object.keys(PERMISSION_MATRIX).map(k => [k, false])
);
Object.assign(defaultPermissions, {
    role: null, employeeRole: null, employeeName: null, employeeId: null,
    isLoading: true, isAdmin: false, isManager: false, isTerminal: false,
});

/**
 * Load and manage user permissions based on role and employee data.
 * Permissions are cached in localStorage and reloaded on mount.
 * @returns {PermissionsState} User permissions and metadata
 */
export function usePermissions() {

/**
 * Clear all cached permissions from localStorage (for logout/role changes)
 */