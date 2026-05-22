import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from './usePermissions';
import { createPageUrl } from '@/utils';
import { allPages } from '@/components/navigation/navigationConfig';

/**
 * RoleGuard — wraps a page and redirects to the user's allowed landing page
 * if the required permission key is not granted.
 *
 * Usage:
 *   <RoleGuard permission="canViewAnalytics">
 *     <AnalyticsPage />
 *   </RoleGuard>
 */
export default function RoleGuard({ permission, children }) {
    const permissions = usePermissions();
    const navigate = useNavigate();

    useEffect(() => {
        if (permissions.isLoading) return;
        // Support both PERMISSION_MATRIX keys and identity fields (isManager, isAdmin)
        const hasAccess = !!permissions[permission];
        if (!hasAccess) {
            navigate(getAllowedLandingUrl(permissions), { replace: true });
        }
    }, [permissions.isLoading, permissions[permission], permission]);

    if (permissions.isLoading || !permissions[permission]) {
        return null;
    }

    return children;
}

/**
 * Determines the best landing URL for a user based on their resolved permissions.
 */
export function getAllowedLandingUrl(permissions) {
    if (permissions.canViewDashboard) return '/';
    if (permissions.canViewMeinTag)   return createPageUrl('MeinTag');
    if (permissions.canViewShifts)    return createPageUrl('Calendar');

    for (const page of allPages) {
        if (page.permission && permissions[page.permission]) {
            return createPageUrl(page.page);
        }
    }
    return '/';
}