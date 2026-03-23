import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        await base44.asServiceRole.entities.Employee.update('695534ed911b0cd26dbbdbdd', {
            vacation_days_per_year: 30
        });

        return Response.json({ success: true, message: 'Urlaubstage von Marco Monachino auf 30 zurückgesetzt.' });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});