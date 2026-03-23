import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Alle Schichten, Reservierungen und Urlaubsanfragen abrufen
        const shifts = await base44.asServiceRole.entities.Shift.list('-date', 1000);
        const reservations = await base44.asServiceRole.entities.Reservation.list('-date', 1000);
        const vacationRequests = await base44.asServiceRole.entities.VacationRequest.list('-date', 1000);

        const backup = {
            timestamp: new Date().toISOString(),
            shifts: shifts,
            reservations: reservations,
            vacationRequests: vacationRequests,
            summary: {
                shiftsCount: shifts.length,
                reservationsCount: reservations.length,
                vacationRequestsCount: vacationRequests.length
            }
        };

        return Response.json(backup);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});