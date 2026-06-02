import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/queryUtils';
import { LoadingState } from '@/components/ui/StateDisplay';
import { useErrorHandler } from '@/components/error/ErrorHandler';
import { usePermissions } from '@/components/auth/usePermissions';
import SmartDashboard from '@/components/dashboard/SmartDashboard';
import CalendarSyncBanner from '@/components/dashboard/CalendarSyncBanner';

export default function Dashboard() {
    const permissions = usePermissions();

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true }),
        staleTime: STALE.SLOW,
    });

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { handleError } = useErrorHandler();

    if (permissions.isLoading || !user) {
        return <LoadingState text="Lade Dashboard…" fullScreen />;
    }

    const currentEmployee = employees.find(e => e.email === user.email);

    return (
        <>
        <CalendarSyncBanner employee={currentEmployee || null} />
        <SmartDashboard
            currentUser={user}
            currentEmployee={currentEmployee || null}
            isManager={permissions.isManager}
            permissions={permissions}
        />
        </>
    );
}