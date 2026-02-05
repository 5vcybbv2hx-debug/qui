import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
        
        if (!vapidPublicKey) {
            return Response.json({ error: 'VAPID key not configured' }, { status: 500 });
        }

        // CORS-Header für öffentlichen Zugang
        return Response.json(
            { publicKey: vapidPublicKey },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});