import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Home, Calendar, Sparkles, CheckSquare, Users, Menu, X, CalendarCheck, Package, ShoppingCart, BookOpen, Clock, TrendingUp, LogOut, RepeatIcon, Bell, Shield, ClipboardCheck, GraduationCap, Wrench, Wine } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import { cn } from "@/lib/utils";
import { useState } from 'react';
import { usePermissions } from '@/components/auth/usePermissions';
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';
import OfflineIndicator from '@/components/pwa/OfflineIndicator';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';

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
            { name: 'Dokumente', page: 'Documents', icon: BookOpen, permission: 'canViewEmployees' },
            { name: 'Firmendaten', page: 'CompanySettings', icon: Shield, permission: 'isManager' },
        ]
    },
];

const navigation = navigationSections.flatMap(section => section.items);

export default function Layout({ children, currentPageName }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const permissions = usePermissions();
    const [currentUser, setCurrentUser] = React.useState(null);

    React.useEffect(() => {
        base44.auth.me().then(setCurrentUser).catch(() => {});
    }, []);

    return (
        <div className="min-h-screen bg-slate-900">
            <ServiceWorkerRegistration />
            <PWAInstallPrompt />
            <OfflineIndicator />
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
                <div className="flex flex-col flex-grow bg-slate-950 border-r border-slate-800 pt-5 overflow-y-auto">
                    {/* Logo */}
                    <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3 px-6 mb-8 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">B</span>
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">BarManager</span>
                    </Link>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 space-y-6 overflow-y-auto">
                        {navigationSections.map((section) => {
                            const visibleItems = section.items.filter(item => permissions[item.permission]);
                            if (visibleItems.length === 0) return null;

                            return (
                                <div key={section.title}>
                                    <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        {section.title}
                                    </h3>
                                    <div className="space-y-1">
                                        {visibleItems.map((item) => {
                                            const isActive = currentPageName === item.page;
                                            return (
                                                <Link
                                                    key={item.name}
                                                    to={createPageUrl(item.page)}
                                                    className={cn(
                                                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                                                        isActive 
                                                            ? "bg-amber-600 text-white" 
                                                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                                    )}
                                                >
                                                    <item.icon className="w-4 h-4" />
                                                    {item.name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-800 space-y-3">
                        {permissions.isManager && currentUser && (
                            <div className="flex justify-center">
                                <NotificationBell userEmail={currentUser.email} />
                            </div>
                        )}
                        <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-800/30">
                            <p className="text-xs font-medium text-amber-500">Bar Management</p>
                            <p className="text-[10px] text-amber-600/70 mt-0.5">
                                {permissions.employeeRole || 'Alles im Griff'}
                            </p>
                        </div>
                        <button
                            onClick={() => base44.auth.logout()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            Abmelden
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950 border-t border-slate-800 pb-safe">
                <div className="flex items-center justify-around px-1 py-3">
                    <Link 
                        to={createPageUrl('Dashboard')}
                        className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-white transition-colors min-w-[72px]"
                    >
                        <Home className="w-6 h-6" />
                        <span className="text-xs font-medium">Home</span>
                    </Link>
                    <Link 
                        to={createPageUrl('Calendar')}
                        className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-white transition-colors min-w-[72px]"
                    >
                        <Calendar className="w-6 h-6" />
                        <span className="text-xs font-medium">Kalender</span>
                    </Link>
                    {permissions.isManager && currentUser && (
                        <div className="flex flex-col items-center gap-1 px-3 py-2">
                            <NotificationBell userEmail={currentUser.email} />
                        </div>
                    )}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-white transition-colors min-w-[72px]"
                    >
                        <Menu className="w-6 h-6" />
                        <span className="text-xs font-medium">Menü</span>
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <>
                        <div 
                            className="fixed inset-0 bg-black/60 z-40"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 bg-slate-950 border-t border-slate-800 shadow-2xl max-h-[75vh] overflow-y-auto z-50 rounded-t-2xl">
                            <nav className="p-4 space-y-5">
                                {navigationSections.map((section) => {
                                    const visibleItems = section.items.filter(item => permissions[item.permission]);
                                    if (visibleItems.length === 0) return null;

                                    return (
                                        <div key={section.title}>
                                            <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                                {section.title}
                                            </h3>
                                            <div className="space-y-1">
                                                {visibleItems.map((item) => {
                                                    const isActive = currentPageName === item.page;
                                                    return (
                                                        <Link
                                                            key={item.name}
                                                            to={createPageUrl(item.page)}
                                                            onClick={() => setMobileMenuOpen(false)}
                                                            className={cn(
                                                                "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-colors",
                                                                isActive 
                                                                    ? "bg-amber-600 text-white shadow-lg" 
                                                                    : "text-slate-300 hover:bg-slate-800 active:bg-slate-700"
                                                            )}
                                                            >
                                                            <item.icon className="w-5 h-5" />
                                                            {item.name}
                                                            </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </nav>
                            <div className="p-4 border-t border-slate-800">
                                <button
                                    onClick={() => {
                                        base44.auth.logout();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Abmelden
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Main Content */}
            <main className="md:pl-64 pt-safe pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
                <div className="pt-[env(safe-area-inset-top)]">
                    {children}
                </div>
            </main>
        </div>
    );
}