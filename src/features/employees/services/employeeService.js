/**
 * employeeService.js
 * All Employee data access in one place.
 * UI components import hooks, hooks import this service — never base44 directly.
 */
import { entities } from '@/lib/serviceBase';

const E = entities.Employee;

export const employeeService = {
    /** List all employees, optionally filtered */
    list: (onlyActive = true) =>
        onlyActive ? E.filter({ is_active: true }, 'name') : E.list('name'),

    get: (id) => E.filter({ id }).then(r => r[0] ?? null),

    /** Returns employees that match a specific role (Manager / Vollzeit / Aushilfe) */
    byRole: (role) => E.filter({ role, is_active: true }, 'name'),

    create: (data) => E.create(data),

    update: (id, data) => E.update(id, data),

    /** Soft-delete by deactivating */
    deactivate: (id) => E.update(id, { is_active: false }),

    /** Full delete — use with care */
    delete: (id) => E.delete(id),
};