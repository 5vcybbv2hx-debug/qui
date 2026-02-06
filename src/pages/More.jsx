import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { LogOut, ChevronRight, Home, Calendar, Users, Package, Wine, BookOpen, CalendarCheck, CheckSquare, Sparkles, Wrench, TrendingUp, Bell, Shield, GraduationCap, Clock, Settings } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import { haptics } from '@/components/utils/haptics';
import { Card } from '@/components/ui/card';

const navigationSections = [
    {
        title: 'Übersicht',
        items: [
            { name: 'Dashboard', page: 'Dashboard', icon: Home, permission: 'canViewDashboard' },
            { name: 'Benachrichtigungen', page: 'Notifications', icon: Bell, permission: 'canViewDashboard' },
        ]
    },
    {
        title: 'Team',
        items: [
            { name: 'Kalender', page: 'Calendar', icon: Calendar, permission: 'canViewShifts' },
            { name: 'Zeit', page: 'TimeManagement', icon: Clock, permission: 'canViewDashboard' },
            { name: 'Mein Bereich', page: 'MyArea', icon: Users, permission: 'canViewDashboard' },
            { name: 'Einlernen', page: 'Onboarding', icon: GraduationCap, permission: 'canViewEmployees' },
            { name: 'Mitarbeiter', page: 'Employees', icon: Users, permission: 'canViewEmployees' },
            { name: 'Berechtigungen', page: 'Permissions', icon: Shield, permission: 'isAdmin' },
        ]
    },
    {
        title: 'Bar',
        items: [
            { name: 'Lager', page: 'Warehouse', icon: Package, permission: 'canViewShopping' },
            { name: 'Getränkekarte', page: 'DrinkMenu', icon: Wine, permission: 'canViewEmployees' },
            { name: 'Rezepte', page: 'Recipes', icon: BookOpen, permission: 'canViewDashboard' },
            { name: 'Lieferanten', page: 'Suppliers', icon: Package, permission: 'isManager' },
        ]
    },
    {
        title: 'Events',
        items: [
            { name: 'Events', page: 'Events', icon: Calendar, permission: 'canViewDashboard' },
            { name: 'Reservierungen', page: 'Reservations', icon: CalendarCheck, permission: 'canViewReservations' },
        ]
    },
    {
        title: 'Organisation',
        items: [
            { name: 'Aufgaben', page: 'Todos', icon: CheckSquare, permission: 'canViewTodos' },
            { name: 'Putzen', page: 'Cleaning', icon: Sparkles, permission: 'canViewCleaning' },
            { name: 'Wartung', page: 'Maintenance', icon: Wrench, permission: 'canViewEmployees' },
            { name: 'Wartungshistorie', page: 'MaintenanceHistory', icon: TrendingUp, permission: 'canViewEmployees' },
            { name: 'Teamsitzung', page: 'TeamMeeting', icon: Users, permission: 'canViewDashboard' },
        ]
    },
    {
        title: 'Analysen',
        items: [
            { name: 'Verkäufe', page: 'SalesAnalysis', icon: TrendingUp, permission: 'canViewAnalytics' },
            { name: 'Personalkosten', page: 'LaborCostAnalysis', icon: Users, permission: 'canViewAnalytics' },
            { name: 'Budget', page: 'Budget', icon: TrendingUp, permission: 'canViewAnalytics' },
            { name: 'Berichte', page: 'Reports', icon: TrendingUp, permission: 'canViewAnalytics' },
        ]
    },
    {
        title: 'Einstellungen',
        items: [
            { name: 'Einstellungen', page: 'Settings', icon: Settings, permission: 'canViewDashboard' },
            { name: 'Dokumente', page: 'Documents', icon: BookOpen, permission: 'canViewEmployees' },
            { name: 'Firmendaten', page: 'CompanySettings', icon: Shield, permission: 'isManager' },
        ]
    },
];

export default function MorePage() {
    const permissions = usePermissions();
    const [currentUser, setCurrentUser] = React.useState(null);

    React.useEffect(() => {
        base44.auth.me().then(setCurrentUser).catch(() => {});
    }, []);

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-white">Mehr</h1>
                    <p className="text-slate-400 text-sm">Alle Funktionen im Überblick</p>
                </div>

                {/* User Info */}
                {currentUser && (
                    <Card className="bg-slate-900 border-slate-800 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                <span className="text-slate-900 font-bold text-lg">
                                    {currentUser.full_name?.charAt(0) || 'U'}
                                </span>
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-white">{currentUser.full_name}</p>
                                <p className="text-sm text-slate-400">{currentUser.email}</p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Navigation Sections */}
                <div className="space-y-6">
                    {navigationSections.map((section) => {
                        const visibleItems = section.items.filter(item => permissions[item.permission]);
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={section.title} className="space-y-2">
                                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
                                    {section.title}
                                </h2>
                                <Card className="bg-slate-900 border-slate-800 divide-y divide-slate-800">
                                    {visibleItems.map((item) => (
                                        <Link
                                            key={item.page}
                                            to={createPageUrl(item.page)}
                                            onClick={() => haptics.selection()}
                                            className="flex items-center gap-4 px-4 py-4 hover:bg-slate-800/50 active:bg-slate-800 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                        >
                                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 text-amber-500">
                                                <item.icon className="w-5 h-5" />
                                            </div>
                                            <span className="flex-1 font-medium text-white">{item.name}</span>
                                            <ChevronRight className="w-5 h-5 text-slate-500" />
                                        </Link>
                                    ))}
                                </Card>
                            </div>
                        );
                    })}
                </div>

                {/* Logout Button */}
                <Card className="bg-slate-900 border-slate-800">
                    <button
                        onClick={() => {
                            haptics.light();
                            base44.auth.logout();
                        }}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 hover:bg-slate-800/50 active:bg-slate-800 transition-colors rounded-lg text-red-400 font-medium"
                    >
                        <LogOut className="w-5 h-5" />
                        Abmelden
                    </button>
                </Card>
            </div>
        </div>
    );
}