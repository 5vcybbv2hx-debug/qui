import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Get current time + 4 hours
        const now = new Date();
        const fourHoursLater = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        const todayStr = now.toISOString().split('T')[0];

        // Get today's shifts
        const shifts = await base44.asServiceRole.entities.Shift.filter({
            date: todayStr
        });

        if (shifts.length === 0) {
            return Response.json({ 
                message: 'No shifts today',
                count: 0 
            });
        }

        const notifications = [];

        for (const shift of shifts) {
            // Parse shift start time
            const [hours, minutes] = shift.start_time.split(':');
            const shiftStart = new Date(todayStr);
            shiftStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // Check if shift starts within next 4 hours
            if (shiftStart > now && shiftStart <= fourHoursLater) {
                // Get the employee
                const employee = await base44.asServiceRole.entities.Employee.get(shift.employee_id);
                if (!employee || !employee.email) continue;

                // Get user account
                const users = await base44.asServiceRole.entities.User.list();
                const user = users.find(u => u.email === employee.email);
                if (!user) continue;

                // Check notification preferences
                const prefs = user.notification_preferences || {};
                if (prefs.shifts_reminder === false) continue;

                // Create notification
                await base44.asServiceRole.entities.Notification.create({
                    type: 'general',
                    title: 'Schicht beginnt bald',
                    message: `Deine Schicht beginnt um ${shift.start_time} Uhr.`,
                    related_id: shift.id,
                    read_by: []
                });

                notifications.push(`${employee.name} - ${shift.start_time}`);

                // Send push notification
                if (user.push_subscription) {
                    try {
                        await base44.asServiceRole.functions.invoke('sendPushNotification', {
                            title: 'Schicht beginnt bald',
                            message: `Deine Schicht beginnt um ${shift.start_time} Uhr`,
                            targetRoles: [],
                            targetEmails: [user.email]
                        });
                    } catch (error) {
                        console.error('Push notification failed:', error);
                    }
                }
            }
        }

        return Response.json({
            success: true,
            message: `Sent ${notifications.length} shift reminders`,
            shifts: notifications
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});