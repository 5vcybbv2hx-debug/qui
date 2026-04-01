import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Inlined from holidayUtils.js — local imports are not supported in Deno Deploy
function getEasterSunday(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}
function addDaysToDate(date, days) { const r = new Date(date); r.setDate(r.getDate() + days); return r; }
function getHolidaysBW(year) {
    const easter = getEasterSunday(year);
    return [
        { date: new Date(year, 0, 1), name: 'Neujahr' },
        { date: new Date(year, 0, 6), name: 'Heilige Drei Könige' },
        { date: addDaysToDate(easter, -2), name: 'Karfreitag' },
        { date: addDaysToDate(easter, 1), name: 'Ostermontag' },
        { date: new Date(year, 4, 1), name: 'Tag der Arbeit' },
        { date: addDaysToDate(easter, 39), name: 'Christi Himmelfahrt' },
        { date: addDaysToDate(easter, 50), name: 'Pfingstmontag' },
        { date: addDaysToDate(easter, 60), name: 'Fronleichnam' },
        { date: new Date(year, 9, 3), name: 'Tag der Deutschen Einheit' },
        { date: new Date(year, 10, 1), name: 'Allerheiligen' },
        { date: new Date(year, 11, 25), name: '1. Weihnachtstag' },
        { date: new Date(year, 11, 26), name: '2. Weihnachtstag' }
    ];
}

// CRITICAL FIX: Calendar feed now requires authentication via a secret token.
// The token must be passed as ?token=<CALENDAR_FEED_TOKEN> query parameter.
// Set CALENDAR_FEED_TOKEN as an environment secret in the dashboard.
// This prevents public exposure of: all shifts, guest phone/email, employee birthdays, vacation data.
Deno.serve(async (req) => {
    try {
        const url = new URL(req.url);
        const calendarToken = url.searchParams.get('token');
        const expectedToken = Deno.env.get('CALENDAR_FEED_TOKEN');

        if (!expectedToken) {
            return new Response('Calendar feed token not configured', { status: 500 });
        }

        if (!calendarToken || calendarToken !== expectedToken) {
            return new Response('Unauthorized', { 
                status: 401,
                headers: { 'WWW-Authenticate': 'Bearer' }
            });
        }

        const base44 = createClientFromRequest(req);
        
        const shifts = await base44.asServiceRole.entities.Shift.list('-date', 500);
        const reservations = await base44.asServiceRole.entities.Reservation.list('-date', 500);
        const employees = await base44.asServiceRole.entities.Employee.list();
        const vacationRequests = await base44.asServiceRole.entities.VacationRequest.filter({ 
            status: 'genehmigt' 
        });
        
        const currentYear = new Date().getFullYear();
        const holidays = [...getHolidaysBW(currentYear), ...getHolidaysBW(currentYear + 1)];
        
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
            lines.push(`SUMMARY:${shift.employee_name} - ${shift.shift_type || ''}`);
            if (shift.notes) {
                lines.push(`DESCRIPTION:${shift.notes.replace(/\n/g, '\\n')}`);
            }
            lines.push('STATUS:CONFIRMED');
            lines.push('END:VEVENT');
        });

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
            lines.push(`SUMMARY:🪑 Reservierung: ${res.customer_name} (${res.guests} Pers.)`);
            // HIGH FIX: Phone and notes omitted from calendar — sensitive guest data
            let desc = `${res.guests} Personen`;
            if (res.table) desc += ` - Tisch ${res.table}`;
            lines.push(`DESCRIPTION:${desc}`);
            lines.push('STATUS:CONFIRMED');
            lines.push('END:VEVENT');
        });

        employees.forEach(emp => {
            if (!emp.birthday) return;
            
            const birthDate = emp.birthday.replace(/-/g, '');
            const currentYearNum = new Date().getFullYear();
            
            lines.push('BEGIN:VEVENT');
            lines.push(`UID:birthday-${emp.id}@barmanager.app`);
            lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
            lines.push(`DTSTART;VALUE=DATE:${currentYearNum}${birthDate.slice(4)}`);
            lines.push(`SUMMARY:🎂 Geburtstag: ${emp.name}`);
            lines.push(`DESCRIPTION:Geburtstag von ${emp.name}`);
            lines.push('RRULE:FREQ=YEARLY');
            lines.push('STATUS:CONFIRMED');
            lines.push('END:VEVENT');
        });

        vacationRequests.forEach(vacation => {
            const startDate = vacation.start_date.replace(/-/g, '');
            const endDateObj = new Date(vacation.end_date);
            endDateObj.setDate(endDateObj.getDate() + 1);
            const endDatePlusOne = endDateObj.toISOString().split('T')[0].replace(/-/g, '');
            
            lines.push('BEGIN:VEVENT');
            lines.push(`UID:vacation-${vacation.id}@barmanager.app`);
            lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
            lines.push(`DTSTART;VALUE=DATE:${startDate}`);
            lines.push(`DTEND;VALUE=DATE:${endDatePlusOne}`);
            lines.push(`SUMMARY:🏖️ Urlaub: ${vacation.employee_name}`);
            let desc = `${vacation.type || 'Urlaub'}`;
            if (vacation.days_count) desc += ` - ${vacation.days_count} Tage`;
            lines.push(`DESCRIPTION:${desc}`);
            lines.push('STATUS:CONFIRMED');
            lines.push('TRANSP:TRANSPARENT');
            lines.push('END:VEVENT');
        });

        holidays.forEach(holiday => {
            const dateStr = holiday.date.toISOString().split('T')[0].replace(/-/g, '');
            const endDateObj = new Date(holiday.date);
            endDateObj.setDate(endDateObj.getDate() + 1);
            const endDateStr = endDateObj.toISOString().split('T')[0].replace(/-/g, '');
            
            lines.push('BEGIN:VEVENT');
            lines.push(`UID:holiday-${dateStr}@barmanager.app`);
            lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
            lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
            lines.push(`DTEND;VALUE=DATE:${endDateStr}`);
            lines.push(`SUMMARY:🎉 Feiertag: ${holiday.name}`);
            lines.push(`DESCRIPTION:Gesetzlicher Feiertag in Baden-Württemberg`);
            lines.push('STATUS:CONFIRMED');
            lines.push('TRANSP:TRANSPARENT');
            lines.push('END:VEVENT');
        });

        lines.push('END:VCALENDAR');
        
        const icsContent = lines.join('\r\n');
        
        return new Response(icsContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'inline; filename="calendar.ics"',
                'Cache-Control': 'private, max-age=3600'
            }
        });
        
    } catch (error) {
        console.error('Calendar feed error:', error);
        return new Response('Failed to generate calendar feed', { status: 500 });
    }
});