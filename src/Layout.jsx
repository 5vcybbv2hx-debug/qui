import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useQueryClient } from '@tanstack/react-query';
import { haptics } from '@/components/utils/haptics';
import { Menu, ArrowLeft, LogOut, Bell, Search, Home, ScanLine, Package, Archive, ShoppingCart } from 'lucide-react';
import BarcodeScanner from '@/components/restock/BarcodeScanner';
import { navigationSections, navigationFlat } from '@/components/navigation/navigationConfig';
import NotificationBell from '@/components/notifications/NotificationBell';
import { cn } from "@/lib/utils";
import { useState } from 'react';
import { usePermissions } from '@/components/auth/usePermissions';
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';
import OfflineIndicator from '@/components/pwa/OfflineIndicator';
import OfflineSyncManager from '@/components/pwa/OfflineSyncManager';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import GlobalSearch from '@/components/search/GlobalSearch';
import { loadSavedColors } from '@/components/settings/ColorCustomizer';
import ErrorBoundary from '@/components/error/ErrorBoundary';
import { useAnalytics } from '@/components/analytics/useAnalytics';

const navigation = navigationFlat;

export default function Layout({ children, currentPageName }) {
     const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
     const [searchOpen, setSearchOpen] = useState(false);
     const [scannerOpen, setScannerOpen] = useState(false);

     const handleScan = (code) => {
         setScannerOpen(false);
         navigate(createPageUrl('Shopping') + `?scan=${code}`);
     };
     const permissions = usePermissions();
     const [currentUser, setCurrentUser] = React.useState(null);
     const navigate = useNavigate();
     const queryClient = useQueryClient();
     const { track } = useAnalytics();

     React.useEffect(() => {
         base44.auth.me().then(setCurrentUser).catch(() => {});
         // NOTE: No forced redirect here — deep links and direct URLs must work.
         // Navigation to a default page is the job of the auth layer, not the layout.

         // Keyboard shortcut für Suche (Strg+K)
         const handleKeyDown = (e) => {
             if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                 e.preventDefault();
                 setSearchOpen(true);
             }
         };
         window.addEventListener('keydown', handleKeyDown);
         return () => window.removeEventListener('keydown', handleKeyDown);
     }, []);

     // Farben beim App-Start aus DB laden
     React.useEffect(() => {
         loadSavedColors();
     }, []);


     // Theme beim App-Start laden und anwenden
     React.useEffect(() => {
         const savedTheme = localStorage.getItem('theme') || 'dark';
         const root = document.documentElement;
         
         if (savedTheme === 'light') {
             root.classList.remove('dark');
         } else if (savedTheme === 'dark') {
             root.classList.add('dark');
         } else if (savedTheme === 'system') {
             const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
             if (prefersDark) {
                 root.classList.add('dark');
             } else {
                 root.classList.remove('dark');
             }
         }
     }, []);

     // Tab sections for history tracking
     const tabSections = {
         Dashboard: ['Dashboard', 'Notifications', 'MyArea', 'TimeManagement', 'TeamMeeting'],
         Calendar: ['Calendar', 'Shifts', 'TeamCalendar', 'CalendarIntegration', 'Vacation', 'ShiftSwaps'],
         More: ['More', 'Settings', 'Onboarding', 'Employees', 'Permissions', 'Warehouse', 'DrinkMenu', 'Recipes', 'PriceCalculator', 'Suppliers', 'Events', 'Reservations', 'Todos', 'Cleaning', 'Maintenance', 'MaintenanceHistory', 'SalesAnalysis', 'LaborCostAnalysis', 'Budget', 'Reports', 'Documents', 'CompanySettings', 'NotificationSettings', 'QRCodes']
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

     // Navigate to tab — if already in the same tab, go to its root page.
     // Otherwise follow the <Link to=...> naturally (no e.preventDefault).
     const navigateToTab = (tabName, e) => {
         const currentTab = getCurrentTab(currentPageName);
         if (currentTab === tabName) {
             // Tapping the active tab root resets to its root page
             e.preventDefault();
             navigate(createPageUrl(tabName));
         }
         // No else: let React Router handle the Link normally for cross-tab navigation.
         // Removed last-visited restore — it caused surprising redirects away from deep links.
     };

     // All main navigation sections are root pages (no back button)
     const primaryPages = navigation.map(item => item.page);
     const isRootPage = primaryPages.includes(currentPageName);

     const handleRefresh = async () => {
         await queryClient.invalidateQueries();
     };

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-background" onContextMenu={(e) => e.preventDefault()}>
            <ServiceWorkerRegistration />
            <PWAInstallPrompt />
            <OfflineIndicator />
            <OfflineSyncManager />
            {/* Fixed Top Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card/95 border-b border-border/50 backdrop-blur-xl pt-safe">
                <div className="flex items-center gap-3 px-3 py-3">
                    {!isRootPage && (
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-accent/50 active:bg-accent text-muted-foreground hover:text-foreground transition-all"
                            title="Zurück"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <h1 className="text-lg font-bold text-foreground flex-1">
                        {navigation.find(item => item.page === currentPageName)?.name || 'BarManager'}
                    </h1>
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-accent/50 active:bg-accent text-muted-foreground hover:text-foreground transition-all"
                        title="Suche (Strg+K)"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Global Search */}
            <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

            {/* Barcode Scanner */}
            <BarcodeScanner
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleScan}
                title="Artikel scannen"
                mode="default"
            />

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0">
                <div className="flex flex-col flex-grow bg-card border-r border-border/50 pt-8 overflow-y-auto backdrop-blur-xl">
                    {/* Logo */}
                    <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3 px-6 mb-6 group">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all">
                            <span className="text-slate-900 font-bold text-xl">B</span>
                        </div>
                        <span className="text-xl font-bold text-foreground tracking-tight">BarManager</span>
                    </Link>

                    {/* Search Bar */}
                    <div className="px-4 mb-6">
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all border border-border/50"
                        >
                            <Search className="w-4 h-4" />
                            <span className="text-sm flex-1 text-left">Suche...</span>
                            <kbd className="px-2 py-1 text-xs bg-background border border-border/50 rounded">⌘K</kbd>
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 space-y-8 overflow-y-auto">
                        {navigationSections.map((section) => {
                            const visibleItems = section.items.filter(item => permissions[item.permission]);
                            if (visibleItems.length === 0) return null;

                            return (
                                <div key={section.title}>
                                    <h3 className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
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
                                                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
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
                    <div className="p-4 border-t border-border/50 space-y-3">
                        {permissions.isManager && currentUser && (
                            <div className="flex justify-center">
                                <NotificationBell userEmail={currentUser.email} userRole={currentUser.role} />
                            </div>
                        )}
                        <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 backdrop-blur">
                            <p className="text-sm font-bold text-amber-500">Bar Management</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {permissions.employeeRole || 'Alles im Griff'}
                            </p>
                        </div>
                        <button
                            onClick={() => base44.auth.logout()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all text-sm font-medium border border-border/50"
                        >
                            <LogOut className="w-4 h-4" />
                            Abmelden
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 border-t border-border/50 pb-safe shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-around px-2 py-2">
                    {/* Home — simple link, no tab-history override needed */}
                    <Link
                        to={createPageUrl('Dashboard')}
                        className={cn('flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all',
                            currentPageName === 'Dashboard' ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'
                        )}
                    >
                        <Home className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Home</span>
                    </Link>

                    {/* Search */}
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-muted-foreground hover:text-blue-400 transition-all"
                    >
                        <Search className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Suche</span>
                    </button>

                    {/* Scan — center CTA */}
                    <button
                        onClick={() => setScannerOpen(true)}
                        className="flex flex-col items-center gap-1 -mt-4 px-3 py-3 rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/40 text-slate-900 active:scale-95 transition-all"
                    >
                        <ScanLine className="w-7 h-7" />
                        <span className="text-[10px] font-bold">Scan</span>
                    </button>

                    {/* Inventory */}
                    <Link
                        to={createPageUrl('Articles')}
                        className={cn('flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all',
                            currentPageName === 'Articles' ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'
                        )}
                    >
                        <Package className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Lager</span>
                    </Link>

                    {/* More / Drawer */}
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className={cn('flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all',
                            getCurrentTab(currentPageName) === 'More' ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'
                        )}
                    >
                        <Menu className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Mehr</span>
                    </button>
                </div>

                {/* Mobile Menu Drawer */}
                <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <DrawerContent className="bg-card border-border max-h-[80vh]">
                        <DrawerHeader className="border-b border-border">
                            <DrawerTitle className="text-foreground">Menü</DrawerTitle>
                        </DrawerHeader>
                        <nav className="overflow-y-auto p-4">
                            {navigationSections.map((section) => {
                                const visibleItems = section.items.filter(item => permissions[item.permission]);
                                if (visibleItems.length === 0) return null;

                                const colors = [
                                    { bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-500/30' },
                                    { bg: 'bg-purple-600/20', text: 'text-purple-400', border: 'border-purple-500/30' },
                                    { bg: 'bg-pink-600/20', text: 'text-pink-400', border: 'border-pink-500/30' },
                                    { bg: 'bg-green-600/20', text: 'text-green-400', border: 'border-green-500/30' },
                                    { bg: 'bg-orange-600/20', text: 'text-orange-400', border: 'border-orange-500/30' },
                                    { bg: 'bg-cyan-600/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
                                    { bg: 'bg-red-600/20', text: 'text-red-400', border: 'border-red-500/30' },
                                    { bg: 'bg-yellow-600/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
                                    { bg: 'bg-indigo-600/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
                                ];

                                return (
                                    <div key={section.title} className="mb-6">
                                        <h3 className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                                            {section.title}
                                        </h3>
                                        <div className="grid grid-cols-3 gap-2">
                                            {visibleItems.map((item, idx) => {
                                                const isActive = currentPageName === item.page;
                                                const color = colors[idx % colors.length];
                                                const handleMobileNavClick = (e) => {
                                                    haptics.selection();
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
                                                            "flex flex-col items-center gap-2 p-3 rounded-xl text-xs font-medium transition-all text-center border",
                                                            isActive 
                                                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 shadow-lg shadow-amber-500/20 border-amber-500/50" 
                                                                : `${color.bg} ${color.text} hover:opacity-80 active:opacity-100 ${color.border}`
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
                            <div className="pt-2 border-t border-border">
                                <button
                                    onClick={() => {
                                        haptics.light();
                                        base44.auth.logout();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-secondary/50 hover:bg-secondary active:bg-secondary text-muted-foreground hover:text-foreground text-sm font-medium transition-all border border-border/50"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Abmelden
                                </button>
                            </div>
                        </nav>
                    </DrawerContent>
                </Drawer>
            </div>

            {/* Main Content */}
            <main className="md:pl-72 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
                <PullToRefresh onRefresh={handleRefresh}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentPageName}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="pt-[calc(4rem+env(safe-area-inset-top))] md:pt-0"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </PullToRefresh>
            </main>
            </div>
        </ErrorBoundary>
    );
}