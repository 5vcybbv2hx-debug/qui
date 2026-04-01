import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// CRITICAL FIX: Added admin auth check — previously anyone could reset vacation days
// for this hardcoded employee without authentication.
// NOTE: This function should ideally be removed or generalized. The hardcoded employee ID
// is a code smell — use the general employee update flow instead.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        await base44.asServiceRole.entities.Employee.update('695534ed911b0cd26dbbdbdd', {
            vacation_days_per_year: 30
        });

        return Response.json({ success: true, message: 'Urlaubstage von Marco Monachino auf 30 zurückgesetzt.' });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});