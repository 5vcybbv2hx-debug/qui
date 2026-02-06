import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Get all open tasks with due dates
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const tasks = await base44.asServiceRole.entities.TodoItem.filter({
            status: 'offen',
            due_date: tomorrowStr
        });

        if (tasks.length === 0) {
            return Response.json({ 
                message: 'No tasks due tomorrow',
                count: 0 
            });
        }

        // Get all users to check preferences
        const users = await base44.asServiceRole.entities.User.list();
        
        const notifications = [];

        for (const task of tasks) {
            // Find the assigned user
            const assignedUser = users.find(u => u.email === task.assigned_to || u.full_name === task.assigned_to);
            
            if (!assignedUser) continue;

            // Check notification preferences
            const prefs = assignedUser.notification_preferences || {};
            if (prefs.tasks_deadline === false) continue;

            // Create notification
            await base44.asServiceRole.entities.Notification.create({
                type: 'alert',
                title: 'Aufgabe fällig morgen',
                message: `Deine Aufgabe "${task.title}" ist morgen fällig.`,
                related_id: task.id,
                read_by: []
            });

            notifications.push(task.title);

            // Send push notification if user has subscription
            if (assignedUser.push_subscription) {
                try {
                    await base44.asServiceRole.functions.invoke('sendPushNotification', {
                        title: 'Aufgabe fällig morgen',
                        message: `"${task.title}" ist morgen fällig`,
                        targetRoles: [],
                        targetEmails: [assignedUser.email]
                    });
                } catch (error) {
                    console.error('Push notification failed:', error);
                }
            }
        }

        return Response.json({
            success: true,
            message: `Sent ${notifications.length} deadline reminders`,
            tasks: notifications
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});