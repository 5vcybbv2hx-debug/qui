import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// HIGH FIX 1: Token now uses crypto.randomUUID() — Math.random() is not cryptographically secure.
// HIGH FIX 2: guest_token is no longer returned in the response to prevent token leakage.
// HIGH FIX 3: Input validation added for guests count and date format.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const formData = await req.json();

        // Validierung
        if (!formData.customer_name || !formData.phone || !formData.email || !formData.date || !formData.time || !formData.guests) {
            return Response.json({ 
                success: false,
                error: 'Alle Pflichtfelder müssen ausgefüllt sein'
            }, { status: 400 });
        }

        // Input validation
        const guestCount = parseInt(formData.guests);
        if (isNaN(guestCount) || guestCount < 1 || guestCount > 100) {
            return Response.json({ success: false, error: 'Ungültige Personenanzahl' }, { status: 400 });
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) {
            return Response.json({ success: false, error: 'Ungültiges Datumsformat' }, { status: 400 });
        }

        // Cryptographically secure token
        const token = crypto.randomUUID() + '-' + crypto.randomUUID();

        // Only allow safe fields — prevent field injection
        const reservation = await base44.asServiceRole.entities.Reservation.create({
            customer_name: String(formData.customer_name).slice(0, 100),
            phone: String(formData.phone).slice(0, 30),
            email: String(formData.email).slice(0, 100),
            date: formData.date,
            time: String(formData.time).slice(0, 5),
            guests: guestCount,
            notes: formData.notes ? String(formData.notes).slice(0, 500) : '',
            table: formData.table ? String(formData.table).slice(0, 20) : undefined,
            guest_token: token,
            status: 'vorgemerkt',
            source: 'online'
        });

        try {
            await base44.asServiceRole.functions.invoke('sendReservationConfirmation', {
                reservationId: reservation.id
            });
        } catch (emailError) {
            console.warn('Email konnte nicht gesendet werden:', emailError);
        }

        // HIGH FIX: Return only non-sensitive fields — no guest_token, no internal IDs beyond id
        return Response.json({ 
            success: true,
            reservation: {
                id: reservation.id,
                customer_name: reservation.customer_name,
                date: reservation.date,
                time: reservation.time,
                guests: reservation.guests,
                status: reservation.status
            }
        });
    } catch (error) {
        console.error('Fehler beim Erstellen der Reservierung:', error);
        return Response.json({ 
            success: false,
            error: 'Reservierung konnte nicht erstellt werden'
        }, { status: 500 });
    }
});