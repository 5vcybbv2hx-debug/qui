import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// CRITICAL FIX: Added admin auth check — previously callable without any authentication,
// leaking all admin email addresses and sending emails to them.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const users = await base44.asServiceRole.entities.User.list();
        const admins = users.filter(u => u.role === 'admin');
        
        const employees = await base44.asServiceRole.entities.Employee.filter({
            role: 'Manager',
            is_active: true
        });
        
        const recipients = [
            ...admins.map(u => u.email),
            ...employees.map(e => e.email).filter(Boolean)
        ];
        
        const uniqueRecipients = [...new Set(recipients)];
        
        let sentCount = 0;
        let failCount = 0;
        
        for (const email of uniqueRecipients) {
            try {
                await base44.asServiceRole.entities.Notification.create({
                    recipient_email: email,
                    title: 'Backup-Erinnerung',
                    message: 'Es ist Zeit für ein Backup der App-Daten. Gehe zu Dashboard → Backup Manager.',
                    type: 'system',
                    priority: 'medium',
                    is_read: false
                });
                
                await base44.asServiceRole.integrations.Core.SendEmail({
                    to: email,
                    subject: '🔔 BarManager - Backup-Erinnerung',
                    body: `
                        <h2>Zeit für ein Backup!</h2>
                        <p>Hallo,</p>
                        <p>Es ist empfohlen, regelmäßige Backups deiner BarManager-Daten zu erstellen.</p>
                        <p><strong>So erstellst du ein Backup:</strong></p>
                        <ol>
                            <li>Öffne die BarManager App</li>
                            <li>Gehe zum Dashboard</li>
                            <li>Klicke auf "Backup Manager"</li>
                            <li>Erstelle ein neues Backup</li>
                        </ol>
                        <p>Viele Grüße,<br>Dein BarManager Team</p>
                    `
                });
                
                sentCount++;
            } catch (error) {
                failCount++;
            }
        }
        
        // MEDIUM FIX: Don't return email addresses in response
        return Response.json({
            success: true,
            recipients: uniqueRecipients.length,
            sent: sentCount,
            failed: failCount
        });
    } catch (error) {
        console.error('Backup reminder error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});