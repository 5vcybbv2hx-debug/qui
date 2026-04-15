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
import { mainNavigation, additionalPages, allPages } from '@/components/navigation/navigationConfig';
import { useActiveNavigation } from '@/components/navigation/useActiveNavigation';
import { getTopPages } from '@/hooks/usePageTracking';
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
import BarAssistant from '@/components/assistant/BarAssistant';

export default function Layout({ children, currentPageName }) {
    // ── State ────────────────────────────────────────────────────────────────
    const [searchOpen, setSearchOpen] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [currentUser, setCurrentUser] = React.useState(null);
    const [mobileNavPages, setMobileNavPages] = React.useState([]);

    // ── Hooks (all hooks before any early returns) ────────────────────────────
    const { isPageActive } = useActiveNavigation();
    const permissions = usePermissions();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { track } = useAnalytics();

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleScan = (code) => {
        setScannerOpen(false);
        navigate(createPageUrl('Shopping') + `?scan=${code}`);
    };

    const handleRefresh = async () => {
        await queryClient.invalidateQueries();
    };

    // ── Effects ──────────────────────────────────────────────────────────────
    React.useEffect(() => {
        base44.auth.me().then(user => {
            setCurrentUser(user);
            if (user?.email) {
                // Build personalized nav from tracked pages
                const updateNav = () => {
                    const allNavPages = mainNavigation.flatMap(a => a.pages).concat(additionalPages);
                    const allowed = allNavPages.map(p => p.page);
                    const top = getTopPages(user.email, 4, allowed);
                    if (top.length >= 2) {
                        setMobileNavPages(top.map(t => allNavPages.find(p => p.page === t.page)).filter(Boolean));
                    }
                };
                updateNav();
            }
        }).catch(() => {});

        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    React.useEffect(() => { loadSavedColors(); }, []);

    // Theme sync (index.html script handles initial flash-prevention;
    // this effect handles runtime theme changes e.g. from Settings page)
    React.useEffect(() => {
        const applyTheme = () => {
            const t = localStorage.getItem('theme') || 'dark';
            const root = document.documentElement;
            if (t === 'light') {
                root.classList.remove('dark');
            } else if (t === 'dark') {
                root.classList.add('dark');
            } else {
                root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
            }
        };
        applyTheme();
        // Listen for storage events (theme changed in another tab)
        window.addEventListener('storage', applyTheme);
        return () => window.removeEventListener('storage', applyTheme);
    }, []);


    // Derived values
    const allPages = mainNavigation.flatMap(area => area.pages).concat(additionalPages);
    const getPageName = (pageName) => allPages.find(p => p.page === pageName)?.name || 'BarManager';
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
                        <button
                            onClick={() => setSettingsOpen(true)}
                            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-accent/50 active:bg-accent text-muted-foreground hover:text-foreground transition-all"
                            title="Einstellungen"
                        >
                            <Settings className="w-5 h-5" />
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
                                                const isActive = isPageActive(item.page);
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
                                            const isActive = isPageActive(item.page);
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

                {/* Mobile Bottom Navigation — personalisiert */}
                {(() => {
                    const allNavPages = mainNavigation.flatMap(a => a.pages).concat(additionalPages);
                    // Default pages fallback (Dashboard immer dabei)
                    const defaultPages = ['Dashboard', 'GuestHub', 'Todos', 'TeamCalendar'];
                    const navItems = mobileNavPages.length >= 2
                        ? mobileNavPages
                        : defaultPages.map(p => allNavPages.find(i => i.page === p)).filter(Boolean);

                    return (
                        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 border-t border-border/50 pb-safe shadow-2xl backdrop-blur-xl">
                            <div className="flex items-center justify-around px-1 pt-1 pb-1">
                                {navItems.map(item => (
                                    permissions[item.permission] && (
                                        <button
                                            key={item.page}
                                            onClick={() => { haptics.selection(); navigate(createPageUrl(item.page)); }}
                                            className={cn('flex flex-col items-center justify-center gap-0.5 py-2 flex-1 rounded-xl transition-all min-h-[56px]',
                                                isPageActive(item.page) ? 'text-foreground' : 'text-muted-foreground')}
                                        >
                                            <div className={cn('flex items-center justify-center w-8 h-8 rounded-xl transition-all', isPageActive(item.page) && 'bg-foreground/10')}>
                                                <item.icon className="w-5 h-5" />
                                            </div>
                                            <span className={cn('text-[10px] leading-tight font-medium', isPageActive(item.page) && 'font-bold')}>{item.name}</span>
                                        </button>
                                    )
                                ))}

                                {/* Mehr */}
                                <button
                                    onClick={() => { haptics.selection(); setSettingsOpen(true); }}
                                    className={cn('flex flex-col items-center justify-center gap-0.5 py-2 flex-1 rounded-xl transition-all min-h-[56px] text-muted-foreground')}
                                >
                                    <div className="flex items-center justify-center w-8 h-8 rounded-xl">
                                        <Settings className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] leading-tight font-medium">Mehr</span>
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* Mehr-Drawer — alle Bereiche geordnet */}
                <Drawer open={settingsOpen} onOpenChange={setSettingsOpen}>
                    <DrawerContent className="bg-card border-border max-h-[85vh]">
                        <DrawerHeader className="border-b border-border pb-3">
                            <DrawerTitle className="text-foreground text-base">Alle Bereiche</DrawerTitle>
                        </DrawerHeader>
                        <div className="overflow-y-auto">
                            {/* Alle Hauptbereiche */}
                            {mainNavigation.map((section) => {
                                const visibleItems = section.pages.filter(item => permissions[item.permission]);
                                if (visibleItems.length === 0) return null;
                                return (
                                    <div key={section.id} className="px-4 pt-4">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">{section.name}</p>
                                        <div className="grid grid-cols-3 gap-2 mb-2">
                                            {visibleItems.map((item) => (
                                                <Link
                                                    key={item.page}
                                                    to={createPageUrl(item.page)}
                                                    onClick={() => { haptics.selection(); setSettingsOpen(false); }}
                                                    className={cn(
                                                        'flex flex-col items-center gap-1.5 p-3 rounded-xl active:scale-95 transition-all text-center',
                                                        isPageActive(item.page)
                                                            ? 'bg-amber-500/20 border border-amber-500/40'
                                                            : 'bg-secondary/40 hover:bg-secondary'
                                                    )}
                                                >
                                                    <item.icon className={cn('w-5 h-5', isPageActive(item.page) ? 'text-amber-400' : 'text-foreground')} />
                                                    <span className={cn('text-[10px] font-medium leading-tight', isPageActive(item.page) ? 'text-amber-400 font-bold' : 'text-foreground')}>{item.name}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Zusätzliche Seiten */}
                            {additionalPages.some(p => permissions[p.permission]) && (
                                <div className="px-4 pt-4">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Einstellungen</p>
                                    <div className="grid grid-cols-3 gap-2 mb-2">
                                        {additionalPages.filter(p => permissions[p.permission]).map((item) => (
                                            <Link
                                                key={item.page}
                                                to={createPageUrl(item.page)}
                                                onClick={() => { haptics.selection(); setSettingsOpen(false); }}
                                                className={cn(
                                                    'flex flex-col items-center gap-1.5 p-3 rounded-xl active:scale-95 transition-all text-center',
                                                    isPageActive(item.page)
                                                        ? 'bg-amber-500/20 border border-amber-500/40'
                                                        : 'bg-secondary/40 hover:bg-secondary'
                                                )}
                                            >
                                                <item.icon className={cn('w-5 h-5', isPageActive(item.page) ? 'text-amber-400' : 'text-foreground')} />
                                                <span className={cn('text-[10px] font-medium leading-tight', isPageActive(item.page) ? 'text-amber-400 font-bold' : 'text-foreground')}>{item.name}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Abmelden */}
                            <div className="px-4 pt-3 pb-6 mt-2 border-t border-border">
                                <button
                                    onClick={() => { haptics.light(); base44.auth.logout(); setSettingsOpen(false); }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary/50 text-muted-foreground text-sm font-medium border border-border/50"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Abmelden
                                </button>
                            </div>
                        </div>
                    </DrawerContent>
                </Drawer>

                {/* KI-Assistent (nur Manager) */}
                <BarAssistant isManager={permissions.isManager} />

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