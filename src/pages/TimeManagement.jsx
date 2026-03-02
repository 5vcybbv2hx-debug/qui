import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, LogIn } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';

// Import existing page components
import TimeTrackingPage from './TimeTracking';
import TerminalClockPage from './TerminalClock';

export default function TimeManagementPage() {
    const permissions = usePermissions();
    const [activeTab, setActiveTab] = useState(permissions.isTerminal ? 'terminal' : 'tracking');

    if (!permissions.canViewDashboard && !permissions.isTerminal) {
        return <PermissionDenied message="Du hast keine Berechtigung für die Zeiterfassung." />;
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="mb-4 sm:mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">Zeiterfassung</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1">Arbeitszeiten erfassen und verwalten</p>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
                    <TabsList className="grid w-full grid-cols-2 bg-card border border-border h-auto p-1">
                        <TabsTrigger value="tracking" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                            <Clock className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span>Zeiterfassung</span>
                        </TabsTrigger>
                        <TabsTrigger value="terminal" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                            <LogIn className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span>Terminal</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="tracking" className="space-y-0">
                        <TimeTrackingPage />
                    </TabsContent>

                    <TabsContent value="terminal" className="space-y-0">
                        <TerminalClockPage />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}