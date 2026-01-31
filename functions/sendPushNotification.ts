import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import webpush from 'npm:web-push';

// VAPID-Keys (diese sollten als Secrets gesetzt werden, hier als Beispiel)
const vapidKeys = {
    publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SdzE9k0vXz3WJRbBlOWE7pXGlPnIbPzJ7ScTyHPjQyq-DuKYGDnT3Xg',
    privateKey: 'UUxDK_SfkJbOYpPH3R8yoMJEyNYqZQZp5K1H0_WKqTo'
};

webpush.setVapidDetails(
    'mailto:your-email@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { title, message, targetRoles } = await req.json();

        // Hole alle User mit Push-Subscriptions
        const users = await base44.asServiceRole.entities.User.list();
        
        const targetUsers = users.filter(u => {
            if (!u.push_subscription) return false;
            
            // Wenn targetRoles angegeben, nur an diese Rollen senden
            if (targetRoles && targetRoles.length > 0) {
                // Hole Employee-Daten für Rolle
                return targetRoles.includes(u.role);
            }
            return true;
        });

        const pushPromises = targetUsers.map(async (targetUser) => {
            try {
                const subscription = JSON.parse(targetUser.push_subscription);
                
                await webpush.sendNotification(
                    subscription,
                    JSON.stringify({
                        title: title || 'Neue Benachrichtigung',
                        body: message,
                        icon: '/icon-192.png',
                        badge: '/icon-192.png',
                        data: {
                            url: '/Notifications'
                        }
                    })
                );
                
                return { success: true, user: targetUser.email };
            } catch (error) {
                console.error('Push failed for user:', targetUser.email, error);
                return { success: false, user: targetUser.email, error: error.message };
            }
        });

        const results = await Promise.all(pushPromises);
        const successCount = results.filter(r => r.success).length;

        return Response.json({
            success: true,
            sent: successCount,
            total: targetUsers.length,
            results
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});