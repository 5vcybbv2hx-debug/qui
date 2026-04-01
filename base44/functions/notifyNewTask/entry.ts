import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// MEDIUM FIX: This function is called by an entity automation (no user context).
// It validates the payload structure to prevent misuse when called directly.
// No auth check is possible here as entity automations don't have a user context,
// but we validate the expected payload shape to prevent abuse.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const body = await req.json();
        const { event, data } = body;

        // Validate expected automation payload structure
        if (!event || !event.type || !data) {
            return Response.json({ message: 'Invalid automation payload' }, { status: 400 });
        }

        if (event.type !== 'create') {
            return Response.json({ message: 'Not a create event' });
        }

        if (!data.assigned_to) {
            return Response.json({ message: 'Task not assigned to anyone' });
        }

        const users = await base44.asServiceRole.entities.User.list();
        const assignedUser = users.find(u => 
            u.email === data.assigned_to || u.full_name === data.assigned_to
        );

        if (!assignedUser) {
            return Response.json({ message: 'Assigned user not found' });
        }

        const prefs = assignedUser.notification_preferences || {};
        if (prefs.tasks_assigned === false) {
            return Response.json({ message: 'User has disabled task notifications' });
        }

        await base44.asServiceRole.entities.Notification.create({
            type: 'task',
            title: 'Neue Aufgabe zugewiesen',
            message: `Dir wurde die Aufgabe "${data.title}" zugewiesen.`,
            related_id: data.id,
            read_by: []
        });

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

        return Response.json({ success: true, message: 'Notification sent' });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});