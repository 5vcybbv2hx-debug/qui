import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, CalendarCheck, Link2 } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';

// Import existing page components
import ShiftsPage from './Shifts';
import TeamCalendarPage from './TeamCalendar';
import CalendarIntegrationPage from './CalendarIntegration';

export default function CalendarPage() {
    const permissions = usePermissions();
    const [activeTab, setActiveTab] = useState('shifts');

    if (!permissions.canViewShifts) {
        return <PermissionDenied message="Du hast keine Berechtigung für den Kalender." />;
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="mb-4 sm:mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Kalender</h1>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">Schichten, Team-Übersicht und Integration</p>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
                    <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700 h-auto p-1">
                        <TabsTrigger value="shifts" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                            <CalendarIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span>Schichten</span>
                        </TabsTrigger>
                        <TabsTrigger value="team" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                            <CalendarCheck className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span>Team</span>
                        </TabsTrigger>
                        <TabsTrigger value="integration" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                            <Link2 className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span>Integration</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="shifts" className="space-y-0">
                        <ShiftsPage />
                    </TabsContent>

                    <TabsContent value="team" className="space-y-0">
                        <TeamCalendarPage />
                    </TabsContent>

                    <TabsContent value="integration" className="space-y-0">
                        <CalendarIntegrationPage />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}