import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get shifts starting in the next 1-2 hours
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        
        const today = now.toISOString().split('T')[0];
        
        const shifts = await base44.asServiceRole.entities.Shift.filter({
            date: today
        });
        
        const upcomingShifts = shifts.filter(shift => {
            const [hours, minutes] = shift.start_time.split(':');
            const shiftDate = new Date(shift.date);
            shiftDate.setHours(parseInt(hours), parseInt(minutes), 0);
            
            return shiftDate >= oneHourFromNow && shiftDate <= twoHoursFromNow;
        });
        
        // Get employees
        const employees = await base44.asServiceRole.entities.Employee.filter({
            is_active: true
        });
        
        const employeeMap = {};
        employees.forEach(emp => {
            employeeMap[emp.id] = emp;
        });
        
        // Send reminders
        const notifications = [];
        
        for (const shift of upcomingShifts) {
            const employee = employeeMap[shift.employee_id];
            if (!employee || !employee.email) continue;
            
            try {
                // Create notification
                await base44.asServiceRole.entities.Notification.create({
                    recipient_email: employee.email,
                    title: 'Schicht-Erinnerung',
                    message: `Deine Schicht beginnt um ${shift.start_time} Uhr`,
                    type: 'shift_reminder',
                    priority: 'high',
                    is_read: false
                });
                
                // Send push notification if available
                try {
                    await base44.asServiceRole.functions.invoke('sendPushNotification', {
                        userEmail: employee.email,
                        title: 'Schicht-Erinnerung 🔔',
                        body: `Deine Schicht beginnt um ${shift.start_time} Uhr`,
                        data: {
                            type: 'shift_reminder',
                            shift_id: shift.id
                        }
                    });
                } catch (pushError) {
                    console.log('Push notification not available:', pushError.message);
                }
                
                notifications.push({
                    employee: employee.name,
                    shift_time: shift.start_time,
                    sent: true
                });
            } catch (error) {
                notifications.push({
                    employee: employee.name,
                    shift_time: shift.start_time,
                    sent: false,
                    error: error.message
                });
            }
        }
        
        return Response.json({
            success: true,
            checked_shifts: shifts.length,
            upcoming_shifts: upcomingShifts.length,
            notifications_sent: notifications.filter(n => n.sent).length,
            details: notifications
        });
    } catch (error) {
        console.error('Shift reminder error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});