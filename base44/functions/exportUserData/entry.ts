import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Collect all user's data from relevant entities
        const data = {
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                created_date: user.created_date,
                exported_at: new Date().toISOString()
            },
            tasks: await base44.entities.TodoItem.filter({ assigned_to: user.email }),
            shifts: await base44.entities.Shift.filter({ employee_id: user.id }),
            timeEntries: await base44.entities.ClockEntry.filter({ employee_id: user.id }),
            notifications: await base44.entities.Notification.list(),
            vacationRequests: await base44.entities.VacationRequest.list(),
        };

        return Response.json({ 
            success: true,
            data 
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});