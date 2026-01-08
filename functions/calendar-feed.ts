import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Fetch all shifts
        const shifts = await base44.asServiceRole.entities.Shift.list('-date', 500);
        
        // Fetch all reservations
        const reservations = await base44.asServiceRole.entities.Reservation.list('-date', 500);
        
        // Fetch all employees for birthdays
        const employees = await base44.asServiceRole.entities.Employee.list();
        
        // Generate ICS content
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Bar Manager//Live Calendar//DE',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Bar Management Live',
            'X-WR-TIMEZONE:Europe/Berlin',
            'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
            'X-PUBLISHED-TTL:PT1H'
        ];

        // Add shifts
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
            lines.push(`SUMMARY:${shift.employee_name} - ${shift.shift_type}`);
            if (shift.notes) {
                lines.push(`DESCRIPTION:${shift.notes.replace(/\n/g, '\\n')}`);
            }
            lines.push('STATUS:CONFIRMED');
            lines.push('END:VEVENT');
        });

        // Add reservations
        reservations.forEach(res => {
            if (res.status === 'storniert') return;
            
            const date = res.date.replace(/-/g, '');
            const time = res.time.replace(':', '') + '00';
            const endHour = parseInt(res.time.split(':')[0]) + 2;
            const endTime = endHour.toString().padStart(2, '0') + res.time.split(':')[1] + '00';

            lines.push('BEGIN:VEVENT');
            lines.push(`UID:res-${res.id}@barmanager.app`);
            lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
            lines.push(`DTSTART:${date}T${time}`);
            lines.push(`DTEND:${date}T${endTime}`);
            lines.push(`SUMMARY:Reservierung: ${res.customer_name} (${res.guests} Pers.)`);
            let desc = `${res.guests} Personen`;
            if (res.table) desc += ` - Tisch ${res.table}`;
            if (res.phone) desc += `\\nTel: ${res.phone}`;
            if (res.notes) desc += `\\n${res.notes}`;
            lines.push(`DESCRIPTION:${desc}`);
            lines.push('STATUS:CONFIRMED');
            lines.push('END:VEVENT');
        });

        // Add birthdays as yearly recurring events
        employees.forEach(emp => {
            if (!emp.birthday) return;
            
            const birthDate = emp.birthday.replace(/-/g, '');
            const currentYear = new Date().getFullYear();
            
            lines.push('BEGIN:VEVENT');
            lines.push(`UID:birthday-${emp.id}@barmanager.app`);
            lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
            lines.push(`DTSTART;VALUE=DATE:${currentYear}${birthDate.slice(4)}`);
            lines.push(`SUMMARY:🎂 Geburtstag: ${emp.name}`);
            lines.push(`DESCRIPTION:Geburtstag von ${emp.name} (${emp.role})`);
            lines.push('RRULE:FREQ=YEARLY');
            lines.push('STATUS:CONFIRMED');
            lines.push('END:VEVENT');
        });

        lines.push('END:VCALENDAR');
        
        const icsContent = lines.join('\r\n');
        
        return new Response(icsContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'inline; filename="calendar.ics"',
                'Cache-Control': 'public, max-age=3600'
            }
        });
        
    } catch (error) {
        console.error('Calendar feed error:', error);
        return Response.json({ error: 'Failed to generate calendar feed' }, { status: 500 });
    }
});