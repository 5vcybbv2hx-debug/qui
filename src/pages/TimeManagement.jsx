/**
 * Zeiterfassung — Wrapper
 * Terminal-Zugang als prominenter Button für Manager
 */
import React from 'react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import HolidayCreditManager from '@/components/dashboard/HolidayCreditManager';
import TimeTrackingPage from './TimeTracking';


export default function TimeManagementPage() {
    const permissions = usePermissions();

    if (!permissions.canViewOwnTimeEntries && !permissions.isTerminal) {
        return <PermissionDenied message="Du hast keine Berechtigung für die Zeiterfassung." />;
    }



    return (
        <div className="min-h-screen bg-background">
            {/* Manager-Leiste: Terminal-Zugang + HolidayCreditManager */}
            {permissions.isManager && (
                <div className="max-w-6xl mx-auto px-4 pt-4 flex items-center justify-end gap-2">
                    <HolidayCreditManager />
                </div>
            )}
            <TimeTrackingPage />
        </div>
    );
}