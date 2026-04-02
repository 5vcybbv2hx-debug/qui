import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/components/auth/usePermissions';
import SmartDashboard from '@/components/dashboard/SmartDashboard';

export default function Dashboard() {
    const permissions = usePermissions();

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const currentEmployee = employees.find(e => e.email === user?.email);

    if (permissions.isLoading) return null;

    return (
        <SmartDashboard
            currentUser={user}
            currentEmployee={currentEmployee || null}
            isManager={permissions.isManager}
        />
    );
}