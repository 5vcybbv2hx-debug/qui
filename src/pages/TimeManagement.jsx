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
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">Zeiterfassung</h1>
                    <p className="text-slate-400 text-sm mt-1">Arbeitszeiten erfassen und verwalten</p>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800 border-slate-700">
                        <TabsTrigger value="tracking" className="data-[state=active]:bg-amber-600">
                            <Clock className="w-4 h-4 mr-2" />
                            Zeiterfassung
                        </TabsTrigger>
                        <TabsTrigger value="terminal" className="data-[state=active]:bg-amber-600">
                            <LogIn className="w-4 h-4 mr-2" />
                            Terminal
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