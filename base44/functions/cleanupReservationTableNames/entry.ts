import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only check
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Mappings for data cleanup
    const mappings = [
      { old: "NR Eck Links", new: "Eck links" },
      { old: "Bühne rechts", new: "Bühne Rechts" },
      { old: "Podest links", new: "Podest Links" },
      { old: "Tunnel ", new: "Tunnel Rechts " }
    ];

    const results = [];

    // Process each mapping
    for (const mapping of mappings) {
      try {
        // Find all reservations with the old table name
        const reservations = await base44.asServiceRole.entities.Reservation.filter(
          { table: mapping.old }
        );

        // Update each reservation
        for (const reservation of reservations) {
          await base44.asServiceRole.entities.Reservation.update(reservation.id, {
            table: mapping.new
          });
        }

        results.push({
          oldValue: mapping.old,
          newValue: mapping.new,
          updated: reservations.length,
          status: 'success'
        });
      } catch (error) {
        results.push({
          oldValue: mapping.old,
          newValue: mapping.new,
          updated: 0,
          status: 'error',
          error: error.message
        });
      }
    }

    // Calculate totals
    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
    const successCount = results.filter(r => r.status === 'success').length;

    return Response.json({
      success: true,
      message: `Datenbereinigung abgeschlossen: ${totalUpdated} Reservierungen aktualisiert`,
      totalUpdated,
      successCount,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});