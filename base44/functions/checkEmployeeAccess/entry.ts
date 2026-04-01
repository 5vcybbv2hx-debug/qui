import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Backend-Funktion zur Prüfung von Employee-Datenzugriff
 * Verhindert unautorisierten Zugriff auf Personaldaten
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId, action } = await req.json();

    // Admin: Vollzugriff
    if (user.role === 'admin') {
      return Response.json({ allowed: true, reason: 'admin' });
    }

    // Mitarbeiter darf nur eigene Daten sehen
    if (action === 'view' || action === 'edit') {
      const targetEmployee = await base44.entities.Employee.filter({ 
        created_by: user.email 
      });
      
      if (targetEmployee.length === 0) {
        return Response.json({ 
          allowed: false, 
          reason: 'employee_not_found' 
        }, { status: 403 });
      }

      if (targetEmployee[0].id === employeeId || user.role === 'manager') {
        return Response.json({ allowed: true, reason: 'owner_or_manager' });
      }

      return Response.json({ 
        allowed: false, 
        reason: 'not_owner' 
      }, { status: 403 });
    }

    // Andere Aktionen nur Admin/Manager
    if (action === 'delete' || action === 'admin') {
      if (user.role === 'admin' || user.role === 'manager') {
        return Response.json({ allowed: true, reason: 'manager_admin' });
      }
      return Response.json({ 
        allowed: false, 
        reason: 'insufficient_role' 
      }, { status: 403 });
    }

    return Response.json({ 
      allowed: false, 
      reason: 'unknown_action' 
    }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});