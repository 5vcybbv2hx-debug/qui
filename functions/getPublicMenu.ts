import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Hole verfügbare Menü-Items (Service Role da öffentlich)
        const items = await base44.asServiceRole.entities.MenuItem.filter({ is_available: true });
        const sortedItems = items.sort((a, b) => (a.order_position || 999) - (b.order_position || 999));

        return Response.json({ items: sortedItems });
    } catch (error) {
        console.error('Fehler beim Laden der Menü-Items:', error);
        return Response.json({ 
            error: error.message,
            items: []
        }, { status: 500 });
    }
});