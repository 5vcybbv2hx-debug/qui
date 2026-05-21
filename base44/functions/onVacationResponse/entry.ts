import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entity automation: fires on VacationRequest update
// Sends push notification when status changes to 'genehmigt' or 'abgelehnt'
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { event, data, old_data, changed_fields } = body;

        if (event?.type !== 'update') {
            return Response.json({ message: 'Not an update event' });
        }

        const status = data?.status;
        if (!status || !['genehmigt', 'abgelehnt'].includes(status)) {
            return Response.json({ message: 'Status not a final response' });
        }

        // Only fire if status actually changed
        if (old_data && old_data.status === status) {
            return Response.json({ message: 'Status unchanged' });
        }

        const employeeId = data.employee_id;
        if (!employeeId) {
            return Response.json({ message: 'No employee_id' });
        }

        const approved = status === 'genehmigt';
        const title = approved ? 'Urlaub genehmigt ✅' : 'Urlaub abgelehnt ❌';
        const dateFrom = data.start_date || '';
        const dateTo = data.end_date || '';
        const period = dateFrom ? `${dateFrom}${dateTo && dateTo !== dateFrom ? ` – ${dateTo}` : ''}` : '';
        const message = period ? `Dein Urlaubsantrag (${period}) wurde ${approved ? 'genehmigt' : 'abgelehnt'}.` : `Dein Urlaubsantrag wurde ${approved ? 'genehmigt' : 'abgelehnt'}.`;

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
            type: 'vacation_response',
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
            console.error('[onVacationResponse] Push failed:', pushErr.message);
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error('[onVacationResponse] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});