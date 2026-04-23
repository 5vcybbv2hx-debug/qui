/**
 * ZENTRALE PERMISSION-GUARDS
 * 
 * Guards und Helper für Permission-Checks überall in der App
 * Konsistente Rechtsprüfung an:
 * - Navigation
 * - Routing
 * - Tabs
 * - Panels
 * - Buttons
 * - Dialoge
 * - API-Calls
 */

import { getEmployeePermissions, canAccessPermission, PERMISSION_LEVELS } from '@/lib/permissionRegistry';

/**
 * Check ob Mitarbeiter Zugriff auf eine Seite hat
 * @param {Object} employee - Employee object mit permissions
 * @param {String} sectionKey - Permission key (z.B. 'dashboard_overview')
 * @param {String} requiredLevel - 'view' oder 'edit' (default: 'view')
 * @returns {Boolean}
 */
export function canAccessSection(employee, sectionKey, requiredLevel = 'view') {
  return canAccessPermission(employee, sectionKey, requiredLevel);
}

/**
 * Check ob Mitarbeiter eine Seite vollständig sehen darf
 */
export function canViewPage(employee, pageKey) {
  // Check ob mindestens eine Section der Seite sichtbar ist
  const perms = getEmployeePermissions(employee);
  return Object.values(perms).some(level => level !== PERMISSION_LEVELS.NONE);
}

/**
 * Helper zum Filtern von Tabs/Sections basierend auf Berechtigungen
 * @param {Object} employee
 * @param {Array} tabs - Array von {key, label, ...}
 * @returns {Array} Gefilterte Tabs
 */
export function getVisibleTabs(employee, tabs) {
  return tabs.filter(tab => canAccessSection(employee, tab.key || tab.key));
}

/**
 * Helper zum Filtern von Actions basierend auf Berechtigungen
 */
export function getVisibleActions(employee, actions, requiredLevel = 'view') {
  return actions.filter(action => 
    canAccessSection(employee, action.key || action.permissionKey, requiredLevel)
  );
}

/**
 * Button/Action sichtbar machen?
 */
export function shouldShowButton(employee, permissionKey, requiredLevel = 'view') {
  return canAccessSection(employee, permissionKey, requiredLevel);
}

/**
 * Button deaktivieren wenn nicht enough permissions?
 */
export function isButtonDisabled(employee, permissionKey, requiredLevel = 'view') {
  return !canAccessSection(employee, permissionKey, requiredLevel);
}

/**
 * Permission-based Filter für Listen/Arrays
 */
export function filterByPermission(employee, items, permissionKeyField = 'permissionKey') {
  return items.filter(item => 
    canAccessSection(employee, item[permissionKeyField], 'view')
  );
}

/**
 * Get user's permission level for specific action
 * @returns {String} 'none' | 'view' | 'edit'
 */
export function getPermissionLevel(employee, permissionKey) {
  const perms = getEmployeePermissions(employee);
  return perms[permissionKey] || PERMISSION_LEVELS.NONE;
}

/**
 * Check ob Mitarbeiter ALLE required permissions hat
 */
export function hasAllPermissions(employee, requiredKeys, requiredLevel = 'view') {
  return requiredKeys.every(key => 
    canAccessSection(employee, key, requiredLevel)
  );
}

/**
 * Check ob Mitarbeiter MINDESTENS EINE der permissions hat
 */
export function hasAnyPermission(employee, permissionKeys, requiredLevel = 'view') {
  return permissionKeys.some(key => 
    canAccessSection(employee, key, requiredLevel)
  );
}

/**
 * Erstelle Tooltip/Message basierend auf Permission-Status
 */
export function getPermissionDenialMessage(permissionKey) {
  const messages = {
    dashboard_manager: 'Manager-Panel nicht verfügbar',
    shifts_create: 'Du darfst keine Schichten erstellen',
    shifts_edit: 'Du darfst Schichten nicht bearbeiten',
    time_approvals: 'Du darfst Zeiten nicht genehmigen',
    vacation_approve: 'Du darfst Urlaube nicht genehmigen',
    employees_manage: 'Du darfst Mitarbeiter nicht verwalten',
    employees_permissions: 'Du darfst Berechtigungen nicht verwalten',
    storage_labels: 'Du darfst Etiketten nicht drucken',
  };
  return messages[permissionKey] || 'Du hast keine Berechtigung für diese Aktion';
}

/**
 * Conditional Rendering Helper
 * Usage: {shouldShow(employee, 'dashboard_manager') && <ManagerPanel />}
 */
export const shouldShow = (employee, permissionKey, requiredLevel = 'view') => 
  canAccessSection(employee, permissionKey, requiredLevel);

/**
 * Guard für API-Calls und Mutations
 * Prüft Permission vor Ausführung
 */
export function checkPermissionBeforeMutation(employee, permissionKey, action = 'edit') {
  const level = getPermissionLevel(employee, permissionKey);
  
  if (level === PERMISSION_LEVELS.NONE) {
    throw new Error(`Keine Berechtigung: ${getPermissionDenialMessage(permissionKey)}`);
  }
  
  if (action === 'edit' && level !== PERMISSION_LEVELS.EDIT) {
    throw new Error(`Nur Lesezugriff: ${getPermissionDenialMessage(permissionKey)}`);
  }
  
  return true;
}

/**
 * React Hook: usePermissionGuard
 * Für einfache Permission-Checks in Komponenten
 */
export function usePermissionGuard(employee, permissionKey, requiredLevel = 'view') {
  return {
    canAccess: canAccessSection(employee, permissionKey, requiredLevel),
    level: getPermissionLevel(employee, permissionKey),
    message: getPermissionDenialMessage(permissionKey),
  };
}

/**
 * Wrapper für Protected Actions
 */
export function withPermissionGuard(employee, action, permissionKey) {
  return (...args) => {
    try {
      checkPermissionBeforeMutation(employee, permissionKey, 'edit');
      return action(...args);
    } catch (err) {
      console.error('Permission denied:', err.message);
      throw err;
    }
  };
}

/**
 * Build permission-filtered menu/navigation
 */
export function buildFilteredNavigation(employee, navigationConfig) {
  return navigationConfig.filter(item => 
    !item.requiredPermission || 
    canAccessSection(employee, item.requiredPermission, 'view')
  ).map(item => ({
    ...item,
    disabled: item.requiredPermission && 
              !canAccessSection(employee, item.requiredPermission, 'edit'),
  }));
}

/**
 * Get all accessible pages for employee
 */
export function getAccessiblePages(employee, availablePages) {
  return availablePages.filter(page => 
    canAccessSection(employee, page.permissionKey, 'view')
  );
}

/**
 * Audit-Log Helper: Log permission checks
 */
export function logPermissionCheck(employee, permissionKey, result, action = 'view') {
  console.log(`[Permission] ${employee?.name} - ${action} ${permissionKey}: ${result ? '✓' : '✗'}`);
}