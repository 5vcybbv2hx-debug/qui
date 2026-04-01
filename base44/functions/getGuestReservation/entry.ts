import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// HIGH FIX: Previously returned the full reservation object including guest_token and all internal fields.
// Now only returns guest-facing fields. guest_token is stripped from the response.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { token } = await req.json();

        if (!token) {
            return Response.json({ error: 'Token erforderlich' }, { status: 400 });
        }

        const reservations = await base44.asServiceRole.entities.Reservation.filter({ guest_token: token });
        
        if (reservations.length === 0) {
            return Response.json(null, { status: 404 });
        }

        const res = reservations[0];

        // Only return guest-safe fields — never expose guest_token, internal IDs or system fields
        const safeReservation = {
            id: res.id,
            customer_name: res.customer_name,
            date: res.date,
            time: res.time,
            guests: res.guests,
            table: res.table,
            notes: res.notes,
            status: res.status,
            source: res.source
        };

        return Response.json(safeReservation);
    } catch (error) {
        console.error('Fehler beim Abrufen der Reservierung:', error);
        return Response.json({ error: 'Reservierung konnte nicht geladen werden' }, { status: 500 });
    }
});