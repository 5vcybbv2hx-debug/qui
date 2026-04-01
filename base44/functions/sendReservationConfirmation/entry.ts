import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// HIGH FIX: This function was callable by anyone without auth, allowing spam/abuse.
// Now only callable by authenticated users (admin or internal service calls).
// The function itself uses asServiceRole, so the caller only needs to be authenticated.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { reservationId } = await req.json();

        if (!reservationId) {
            return Response.json({ error: 'reservationId erforderlich' }, { status: 400 });
        }

        const reservations = await base44.asServiceRole.entities.Reservation.filter({ id: reservationId });
        const reservation = reservations[0];

        if (!reservation) {
            return Response.json({ error: 'Reservierung nicht gefunden' }, { status: 404 });
        }

        if (!reservation.email) {
            return Response.json({ error: 'Keine E-Mail-Adresse vorhanden' }, { status: 400 });
        }

        const companyInfos = await base44.asServiceRole.entities.CompanyInfo.list();
        const companyInfo = companyInfos[0] || {};
        const barName = companyInfo.company_name || 'BarManager';

        const dateObj = new Date(reservation.date);
        const formattedDate = dateObj.toLocaleDateString('de-DE', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });

        const statusText = reservation.status === 'bestätigt' 
            ? 'Ihre Reservierung wurde bestätigt!' 
            : 'Ihre Reservierung wurde vorgemerkt und wird in Kürze von uns bestätigt.';

        const managementLink = `${Deno.env.get('BASE44_APP_URL') || 'https://barmanager.base44.com'}/guest-reservation?token=${reservation.guest_token}`;

        const emailBody = `
Hallo ${reservation.customer_name},

${statusText}

📅 Details Ihrer Reservierung:
━━━━━━━━━━━━━━━━━━━━━━━━
Datum: ${formattedDate}
Uhrzeit: ${reservation.time} Uhr
Personen: ${reservation.guests}
${reservation.table ? `Tisch: ${reservation.table}` : ''}
${reservation.notes ? `\nIhre Anmerkungen:\n${reservation.notes}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━

🔗 Reservierung verwalten:
${managementLink}

Wir freuen uns auf Ihren Besuch!

Mit freundlichen Grüßen
Ihr ${barName} Team

━━━━━━━━━━━━━━━━━━━━━━━━
${companyInfo.address || ''}
${companyInfo.phone || ''}
${companyInfo.email || ''}
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: barName,
            to: reservation.email,
            subject: `Reservierungsbestätigung - ${barName}`,
            body: emailBody
        });

        return Response.json({ success: true, message: 'Bestätigungsmail versendet' });

    } catch (error) {
        console.error('Fehler beim Senden der Bestätigungsmail:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});