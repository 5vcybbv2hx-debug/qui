import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Hole Firmendaten (Service Role da öffentlich)
        const companyData = await base44.asServiceRole.entities.CompanyInfo.list();
        const companyInfo = companyData[0] || {};

        return Response.json(companyInfo);
    } catch (error) {
        console.error('Fehler beim Laden der Firmendaten:', error);
        return Response.json({ 
            error: error.message,
            company_name: 'BarManager'
        }, { status: 500 });
    }
});