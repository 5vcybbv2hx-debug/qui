import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Serverseitige Abfrage der erlaubten Todo-Kategorien für einen User
 * Basiert auf Rolle + optionale Mitarbeiter-ID
 * Verhindert Frontend-Spoofing
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all categories
    const categories = await base44.entities.TodoCategory.list();

    // Admin sieht alles
    if (user.role === 'admin') {
      return Response.json({ categories, user });
    }

    // Filter nach Rolle des Users
    const visibleCategories = categories.filter(cat => {
      const visibleRoles = cat.visible_roles || [];
      const visibleEmployeeIds = cat.visible_employee_ids || [];

      // Check: Ist die Rolle des Users in visible_roles?
      const roleMatches = visibleRoles.includes(user.role) || visibleRoles.includes('*');

      // Check: Ist die ID des Users in visible_employee_ids?
      const employeeMatches = visibleEmployeeIds.includes(user.id);

      return roleMatches || employeeMatches;
    });

    return Response.json({ categories: visibleCategories, user });
  } catch (error) {
    console.error('Error fetching todo categories:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});