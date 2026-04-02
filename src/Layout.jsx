import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useQueryClient } from '@tanstack/react-query';
import { haptics } from '@/components/utils/haptics';
import { ArrowLeft, LogOut, Search, ScanLine, Settings } from 'lucide-react';
import BarcodeScanner from '@/components/restock/BarcodeScanner';
import { mainNavigation, additionalPages } from '@/components/navigation/navigationConfig';
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

export default function Layout({ children, currentPageName }) {
    const [searchOpen, setSearchOpen] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');

    const handleScan = (code) => {
        setScannerOpen(false);
        navigate(createPageUrl('Shopping') + `?scan=${code}`);
    };

    const permissions = usePermissions();
    const [currentUser, setCurrentUser] = React.useState(null);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { track } = useAnalytics();

    // Alle Seiten für Lookup
    const allPages = mainNavigation.flatMap(area => area.pages).concat(additionalPages);
    const getPageName = (pageName) => allPages.find(p => p.page === pageName)?.name || 'BarManager';

    React.useEffect(() => {
        base44.auth.me().then(setCurrentUser).catch(() => {});

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

    // Update active tab wenn Seite sich ändert
    React.useEffect(() => {
        const area = mainNavigation.find(a => a.pages.some(p => p.page === currentPageName));
        if (area) setActiveTab(area.id);
    }, [currentPageName]);

    const handleRefresh = async () => {
        await queryClient.invalidateQueries();
    };

    // Bestimme ob es eine Root-Page ist
    const primaryPages = mainNavigation.flatMap(a => a.pages).map(p => p.page);
    const isRootPage = primaryPages.includes(currentPageName);

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
                            {getPageName(currentPageName)}
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
                        <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3 px-6 mb-8 group">
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

                        {/* Navigation Sections */}
                        <nav className="flex-1 px-4 space-y-6 overflow-y-auto">
                            {mainNavigation.map((section) => {
                                const visibleItems = section.pages.filter(item => permissions[item.permission]);
                                if (visibleItems.length === 0) return null;

                                return (
                                    <div key={section.id}>
                                        <h3 className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                                            {section.name}
                                        </h3>
                                        <div className="space-y-1">
                                            {visibleItems.map((item) => {
                                                const isActive = currentPageName === item.page;
                                                return (
                                                    <Link
                                                        key={item.name}
                                                        to={createPageUrl(item.page)}
                                                        className={cn(
                                                            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                                                            isActive 
                                                                ? "shadow-lg" 
                                                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                                        )}
                                                        style={isActive ? {
                                                            background: 'linear-gradient(to right, var(--brand-from), var(--brand-via))',
                                                            color: 'var(--brand-fg)'
                                                        } : {}}
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
                            
                            {/* Additional Pages */}
                            {additionalPages.some(p => permissions[p.permission]) && (
                                <div>
                                    <h3 className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                                        Weitere
                                    </h3>
                                    <div className="space-y-1">
                                        {additionalPages.map((item) => {
                                            if (!permissions[item.permission]) return null;
                                            const isActive = currentPageName === item.page;
                                            return (
                                                <Link
                                                    key={item.name}
                                                    to={createPageUrl(item.page)}
                                                    className={cn(
                                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                                                        isActive 
                                                            ? "shadow-lg" 
                                                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                                    )}
                                                    style={isActive ? {
                                                        background: 'linear-gradient(to right, var(--brand-from), var(--brand-via))',
                                                        color: 'var(--brand-fg)'
                                                    } : {}}
                                                >
                                                    <item.icon className="w-5 h-5" />
                                                    {item.name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
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

                {/* Mobile Bottom Navigation — 5 Hauptbereiche */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 border-t border-border/50 pb-safe shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between px-1 py-2 gap-1">
                        {mainNavigation.map((area) => {
                            const visiblePages = area.pages.filter(p => permissions[p.permission]);
                            if (visiblePages.length === 0) return null;

                            const isActive = activeTab === area.id;
                            const AreaIcon = area.icon;
                            return (
                                <button
                                    key={area.id}
                                    onClick={() => {
                                        setActiveTab(area.id);
                                        const firstPage = visiblePages[0]?.page;
                                        if (firstPage) navigate(createPageUrl(firstPage));
                                    }}
                                    className={cn(
                                        'flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg flex-1 transition-all text-[10px] font-medium',
                                        isActive
                                            ? 'shadow-md'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                    style={isActive ? {
                                        background: `linear-gradient(135deg, ${area.color})`,
                                        color: 'var(--brand-fg)'
                                    } : {}}
                                >
                                    <AreaIcon className="w-5 h-5" />
                                    <span className="leading-tight text-center">{area.name}</span>
                                </button>
                            );
                        })}
                        {/* Settings Button */}
                        <button
                            onClick={() => setSettingsOpen(true)}
                            className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground transition-all"
                        >
                            <Settings className="w-5 h-5" />
                            <span className="leading-tight text-center">Mehr</span>
                        </button>
                    </div>
                </div>

                {/* Settings Drawer */}
                <Drawer open={settingsOpen} onOpenChange={setSettingsOpen}>
                    <DrawerContent className="bg-card border-border">
                        <DrawerHeader className="border-b border-border">
                            <DrawerTitle className="text-foreground">Weitere Optionen</DrawerTitle>
                        </DrawerHeader>
                        <nav className="overflow-y-auto p-4 space-y-1">
                            {additionalPages.map((page) => {
                                if (!permissions[page.permission]) return null;

                                return (
                                    <Link
                                        key={page.name}
                                        to={createPageUrl(page.page)}
                                        onClick={() => setSettingsOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-accent/50 transition-all"
                                    >
                                        <page.icon className="w-5 h-5" />
                                        {page.name}
                                    </Link>
                                );
                            })}
                            <div className="pt-2 mt-2 border-t border-border">
                                <button
                                    onClick={() => {
                                        haptics.light();
                                        base44.auth.logout();
                                        setSettingsOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-secondary/50 hover:bg-secondary active:bg-secondary text-muted-foreground hover:text-foreground text-sm font-medium transition-all border border-border/50"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Abmelden
                                </button>
                            </div>
                        </nav>
                    </DrawerContent>
                </Drawer>

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