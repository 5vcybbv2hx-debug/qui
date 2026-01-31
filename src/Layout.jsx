import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Home, Calendar, Sparkles, CheckSquare, Users, Menu, X, CalendarCheck, Package, ShoppingCart, BookOpen, Clock, TrendingUp, LogOut, RepeatIcon } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import { cn } from "@/lib/utils";
import { useState } from 'react';
import { usePermissions } from '@/components/auth/usePermissions';
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';
import OfflineIndicator from '@/components/pwa/OfflineIndicator';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';

const navigation = [
    { name: 'Mein Dashboard', page: 'MyDashboard', icon: Home, permission: 'canViewDashboard' },
    { name: 'Dashboard', page: 'Dashboard', icon: Home, permission: 'canViewDashboard' },
    { name: 'Schichtplan', page: 'Shifts', icon: Calendar, permission: 'canViewShifts' },
    { name: 'Schichttausch', page: 'ShiftSwaps', icon: RepeatIcon, permission: 'canViewDashboard' },
    { name: 'Kalenderintegration', page: 'CalendarIntegration', icon: Calendar, permission: 'canViewDashboard' },
    { name: 'Zeit & Stempeluhr', page: 'TimeTracking', icon: Clock, permission: 'canViewDashboard' },
    { name: 'Urlaub', page: 'Vacation', icon: Calendar, permission: 'canViewDashboard' },
    { name: 'Budget', page: 'Budget', icon: TrendingUp, permission: 'canViewAnalytics' },
    { name: 'Berichte', page: 'Reports', icon: TrendingUp, permission: 'canViewAnalytics' },
    { name: 'Reservierungen', page: 'Reservations', icon: CalendarCheck, permission: 'canViewReservations' },
    { name: 'Events', page: 'Events', icon: Calendar, permission: 'canViewDashboard' },
    { name: 'Rezepte', page: 'Recipes', icon: BookOpen, permission: 'canViewDashboard' },
    { name: 'Preiskalkulation', page: 'PriceCalculator', icon: TrendingUp, permission: 'canViewPriceCalculator' },
    { name: 'Artikel', page: 'Articles', icon: Package, permission: 'canEditShopping' },
    { name: 'Einkauf', page: 'Shopping', icon: ShoppingCart, permission: 'canViewShopping' },
    { name: 'Auffüllen', page: 'Restock', icon: Package, permission: 'canViewRestock' },
    { name: 'Putzliste', page: 'Cleaning', icon: Sparkles, permission: 'canViewCleaning' },
    { name: 'Aufgaben', page: 'Todos', icon: CheckSquare, permission: 'canViewTodos' },
    { name: 'Team', page: 'Employees', icon: Users, permission: 'canViewEmployees' },
];

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
                    <nav className="flex-1 px-3 space-y-1">
                        {navigation.filter(item => permissions[item.permission]).map((item) => {
                            const isActive = currentPageName === item.page;
                            return (
                                <Link
                                    key={item.name}
                                    to={createPageUrl(item.page)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                        isActive 
                                            ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20" 
                                            : "text-slate-400 hover:bg-slate-800"
                                    )}
                                >
                                    <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-500")} />
                                    {item.name}
                                </Link>
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
                            <nav className="p-3 space-y-1">
                                {navigation.filter(item => permissions[item.permission]).map((item) => {
                                    const isActive = currentPageName === item.page;
                                    return (
                                        <Link
                                            key={item.name}
                                            to={createPageUrl(item.page)}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium",
                                                isActive 
                                                    ? "bg-amber-600 text-white" 
                                                    : "text-slate-400 hover:bg-slate-800 active:bg-slate-700"
                                            )}
                                        >
                                            <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-500")} />
                                            {item.name}
                                        </Link>
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