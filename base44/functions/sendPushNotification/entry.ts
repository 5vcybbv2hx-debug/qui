import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push';

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails('mailto:admin@barmanager.de', vapidPublicKey, vapidPrivateKey);
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!vapidPublicKey || !vapidPrivateKey) {
            return Response.json({ error: 'Push notifications not configured' }, { status: 503 });
        }

        const { title, message, targetRoles, targetEmails } = await req.json();

        const users = await base44.asServiceRole.entities.User.list();
        
        const targetUsers = users.filter(u => {
            if (!u.push_subscription) return false;
            if (targetEmails && targetEmails.length > 0) return targetEmails.includes(u.email);
            if (targetRoles && targetRoles.length > 0) return targetRoles.includes(u.role);
            return true;
        });

        const results = await Promise.all(targetUsers.map(async (targetUser) => {
            try {
                const subscription = JSON.parse(targetUser.push_subscription);
                await webpush.sendNotification(subscription, JSON.stringify({
                    title: title || 'Neue Benachrichtigung',
                    body: message,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    data: { url: '/Notifications' }
                }));
                return { success: true };
            } catch (error) {
                console.error('Push failed for user:', error.message);
                return { success: false };
            }
        }));

        const successCount = results.filter(r => r.success).length;

        // MEDIUM FIX: Don't return email addresses in response
        return Response.json({
            success: true,
            sent: successCount,
            total: targetUsers.length,
            failed: results.filter(r => !r.success).length
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});