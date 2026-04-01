import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Serverseitige Todo-Filterung nach:
 * 1. Kategorie-Berechtigungen (role-based visibility)
 * 2. Zuordnung (assigned_to_names)
 * 
 * Verhindert dass User unberechtigt auf Todos sehen können
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch categories + todos
    const categories = await base44.entities.TodoCategory.list();
    const allTodos = await base44.entities.TodoItem.list('-created_date', 500);

    // Build set of visible category names
    const visibleCategories = categories.filter(cat => {
      const visibleRoles = cat.visible_roles || [];
      const visibleEmployeeIds = cat.visible_employee_ids || [];
      const roleMatches = visibleRoles.includes(user.role) || visibleRoles.includes('*');
      const employeeMatches = visibleEmployeeIds.includes(user.id);
      return roleMatches || employeeMatches || user.role === 'admin';
    });

    const visibleCategoryNames = new Set(visibleCategories.map(c => c.name));

    // Filter todos
    const visibleTodos = allTodos.filter(todo => {
      // Filter 1: Kategorie-Berechtigung
      if (todo.category && !visibleCategoryNames.has(todo.category)) {
        return false; // User darf diese Kategorie nicht sehen
      }

      // Filter 2: Zuordnung
      const assignees = todo.assigned_to_names?.length > 0
        ? todo.assigned_to_names
        : todo.assigned_to ? [todo.assigned_to] : [];

      if (assignees.length === 0) return true; // Unbeauftragte sehen alle
      if (user.role === 'admin') return true; // Admins sehen alle
      
      // Regular users sehen nur ihrer zugeordnete
      return assignees.includes(user.full_name) || assignees.includes(user.email);
    });

    return Response.json({ 
      todos: visibleTodos,
      visibleCategories,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error fetching visible todos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});