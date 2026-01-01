import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Calendar, Sparkles, CheckSquare, Users, Menu, X, CalendarCheck, Package, ShoppingCart, BookOpen } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useState } from 'react';
import { usePermissions } from '@/components/auth/usePermissions';

const navigation = [
    { name: 'Dashboard', page: 'Dashboard', icon: Home, permission: 'canViewDashboard' },
    { name: 'Schichtplan', page: 'Shifts', icon: Calendar, permission: 'canViewShifts' },
    { name: 'Reservierungen', page: 'Reservations', icon: CalendarCheck, permission: 'canViewReservations' },
    { name: 'Rezepte', page: 'Recipes', icon: BookOpen, permission: 'canViewDashboard' },
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
        <div className="min-h-screen bg-slate-50">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
                <div className="flex flex-col flex-grow bg-white border-r border-slate-200 pt-5 overflow-y-auto">
                    {/* Logo */}
                    <div className="flex items-center gap-3 px-6 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">B</span>
                        </div>
                        <span className="text-xl font-bold text-slate-800 tracking-tight">BarManager</span>
                    </div>

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
                                            ? "bg-slate-800 text-white shadow-lg shadow-slate-800/20" 
                                            : "text-slate-600 hover:bg-slate-100"
                                    )}
                                >
                                    <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100">
                        <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50">
                            <p className="text-xs font-medium text-amber-700">Bar Management</p>
                            <p className="text-[10px] text-amber-600/70 mt-0.5">
                                {permissions.employeeRole || 'Alles im Griff'}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                            <span className="text-white font-bold">B</span>
                        </div>
                        <span className="font-bold text-slate-800">BarManager</span>
                    </div>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 rounded-lg hover:bg-slate-100"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg">
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
                                                ? "bg-slate-800 text-white" 
                                                : "text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
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