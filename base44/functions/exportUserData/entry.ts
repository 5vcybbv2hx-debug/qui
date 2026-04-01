import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// HIGH FIX: notifications.list() and vacationRequests.list() previously returned ALL records.
// Now filtered to only the requesting user's own data.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only return data belonging to the requesting user
        const [tasks, shifts, timeEntries, allNotifications, allVacations] = await Promise.all([
            base44.entities.TodoItem.filter({ assigned_to: user.email }),
            base44.entities.Shift.filter({ employee_id: user.id }),
            base44.entities.ClockEntry.filter({ employee_id: user.id }),
            base44.asServiceRole.entities.Notification.list(),
            base44.asServiceRole.entities.VacationRequest.list(),
        ]);

        // Filter to only user's own notifications and vacation requests
        const notifications = allNotifications.filter(n => 
            n.recipient_email === user.email || n.created_by === user.email
        );
        const vacationRequests = allVacations.filter(v => 
            v.employee_id === user.id || v.created_by === user.email
        );

        const data = {
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                created_date: user.created_date,
                exported_at: new Date().toISOString()
            },
            tasks,
            shifts,
            timeEntries,
            notifications,
            vacationRequests,
        };

        return Response.json({ success: true, data });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});