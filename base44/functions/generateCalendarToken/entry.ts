import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Generates a random token and saves it to the employee record
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { employee_id } = await req.json();
        if (!employee_id) {
            return Response.json({ error: 'employee_id is required' }, { status: 400 });
        }

        // Only admins/managers can generate tokens for others
        const isPrivileged = user.role === 'admin' || user.role === 'manager';
        if (!isPrivileged) {
            // Regular users: verify they own this employee record
            const emp = await base44.asServiceRole.entities.Employee.get(employee_id);
            if (!emp || emp.email?.toLowerCase() !== user.email?.toLowerCase()) {
                return Response.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        // Generate a secure random token
        const tokenBytes = new Uint8Array(24);
        crypto.getRandomValues(tokenBytes);
        const token = btoa(String.fromCharCode(...tokenBytes))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        // Save token to employee record
        await base44.asServiceRole.entities.Employee.update(employee_id, {
            calendar_token: token
        });

        return Response.json({ token });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});