import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── ICS helper ───────────────────────────────────────────────────────────────
const now8601 = () => new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

function shiftToEvent(shift) {
    const d = shift.date.replace(/-/g, '');
    const startH = parseInt(shift.start_time);
    const endH   = parseInt(shift.end_time);
    let endDate = d;
    if (endH < startH) {
        const next = new Date(shift.date); next.setDate(next.getDate() + 1);
        endDate = next.toISOString().split('T')[0].replace(/-/g, '');
    }
    const lines = [
        'BEGIN:VEVENT',
        `UID:shift-${shift.id}@barmanager.app`,
        `DTSTAMP:${now8601()}`,
        `DTSTART:${d}T${shift.start_time.replace(':', '')}00`,
        `DTEND:${endDate}T${shift.end_time.replace(':', '')}00`,
        `SUMMARY:${shift.shift_type || 'Schicht'}`,
    ];
    if (shift.notes) lines.push(`DESCRIPTION:${shift.notes.replace(/\n/g, '\\n')}`);
    lines.push('STATUS:CONFIRMED', 'END:VEVENT');
    return lines.join('\r\n');
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    const url        = new URL(req.url);
    const employeeId = url.searchParams.get('employee_id');
    const token      = url.searchParams.get('token');

    if (!employeeId || !token) {
        return Response.json({ error: 'employee_id and token parameters are required' }, { status: 400 });
    }

    try {
        const base44 = createClientFromRequest(req);

        // Token-basierte Auth: kein Login nötig — iPhone-Kalender kann jederzeit abrufen
        const employee = await base44.asServiceRole.entities.Employee.get(employeeId);
        if (!employee) {
            return Response.json({ error: 'Employee not found' }, { status: 404 });
        }

        // Validiere Token gegen den gespeicherten Wert im Employee-Record
        if (!employee.calendar_token || employee.calendar_token !== token) {
            return new Response('Invalid token', { status: 403 });
        }

        const shifts = await base44.asServiceRole.entities.Shift.filter(
            { employee_id: employeeId }, '-date', 500
        );

        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Bar Manager//My Shifts//DE',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:Meine Schichten – ${employee.name}`,
            'X-WR-TIMEZONE:Europe/Berlin',
            'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
            'X-PUBLISHED-TTL:PT1H',
            ...shifts.map(shiftToEvent),
            'END:VCALENDAR',
        ].join('\r\n');

        return new Response(ics, {
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'inline; filename="my-shifts.ics"',
                'Cache-Control': 'private, max-age=3600',
            }
        });

    } catch (error) {
        console.error('My shifts calendar error:', error);
        return new Response('Internal server error', { status: 500 });
    }
});