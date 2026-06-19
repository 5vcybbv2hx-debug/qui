import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ONESIGNAL_APP_ID = '664fda20-f8c7-411a-928f-217c855bb2bb';

async function pushViaOneSignal(externalIds: string[], title: string, message: string, url = '/Notifications') {
    if (!externalIds || externalIds.length === 0) return { sent: 0, error: null };

    const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
    if (!apiKey) {
        console.error('[sendPushNotification] ONESIGNAL_REST_API_KEY not set');
        return { sent: 0, error: 'ONESIGNAL_REST_API_KEY not configured' };
    }

    const body = {
        app_id: ONESIGNAL_APP_ID,
        include_aliases: { external_id: externalIds.map(String) },
        target_channel: 'push',
        headings: { en: title, de: title },
        contents: { en: message, de: message },
        url,
        web_url: url,
    };

    const res = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error('[sendPushNotification] OneSignal error:', errText);
        return { sent: 0, error: errText };
    }

    const result = await res.json();
    return { sent: result.recipients ?? externalIds.length, error: null };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Auth: erlaubt für eingeloggte User (kein reiner Admin-Guard —
        // Mitarbeiter müssen Schichttausch-Notifications auslösen können)
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { title, message, targetEmployeeId, targetEmployeeIds, targetRoles, targetEmails, url } = await req.json();

        if (!title || !message) {
            return Response.json({ error: 'title and message are required' }, { status: 400 });
        }

        const employees = await base44.asServiceRole.entities.Employee.filter({ is_active: true });

        let targetIds: string[] = [];

        if (targetEmployeeId) {
            // Einzelner Mitarbeiter per ID
            targetIds = [String(targetEmployeeId)];
        } else if (targetEmployeeIds && targetEmployeeIds.length > 0) {
            // Mehrere Mitarbeiter per ID-Array
            targetIds = targetEmployeeIds.map(String);
        } else if (targetEmails && targetEmails.length > 0) {
            // Per E-Mail-Adressen
            targetIds = employees
                .filter(e => targetEmails.includes(e.email))
                .map(e => String(e.id));
        } else if (targetRoles && targetRoles.length > 0) {
            // Per Rollen
            targetIds = employees
                .filter(e => targetRoles.includes(e.role))
                .map(e => String(e.id));
        } else {
            // Broadcast an alle aktiven Mitarbeiter
            targetIds = employees.map(e => String(e.id));
        }

        if (targetIds.length === 0) {
            return Response.json({ success: true, sent: 0, message: 'No matching employees found' });
        }

        const notifUrl = url || '/Notifications';
        const result = await pushViaOneSignal(targetIds, title, message, notifUrl);

        return Response.json({
            success: !result.error,
            sent: result.sent,
            targeted: targetIds.length,
            error: result.error ?? undefined
        });
    } catch (error) {
        console.error('[sendPushNotification] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
