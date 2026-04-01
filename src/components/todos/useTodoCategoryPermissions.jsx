import { useMemo } from 'react';
import { usePermissions } from '@/components/auth/usePermissions';

/**
 * Hook: Prüfe welche Todo-Kategorien der aktuelle Nutzer sehen darf
 * Basierend auf: Rolle + optionale spezifische Mitarbeiter-ID
 */
export function useTodoCategoryPermissions(categories = [], currentUserId = null) {
  const permissions = usePermissions();

  const visibleCategories = useMemo(() => {
    if (!Array.isArray(categories)) return [];

    return categories.filter(cat => {
      // Admins sehen alles
      if (permissions.isAdmin) return true;

      // Prüfe ob Rolle in visible_roles ist
      const visibleRoles = cat.visible_roles || [];
      const userRole = permissions.role || 'user';
      const roleMatches = visibleRoles.includes(userRole) || visibleRoles.includes('*');

      // Prüfe ob Mitarbeiter-ID in visible_employee_ids ist
      const visibleEmployeeIds = cat.visible_employee_ids || [];
      const employeeMatches = currentUserId && visibleEmployeeIds.includes(currentUserId);

      return roleMatches || employeeMatches;
    });
  }, [categories, permissions.isAdmin, permissions.role, currentUserId]);

  return visibleCategories;
}

/**
 * Filter todos by visible categories
 */
export function filterTodosByVisibleCategories(todos = [], visibleCategories = []) {
  if (!Array.isArray(todos)) return [];

  const visibleCategoryNames = visibleCategories.map(c => c.name);
  return todos.filter(todo => {
    // Todos ohne Kategorie zeigen (Fallback für alte Daten)
    if (!todo.category) return true;
    // Nur zeigen wenn Kategorie erlaubt
    return visibleCategoryNames.includes(todo.category);
  });
}