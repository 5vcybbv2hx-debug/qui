/**
 * autoArchiveReservations — Archiviert alle vergangenen Reservierungen täglich um 04:00 Uhr.
 * Alle Reservierungen mit Datum < heute und is_archived = false werden archiviert.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Nur als Service-Role (kein User-Context nötig, da Scheduled Task)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Alle nicht-archivierten Reservierungen laden
        const reservations = await base44.asServiceRole.entities.Reservation.filter({
            is_archived: false
        });

        // Nur vergangene (Datum strikt vor heute) archivieren
        const toArchive = reservations.filter(r => r.date && r.date < todayStr);

        if (toArchive.length === 0) {
            return Response.json({ archived: 0, message: 'Keine Reservierungen zu archivieren.' });
        }

        let count = 0;
        for (const res of toArchive) {
            await base44.asServiceRole.entities.Reservation.update(res.id, { is_archived: true });
            count++;
        }

        return Response.json({
            archived: count,
            message: `${count} Reservierungen archiviert.`,
            date: todayStr
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});