import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { vacation_request_id, year, month } = await req.json();

        // Hole Öffnungszeiten
        const openingHours = await base44.asServiceRole.entities.OpeningHours.list();
        
        let vacationRequests;
        
        if (vacation_request_id) {
            // Einzelner Urlaubsantrag
            const request = await base44.asServiceRole.entities.VacationRequest.filter({ id: vacation_request_id });
            vacationRequests = request;
        } else if (year && month) {
            // Alle genehmigten Urlaubsanträge eines Monats
            vacationRequests = await base44.asServiceRole.entities.VacationRequest.filter({ 
                status: 'genehmigt',
                type: 'Urlaub'
            });
            
            // Filtere nach Monat
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            vacationRequests = vacationRequests.filter(v => 
                v.start_date?.startsWith(monthStr) || v.end_date?.startsWith(monthStr) ||
                (v.start_date <= `${monthStr}-31` && v.end_date >= `${monthStr}-01`)
            );
        } else {
            // Alle genehmigten Urlaubsanträge
            vacationRequests = await base44.asServiceRole.entities.VacationRequest.filter({ 
                status: 'genehmigt',
                type: 'Urlaub'
            });
        }

        if (vacationRequests.length === 0) {
            return Response.json({ 
                success: true, 
                message: 'Keine Urlaubsanträge gefunden',
                credited: [],
                skipped: []
            });
        }

        const credited = [];
        const skipped = [];

        for (const vacation of vacationRequests) {
            // Hole Mitarbeiter-Infos
            const employees = await base44.asServiceRole.entities.Employee.filter({ 
                id: vacation.employee_id 
            });
            const employee = employees[0];

            if (!employee) {
                skipped.push({
                    vacation_id: vacation.id,
                    reason: 'Mitarbeiter nicht gefunden'
                });
                continue;
            }

            // Nur Vollzeitmitarbeiter
            if (employee.contract_type !== 'Vollzeit') {
                skipped.push({
                    vacation_id: vacation.id,
                    employee: employee.name,
                    reason: 'Nicht Vollzeit'
                });
                continue;
            }

            // Iteriere über alle Tage des Urlaubs
            const startDate = new Date(vacation.start_date);
            const endDate = new Date(vacation.end_date);
            
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dayName = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][date.getDay()];
                const dateStr = date.toISOString().split('T')[0];

                // Prüfe ob an diesem Tag normalerweise geöffnet ist
                const openingDay = openingHours.find(oh => oh.day_of_week === dayName);
                const isOpeningDay = openingDay && !openingDay.is_closed;
                
                if (!isOpeningDay) {
                    skipped.push({
                        date: dateStr,
                        employee: employee.name,
                        reason: 'Kein Öffnungstag'
                    });
                    continue;
                }

                // Prüfe ob bereits ein Eintrag existiert
                const existing = await base44.asServiceRole.entities.TimeEntry.filter({
                    employee_id: employee.id,
                    date: dateStr
                });

                if (existing.length > 0) {
                    skipped.push({
                        date: dateStr,
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
                    notes: `Urlaub (automatisch gutgeschrieben)`,
                    status: 'genehmigt',
                    employee_confirmed: true,
                    employee_confirmed_at: new Date().toISOString(),
                    manager_approved_by: user.email,
                    manager_approved_at: new Date().toISOString()
                });

                credited.push({
                    date: dateStr,
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