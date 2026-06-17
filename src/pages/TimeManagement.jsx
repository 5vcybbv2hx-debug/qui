/**
 * Zeiterfassung — Wrapper
 * Terminal-Zugang als prominenter Button für Manager
 */
import React, { useState } from 'react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import HolidayCreditManager from '@/components/dashboard/HolidayCreditManager';
import TimeTrackingPage from './TimeTracking';
import TerminalClockPage from './TerminalClock';
import { Monitor, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TimeManagementPage() {
    const permissions = usePermissions();
    const [showTerminal, setShowTerminal] = useState(false);

    if (!permissions.canViewOwnTimeEntries && !permissions.isTerminal) {
        return <PermissionDenied message="Du hast keine Berechtigung für die Zeiterfassung." />;
    }

    // Terminal-Nutzer ohne Manager: direkt Terminal zeigen
    if (permissions.isTerminal && !permissions.isManager) {
        return <TerminalClockPage />;
    }

    if (showTerminal) {
        return (
            <div className="min-h-screen bg-background">
                {/* Zurück-Button im Terminal-Modus */}
                <div className="max-w-6xl mx-auto px-4 pt-4 flex items-center gap-3">
                    <button
                        onClick={() => setShowTerminal(false)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all min-h-[44px]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Zurück zur Zeiterfassung
                    </button>
                </div>
                <TerminalClockPage />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Manager-Leiste: Terminal-Zugang + HolidayCreditManager */}
            {permissions.isManager && (
                <div className="max-w-6xl mx-auto px-4 pt-4 flex items-center justify-end gap-2">
                    <HolidayCreditManager />
                    <button
                        onClick={() => setShowTerminal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-accent transition-all min-h-[44px]"
                    >
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                        Terminal-Modus
                    </button>
                </div>
            )}
            <TimeTrackingPage />
        </div>
    );
}
