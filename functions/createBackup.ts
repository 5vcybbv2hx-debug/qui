import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Nur Admins können Backups erstellen' }, { status: 403 });
        }

        // Alle Entities abrufen
        const entities = [
            'Employee', 'Shift', 'Article', 'Recipe', 'ShoppingList', 
            'TimeEntry', 'ClockEntry', 'CleaningTask', 'Expense', 
            'Budget', 'TodoItem', 'Event', 'Reservation', 'VacationRequest',
            'ShiftSwapRequest', 'Notification', 'ShiftType', 'ShiftRequirement',
            'OpeningHours', 'ArticleCategory', 'CleaningArea', 'RestockItem'
        ];

        const backup = {
            created_at: new Date().toISOString(),
            created_by: user.full_name,
            data: {}
        };

        for (const entityName of entities) {
            try {
                const data = await base44.asServiceRole.entities[entityName].list();
                backup.data[entityName] = data;
            } catch (error) {
                console.error(`Fehler bei ${entityName}:`, error.message);
                backup.data[entityName] = [];
            }
        }

        // Als JSON zurückgeben
        const jsonString = JSON.stringify(backup, null, 2);
        
        return new Response(jsonString, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="backup_${new Date().toISOString().split('T')[0]}.json"`
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});