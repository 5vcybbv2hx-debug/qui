import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// CRITICAL FIX: IDOR vulnerability — previously anyone could pass any employee_id
// and retrieve all their shifts without authentication.
// Now requires auth + the requester must either be an admin or the employee themselves.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(req.url);
        const employeeId = url.searchParams.get('employee_id');
        
        if (!employeeId) {
            return Response.json({ error: 'employee_id parameter is required' }, { status: 400 });
        }

        // Fetch employee record
        const employee = await base44.asServiceRole.entities.Employee.get(employeeId);
        if (!employee) {
            return Response.json({ error: 'Employee not found' }, { status: 404 });
        }

        // Access control: admin can view any employee, regular users only their own
        const isAdmin = user.role === 'admin';
        const isOwnEmployee = employee.email && employee.email.toLowerCase() === user.email.toLowerCase();

        if (!isAdmin && !isOwnEmployee) {
            return Response.json({ error: 'Forbidden: You can only view your own shifts' }, { status: 403 });
        }
        
        const shifts = await base44.asServiceRole.entities.Shift.filter({ 
            employee_id: employeeId 
        }, '-date', 500);
        
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Bar Manager//My Shifts//DE',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:Meine Schichten - ${employee.name}`,
            'X-WR-TIMEZONE:Europe/Berlin',
            'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
            'X-PUBLISHED-TTL:PT1H'
        ];

        shifts.forEach(shift => {
            const date = shift.date.replace(/-/g, '');
            const startTime = shift.start_time.replace(':', '') + '00';
            const endTime = shift.end_time.replace(':', '') + '00';
            
            const startHour = parseInt(shift.start_time.split(':')[0]);
            const endHour = parseInt(shift.end_time.split(':')[0]);
            let endDate = date;
            
            if (endHour < startHour) {
                const dateObj = new Date(shift.date);
                dateObj.setDate(dateObj.getDate() + 1);
                endDate = dateObj.toISOString().split('T')[0].replace(/-/g, '');
            }

            lines.push('BEGIN:VEVENT');
            lines.push(`UID:shift-${shift.id}@barmanager.app`);
            lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
            lines.push(`DTSTART:${date}T${startTime}`);
            lines.push(`DTEND:${endDate}T${endTime}`);
            
            let summary = shift.shift_type || 'Schicht';
            lines.push(`SUMMARY:${summary}`);
            
            let description = 'Schicht bei Bar Manager';
            if (shift.shift_type) description += `\\nTyp: ${shift.shift_type}`;
            if (shift.notes) description += `\\nNotizen: ${shift.notes.replace(/\n/g, '\\n')}`;
            lines.push(`DESCRIPTION:${description}`);
            
            lines.push('STATUS:CONFIRMED');
            lines.push('END:VEVENT');
        });

        lines.push('END:VCALENDAR');
        
        const icsContent = lines.join('\r\n');
        
        return new Response(icsContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'inline; filename="my-shifts.ics"',
                'Cache-Control': 'private, max-age=3600'
            }
        });
        
    } catch (error) {
        console.error('My shifts calendar error:', error);
        return new Response('Failed to generate calendar feed', { status: 500 });
    }
});