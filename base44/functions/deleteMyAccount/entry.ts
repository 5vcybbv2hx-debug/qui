import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get employee data
        const employees = await base44.entities.Employee.filter({ email: user.email });
        const employee = employees[0];

        if (employee?.id) {
            // Delete employee record
            await base44.asServiceRole.entities.Employee.delete(employee.id);
            
            // Delete all shifts
            const shifts = await base44.asServiceRole.entities.Shift.filter({ employee_id: employee.id });
            for (const shift of shifts) {
                await base44.asServiceRole.entities.Shift.delete(shift.id);
            }
            
            // Delete all clock entries
            const clockEntries = await base44.asServiceRole.entities.ClockEntry.filter({ employee_id: employee.id });
            for (const entry of clockEntries) {
                await base44.asServiceRole.entities.ClockEntry.delete(entry.id);
            }
            
            // Delete all time entries
            const timeEntries = await base44.asServiceRole.entities.TimeEntry.filter({ employee_id: employee.id });
            for (const entry of timeEntries) {
                await base44.asServiceRole.entities.TimeEntry.delete(entry.id);
            }
        }

        // Delete user account
        await base44.asServiceRole.entities.User.delete(user.id);

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});