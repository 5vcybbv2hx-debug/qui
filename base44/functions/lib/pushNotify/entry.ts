/**
 * Central push notification helper for backend functions.
 * Looks up user by employee_id (Employee.id → User.email match),
 * then sends push via sendPushNotification function.
 *
 * Usage:
 *   import { pushNotifyEmployee, pushNotifyManagers } from './lib/pushNotify.js';
 *   await pushNotifyEmployee(base44, employeeId, 'Titel', 'Nachricht');
 */

/**
 * Send push notification to a single employee identified by Employee.id
 */
export async function pushNotifyEmployee(base44, employeeId, title, message) {
    try {
        if (!employeeId) return;
        const employee = await base44.asServiceRole.entities.Employee.get(employeeId);
        if (!employee?.email) return;

        const users = await base44.asServiceRole.entities.User.list();
        const user = users.find(u => u.email === employee.email);
        if (!user?.push_subscription) return;

        await base44.asServiceRole.functions.invoke('sendPushNotification', {
            title,
            message,
            targetEmails: [employee.email],
            targetRoles: []
        });
    } catch (err) {
        console.error(`[pushNotifyEmployee] Failed for employee ${employeeId}:`, err.message);
    }
}

/**
 * Send push notification to all managers (role === 'Manager' or 'admin')
 */
export async function pushNotifyManagers(base44, title, message) {
    try {
        const users = await base44.asServiceRole.entities.User.list();
        const managerEmails = users
            .filter(u => (u.role === 'admin' || u.role === 'Manager') && u.push_subscription)
            .map(u => u.email);

        if (managerEmails.length === 0) return;

        await base44.asServiceRole.functions.invoke('sendPushNotification', {
            title,
            message,
            targetEmails: managerEmails,
            targetRoles: []
        });
    } catch (err) {
        console.error('[pushNotifyManagers] Failed:', err.message);
    }
}