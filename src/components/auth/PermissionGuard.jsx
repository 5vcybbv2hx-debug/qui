/**
 * PermissionGuard.jsx
 * Declarative frontend access control.
 *
 * Usage:
 *   // Hides content silently
 *   <PermissionGuard permission="canEditEmployees">
 *     <DeleteButton />
 *   </PermissionGuard>
 *
 *   // Shows a friendly denied message
 *   <PermissionGuard permission="canViewAnalytics" showDenied>
 *     <AnalyticsDashboard />
 *   </PermissionGuard>
 *
 *   // Custom fallback
 *   <PermissionGuard permission="canViewSalaryData" fallback={<p>Kein Zugriff</p>}>
 *     <SalaryTable />
 *   </PermissionGuard>
 *
 *   // Manager/Admin check without a specific permission key
 *   <PermissionGuard managerOnly>
 *     <ManagerPanel />
 *   </PermissionGuard>
 */
import { ShieldOff } from 'lucide-react';
import { usePermissions } from './usePermissions';

// ── Denied placeholder ────────────────────────────────────────────────────────
function AccessDenied() {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <ShieldOff className="w-8 h-8 opacity-40" />
            <p className="text-sm">Keine Berechtigung für diesen Bereich.</p>
        </div>
    );
}

// ── Main Guard component ──────────────────────────────────────────────────────
export default function PermissionGuard({
    permission,   // string — key from PERMISSION_MATRIX
    managerOnly,  // boolean — shorthand for isManager check
    adminOnly,    // boolean — shorthand for isAdmin check
    fallback,     // ReactNode — shown when denied (default: null)
    showDenied,   // boolean — show AccessDenied component when denied
    children,
}) {
    const perms = usePermissions();

    // Still loading — skeleton to avoid layout shift
    if (perms.isLoading) return <div className="animate-pulse h-8 w-full rounded-lg bg-muted" />;

    // Evaluate access
    let allowed = true;
    if (adminOnly)   allowed = perms.isAdmin;
    else if (managerOnly) allowed = perms.isManager;
    else if (permission)  allowed = perms[permission] === true;

    if (!allowed) {
        if (fallback)    return fallback;
        if (showDenied)  return <AccessDenied />;
        return null;
    }

    return children;
}

// ── useGate — imperative version for conditional logic in handlers ────────────
/**
 * Returns a function that checks a permission and optionally shows a toast.
 *
 * Usage:
 *   const gate = useGate();
 *   const handleDelete = () => {
 *     if (!gate('canDeleteReservations')) return;
 *     deleteMutation.mutate(id);
 *   };
 */
export function useGate() {
    const perms = usePermissions();
    return function gate(permission, { silent = false } = {}) {
        const allowed = perms[permission] === true;
        if (!allowed && !silent) {
            // Dynamic import to avoid circular deps
            import('sonner').then(({ toast }) =>
                toast.error('Keine Berechtigung', { description: 'Dein Account hat keinen Zugriff auf diese Aktion.' })
            );
        }
        return allowed;
    };
}