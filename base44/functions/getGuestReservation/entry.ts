import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { token } = await req.json();

        if (!token) {
            return Response.json({ error: 'Token erforderlich' }, { status: 400 });
        }

        // Öffentlicher Zugriff auf Reservierung via Token
        const reservations = await base44.asServiceRole.entities.Reservation.filter({ guest_token: token });
        
        if (reservations.length === 0) {
            return Response.json(null, { status: 404 });
        }

        return Response.json(reservations[0]);
    } catch (error) {
        console.error('Fehler beim Abrufen der Reservierung:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});