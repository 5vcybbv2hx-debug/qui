import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { event, data } = await req.json();

        // Only process create events
        if (event.type !== 'create') {
            return Response.json({ message: 'Not a create event' });
        }

        // Check if task is assigned
        if (!data.assigned_to) {
            return Response.json({ message: 'Task not assigned to anyone' });
        }

        // Get the assigned user
        const users = await base44.asServiceRole.entities.User.list();
        const assignedUser = users.find(u => 
            u.email === data.assigned_to || u.full_name === data.assigned_to
        );

        if (!assignedUser) {
            return Response.json({ message: 'Assigned user not found' });
        }

        // Check notification preferences
        const prefs = assignedUser.notification_preferences || {};
        if (prefs.tasks_assigned === false) {
            return Response.json({ message: 'User has disabled task notifications' });
        }

        // Create notification
        await base44.asServiceRole.entities.Notification.create({
            type: 'task',
            title: 'Neue Aufgabe zugewiesen',
            message: `Dir wurde die Aufgabe "${data.title}" zugewiesen.`,
            related_id: data.id,
            read_by: []
        });

        // Send push notification if user has subscription
        if (assignedUser.push_subscription) {
            try {
                await base44.asServiceRole.functions.invoke('sendPushNotification', {
                    title: 'Neue Aufgabe zugewiesen',
                    message: `"${data.title}" wurde dir zugewiesen`,
                    targetRoles: [],
                    targetEmails: [assignedUser.email]
                });
            } catch (error) {
                console.error('Push notification failed:', error);
            }
        }

        return Response.json({
            success: true,
            message: 'Notification sent'
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});