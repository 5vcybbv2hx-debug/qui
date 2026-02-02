import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getHolidaysBW, getHolidayName } from './holidayUtils.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { date, year, month } = await req.json();
        
        // Hole alle Vollzeitkräfte
        const employees = await base44.asServiceRole.entities.Employee.filter({ 
            is_active: true,
            contract_type: 'Vollzeit'
        });

        if (employees.length === 0) {
            return Response.json({ 
                success: true, 
                message: 'Keine Vollzeitkräfte gefunden',
                credited: []
            });
        }

        // Hole Öffnungszeiten
        const openingHours = await base44.asServiceRole.entities.OpeningHours.list();
        
        // Bestimme Feiertage
        let holidays;
        if (date) {
            // Einzelner Tag
            const targetDate = new Date(date);
            const targetYear = targetDate.getFullYear();
            holidays = getHolidaysBW(targetYear);
            const holidayName = getHolidayName(targetDate, holidays);
            
            if (!holidayName) {
                return Response.json({ 
                    success: false, 
                    error: 'Kein Feiertag an diesem Datum' 
                });
            }
            
            holidays = [{ date: targetDate, name: holidayName }];
        } else if (month && year) {
            // Ganzer Monat
            holidays = getHolidaysBW(parseInt(year));
            holidays = holidays.filter(h => {
                const m = h.date.getMonth() + 1;
                return m === parseInt(month) && h.date.getFullYear() === parseInt(year);
            });
        } else {
            return Response.json({ 
                success: false, 
                error: 'Bitte date oder year+month angeben' 
            });
        }

        const credited = [];
        const skipped = [];

        for (const holiday of holidays) {
            const dayName = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][holiday.date.getDay()];
            
            // Prüfe ob an diesem Tag normalerweise geöffnet ist
            const isOpeningDay = openingHours.some(oh => oh.day_of_week === dayName && oh.is_open);
            
            if (!isOpeningDay) {
                skipped.push({
                    date: holiday.date.toISOString().split('T')[0],
                    name: holiday.name,
                    reason: 'Kein Öffnungstag'
                });
                continue;
            }

            const dateStr = holiday.date.toISOString().split('T')[0];

            // Für jeden Vollzeitangestellten einen Eintrag erstellen
            for (const employee of employees) {
                // Prüfe ob bereits ein Eintrag existiert
                const existing = await base44.asServiceRole.entities.TimeEntry.filter({
                    employee_id: employee.id,
                    date: dateStr
                });

                if (existing.length > 0) {
                    skipped.push({
                        date: dateStr,
                        name: holiday.name,
                        employee: employee.name,
                        reason: 'Eintrag existiert bereits'
                    });
                    continue;
                }

                // Erstelle TimeEntry mit 8 Stunden
                await base44.asServiceRole.entities.TimeEntry.create({
                    employee_id: employee.id,
                    employee_name: employee.name,
                    date: dateStr,
                    start_time: '00:00',
                    end_time: '08:00',
                    break_minutes: 0,
                    total_hours: 8,
                    notes: `Feiertag: ${holiday.name}`,
                    status: 'genehmigt',
                    employee_confirmed: true,
                    employee_confirmed_at: new Date().toISOString(),
                    manager_approved_by: user.email,
                    manager_approved_at: new Date().toISOString()
                });

                credited.push({
                    date: dateStr,
                    name: holiday.name,
                    employee: employee.name,
                    hours: 8
                });
            }
        }

        return Response.json({ 
            success: true,
            credited,
            skipped,
            summary: `${credited.length} Einträge gutgeschrieben, ${skipped.length} übersprungen`
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});