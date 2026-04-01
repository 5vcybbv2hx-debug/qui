import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── Input validation ─────────────────────────────────────────────────────────
// SECURITY: Validate and sanitize all fields before writing to DB.
// Without this, an attacker could inject oversized strings or invalid data.
function validateReservation(body) {
    const errors = [];

    if (!body.customer_name?.trim()) errors.push('Name ist erforderlich');
    if (!body.email?.includes('@'))  errors.push('Gültige E-Mail ist erforderlich');
    if (!body.phone?.trim())         errors.push('Telefonnummer ist erforderlich');

    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date ?? '')) errors.push('Ungültiges Datumsformat (YYYY-MM-DD)');
    if (!/^\d{2}:\d{2}$/.test(body.time ?? ''))        errors.push('Ungültiges Zeitformat (HH:MM)');

    const guests = parseInt(body.guests);
    if (isNaN(guests) || guests < 1 || guests > 100) errors.push('Personenanzahl muss zwischen 1 und 100 liegen');

    if (errors.length) return { valid: false, errors };

    // Return sanitized, typed values — only the fields we actually want to store
    return {
        valid: true,
        data: {
            customer_name: String(body.customer_name).trim().slice(0, 100),
            email:         String(body.email).trim().toLowerCase().slice(0, 150),
            phone:         String(body.phone).trim().slice(0, 30),
            date:          body.date,
            time:          body.time,
            guests,
            notes:         body.notes ? String(body.notes).trim().slice(0, 500) : '',
            // Table may optionally be pre-set by the booking widget
            ...(body.table ? { table: String(body.table).trim().slice(0, 20) } : {}),
        }
    };
}

// ─── Secure token generation ──────────────────────────────────────────────────
// SECURITY: Math.random() is NOT cryptographically secure and must not be used
// for tokens. crypto.randomUUID() uses the OS CSPRNG.
function generateGuestToken() {
    return crypto.randomUUID() + '-' + crypto.randomUUID();
}

// ─── Response shaping ─────────────────────────────────────────────────────────
// SECURITY: Never return the guest_token, internal IDs beyond reservation ID,
// or any field that wasn't submitted by the user.
// The token is sent to the guest via email only — not in the API response.
function publicReservationShape(r) {
    return {
        id:            r.id,
        customer_name: r.customer_name,
        date:          r.date,
        time:          r.time,
        guests:        r.guests,
        status:        r.status,
    };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // INPUT: parse and validate body
        let body;
        try {
            body = await req.json();
        } catch {
            return Response.json({ success: false, error: 'Ungültiges JSON' }, { status: 400 });
        }

        const validation = validateReservation(body);
        if (!validation.valid) {
            return Response.json(
                { success: false, errors: validation.errors },
                { status: 422 }
            );
        }

        // Date must not be in the past
        if (validation.data.date < new Date().toISOString().split('T')[0]) {
            return Response.json(
                { success: false, error: 'Datum liegt in der Vergangenheit' },
                { status: 422 }
            );
        }

        // WRITE: create reservation with secure token and fixed status/source
        const reservation = await base44.asServiceRole.entities.Reservation.create({
            ...validation.data,
            guest_token: generateGuestToken(),
            status:      'vorgemerkt',
            source:      'online',
        });

        // Trigger confirmation email in background — failure must not block the response
        base44.asServiceRole.functions.invoke('sendReservationConfirmation', {
            reservationId: reservation.id
        }).catch(err => console.warn('Confirmation email failed:', err));

        // RESPONSE: minimal public fields only — guest_token stays server-side
        return Response.json({ success: true, reservation: publicReservationShape(reservation) });

    } catch (error) {
        console.error('createPublicReservation error:', error);
        // SECURITY: No internal error details to the client
        return Response.json(
            { success: false, error: 'Reservierung konnte nicht erstellt werden' },
            { status: 500 }
        );
    }
});