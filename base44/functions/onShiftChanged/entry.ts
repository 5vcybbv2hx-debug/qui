import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entity automation: fires on Shift create + update
// Sends push notification to the affected employee
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { event, data } = body;

        if (!event || !data) {
            return Response.json({ message: 'Invalid payload' }, { status: 400 });
        }

        const employeeId = data.employee_id;
        if (!employeeId) {
            return Response.json({ message: 'No employee_id in shift' });
        }

        const isCreate = event.type === 'create';
        const title = isCreate ? 'Neue Schicht eingeplant' : 'Schicht geändert';
        const dateStr = data.date || '';
        const timeStr = data.start_time ? `${data.start_time}–${data.end_time || ''}` : '';
        const typeStr = data.shift_type ? ` (${data.shift_type})` : '';
        const message = `${dateStr} ${timeStr}${typeStr}`.trim();

        // Look up employee email
        let employee = null;
        try {
            employee = await base44.asServiceRole.entities.Employee.get(employeeId);
        } catch (_) {}

        if (!employee?.email) {
            return Response.json({ message: 'Employee not found or no email' });
        }

        // Create in-app notification
        await base44.asServiceRole.entities.Notification.create({
            type: isCreate ? 'shift_assigned' : 'shift_updated',
            title,
            message,
            related_id: data.id,
            read_by: []
        });

        // Send push notification
        try {
            const users = await base44.asServiceRole.entities.User.list();
            const user = users.find(u => u.email === employee.email);
            if (user?.push_subscription) {
                await base44.asServiceRole.functions.invoke('sendPushNotification', {
                    title,
                    message,
                    targetEmails: [employee.email],
                    targetRoles: []
                });
            }
        } catch (pushErr) {
            console.error('[onShiftChanged] Push failed:', pushErr.message);
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error('[onShiftChanged] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});