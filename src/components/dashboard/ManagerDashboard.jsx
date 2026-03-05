import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    Calendar, Clock, CheckSquare, AlertCircle, ArrowRight, Users, ShoppingCart,
    Sparkles, Package, AlertTriangle, CalendarCheck, Umbrella, TrendingUp
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import HolidayCreditManager from '@/components/dashboard/HolidayCreditManager';
import TodayOverview from '@/components/dashboard/TodayOverview';
import ShiftSwapApprovalCard from '@/components/dashboard/ShiftSwapApprovalCard';

export default function ManagerDashboard({ onSwitchToEmployee, currentEmployee, clockEntry, hoursThisWeek, remainingVacationDays, myUpcomingShifts }) {
    const today = format(new Date(), 'yyyy-MM-dd');

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });
    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => base44.entities.Shift.list('-date', 100)
    });
    const { data: events = [] } = useQuery({
        queryKey: ['events'],
        queryFn: () => base44.entities.Event.list('-date', 30)
    });
    const { data: reservations = [] } = useQuery({
        queryKey: ['reservations'],
        queryFn: () => base44.entities.Reservation.list('-date', 30)
    });
    const { data: todos = [] } = useQuery({
        queryKey: ['todos'],
        queryFn: () => base44.entities.TodoItem.filter({ is_archived: false })
    });
    const { data: shoppingList = [] } = useQuery({
        queryKey: ['shopping-list'],
        queryFn: () => base44.entities.ShoppingList.list()
    });
    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list()
    });
    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time-entries'],
        queryFn: () => base44.entities.TimeEntry.list('-date', 100)
    });
    const { data: vacationRequests = [] } = useQuery({
        queryKey: ['vacation-requests'],
        queryFn: () => base44.entities.VacationRequest.list('-created_date', 50)
    });
    const { data: cleaningTasks = [] } = useQuery({
        queryKey: ['cleaning-tasks'],
        queryFn: () => base44.entities.CleaningTask.list()
    });

    const todayShifts = shifts.filter(s => s.date === today);
    const todayEvents = events.filter(e => e.date === today && e.status !== 'abgesagt');
    const todayReservations = reservations.filter(r => r.date === today && r.status !== 'storniert');
    const openTodos = todos.filter(t => t.status !== 'erledigt');
    const urgentTodos = openTodos.filter(t => t.priority === 'dringend' || t.priority === 'hoch');
    const openShoppingItems = shoppingList.filter(i => i.status === 'offen');
    const lowStockArticles = articles.filter(a => a.min_stock && a.current_stock <= a.min_stock);
    const pendingTimeEntries = timeEntries.filter(e => e.status === 'eingereicht');
    const pendingVacationRequests = vacationRequests.filter(r => r.status === 'beantragt');
    const cleaningProgress = cleaningTasks.length > 0
        ? Math.round((cleaningTasks.filter(t => t.is_completed).length / cleaningTasks.length) * 100)
        : 0;

    const stats = [
        { title: 'Aktive Mitarbeiter', value: employees.length, icon: Users, color: 'bg-blue-600', link: 'Employees' },
        { title: 'Schichten heute', value: todayShifts.length, icon: Calendar, color: 'bg-purple-600', link: 'Calendar' },
        { title: 'Reservierungen', value: todayReservations.length, icon: CalendarCheck, color: 'bg-green-600', link: 'Reservations' },
        { title: 'Offene Aufgaben', value: openTodos.length, icon: CheckSquare, color: 'bg-orange-600', link: 'Todos', badge: urgentTodos.length > 0 ? `${urgentTodos.length} dringend` : null }
    ];

    return (
        <div className="min-h-screen bg-background p-3 sm:p-8 pb-24 md:pb-0">
            <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
                <div className="flex items-center justify-between gap-2 flex-col sm:flex-row">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
                        <p className="text-muted-foreground text-sm mt-1">{format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onSwitchToEmployee} className="border-border text-muted-foreground hover:bg-accent">
                            <Users className="w-4 h-4 mr-2" />
                            Mitarbeiter-Ansicht
                        </Button>
                        <HolidayCreditManager />
                    </div>
                </div>

                {/* Persönlicher Bereich */}
                {currentEmployee && (
                    <>
                        <Card className="p-6 bg-card border-border shadow-xl">
                            <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
                                <Users className="w-5 h-5 text-amber-500" />
                                Mein Bereich
                            </h2>
                            <div className="grid sm:grid-cols-3 gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                                        <Clock className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold text-white">{hoursThisWeek?.toFixed(1)}h</p>
                                        <p className="text-sm text-slate-400">Diese Woche</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/20">
                                        <Umbrella className="w-8 h-8 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold text-white">{remainingVacationDays}</p>
                                        <p className="text-sm text-slate-400">Urlaubstage übrig</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center border border-green-500/20">
                                        <Calendar className="w-8 h-8 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold text-white">{myUpcomingShifts?.length}</p>
                                        <p className="text-sm text-slate-400">Kommende Schichten</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                        <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                    </>
                )}

                {/* Management Stats */}
                <div>
                    <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-amber-500" />
                        Management Übersicht
                    </h2>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat) => (
                        <Link to={createPageUrl(stat.link)} key={stat.title}>
                            <Card className="bg-card border-border hover:border-primary/30 transition-all group hover:shadow-xl">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`${stat.color} p-3 rounded-2xl shadow-lg`}>
                                            <stat.icon className="w-6 h-6 text-white" />
                                        </div>
                                        {stat.badge && <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs">{stat.badge}</Badge>}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">{stat.title}</p>
                                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Alerts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {pendingTimeEntries.length > 0 && (
                        <Link to={createPageUrl('TimeManagement')}>
                            <Card className="bg-amber-900/20 border-amber-800/30 hover:bg-amber-900/30 transition-colors">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-8 h-8 text-amber-400" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-foreground">Zeiterfassungen</p>
                                            <p className="text-xs text-amber-300">{pendingTimeEntries.length} zu genehmigen</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-amber-400" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )}
                    {pendingVacationRequests.length > 0 && (
                        <Link to={createPageUrl('MyArea')}>
                            <Card className="bg-blue-900/20 border-blue-800/30 hover:bg-blue-900/30 transition-colors">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-8 h-8 text-blue-400" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-foreground">Urlaubsanträge</p>
                                            <p className="text-xs text-blue-300">{pendingVacationRequests.length} ausstehend</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-blue-400" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )}
                    {lowStockArticles.length > 0 && (
                        <Link to={createPageUrl('Warehouse')}>
                            <Card className="bg-red-900/20 border-red-800/30 hover:bg-red-900/30 transition-colors">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="w-8 h-8 text-red-400" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-foreground">Lager niedrig</p>
                                            <p className="text-xs text-red-300">{lowStockArticles.length} Artikel</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-red-400" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )}
                </div>

                {/* Quick Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { page: 'Warehouse', color: 'bg-orange-600', icon: ShoppingCart, label: 'Einkauf', sub: `${openShoppingItems.length} offen` },
                        { page: 'Cleaning', color: 'bg-pink-600', icon: Sparkles, label: 'Putzen', sub: `${cleaningProgress}% erledigt` },
                        { page: 'Events', color: 'bg-indigo-600', icon: Calendar, label: 'Events', sub: `${todayEvents.length} heute` },
                        { page: 'Warehouse', color: 'bg-teal-600', icon: Package, label: 'Lager', sub: `${articles.length} Artikel` },
                    ].map(({ page, color, icon: Icon, label, sub }) => (
                        <Link key={label} to={createPageUrl(page)}>
                            <Card className="bg-card border-border hover:bg-accent/50 transition-colors">
                                <CardContent className="p-4 text-center">
                                    <div className={`w-12 h-12 rounded-lg ${color} mb-3 mx-auto flex items-center justify-center`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <p className="text-sm font-medium text-foreground mb-1">{label}</p>
                                    <p className="text-xs text-muted-foreground">{sub}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                <ShiftSwapApprovalCard />
                <TodayOverview shifts={todayShifts} events={todayEvents} reservations={todayReservations} employees={employees} maxItems={4} />
            </div>
        </div>
    );
}