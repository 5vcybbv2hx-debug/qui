import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get all admin users
        const users = await base44.asServiceRole.entities.User.list();
        const admins = users.filter(user => user.role === 'admin');
        
        // Get all managers
        const employees = await base44.asServiceRole.entities.Employee.filter({
            role: 'Manager',
            is_active: true
        });
        
        const recipients = [
            ...admins.map(u => u.email),
            ...employees.map(e => e.email).filter(Boolean)
        ];
        
        const uniqueRecipients = [...new Set(recipients)];
        
        // Send notifications
        const results = [];
        
        for (const email of uniqueRecipients) {
            try {
                // Create notification
                await base44.asServiceRole.entities.Notification.create({
                    recipient_email: email,
                    title: 'Backup-Erinnerung',
                    message: 'Es ist Zeit für ein Backup der App-Daten. Gehe zu Dashboard → Backup Manager.',
                    type: 'system',
                    priority: 'medium',
                    is_read: false
                });
                
                // Send email
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
                        <p>Das Backup wird alle wichtigen Daten sichern: Mitarbeiter, Schichten, Artikel, Verkäufe und mehr.</p>
                        <p>Viele Grüße,<br>Dein BarManager Team</p>
                    `
                });
                
                results.push({ email, sent: true });
            } catch (error) {
                results.push({ email, sent: false, error: error.message });
            }
        }
        
        return Response.json({
            success: true,
            recipients: uniqueRecipients.length,
            sent: results.filter(r => r.sent).length,
            details: results
        });
    } catch (error) {
        console.error('Backup reminder error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});