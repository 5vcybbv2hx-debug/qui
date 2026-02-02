import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Home, Calendar, Sparkles, CheckSquare, Users, Menu, X, CalendarCheck, Package, ShoppingCart, BookOpen, Clock, TrendingUp, LogOut, RepeatIcon, Bell, Shield, ClipboardCheck } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import { cn } from "@/lib/utils";
import { useState } from 'react';
import { usePermissions } from '@/components/auth/usePermissions';
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';
import OfflineIndicator from '@/components/pwa/OfflineIndicator';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';

const navigationSections = [
    {
        title: 'Dashboard',
        items: [
            { name: 'Mein Dashboard', page: 'MyDashboard', icon: Home, permission: 'canViewDashboard' },
            { name: 'Manager Dashboard', page: 'Dashboard', icon: TrendingUp, permission: 'canViewDashboard' },
            { name: 'Benachrichtigungen', page: 'Notifications', icon: Bell, permission: 'canViewDashboard' },
        ]
    },
    {
        title: 'Personal',
        items: [
            { name: 'Schichtplan', page: 'Shifts', icon: Calendar, permission: 'canViewShifts' },
            { name: 'Team-Kalender', page: 'TeamCalendar', icon: CalendarCheck, permission: 'canViewShifts' },
            { name: 'Schichttausch', page: 'ShiftSwaps', icon: RepeatIcon, permission: 'canViewDashboard' },
            { name: 'Zeiterfassung', page: 'TimeTracking', icon: Clock, permission: 'canViewDashboard' },
            { name: 'Urlaub', page: 'Vacation', icon: Calendar, permission: 'canViewDashboard' },
            { name: 'Team', page: 'Employees', icon: Users, permission: 'canViewEmployees' },
            { name: 'Berechtigungen', page: 'Permissions', icon: Shield, permission: 'isAdmin' },
        ]
    },
    {
        title: 'Bar-Betrieb',
        items: [
            { name: 'Rezepte', page: 'Recipes', icon: BookOpen, permission: 'canViewDashboard' },
            { name: 'Artikel', page: 'Articles', icon: Package, permission: 'canEditShopping' },
            { name: 'Lieferanten', page: 'Suppliers', icon: Package, permission: 'isManager' },
            { name: 'Einkauf', page: 'Shopping', icon: ShoppingCart, permission: 'canViewShopping' },
            { name: 'Auffüllen', page: 'Restock', icon: Package, permission: 'canViewRestock' },
            { name: 'Schwund', page: 'Wastage', icon: TrendingUp, permission: 'canEditShopping' },
            { name: 'Inventur', page: 'Inventory', icon: ClipboardCheck, permission: 'canEditShopping' },
            { name: 'Preiskalkulation', page: 'PriceCalculator', icon: TrendingUp, permission: 'canViewPriceCalculator' },
        ]
    },
    {
        title: 'Events & Gäste',
        items: [
            { name: 'Events', page: 'Events', icon: Calendar, permission: 'canViewDashboard' },
            { name: 'Reservierungen', page: 'Reservations', icon: CalendarCheck, permission: 'canViewReservations' },
            { name: 'Kalenderintegration', page: 'CalendarIntegration', icon: Calendar, permission: 'canViewDashboard' },
        ]
    },
    {
        title: 'Organisation',
        items: [
            { name: 'Aufgaben', page: 'Todos', icon: CheckSquare, permission: 'canViewTodos' },
            { name: 'Putzliste', page: 'Cleaning', icon: Sparkles, permission: 'canViewCleaning' },
            { name: 'Teamsitzung', page: 'TeamMeeting', icon: Users, permission: 'canViewDashboard' },
            { name: 'Terminal', page: 'TerminalClock', icon: Clock, permission: 'isTerminal' },
        ]
    },
    {
        title: 'Finanzen',
        items: [
            { name: 'Budget', page: 'Budget', icon: TrendingUp, permission: 'canViewAnalytics' },
            { name: 'Berichte', page: 'Reports', icon: TrendingUp, permission: 'canViewAnalytics' },
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
                    <Link to={createPageUrl(permissions.isManager ? 'Dashboard' : 'MyDashboard')} className="flex items-center gap-3 px-6 mb-8 hover:opacity-80 transition-opacity">
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
                <div className="flex items-center justify-around px-2 py-2">
                    <Link 
                        to={createPageUrl(permissions.isManager ? 'Dashboard' : 'MyDashboard')}
                        className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <Home className="w-5 h-5" />
                        <span className="text-xs">Home</span>
                    </Link>
                    <Link 
                        to={createPageUrl('Shifts')}
                        className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <Calendar className="w-5 h-5" />
                        <span className="text-xs">Schichten</span>
                    </Link>
                    {permissions.isManager && currentUser && (
                        <div className="flex flex-col items-center gap-1 px-3 py-2">
                            <NotificationBell userEmail={currentUser.email} />
                        </div>
                    )}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                        <span className="text-xs">Menü</span>
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <>
                        <div 
                            className="fixed inset-0 bg-black/50 z-40"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-slate-950 border-t border-slate-800 shadow-lg max-h-[70vh] overflow-y-auto z-50">
                            <nav className="p-3 space-y-4">
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
                                                            onClick={() => setMobileMenuOpen(false)}
                                                            className={cn(
                                                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium",
                                                                isActive 
                                                                    ? "bg-amber-600 text-white" 
                                                                    : "text-slate-400 hover:bg-slate-800 active:bg-slate-700"
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
                            <div className="p-3 border-t border-slate-800">
                                <button
                                    onClick={() => {
                                        base44.auth.logout();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium"
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
            <main className="md:pl-64 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
                {children}
            </main>
        </div>
    );
}