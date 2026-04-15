import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Automatische Zuweisung von Wochenaufgaben an die Aushilfe mit frühester Schicht morgen
 * Wird täglich um 17:00 Uhr (Berlin-Zeit) ausgeführt
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Admin-Check
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Morgen's Datum
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Wochentag morgen (0=Sonntag, 1=Montag, etc.)
    const tomorrowDayOfWeek = tomorrow.getDay();
    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const tomorrowDayName = dayNames[tomorrowDayOfWeek];

    // 1. Finde alle Schichten morgen
    const shiftsForTomorrow = await base44.entities.Shift.filter({
      date: tomorrowStr
    });

    if (shiftsForTomorrow.length === 0) {
      return Response.json({ message: 'Keine Schichten morgen', assigned: 0 });
    }

    // 2. Finde alle Aushilfen mit Schichten morgen
    const aushilfen = await base44.entities.Employee.filter({
      role: 'Aushilfe'
    });

    const aushilfeShifts = shiftsForTomorrow
      .filter(s => aushilfen.some(a => a.id === s.employee_id))
      .sort((a, b) => a.start_time.localeCompare(b.start_time)); // Nach Startzeit sortieren

    if (aushilfeShifts.length === 0) {
      return Response.json({ message: 'Keine Aushilfen morgen eingeplant', assigned: 0 });
    }

    // 3. Die Aushilfe mit frühester Schicht
    const earliestAushilfe = aushilfeShifts[0];
    const targetEmployee = aushilfen.find(a => a.id === earliestAushilfe.employee_id);

    // 4. Finde alle Wochenaufgaben (CleaningTasks), die morgen fällig sind
    const allTasks = await base44.entities.CleaningTask.filter({
      is_active: true
    });

    let assignedCount = 0;
    const tasksToAssign = [];

    for (const task of allTasks) {
      const shouldAssignToday = (
        (task.frequency === 'täglich') ||
        (task.frequency === 'am Wochenende' && (tomorrowDayOfWeek === 0 || tomorrowDayOfWeek === 6)) ||
        (task.frequency === 'wöchentlich' && task.due_date === tomorrowStr) ||
        (task.frequency === 'alle zwei Wochen' && task.biweekly_pattern) ||
        (task.frequency === 'monatlich' && parseInt(task.due_date?.split('-')[2]) === tomorrow.getDate())
      );

      if (shouldAssignToday) {
        tasksToAssign.push(task);
      }
    }

    // 5. Weise alle Tasks dieser Aushilfe zu
    for (const task of tasksToAssign) {
      // Erstelle einen TodoItem basierend auf dem CleaningTask
      const todoData = {
        title: task.title,
        description: `Reinigungsaufgabe: ${task.area}`,
        priority: 'mittel',
        status: 'offen',
        due_date: tomorrowStr,
        assigned_to: targetEmployee.short_name || targetEmployee.name,
        assigned_to_names: [targetEmployee.name],
        category: 'Sonstiges',
        created_by: 'System (automatisch)'
      };

      // Erstelle den Todo-Eintrag
      await base44.entities.TodoItem.create(todoData);
      assignedCount++;

      // Optional: Update des Tasks, um zu zeigen, dass er zugewiesen wurde
      await base44.entities.CleaningTask.update(task.id, {
        assigned_to: targetEmployee.id,
        assigned_to_name: targetEmployee.name
      });
    }

    return Response.json({
      success: true,
      message: `${assignedCount} Aufgaben zugewiesen an ${targetEmployee.name}`,
      assigned_to: targetEmployee.name,
      assigned_count: assignedCount,
      date: tomorrowStr,
      shift_start: earliestAushilfe.start_time
    });

  } catch (error) {
    console.error('Error in assignWeeklyTasks:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});