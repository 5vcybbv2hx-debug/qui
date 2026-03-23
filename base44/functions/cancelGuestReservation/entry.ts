import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { token, reservationId } = await req.json();

        if (!token || !reservationId) {
            return Response.json({ error: 'Token und ReservationId erforderlich' }, { status: 400 });
        }

        // Verifiziere Token
        const reservations = await base44.asServiceRole.entities.Reservation.filter({ 
            id: reservationId,
            guest_token: token 
        });
        
        if (reservations.length === 0) {
            return Response.json({ error: 'Reservierung nicht gefunden' }, { status: 404 });
        }

        // Storniere Reservierung
        await base44.asServiceRole.entities.Reservation.update(reservationId, {
            status: 'storniert'
        });

        return Response.json({ success: true });
    } catch (error) {
        console.error('Fehler beim Stornieren der Reservierung:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});