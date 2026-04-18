import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Nur Admins erlaubt' }, { status: 403 });
    }

    // Alle abgeschlossenen ClockEntries laden
    const clockEntries = await base44.asServiceRole.entities.ClockEntry.list('-clock_in', 500);
    const completedEntries = clockEntries.filter(e => e.clock_out && e.status === 'clocked_out');

    // Alle vorhandenen TimeEntries laden
    const timeEntries = await base44.asServiceRole.entities.TimeEntry.list('-date', 1000);

    // Erstelle ein Set aus bereits vorhandenen Kombinationen: employee_id + date + start_time
    const existingKeys = new Set(
      timeEntries.map(t => `${t.employee_id}_${t.date}_${t.start_time}`)
    );

    let created = 0;
    let skipped = 0;

    for (const entry of completedEntries) {
      const clockIn = new Date(entry.clock_in);
      const clockOut = new Date(entry.clock_out);
      const date = format(clockIn, 'yyyy-MM-dd');
      const start_time = format(clockIn, 'HH:mm');
      const end_time = format(clockOut, 'HH:mm');

      const key = `${entry.employee_id}_${date}_${start_time}`;

      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      const totalHours = entry.total_hours || Math.round(((clockOut - clockIn) / 3600000 - (entry.pause_minutes || 0) / 60) * 100) / 100;

      await base44.asServiceRole.entities.TimeEntry.create({
        employee_id: entry.employee_id,
        employee_name: entry.employee_name,
        date,
        start_time,
        end_time,
        break_minutes: entry.pause_minutes || 0,
        total_hours: totalHours,
        status: 'eingereicht',
        employee_confirmed: true,
        employee_confirmed_at: entry.clock_out,
        notes: 'Nachträglich aus Stempelzeiten importiert'
      });

      existingKeys.add(key);
      created++;
    }

    return Response.json({ success: true, created, skipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});