import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Calendar, Sparkles, CheckSquare, Users, Menu, X, CalendarCheck, Package, ShoppingCart, BookOpen, Clock, TrendingUp } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useState } from 'react';
import { usePermissions } from '@/components/auth/usePermissions';

const navigation = [
    { name: 'Dashboard', page: 'Dashboard', icon: Home, permission: 'canViewDashboard' },
    { name: 'Schichtplan', page: 'Shifts', icon: Calendar, permission: 'canViewShifts' },
    { name: 'Analyse', page: 'ShiftAnalytics', icon: Calendar, permission: 'canViewShifts' },
    { name: 'Zeiterfassung', page: 'TimeTracking', icon: Clock, permission: 'canViewDashboard' },
    { name: 'Reservierungen', page: 'Reservations', icon: CalendarCheck, permission: 'canViewReservations' },
    { name: 'Events', page: 'Events', icon: Calendar, permission: 'canViewDashboard' },
    { name: 'Rezepte', page: 'Recipes', icon: BookOpen, permission: 'canViewDashboard' },
    { name: 'Preiskalkulation', page: 'PriceCalculator', icon: TrendingUp, permission: 'canViewDashboard' },
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

    return (
        <div className="min-h-screen bg-slate-900">
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
                    <div className="p-4 border-t border-slate-800">
                        <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-800/30">
                            <p className="text-xs font-medium text-amber-500">Bar Management</p>
                            <p className="text-[10px] text-amber-600/70 mt-0.5">
                                {permissions.employeeRole || 'Alles im Griff'}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-950 border-b border-slate-800">
                <div className="flex items-center justify-between px-4 py-3">
                    <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                            <span className="text-white font-bold">B</span>
                        </div>
                        <span className="font-bold text-white">BarManager</span>
                    </Link>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="absolute top-full left-0 right-0 bg-slate-950 border-b border-slate-800 shadow-lg">
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
                                                : "text-slate-400 hover:bg-slate-800"
                                        )}
                                    >
                                        <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-500")} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <main className="md:pl-64 pt-14 md:pt-0">
                {children}
            </main>
        </div>
    );
}