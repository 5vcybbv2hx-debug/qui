import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── Inlined holiday utils (local imports not supported in Deno Deploy) ────────
function getEasterSunday(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    return new Date(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
function shiftDate(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function getHolidaysBW(year) {
    const e = getEasterSunday(year);
    return [
        { date: new Date(year, 0, 1),   name: 'Neujahr' },
        { date: new Date(year, 0, 6),   name: 'Heilige Drei Könige' },
        { date: shiftDate(e, -2),        name: 'Karfreitag' },
        { date: shiftDate(e,  1),        name: 'Ostermontag' },
        { date: new Date(year, 4, 1),   name: 'Tag der Arbeit' },
        { date: shiftDate(e, 39),        name: 'Christi Himmelfahrt' },
        { date: shiftDate(e, 50),        name: 'Pfingstmontag' },
        { date: shiftDate(e, 60),        name: 'Fronleichnam' },
        { date: new Date(year, 9, 3),   name: 'Tag der Deutschen Einheit' },
        { date: new Date(year, 10, 1),  name: 'Allerheiligen' },
        { date: new Date(year, 11, 25), name: '1. Weihnachtstag' },
        { date: new Date(year, 11, 26), name: '2. Weihnachtstag' },
    ];
}

// ─── Auth helper ──────────────────────────────────────────────────────────────
// SECURITY: Calendar feed is public-facing (subscribed via calendar apps).
// We protect it with a static shared secret set in environment variables.
// Without this, ALL employee shifts, birthdays, vacation data would be publicly readable.
function verifyCalendarToken(req) {
    const url = new URL(req.url);
    const provided = url.searchParams.get('token');
    const expected = Deno.env.get('CALENDAR_FEED_TOKEN');
    if (!expected) return { ok: false, reason: 'Calendar feed token not configured on server' };
    if (!provided || provided !== expected) return { ok: false, reason: 'Invalid or missing token' };
    return { ok: true };
}

// ─── ICS helpers ─────────────────────────────────────────────────────────────
const now8601 = () => new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
const dateStr  = (d) => d.replace(/-/g, '');

function buildEvent({ uid, dtstart, dtend, summary, description, allDay = false, transparent = false }) {
    const lines = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now8601()}`,
        allDay ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART:${dtstart}`,
        allDay ? `DTEND;VALUE=DATE:${dtend}`   : `DTEND:${dtend}`,
        `SUMMARY:${summary}`,
    ];
    if (description) lines.push(`DESCRIPTION:${description}`);
    if (transparent)  lines.push('TRANSP:TRANSPARENT');
    lines.push('STATUS:CONFIRMED', 'END:VEVENT');
    return lines.join('\r\n');
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    // AUTH: Reject requests without a valid shared secret
    const auth = verifyCalendarToken(req);
    if (!auth.ok) {
        return new Response(auth.reason, {
            status: 401,
            headers: { 'WWW-Authenticate': 'Bearer realm="calendar"' }
        });
    }

    try {
        const base44 = createClientFromRequest(req);

        const [shifts, reservations, employees, vacations] = await Promise.all([
            base44.asServiceRole.entities.Shift.list('-date', 500),
            base44.asServiceRole.entities.Reservation.list('-date', 500),
            base44.asServiceRole.entities.Employee.list(),
            base44.asServiceRole.entities.VacationRequest.filter({ status: 'genehmigt' }),
        ]);

        const year = new Date().getFullYear();
        const holidays = [...getHolidaysBW(year), ...getHolidaysBW(year + 1)];

        const events = [];

        // ── Shifts: only operational info, no personal data beyond name ──────
        for (const s of shifts) {
            const d = dateStr(s.date);
            const startH = parseInt(s.start_time);
            const endH   = parseInt(s.end_time);
            let endDate = d;
            if (endH < startH) {
                const next = new Date(s.date); next.setDate(next.getDate() + 1);
                endDate = next.toISOString().split('T')[0].replace(/-/g, '');
            }
            events.push(buildEvent({
                uid: `shift-${s.id}@barmanager.app`,
                dtstart: `${d}T${s.start_time.replace(':', '')}00`,
                dtend:   `${endDate}T${s.end_time.replace(':', '')}00`,
                summary: `${s.employee_name}${s.shift_type ? ' – ' + s.shift_type : ''}`,
                // PRIVACY: No notes included — may contain sensitive context
            }));
        }

        // ── Reservations: guest count + table only, NO phone/email/notes ─────
        // PRIVACY: Phone, email and personal notes are stripped — they are internal data.
        for (const r of reservations) {
            if (r.status === 'storniert') continue;
            const d    = dateStr(r.date);
            const time = r.time.replace(':', '') + '00';
            const endH = (parseInt(r.time.split(':')[0]) + 2).toString().padStart(2, '0');
            const endT = endH + r.time.split(':')[1] + '00';
            const desc = `${r.guests} Personen${r.table ? ' – Tisch ' + r.table : ''}`;
            events.push(buildEvent({
                uid: `res-${r.id}@barmanager.app`,
                dtstart: `${d}T${time}`,
                dtend:   `${d}T${endT}`,
                summary: `🪑 Reservierung (${r.guests} Pers.)`,
                description: desc,
                // NOTE: customer_name intentionally omitted — GDPR / data minimisation
            }));
        }

        // ── Birthdays: name + role only, no personal dates exposed directly ──
        const currentYear = new Date().getFullYear();
        for (const emp of employees) {
            if (!emp.birthday) continue;
            const mmdd = emp.birthday.slice(5).replace('-', '');
            events.push(buildEvent({
                uid: `birthday-${emp.id}@barmanager.app`,
                // We output the current year's occurrence; RRULE handles future years
                dtstart: `${currentYear}${mmdd}`,
                dtend:   `${currentYear}${mmdd}`,
                summary: `🎂 ${emp.name}`,
                allDay: true,
                transparent: true,
            }) + '\r\nRRULE:FREQ=YEARLY');
        }

        // ── Vacations: employee name + duration, no notes ─────────────────────
        for (const v of vacations) {
            const start   = dateStr(v.start_date);
            const endNext = new Date(v.end_date); endNext.setDate(endNext.getDate() + 1);
            const end     = endNext.toISOString().split('T')[0].replace(/-/g, '');
            events.push(buildEvent({
                uid: `vacation-${v.id}@barmanager.app`,
                dtstart: start,
                dtend:   end,
                summary: `🏖️ ${v.employee_name}${v.days_count ? ' (' + v.days_count + ' Tage)' : ''}`,
                allDay: true,
                transparent: true,
                // NOTE: vacation.notes omitted — may contain medical / personal context
            }));
        }

        // ── Holidays ──────────────────────────────────────────────────────────
        for (const h of holidays) {
            const d   = h.date.toISOString().split('T')[0].replace(/-/g, '');
            const end = new Date(h.date); end.setDate(end.getDate() + 1);
            const de  = end.toISOString().split('T')[0].replace(/-/g, '');
            events.push(buildEvent({
                uid: `holiday-${d}@barmanager.app`,
                dtstart: d, dtend: de,
                summary: `🎉 ${h.name}`,
                description: 'Gesetzlicher Feiertag in Baden-Württemberg',
                allDay: true, transparent: true,
            }));
        }

        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Bar Manager//Live Calendar//DE',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Bar Management Live',
            'X-WR-TIMEZONE:Europe/Berlin',
            'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
            'X-PUBLISHED-TTL:PT1H',
            ...events,
            'END:VCALENDAR',
        ].join('\r\n');

        return new Response(ics, {
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'inline; filename="calendar.ics"',
                // SECURITY: private — must not be cached by CDNs or shared proxies
                'Cache-Control': 'private, max-age=3600',
            }
        });

    } catch (error) {
        console.error('Calendar feed error:', error);
        // SECURITY: No internal error details to client
        return new Response('Internal server error', { status: 500 });
    }
});