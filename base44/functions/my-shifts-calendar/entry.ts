import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── ICS helper ───────────────────────────────────────────────────────────────
const now8601 = () => new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
const escapeIcs = (str) => (str || '').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

function shiftToEvent(shift) {
    const d = shift.date.replace(/-/g, '');
    const [startH] = shift.start_time.split(':').map(Number);
    const [endH]   = shift.end_time.split(':').map(Number);
    let endDate = d;
    if (endH < startH || (endH === startH && endH === 0)) {
        const next = new Date(shift.date + 'T00:00:00');
        next.setDate(next.getDate() + 1);
        endDate = next.toISOString().split('T')[0].replace(/-/g, '');
    }
    const lines = [
        'BEGIN:VEVENT',
        `UID:shift-${shift.id}@barmanager.app`,
        `DTSTAMP:${now8601()}`,
        `DTSTART;TZID=Europe/Berlin:${d}T${shift.start_time.replace(':', '')}00`,
        `DTEND;TZID=Europe/Berlin:${endDate}T${shift.end_time.replace(':', '')}00`,
        `SUMMARY:🍺 ${escapeIcs(shift.shift_type || 'Schicht')}`,
    ];
    if (shift.notes) lines.push(`DESCRIPTION:${escapeIcs(shift.notes)}`);
    lines.push('STATUS:CONFIRMED', 'END:VEVENT');
    return lines.join('\r\n');
}

function birthdayToEvent(employee) {
    if (!employee.birthday) return null;
    const [, month, day] = employee.birthday.split('-');
    const yearlyDate = `${new Date().getFullYear()}${month}${day}`;
    return [
        'BEGIN:VEVENT',
        `UID:birthday-${employee.id}@barmanager.app`,
        `DTSTAMP:${now8601()}`,
        `DTSTART;VALUE=DATE:${yearlyDate}`,
        `DTEND;VALUE=DATE:${yearlyDate}`,
        `SUMMARY:🎂 Geburtstag: ${escapeIcs(employee.name)}`,
        'RRULE:FREQ=YEARLY',
        'STATUS:CONFIRMED',
        'END:VEVENT',
    ].join('\r\n');
}

function meetingToEvent(meeting) {
    if (!meeting.date) return null;
    const d = meeting.date.replace(/-/g, '');
    const startTime = meeting.start_time || '18:00';
    const endTime   = meeting.end_time   || '19:00';
    const lines = [
        'BEGIN:VEVENT',
        `UID:meeting-${meeting.id}@barmanager.app`,
        `DTSTAMP:${now8601()}`,
        `DTSTART;TZID=Europe/Berlin:${d}T${startTime.replace(':', '')}00`,
        `DTEND;TZID=Europe/Berlin:${d}T${endTime.replace(':', '')}00`,
        `SUMMARY:📋 Teamsitzung${meeting.title ? ': ' + escapeIcs(meeting.title) : ''}`,
    ];
    if (meeting.location) lines.push(`LOCATION:${escapeIcs(meeting.location)}`);
    if (meeting.description) lines.push(`DESCRIPTION:${escapeIcs(meeting.description)}`);
    lines.push('STATUS:CONFIRMED', 'END:VEVENT');
    return lines.join('\r\n');
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    // Unterstützt GET (iCal-Abo von Apple/Google) und POST (SDK-Aufruf)
    const reqUrl = new URL(req.url);
    let employeeId = reqUrl.searchParams.get('employee_id');
    let token      = reqUrl.searchParams.get('token');

    // Bei POST: Parameter aus Body lesen
    if (req.method === 'POST') {
        try {
            const body = await req.json();
            employeeId = employeeId || body.employee_id;
            token      = token      || body.token;
        } catch (_) {}
    }

    if (!employeeId || !token) {
        return Response.json({ error: 'employee_id and token parameters are required' }, { status: 400 });
    }

    try {
        const base44 = createClientFromRequest(req);

        const employee = await base44.asServiceRole.entities.Employee.get(employeeId);
        if (!employee) {
            return Response.json({ error: 'Employee not found' }, { status: 404 });
        }

        if (!employee.calendar_token || employee.calendar_token !== token) {
            return new Response('Invalid token', { status: 403 });
        }

        // Fetch all data in parallel
        const [shifts, allEmployees, meetings] = await Promise.all([
            base44.asServiceRole.entities.Shift.filter({ employee_id: employeeId }, '-date', 500),
            base44.asServiceRole.entities.Employee.filter({ is_active: true }, 'name', 200),
            base44.asServiceRole.entities.TeamMeetingSchedule.list('-date', 100).catch(() => []),
        ]);

        const vtimezone = [
            'BEGIN:VTIMEZONE',
            'TZID:Europe/Berlin',
            'BEGIN:STANDARD',
            'DTSTART:19701025T030000',
            'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
            'TZOFFSETFROM:+0200',
            'TZOFFSETTO:+0100',
            'TZNAME:CET',
            'END:STANDARD',
            'BEGIN:DAYLIGHT',
            'DTSTART:19700329T020000',
            'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
            'TZOFFSETFROM:+0100',
            'TZOFFSETTO:+0200',
            'TZNAME:CEST',
            'END:DAYLIGHT',
            'END:VTIMEZONE',
        ].join('\r\n');

        const birthdayEvents = allEmployees
            .filter(e => e.birthday && e.id !== employeeId)
            .map(birthdayToEvent)
            .filter(Boolean);

        const meetingEvents = meetings
            .map(meetingToEvent)
            .filter(Boolean);

        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Bar Manager//My Shifts//DE',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:${employee.name} – Schichten & Team`,
            'X-WR-TIMEZONE:Europe/Berlin',
            'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
            'X-PUBLISHED-TTL:PT15M',
            vtimezone,
            ...shifts.map(shiftToEvent),
            ...birthdayEvents,
            ...meetingEvents,
            'END:VCALENDAR',
        ].join('\r\n');

        return new Response(ics, {
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'inline; filename="my-shifts.ics"',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Access-Control-Allow-Origin': '*',
            }
        });

    } catch (error) {
        console.error('My shifts calendar error:', error);
        return new Response('Internal server error', { status: 500 });
    }
});