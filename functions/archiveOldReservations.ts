import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Alle Reservierungen holen
        const allReservations = await base44.asServiceRole.entities.Reservation.list('', 1000);
        
        // Datum vor 30 Tagen
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        let archivedCount = 0;
        
        // Alte Reservierungen archivieren
        for (const reservation of allReservations) {
            if (!reservation.is_archived && new Date(reservation.date) < thirtyDaysAgo) {
                await base44.asServiceRole.entities.Reservation.update(reservation.id, {
                    is_archived: true
                });
                archivedCount++;
            }
        }

        return Response.json({ 
            success: true, 
            message: `${archivedCount} Reservierungen wurden archiviert.`,
            archived_count: archivedCount
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});