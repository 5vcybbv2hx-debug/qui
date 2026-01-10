import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // This function should only be called by scheduled tasks
        // Get current month info
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
        const monthName = monthNames[lastMonth.getMonth()];
        const year = lastMonth.getFullYear();

        // Create notification for managers
        await base44.asServiceRole.entities.Notification.create({
            type: 'general',
            title: 'Zeiterfassungsbericht erstellen',
            message: `Bitte erstelle den Zeiterfassungsbericht für ${monthName} ${year} und sende ihn an das Lohnbüro. Gehe zu Zeit & Stempeluhr → Bericht erstellen.`,
            target_roles: ['admin', 'Manager'],
            read_by: []
        });

        console.log(`Monthly time report reminder created for ${monthName} ${year}`);

        return Response.json({ 
            success: true, 
            message: `Reminder created for ${monthName} ${year}` 
        });

    } catch (error) {
        console.error('Error creating monthly reminder:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});