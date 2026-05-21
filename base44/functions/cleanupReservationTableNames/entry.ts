import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only check
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 1:1 table name corrections
    const renameMappings = [
      { old: "NR Eck Links", new: "Eck links" },
      { old: "Bühne rechts", new: "Bühne Rechts" },
      { old: "Podest links", new: "Podest Links" },
      { old: "Tunnel ", new: "Tunnel Rechts " }
    ];

    // Multi-table entries: clear table field, append to notes
    const multiTableMappings = [
      { old: "T links +rechts komplett", noteAppend: "Gesamter Tunnel-Bereich" },
      { old: "Tunnel Links + Rechts",    noteAppend: "Gesamter Tunnel-Bereich" },
      { old: "Tunnel",                   noteAppend: "Gesamter Tunnel-Bereich" },
      { old: "T links",                  noteAppend: "T Links Hinten + T Links vorne" },
      { old: "Bühne links",              noteAppend: "Bühne Links vorne + Bühne Links Hinten" }
    ];

    const results = [];

    // Process 1:1 renames
    for (const mapping of renameMappings) {
      try {
        const reservations = await base44.asServiceRole.entities.Reservation.filter({ table: mapping.old });
        for (const reservation of reservations) {
          await base44.asServiceRole.entities.Reservation.update(reservation.id, { table: mapping.new });
        }
        results.push({ oldValue: mapping.old, newValue: mapping.new, updated: reservations.length, status: 'success' });
      } catch (error) {
        results.push({ oldValue: mapping.old, newValue: mapping.new, updated: 0, status: 'error', error: error.message });
      }
    }

    // Process multi-table entries: clear table, append note
    for (const mapping of multiTableMappings) {
      try {
        const reservations = await base44.asServiceRole.entities.Reservation.filter({ table: mapping.old });
        for (const reservation of reservations) {
          const existingNotes = reservation.notes ? reservation.notes.trim() : '';
          const newNotes = existingNotes
            ? `${existingNotes} | ${mapping.noteAppend}`
            : mapping.noteAppend;
          await base44.asServiceRole.entities.Reservation.update(reservation.id, {
            table: "",
            notes: newNotes
          });
        }
        results.push({ oldValue: mapping.old, newValue: "(leer)", noteAppend: mapping.noteAppend, updated: reservations.length, status: 'success' });
      } catch (error) {
        results.push({ oldValue: mapping.old, newValue: "(leer)", noteAppend: mapping.noteAppend, updated: 0, status: 'error', error: error.message });
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