import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── ICS helpers ───────────────────────────────────────────────────────────────
const nowStamp = () => new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
const esc = (s: string) => (s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

function timeToMin(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
}

function shiftToEvent(s: any): string {
    const d        = s.date.replace(/-/g, '');
    const startMin = timeToMin(s.start_time);
    const endMin   = timeToMin(s.end_time);

    let endDate = d;
    if (endMin <= startMin) {
        const next = new Date(s.date + 'T00:00:00');
        next.setDate(next.getDate() + 1);
        endDate = next.toISOString().split('T')[0].replace(/-/g, '');
    }

    const lines = [
        'BEGIN:VEVENT',
        `UID:shift-${s.id}@barshift.app`,
        `DTSTAMP:${nowStamp()}`,
        `DTSTART;TZID=Europe/Berlin:${d}T${s.start_time.replace(':', '')}00`,
        `DTEND;TZID=Europe/Berlin:${endDate}T${s.end_time.replace(':', '')}00`,
        `SUMMARY:🍺 ${esc(s.shift_type || 'Schicht')}`,
    ];
    if (s.notes) lines.push(`DESCRIPTION:${esc(s.notes)}`);
    lines.push('STATUS:CONFIRMED', 'TRANSP:OPAQUE', 'END:VEVENT');
    return lines.join('\r\n');
}

function birthdayToEvent(e: any): string | null {
    if (!e.birthday) return null;
    const parts = e.birthday.split('-');
    if (parts.length < 3) return null;
    const [, mm, dd] = parts;
    const today     = new Date();
    const thisYear  = today.getFullYear();
    const thisDate  = new Date(thisYear, Number(mm) - 1, Number(dd));
    const startYear = thisDate < today ? thisYear + 1 : thisYear;
    const yDate     = `${startYear}${mm.padStart(2,'0')}${dd.padStart(2,'0')}`;
    const endYear   = new Date(startYear, Number(mm) - 1, Number(dd) + 1);
    const yEnd      = `${endYear.getFullYear()}${mm.padStart(2,'0')}${String(endYear.getDate()).padStart(2,'0')}`;

    return [
        'BEGIN:VEVENT',
        `UID:bday-${e.id}@barshift.app`,
        `DTSTAMP:${nowStamp()}`,
        `DTSTART;VALUE=DATE:${yDate}`,
        `DTEND;VALUE=DATE:${yEnd}`,
        `SUMMARY:🎂 ${esc(e.name || '')}`,
        'RRULE:FREQ=YEARLY',
        'TRANSP:TRANSPARENT',
        'STATUS:CONFIRMED',
        'END:VEVENT',
    ].join('\r\n');
}

function meetingToEvent(m: any): string | null {
    if (!m.date) return null;
    const d   = m.date.replace(/-/g, '');
    const st  = (m.start_time || '18:00').replace(':', '');
    const et  = (m.end_time   || '19:00').replace(':', '');
    const lines = [
        'BEGIN:VEVENT',
        `UID:meeting-${m.id}@barshift.app`,
        `DTSTAMP:${nowStamp()}`,
        `DTSTART;TZID=Europe/Berlin:${d}T${st}00`,
        `DTEND;TZID=Europe/Berlin:${d}T${et}00`,
        `SUMMARY:📋 ${esc(m.title ? 'Teamsitzung: ' + m.title : 'Teamsitzung')}`,
    ];
    if (m.location)    lines.push(`LOCATION:${esc(m.location)}`);
    if (m.description) lines.push(`DESCRIPTION:${esc(m.description)}`);
    lines.push('STATUS:CONFIRMED', 'TRANSP:OPAQUE', 'END:VEVENT');
    return lines.join('\r\n');
}

const VTIMEZONE = [
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Berlin',
    'BEGIN:STANDARD',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
    'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
    'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
].join('\r\n');

// ─── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    // CORS pre-flight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    }

    const reqUrl = new URL(req.url);
    let employeeId = reqUrl.searchParams.get('employee_id');
    let token      = reqUrl.searchParams.get('token');

    // POST: auch aus Body lesen
    if (req.method === 'POST') {
        try {
            const body = await req.json();
            employeeId = employeeId || body.employee_id;
            token      = token      || body.token;
        } catch (_) {}
    }

    if (!employeeId || !token) {
        return new Response('employee_id and token are required', { status: 400 });
    }

    try {
        const base44 = createClientFromRequest(req);

        // ── Employee via filter laden (robuster als .get() bei fehlenden IDs) ──
        let employee: any = null;
        try {
            const results = await base44.asServiceRole.entities.Employee.filter({ id: employeeId }, 'name', 1);
            employee = results?.[0] || null;
        } catch (_) {
            employee = null;
        }

        if (!employee) {
            return new Response('Employee not found', { status: 404 });
        }

        // Token validieren
        if (!employee.calendar_token || employee.calendar_token !== token) {
            return new Response('Invalid or expired token', { status: 403 });
        }

        // Alle Daten parallel laden — einzeln abgesichert
        const [shifts, allEmployees, meetings] = await Promise.all([
            base44.asServiceRole.entities.Shift.filter({ employee_id: employeeId }, '-date', 500)
                .catch(() => []),
            base44.asServiceRole.entities.Employee.filter({ is_active: true }, 'name', 200)
                .catch(() => []),
            base44.asServiceRole.entities.TeamMeetingSchedule.list('-date', 100)
                .catch(() => []),
        ]);

        const birthdayEvents = (allEmployees as any[])
            .filter((e: any) => e.birthday && e.id !== employeeId)
            .map(birthdayToEvent)
            .filter(Boolean) as string[];

        const meetingEvents = (meetings as any[])
            .map(meetingToEvent)
            .filter(Boolean) as string[];

        const shiftEvents = (shifts as any[]).map(shiftToEvent);

        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//BarShift Pro//Schichten//DE',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:${esc(employee.name)} – Schichten`,
            'X-WR-TIMEZONE:Europe/Berlin',
            'X-WR-CALDESC:Deine Schichten\\, Teamgeburtstage und Teamsitzungen',
            'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
            'X-PUBLISHED-TTL:PT15M',
            VTIMEZONE,
            ...shiftEvents,
            ...birthdayEvents,
            ...meetingEvents,
            'END:VCALENDAR',
        ].join('\r\n');

        return new Response(ics, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'inline; filename="my-shifts.ics"',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Access-Control-Allow-Origin': '*',
            }
        });

    } catch (err: any) {
        console.error('[my-shifts-calendar] error:', err?.message || err);
        return new Response('Internal server error: ' + (err?.message || ''), { status: 500 });
    }
});
