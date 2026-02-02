import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Admin check
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Hole alle Putzaufgaben
        const tasks = await base44.asServiceRole.entities.CleaningTask.list();
        
        // Finde überfällige Aufgaben
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        const overdueTasks = tasks.filter(task => {
            if (task.is_completed) return false;
            
            // Check basierend auf Frequenz
            if (task.frequency === 'täglich') {
                // Täglich: sollte heute erledigt sein
                return true;
            } else if (task.frequency === 'am Wochenende') {
                const dayOfWeek = now.getDay();
                // 5 = Freitag, 6 = Samstag
                return dayOfWeek === 5 || dayOfWeek === 6;
            } else if (task.frequency === 'wöchentlich') {
                // Wöchentlich: wenn letzte Erledigung > 7 Tage
                if (!task.completed_at) return true;
                const lastCompleted = new Date(task.completed_at);
                const daysSinceCompletion = Math.floor((now - lastCompleted) / (1000 * 60 * 60 * 24));
                return daysSinceCompletion > 7;
            }
            
            return false;
        });

        if (overdueTasks.length === 0) {
            return Response.json({
                success: true,
                message: 'Keine überfälligen Aufgaben',
                overdueCount: 0
            });
        }

        // Erstelle Benachrichtigung
        const taskList = overdueTasks.map(t => `• ${t.title} (${t.area})`).join('\n');
        
        await base44.asServiceRole.entities.Notification.create({
            type: 'alert',
            title: `${overdueTasks.length} überfällige Putzaufgaben`,
            message: `Folgende Aufgaben sind noch nicht erledigt:\n\n${taskList}`,
            target_roles: ['admin', 'Manager']
        });

        // Sende Push-Benachrichtigung
        try {
            await base44.asServiceRole.functions.invoke('sendPushNotification', {
                title: 'Putzliste: Überfällige Aufgaben',
                message: `${overdueTasks.length} Aufgaben noch nicht erledigt`,
                targetRoles: ['admin']
            });
        } catch (pushError) {
            console.error('Push notification failed:', pushError);
        }

        return Response.json({
            success: true,
            message: `${overdueTasks.length} überfällige Aufgaben gefunden`,
            overdueCount: overdueTasks.length,
            tasks: overdueTasks.map(t => ({ 
                title: t.title, 
                area: t.area, 
                frequency: t.frequency 
            }))
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});