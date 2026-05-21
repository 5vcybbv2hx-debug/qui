import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entity automation: fires on ShiftSwapRequest create + update
// create → notify target employee about incoming swap request
// update (status changed) → notify requesting employee about response
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { event, data, old_data } = body;

        if (!event || !data) {
            return Response.json({ message: 'Invalid payload' }, { status: 400 });
        }

        const isCreate = event.type === 'create';
        const isUpdate = event.type === 'update';

        if (isCreate) {
            // New swap request → notify target employee
            const targetEmployeeId = data.target_employee_id;
            if (!targetEmployeeId) {
                return Response.json({ message: 'No target_employee_id' });
            }

            const requesterName = data.requesting_employee_name || 'Ein Kollege';
            const shiftDate = data.shift_date || data.date || '';
            const title = 'Schichttausch-Anfrage 🔄';
            const message = `${requesterName} möchte mit dir die Schicht${shiftDate ? ` am ${shiftDate}` : ''} tauschen.`;

            let employee = null;
            try {
                employee = await base44.asServiceRole.entities.Employee.get(targetEmployeeId);
            } catch (_) {}

            if (employee?.email) {
                await base44.asServiceRole.entities.Notification.create({
                    type: 'shift_swap_request',
                    title,
                    message,
                    related_id: data.id,
                    read_by: []
                });

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
                    console.error('[onShiftSwapEvent] Push (create) failed:', pushErr.message);
                }
            }

            return Response.json({ success: true, action: 'notified_target' });
        }

        if (isUpdate) {
            const newStatus = data.status;
            const oldStatus = old_data?.status;

            // Only fire when status changes to a final response
            if (!newStatus || newStatus === oldStatus) {
                return Response.json({ message: 'Status unchanged or not final' });
            }
            if (!['angenommen', 'abgelehnt', 'in_prüfung', 'vergeben'].includes(newStatus)) {
                return Response.json({ message: 'Not a final response status' });
            }
            if (!['angenommen', 'abgelehnt'].includes(newStatus)) {
                return Response.json({ message: 'Intermediate status, no notification needed' });
            }

            // Notify the requesting employee
            const requestingEmployeeId = data.requesting_employee_id;
            if (!requestingEmployeeId) {
                return Response.json({ message: 'No requesting_employee_id' });
            }

            const targetName = data.target_employee_name || 'Dein Kollege';
            const accepted = newStatus === 'angenommen';
            const title = accepted ? 'Tausch angenommen ✅' : 'Tausch abgelehnt ❌';
            const message = accepted
                ? `${targetName} hat deinen Schichttausch angenommen.`
                : `${targetName} hat deinen Schichttausch abgelehnt.`;

            let employee = null;
            try {
                employee = await base44.asServiceRole.entities.Employee.get(requestingEmployeeId);
            } catch (_) {}

            if (employee?.email) {
                await base44.asServiceRole.entities.Notification.create({
                    type: 'shift_swap_response',
                    title,
                    message,
                    related_id: data.id,
                    read_by: []
                });

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
                    console.error('[onShiftSwapEvent] Push (update) failed:', pushErr.message);
                }
            }

            return Response.json({ success: true, action: 'notified_requester' });
        }

        return Response.json({ message: 'Unhandled event type' });
    } catch (error) {
        console.error('[onShiftSwapEvent] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});