/**
 * serverAuth.js
 * Reusable server-side authentication and role guards for Deno backend functions.
 *
 * IMPORTANT: Frontend permission checks are UX only — they can be bypassed.
 * Every sensitive backend function MUST call one of these guards first.
 *
 * Usage:
 *   import { requireAuth, requireAdmin, requireManager } from './lib/serverAuth.js';
 *
 *   Deno.serve(async (req) => {
 *     const { base44, user } = await requireAdmin(req);
 *     // ... safe to proceed
 *   });
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Role constants (mirrored from frontend roleConfig) ─────────────────────────
const USER_ROLES     = { ADMIN: 'admin', USER: 'user' };
const EMPLOYEE_ROLES = { MANAGER: 'Manager', VOLLZEIT: 'Vollzeit', BARKEEPER: 'Barkeeper', AUSHILFE: 'Aushilfe' };

// ── Error responses ───────────────────────────────────────────────────────────
const err = (msg, status) => Response.json({ error: msg }, { status });

// ── Core guard ────────────────────────────────────────────────────────────────
/**
 * Require a valid authenticated session.
 * Returns { base44, user } or throws a Response.
 */
export async function requireAuth(req) {
    const base44 = createClientFromRequest(req);
    const user   = await base44.auth.me();
    if (!user) throw err('Unauthorized', 401);
    return { base44, user };
}

/**
 * Require the user to be an admin (base44 platform role).
 */
export async function requireAdmin(req) {
    const { base44, user } = await requireAuth(req);
    if (user.role !== USER_ROLES.ADMIN) throw err('Forbidden: Admin required', 403);
    return { base44, user };
}

/**
 * Require the user to be a Manager employee or an Admin.
 * Looks up the employee record by email.
 */
export async function requireManager(req) {
    const { base44, user } = await requireAuth(req);
    if (user.role === USER_ROLES.ADMIN) return { base44, user, employee: null };

    const employees = await base44.asServiceRole.entities.Employee.filter({
        email: user.email, is_active: true
    });
    const employee = employees[0];
    if (!employee || employee.role !== EMPLOYEE_ROLES.MANAGER) {
        throw err('Forbidden: Manager access required', 403);
    }
    return { base44, user, employee };
}

/**
 * Require the user to own a specific employee record, OR be a Manager/Admin.
 * Use this for endpoints where employees can access their own data.
 *
 * @param {Request} req
 * @param {string}  employeeId - The employee ID the action is being performed on
 */
export async function requireSelfOrManager(req, employeeId) {
    const { base44, user } = await requireAuth(req);
    if (user.role === USER_ROLES.ADMIN) return { base44, user };

    const employees = await base44.asServiceRole.entities.Employee.filter({
        email: user.email, is_active: true
    });
    const employee = employees[0];

    const isSelf    = employee?.id === employeeId;
    const isManager = employee?.role === EMPLOYEE_ROLES.MANAGER;

    if (!isSelf && !isManager) throw err('Forbidden: not your resource', 403);
    return { base44, user, employee };
}

/**
 * Require a specific employee role or higher.
 * Useful for feature-level guards (e.g. Barkeeper for recipe edits).
 *
 * @param {Request}  req
 * @param {string[]} allowedRoles - list of EMPLOYEE_ROLES values
 */
export async function requireRole(req, allowedRoles) {
    const { base44, user } = await requireAuth(req);
    if (user.role === USER_ROLES.ADMIN) return { base44, user };

    const employees = await base44.asServiceRole.entities.Employee.filter({
        email: user.email, is_active: true
    });
    const employee = employees[0];

    if (!employee || !allowedRoles.includes(employee.role)) {
        throw err(`Forbidden: requires one of [${allowedRoles.join(', ')}]`, 403);
    }
    return { base44, user, employee };
}

// ── Convenience wrapper ───────────────────────────────────────────────────────
/**
 * Wraps a handler so auth errors automatically return the correct Response.
 * Eliminates try/catch boilerplate in every function.
 *
 * Usage:
 *   export default withAuth(requireAdmin, async ({ base44, user }, req) => {
 *     const data = await base44.asServiceRole.entities.Shift.list();
 *     return Response.json({ data });
 *   });
 */
export function withAuth(guardFn, handler) {
    return async (req) => {
        try {
            const ctx = await guardFn(req);
            return await handler(ctx, req);
        } catch (e) {
            // Guard threw a Response — return it directly
            if (e instanceof Response) return e;
            console.error('[serverAuth] Unhandled error:', e);
            return Response.json({ error: 'Internal server error' }, { status: 500 });
        }
    };
}

export { USER_ROLES, EMPLOYEE_ROLES };