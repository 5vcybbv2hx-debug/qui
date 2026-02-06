import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { reservationId } = await req.json();

        if (!reservationId) {
            return Response.json({ error: 'reservationId erforderlich' }, { status: 400 });
        }

        // Reservierung abrufen
        const reservations = await base44.asServiceRole.entities.Reservation.filter({ id: reservationId });
        const reservation = reservations[0];

        if (!reservation) {
            return Response.json({ error: 'Reservierung nicht gefunden' }, { status: 404 });
        }

        if (!reservation.email) {
            return Response.json({ error: 'Keine E-Mail-Adresse vorhanden' }, { status: 400 });
        }

        // Firmendaten abrufen
        const companyInfos = await base44.asServiceRole.entities.CompanyInfo.list();
        const companyInfo = companyInfos[0] || {};
        const barName = companyInfo.company_name || 'BarManager';

        // Formatiere Datum
        const dateObj = new Date(reservation.date);
        const formattedDate = dateObj.toLocaleDateString('de-DE', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        // Status-Text
        const statusText = reservation.status === 'bestätigt' 
            ? 'Ihre Reservierung wurde bestätigt!' 
            : 'Ihre Reservierung wurde vorgemerkt und wird in Kürze von uns bestätigt.';

        // Erstelle Verwaltungslink
        const managementLink = `${Deno.env.get('BASE44_APP_URL') || 'https://barmanager.base44.com'}/guest-reservation?token=${reservation.guest_token}`;

        // E-Mail-Body
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

Über diesen Link können Sie:
• Ihre Reservierungsdetails einsehen
• Die Reservierung bei Bedarf stornieren

Wir freuen uns auf Ihren Besuch!

Mit freundlichen Grüßen
Ihr ${barName} Team

━━━━━━━━━━━━━━━━━━━━━━━━
${companyInfo.address || ''}
${companyInfo.phone || ''}
${companyInfo.email || ''}
        `;

        // E-Mail senden
        await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: barName,
            to: reservation.email,
            subject: `Reservierungsbestätigung - ${barName}`,
            body: emailBody
        });

        return Response.json({ 
            success: true,
            message: 'Bestätigungsmail versendet'
        });

    } catch (error) {
        console.error('Fehler beim Senden der Bestätigungsmail:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});