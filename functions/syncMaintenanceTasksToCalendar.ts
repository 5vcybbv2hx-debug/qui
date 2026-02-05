import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all active maintenance tasks
        const tasks = await base44.asServiceRole.entities.MaintenanceTask.filter({
            is_active: true,
            sync_to_calendar: true
        });

        let synced = 0;
        let reminders = 0;

        for (const task of tasks) {
            if (!task.next_maintenance) continue;

            // Sync maintenance event
            const existingEvents = await base44.asServiceRole.entities.Event.filter({
                title: `Wartung: ${task.equipment_name}`,
                date: task.next_maintenance
            });

            if (existingEvents.length === 0) {
                await base44.asServiceRole.entities.Event.create({
                    title: `Wartung: ${task.equipment_name}`,
                    date: task.next_maintenance,
                    start_time: "09:00",
                    event_type: "Special Event",
                    status: "geplant",
                    notes: `${task.task_description}\nVerantwortlich: ${task.responsible || 'Nicht zugewiesen'}`
                });
                synced++;
            }

            // Create reminder event if enabled
            if (task.enable_reminders) {
                const reminderDate = new Date(task.next_maintenance);
                reminderDate.setDate(reminderDate.getDate() - (task.reminder_days_before || 7));
                const reminderDateStr = reminderDate.toISOString().split('T')[0];

                const existingReminders = await base44.asServiceRole.entities.Event.filter({
                    title: `⏰ Erinnerung: ${task.equipment_name}`,
                    date: reminderDateStr
                });

                if (existingReminders.length === 0) {
                    await base44.asServiceRole.entities.Event.create({
                        title: `⏰ Erinnerung: ${task.equipment_name}`,
                        date: reminderDateStr,
                        start_time: "09:00",
                        event_type: "Special Event",
                        status: "geplant",
                        notes: `Wartung fällig am: ${new Date(task.next_maintenance).toLocaleDateString('de-DE')}\n${task.task_description}`
                    });
                    reminders++;
                }
            }
        }

        return Response.json({
            success: true,
            message: `Synchronisiert: ${synced} Wartungen, ${reminders} Erinnerungen`,
            synced,
            reminders
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});