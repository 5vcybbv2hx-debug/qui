/**
 * Zeiterfassung — Wrapper
 *
 * v2 Verbesserungen:
 *  - Terminal nicht mehr als gleichwertiger Tab
 *  - Terminal-Zugang als kompakter Link-Button für Manager/Terminal-Rolle
 *  - HolidayCreditManager bleibt für Manager
 */
import React, { useState } from 'react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import HolidayCreditManager from '@/components/dashboard/HolidayCreditManager';
import TimeTrackingPage from './TimeTracking';
import TerminalClockPage from './TerminalClock';
import { Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TimeManagementPage() {
    const permissions = usePermissions();
    const [showTerminal, setShowTerminal] = useState(false);

    if (!permissions.canViewOwnTimeEntries && !permissions.isTerminal) {
        return <PermissionDenied message="Du hast keine Berechtigung für die Zeiterfassung." />;
    }

    // Terminal-Modus: direkt anzeigen ohne Wrapper
    if (permissions.isTerminal && !permissions.isManager) {
        return <TerminalClockPage />;
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Terminal-Zugang für Manager — kleiner Button oben rechts */}
            {(permissions.isManager || permissions.isTerminal) && (
                <div className="flex justify-end px-4 pt-4 max-w-6xl mx-auto">
                    <button
                        onClick={() => setShowTerminal(v => !v)}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                            showTerminal
                                ? 'bg-amber-600 border-amber-600 text-white'
                                : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                        )}>
                        <Monitor className="w-3.5 h-3.5" />
                        {showTerminal ? 'Zeiterfassung' : 'Terminal-Modus'}
                    </button>
                    {permissions.isManager && !showTerminal && (
                        <span className="ml-2">
                            <HolidayCreditManager />
                        </span>
                    )}
                </div>
            )}

            {showTerminal ? <TerminalClockPage /> : <TimeTrackingPage />}
        </div>
    );
}
