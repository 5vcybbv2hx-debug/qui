import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const url    = new URL(req.url);
    const slotId = url.searchParams.get('slotId');

    if (!slotId) {
      return new Response(JSON.stringify({ error: 'slotId fehlt' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Fetch slot + assignments in parallel — service role bypasses auth
    const [slots, assignments] = await Promise.all([
      base44.asServiceRole.entities.StorageSlot.filter({ id: slotId }),
      base44.asServiceRole.entities.StorageAssignment.filter({
        storage_slot_id: slotId,
        is_active: true,
      }),
    ]);

    if (!slots || slots.length === 0) {
      return new Response(JSON.stringify({ error: 'Lagerplatz nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(
      JSON.stringify({ slot: slots[0], assignments: assignments || [] }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Serverfehler', detail: String(err) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
});
