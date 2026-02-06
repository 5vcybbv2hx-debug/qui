import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Öffentlicher Zugriff auf Firmendaten (ohne Auth)
        const infos = await base44.asServiceRole.entities.CompanyInfo.list();
        const companyInfo = infos[0] || {};

        return Response.json(companyInfo);
    } catch (error) {
        console.error('Fehler beim Abrufen der Firmendaten:', error);
        return Response.json({}, { status: 500 });
    }
});