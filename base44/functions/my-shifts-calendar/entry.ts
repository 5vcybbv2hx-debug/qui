import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── Auth helpers ─────────────────────────────────────────────────────────────
// SECURITY: Checks that the requesting user is either:
//   (a) an admin/manager, or
//   (b) the employee whose shifts are being requested.
// Without this check, anyone with a valid login could pass any employee_id
// and read another person's entire shift history (IDOR vulnerability).
async function authorise(base44, employeeId) {
    const user = await base44.auth.me();
    if (!user) return { ok: false, status: 401, reason: 'Unauthorized' };

    const isPrivileged = user.role === 'admin' || user.role === 'manager';
    if (isPrivileged) return { ok: true };

    // Regular user: verify they own this employee record
    const employee = await base44.asServiceRole.entities.Employee.get(employeeId);
    if (!employee) return { ok: false, status: 404, reason: 'Employee not found' };

    const sameEmail = employee.email?.toLowerCase() === user.email?.toLowerCase();
    if (!sameEmail) return { ok: false, status: 403, reason: 'Forbidden: not your calendar' };

    return { ok: true, employee };
}

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
    // Include notes only if present — they are not sensitive for the employee themselves
    if (shift.notes) lines.push(`DESCRIPTION:${shift.notes.replace(/\n/g, '\\n')}`);
    lines.push('STATUS:CONFIRMED', 'END:VEVENT');
    return lines.join('\r\n');
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    // INPUT: employee_id comes from URL param (used by calendar subscription URLs)
    const url        = new URL(req.url);
    const employeeId = url.searchParams.get('employee_id');

    if (!employeeId) {
        return Response.json({ error: 'employee_id parameter is required' }, { status: 400 });
    }

    // AUTH + ACCESS CONTROL
    const auth = await authorise(base44, employeeId);
    if (!auth.ok) {
        return Response.json({ error: auth.reason }, { status: auth.status });
    }

    try {
        // Fetch employee name for calendar title (may already be loaded in auth step)
        const employee = auth.employee
            ?? await base44.asServiceRole.entities.Employee.get(employeeId);

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
                // SECURITY: private — calendar contains personal work schedule
                'Cache-Control': 'private, max-age=3600',
            }
        });

    } catch (error) {
        console.error('My shifts calendar error:', error);
        return new Response('Internal server error', { status: 500 });
    }
});