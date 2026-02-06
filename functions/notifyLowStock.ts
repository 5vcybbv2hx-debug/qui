import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Get all active articles
        const articles = await base44.asServiceRole.entities.Article.filter({
            is_active: true
        });

        // Find articles with low stock
        const lowStockArticles = articles.filter(article => 
            article.min_stock && 
            article.current_stock <= article.min_stock
        );

        if (lowStockArticles.length === 0) {
            return Response.json({ 
                message: 'No low stock articles',
                count: 0 
            });
        }

        // Get users who should receive inventory notifications
        const users = await base44.asServiceRole.entities.User.list();
        const targetUsers = users.filter(u => {
            const prefs = u.notification_preferences || {};
            return prefs.inventory_low !== false;
        });

        // Get managers/employees with inventory permissions
        const employees = await base44.asServiceRole.entities.Employee.filter({
            is_active: true
        });
        const inventoryManagers = employees.filter(e => 
            e.role === 'Manager' || e.permissions?.canEditShopping
        );

        const managerEmails = inventoryManagers.map(e => e.email).filter(Boolean);

        // Create general notification for low stock
        const articleNames = lowStockArticles.slice(0, 3).map(a => a.name).join(', ');
        const moreCount = lowStockArticles.length > 3 ? ` und ${lowStockArticles.length - 3} weitere` : '';

        await base44.asServiceRole.entities.Notification.create({
            type: 'alert',
            title: 'Niedriger Lagerbestand',
            message: `${lowStockArticles.length} Artikel unter Mindestbestand: ${articleNames}${moreCount}`,
            related_id: null,
            read_by: [],
            target_roles: ['Manager']
        });

        // Send push notifications to managers with inventory permissions
        const pushTargets = targetUsers.filter(u => 
            managerEmails.includes(u.email) && u.push_subscription
        );

        if (pushTargets.length > 0) {
            try {
                await base44.asServiceRole.functions.invoke('sendPushNotification', {
                    title: 'Niedriger Lagerbestand',
                    message: `${lowStockArticles.length} Artikel müssen nachbestellt werden`,
                    targetRoles: [],
                    targetEmails: pushTargets.map(u => u.email)
                });
            } catch (error) {
                console.error('Push notification failed:', error);
            }
        }

        return Response.json({
            success: true,
            message: `Notified about ${lowStockArticles.length} low stock articles`,
            articles: lowStockArticles.map(a => ({ name: a.name, stock: a.current_stock }))
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});