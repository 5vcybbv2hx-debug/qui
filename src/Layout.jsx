import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { Home, Calendar, Sparkles, CheckSquare, Users, Menu, X, CalendarCheck, Package, ShoppingCart, BookOpen, Clock, TrendingUp, LogOut, RepeatIcon, Bell, Shield, ClipboardCheck, GraduationCap, Wrench, Wine, ArrowLeft } from 'lucide-react';
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

     // Tab sections for history tracking
     const tabSections = {
         Dashboard: ['Dashboard', 'Notifications', 'MyArea', 'TimeManagement', 'TeamMeeting'],
         Calendar: ['Calendar', 'Shifts', 'TeamCalendar', 'CalendarIntegration', 'Vacation', 'ShiftSwaps']
     };

     // Get current tab section
     const getCurrentTab = (pageName) => {
         for (const [tab, pages] of Object.entries(tabSections)) {
             if (pages.includes(pageName)) return tab;
         }
         return null;
     };

     // Save current page to tab history
     React.useEffect(() => {
         const currentTab = getCurrentTab(currentPageName);
         if (currentTab) {
             localStorage.setItem(`lastPage_${currentTab}`, currentPageName);
         }
     }, [currentPageName]);

     // Navigate to tab with history
     const navigateToTab = (tabName, e) => {
         const currentTab = getCurrentTab(currentPageName);
         const lastPage = localStorage.getItem(`lastPage_${tabName}`);
         
         if (currentTab === tabName) {
             // Already in this tab section
             if (currentPageName === tabName) {
                 // On root page, reload
                 e.preventDefault();
                 window.location.href = createPageUrl(tabName);
             }
         } else if (lastPage && lastPage !== tabName) {
             // Navigate to last visited page in this tab
             e.preventDefault();
             window.location.href = createPageUrl(lastPage);
         }
     };

     const primaryPages = ['Dashboard', 'Calendar'];
     const isRootPage = primaryPages.includes(currentPageName);
     const getRootPage = () => {
         const rootItem = navigation.find(item => item.page === currentPageName);
         return rootItem?.page;
     };

     const handleRefresh = async () => {
         // Reload current page data using react-query's refetch
         window.location.reload();
     };

    return (
        <div className="min-h-screen bg-slate-950">
            <ServiceWorkerRegistration />
            <PWAInstallPrompt />
            <OfflineIndicator />
            {/* Fixed Top Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900/95 border-b border-slate-800/50 backdrop-blur-xl pt-safe">
                <div className="flex items-center gap-3 px-3 py-3">
                    {!isRootPage && (
                        <button
                            onClick={() => window.history.back()}
                            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-800/50 active:bg-slate-800 text-slate-400 hover:text-white transition-all"
                            title="Zurück"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <h1 className="text-lg font-bold text-white flex-1">
                        {navigation.find(item => item.page === currentPageName)?.name || 'BarManager'}
                    </h1>
                </div>
            </header>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0">
                <div className="flex flex-col flex-grow bg-slate-900 border-r border-slate-800/50 pt-8 overflow-y-auto backdrop-blur-xl">
                    {/* Logo */}
                    <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3 px-6 mb-10 group">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all">
                            <span className="text-slate-900 font-bold text-xl">B</span>
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent tracking-tight">BarManager</span>
                    </Link>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 space-y-8 overflow-y-auto">
                        {navigationSections.map((section) => {
                            const visibleItems = section.items.filter(item => permissions[item.permission]);
                            if (visibleItems.length === 0) return null;

                            return (
                                <div key={section.title}>
                                    <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                                        {section.title}
                                    </h3>
                                    <div className="space-y-1">
                                        {visibleItems.map((item) => {
                                            const isActive = currentPageName === item.page;
                                            const handleNavClick = (e) => {
                                        if (isActive) {
                                            e.preventDefault();
                                        }
                                    };

                                    return (
                                                <Link
                                                    key={item.name}
                                                    to={createPageUrl(item.page)}
                                                    onClick={handleNavClick}
                                                    className={cn(
                                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                                                        isActive 
                                                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 shadow-lg shadow-amber-500/20" 
                                                            : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
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

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-800/50 space-y-3">
                        {permissions.isManager && currentUser && (
                            <div className="flex justify-center">
                                <NotificationBell userEmail={currentUser.email} />
                            </div>
                        )}
                        <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 backdrop-blur">
                            <p className="text-xs font-bold text-amber-500">Bar Management</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                {permissions.employeeRole || 'Alles im Griff'}
                            </p>
                        </div>
                        <button
                            onClick={() => base44.auth.logout()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-sm font-medium border border-slate-700/50"
                        >
                            <LogOut className="w-4 h-4" />
                            Abmelden
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 border-t border-slate-800/50 pb-safe shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-around px-1 py-3">
                    <Link 
                        to={createPageUrl(localStorage.getItem('lastPage_Dashboard') || 'Dashboard')}
                        onClick={(e) => navigateToTab('Dashboard', e)}
                        className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl hover:bg-slate-800/50 active:bg-slate-800 text-slate-400 hover:text-amber-500 transition-all min-w-[72px]"
                    >
                        <Home className="w-6 h-6" />
                        <span className="text-xs font-medium">Home</span>
                    </Link>
                    <Link 
                        to={createPageUrl(localStorage.getItem('lastPage_Calendar') || 'Calendar')}
                        onClick={(e) => navigateToTab('Calendar', e)}
                        className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl hover:bg-slate-800/50 active:bg-slate-800 text-slate-400 hover:text-amber-500 transition-all min-w-[72px]"
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
                        className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl hover:bg-slate-800/50 active:bg-slate-800 text-slate-400 hover:text-amber-500 transition-all min-w-[72px]"
                    >
                        <Menu className="w-6 h-6" />
                        <span className="text-xs font-medium">Menü</span>
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <>
                        <div 
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 bg-slate-900/95 border-t border-slate-800/50 shadow-2xl max-h-[75vh] overflow-y-auto z-50 rounded-t-3xl backdrop-blur-xl">
                            <div className="sticky top-0 bg-slate-900/95 border-b border-slate-800/50 flex items-center justify-between px-4 py-3">
                                <h2 className="text-sm font-semibold text-white">Menü</h2>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-white transition-all"
                                    title="Schließen"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <nav className="p-4 space-y-6 pt-2">
                                {navigationSections.map((section) => {
                                    const visibleItems = section.items.filter(item => permissions[item.permission]);
                                    if (visibleItems.length === 0) return null;

                                    return (
                                        <div key={section.title}>
                                            <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                                                {section.title}
                                            </h3>
                                            <div className="space-y-1">
                                                {visibleItems.map((item) => {
                                                    const isActive = currentPageName === item.page;
                                                    const handleMobileNavClick = (e) => {
                                                        if (isActive) {
                                                            e.preventDefault();
                                                        }
                                                        setMobileMenuOpen(false);
                                                    };

                                                    return (
                                                        <Link
                                                            key={item.name}
                                                            to={createPageUrl(item.page)}
                                                            onClick={handleMobileNavClick}
                                                            className={cn(
                                                                "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all",
                                                                isActive 
                                                                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 shadow-lg shadow-amber-500/20" 
                                                                    : "text-slate-300 hover:bg-slate-800/50 active:bg-slate-800"
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
                            <div className="p-4 border-t border-slate-800/50">
                                <button
                                    onClick={() => {
                                        base44.auth.logout();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-all border border-slate-700/50"
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
            <main className="md:pl-72 pt-safe pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
                <PullToRefresh onRefresh={handleRefresh}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentPageName}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="pt-[env(safe-area-inset-top)] md:pt-0 md:block hidden md:pt-safe"
                        >
                            {children}
                        </motion.div>
                        <motion.div
                            key={`mobile-${currentPageName}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="pt-[calc(4rem+env(safe-area-inset-top))] md:hidden md:pt-0"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </PullToRefresh>
            </main>
        </div>
    );
}