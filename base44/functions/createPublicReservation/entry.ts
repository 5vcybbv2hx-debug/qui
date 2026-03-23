import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

        // Generiere eindeutigen Token für Gastzugriff
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        // Erstelle Reservierung (ohne Auth-Check)
        const reservation = await base44.asServiceRole.entities.Reservation.create({
            ...formData,
            guest_token: token,
            status: 'vorgemerkt',
            source: 'online'
        });

        // Sende Bestätigungsmail
        try {
            await base44.asServiceRole.functions.invoke('sendReservationConfirmation', {
                reservationId: reservation.id
            });
        } catch (emailError) {
            console.warn('Email konnte nicht gesendet werden:', emailError);
        }

        return Response.json({ 
            success: true,
            reservation
        });
    } catch (error) {
        console.error('Fehler beim Erstellen der Reservierung:', error);
        return Response.json({ 
            success: false,
            error: error.message
        }, { status: 500 });
    }
});