import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
    LogOut, Home, Calendar, Users, Package, Wine, BookOpen,
    CalendarCheck, CheckSquare, Sparkles, Wrench, TrendingUp,
    Bell, Shield, GraduationCap, Clock, Settings, QrCode,
    RepeatIcon, BarChart2, FileText, Building2, BellRing
} from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import { haptics } from '@/components/utils/haptics';

const navigationSections = [
    {
        title: 'Übersicht',
        items: [
            { name: 'Dashboard', page: 'Dashboard', icon: Home, permission: 'canViewDashboard', color: 'from-amber-500 to-orange-500' },
            { name: 'Benachrichtigungen', page: 'Notifications', icon: Bell, permission: 'isManager', color: 'from-red-500 to-rose-600' },
        ]
    },
    {
        title: 'Team',
        items: [
            { name: 'Kalender', page: 'Calendar', icon: Calendar, permission: 'canViewShifts', color: 'from-blue-500 to-indigo-600' },
            { name: 'Meine Schichten', page: 'MyShifts', icon: CalendarCheck, permission: 'canViewShifts', color: 'from-violet-500 to-purple-600' },
            { name: 'Zeiterfassung', page: 'TimeManagement', icon: Clock, permission: 'canViewDashboard', color: 'from-cyan-500 to-blue-600' },
            { name: 'Mein Bereich', page: 'MyArea', icon: Users, permission: 'canViewDashboard', color: 'from-teal-500 to-emerald-600' },
            { name: 'Einlernen', page: 'Onboarding', icon: GraduationCap, permission: 'canViewOnboarding', color: 'from-lime-500 to-green-600' },
            { name: 'Mitarbeiter', page: 'Employees', icon: Users, permission: 'canViewEmployees', color: 'from-green-500 to-teal-600' },
            { name: 'Berechtigungen', page: 'Permissions', icon: Shield, permission: 'isAdmin', color: 'from-slate-500 to-slate-700' },
        ]
    },
    {
        title: 'Bar',
        items: [
            { name: 'Lager', page: 'Warehouse', icon: Package, permission: 'canViewShopping', color: 'from-orange-500 to-amber-600' },
            { name: 'Getränkekarte', page: 'DrinkMenu', icon: Wine, permission: 'canViewEmployees', color: 'from-rose-500 to-pink-600' },
            { name: 'Rezepte', page: 'Recipes', icon: BookOpen, permission: 'canViewDashboard', color: 'from-pink-500 to-fuchsia-600' },
            { name: 'Lieferanten', page: 'Suppliers', icon: Package, permission: 'isManager', color: 'from-yellow-500 to-orange-500' },
        ]
    },
    {
        title: 'Events',
        items: [
            { name: 'Events', page: 'Events', icon: Calendar, permission: 'canViewDashboard', color: 'from-indigo-500 to-violet-600' },
            { name: 'Reservierungen', page: 'Reservations', icon: CalendarCheck, permission: 'canViewReservations', color: 'from-blue-500 to-cyan-600' },
            { name: 'QR-Codes', page: 'QRCodes', icon: QrCode, permission: 'isManager', color: 'from-slate-400 to-slate-600' },
        ]
    },
    {
        title: 'Organisation',
        items: [
            { name: 'Aufgaben', page: 'Todos', icon: CheckSquare, permission: 'canViewTodos', color: 'from-emerald-500 to-green-600' },
            { name: 'Putzen', page: 'Cleaning', icon: Sparkles, permission: 'canViewCleaning', color: 'from-sky-400 to-blue-500' },
            { name: 'Wochenaufgaben', page: 'WeeklyTasks', icon: RepeatIcon, permission: 'canViewCleaning', color: 'from-teal-400 to-cyan-500' },
            { name: 'Wartung', page: 'Maintenance', icon: Wrench, permission: 'isManager', color: 'from-stone-500 to-zinc-600' },
            { name: 'Teamsitzung', page: 'TeamMeeting', icon: Users, permission: 'canViewDashboard', color: 'from-violet-400 to-purple-500' },
        ]
    },
    {
        title: 'Analysen',
        items: [
            { name: 'Verkäufe', page: 'SalesAnalysis', icon: TrendingUp, permission: 'canViewAnalytics', color: 'from-green-500 to-emerald-600' },
            { name: 'Personalkosten', page: 'LaborCostAnalysis', icon: BarChart2, permission: 'canViewAnalytics', color: 'from-blue-500 to-indigo-600' },
            { name: 'Budget', page: 'Budget', icon: TrendingUp, permission: 'canViewAnalytics', color: 'from-amber-500 to-yellow-600' },
            { name: 'Berichte', page: 'Reports', icon: FileText, permission: 'canViewAnalytics', color: 'from-cyan-500 to-teal-600' },
        ]
    },
    {
        title: 'Einstellungen',
        items: [
            { name: 'Einstellungen', page: 'Settings', icon: Settings, permission: 'canViewDashboard', color: 'from-slate-500 to-slate-600' },
            { name: 'Benachrichtigungen', page: 'NotificationSettings', icon: BellRing, permission: 'canViewDashboard', color: 'from-orange-400 to-red-500' },
            { name: 'Dokumente', page: 'Documents', icon: BookOpen, permission: 'isManager', color: 'from-indigo-400 to-blue-500' },
            { name: 'Firmendaten', page: 'CompanySettings', icon: Building2, permission: 'isManager', color: 'from-zinc-500 to-slate-600' },
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
        <div className="min-h-screen bg-background pb-8">
            <div className="max-w-2xl mx-auto px-4 pt-4 space-y-6">

                {/* User Info Card */}
                {currentUser && (
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg flex-shrink-0">
                            <span className="text-slate-900 font-bold text-lg">
                                {currentUser.full_name?.charAt(0) || 'U'}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{currentUser.full_name}</p>
                            <p className="text-sm text-muted-foreground truncate">{currentUser.email}</p>
                        </div>
                        <button
                            onClick={() => { haptics.light(); base44.auth.logout(); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors flex-shrink-0"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Abmelden</span>
                        </button>
                    </div>
                )}

                {/* Sections as Grid */}
                {navigationSections.map((section) => {
                    const visibleItems = section.items.filter(item => permissions[item.permission]);
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={section.title}>
                            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">
                                {section.title}
                            </h2>
                            <div className="grid grid-cols-3 gap-3">
                                {visibleItems.map((item) => (
                                    <Link
                                        key={item.page}
                                        to={createPageUrl(item.page)}
                                        onClick={() => haptics.selection()}
                                        className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-card border border-border hover:border-muted-foreground/50 active:scale-95 transition-all text-center"
                                    >
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md`}>
                                            <item.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <span className="text-xs font-medium text-foreground leading-tight">
                                            {item.name}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}