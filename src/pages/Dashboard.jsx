import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { usePermissions } from '@/components/auth/usePermissions';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';

export default function Dashboard() {
    const permissions = usePermissions();
    const [viewAsEmployee, setViewAsEmployee] = useState(false);

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

    if (permissions.isManager && !viewAsEmployee) {
        return (
            <ManagerDashboard
                onSwitchToEmployee={() => setViewAsEmployee(true)}
                currentEmployee={currentEmployee}
                currentUser={user}
                isManager={permissions.isManager}
            />
        );
    }

    if (!currentEmployee) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center bg-card border-border">
                    <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-foreground mb-2">Kein Profil</h2>
                    <p className="text-muted-foreground">Du musst als Mitarbeiter registriert sein.</p>
                </Card>
            </div>
        );
    }

    return (
        <EmployeeDashboard
            currentEmployee={currentEmployee}
            isManager={permissions.isManager}
            onSwitchToManager={() => setViewAsEmployee(false)}
        />
    );
}