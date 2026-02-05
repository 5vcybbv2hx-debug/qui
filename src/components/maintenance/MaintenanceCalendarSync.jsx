import { base44 } from "@/api/base44Client";

export async function syncMaintenanceToCalendar(task) {
    if (!task.sync_to_calendar || !task.next_maintenance) return;

    try {
        // Check if event already exists
        const existingEvents = await base44.entities.Event.filter({
            title: `Wartung: ${task.equipment_name}`,
            date: task.next_maintenance
        });

        if (existingEvents.length === 0) {
            await base44.entities.Event.create({
                title: `Wartung: ${task.equipment_name}`,
                date: task.next_maintenance,
                start_time: "09:00",
                event_type: "Special Event",
                status: "geplant",
                notes: `${task.task_description}\nVerantwortlich: ${task.responsible || 'Nicht zugewiesen'}`
            });
        }
    } catch (error) {
        console.error('Error syncing to calendar:', error);
    }
}

export function calculateReminderDate(nextMaintenanceDate, reminderDaysBefore) {
    const date = new Date(nextMaintenanceDate);
    date.setDate(date.getDate() - reminderDaysBefore);
    return date.toISOString().split('T')[0];
}

export async function createReminderEvent(task) {
    if (!task.enable_reminders || !task.next_maintenance) return;

    try {
        const reminderDate = calculateReminderDate(task.next_maintenance, task.reminder_days_before);
        
        const existingReminders = await base44.entities.Event.filter({
            title: `⏰ Erinnerung: ${task.equipment_name}`,
            date: reminderDate
        });

        if (existingReminders.length === 0) {
            await base44.entities.Event.create({
                title: `⏰ Erinnerung: ${task.equipment_name}`,
                date: reminderDate,
                start_time: "09:00",
                event_type: "Special Event",
                status: "geplant",
                notes: `Wartung fällig am: ${new Date(task.next_maintenance).toLocaleDateString('de-DE')}\n${task.task_description}`
            });
        }
    } catch (error) {
        console.error('Error creating reminder:', error);
    }
}