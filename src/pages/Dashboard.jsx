import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, isToday, startOfWeek, endOfWeek, parseISO, addDays, isSameDay, startOfMonth, endOfMonth, differenceInMinutes, isFuture } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
    Calendar, Clock, CheckCircle2, AlertCircle, ArrowRight, Users, ShoppingCart, 
    Sparkles, CheckSquare, Package, AlertTriangle, CalendarCheck, LogIn, LogOut,
    Umbrella, FileText, TrendingUp, Wine, BookOpen, GraduationCap, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import HolidayCreditManager from '@/components/dashboard/HolidayCreditManager';
import { usePermissions } from '@/components/auth/usePermissions';
import FirstStepsTour from '@/components/onboarding/FirstStepsTour';

export default function Dashboard() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [showOnboardingTour, setShowOnboardingTour] = useState(false);
    const [viewAsEmployee, setViewAsEmployee] = useState(false);

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => base44.entities.Shift.list('-date', 100)
    });

    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time-entries'],
        queryFn: () => base44.entities.TimeEntry.list('-date', 100)
    });

    const { data: clockEntries = [] } = useQuery({
        queryKey: ['clock-entries'],
        queryFn: () => base44.entities.ClockEntry.list('-clock_in')
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

    const { data: cleaningTasks = [] } = useQuery({
        queryKey: ['cleaning-tasks'],
        queryFn: () => base44.entities.CleaningTask.list()
    });

    const { data: shoppingList = [] } = useQuery({
        queryKey: ['shopping-list'],
        queryFn: () => base44.entities.ShoppingList.list()
    });

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list()
    });

    const { data: vacationRequests = [] } = useQuery({
        queryKey: ['vacation-requests'],
        queryFn: () => base44.entities.VacationRequest.list('-created_date', 50)
    });

    const { data: shiftSwapRequests = [] } = useQuery({
        queryKey: ['shift-swap-requests'],
        queryFn: () => base44.entities.ShiftSwapRequest.list('-created_date', 50)
    });

    const clockInMutation = useMutation({
        mutationFn: async (employeeId) => {
            const employee = employees.find(e => e.id === employeeId);
            return base44.entities.ClockEntry.create({
                employee_id: employeeId,
                employee_name: employee.name,
                clock_in: new Date().toISOString(),
                status: 'clocked_in'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['clock-entries']);
        }
    });

    const clockOutMutation = useMutation({
        mutationFn: async (entryId) => {
            const entry = clockEntries.find(e => e.id === entryId);
            const clockOutTime = new Date();
            const totalMinutes = differenceInMinutes(clockOutTime, new Date(entry.clock_in));
            const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

            await base44.entities.ClockEntry.update(entryId, {
                clock_out: clockOutTime.toISOString(),
                break_minutes: 0,
                total_hours: totalHours,
                status: 'clocked_out'
            });

            await base44.entities.TimeEntry.create({
                employee_id: entry.employee_id,
                employee_name: entry.employee_name,
                date: format(new Date(entry.clock_in), 'yyyy-MM-dd'),
                start_time: format(new Date(entry.clock_in), 'HH:mm'),
                end_time: format(clockOutTime, 'HH:mm'),
                break_minutes: 0,
                total_hours: totalHours,
                notes: 'Automatisch von Stempeluhr übertragen',
                status: 'eingereicht'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['clock-entries']);
            queryClient.invalidateQueries(['time-entries']);
        }
    });

    const currentEmployee = employees.find(e => e.email === user?.email);
    
    const { data: onboardingItems = [] } = useQuery({
        queryKey: ['onboarding-items', currentEmployee?.id],
        queryFn: () => base44.entities.OnboardingChecklistItem.filter({ employee_id: currentEmployee.id }),
        enabled: !!currentEmployee?.id,
        initialData: []
    });

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    // Manager Dashboard Daten
    const pendingTimeEntries = timeEntries.filter(e => e.status === 'eingereicht');
    const pendingVacationRequests = vacationRequests.filter(r => r.status === 'beantragt');
    const pendingShiftSwaps = shiftSwapRequests.filter(r => r.status === 'ausstehend');
    const openTodos = todos.filter(t => t.status !== 'erledigt');
    const urgentTodos = openTodos.filter(t => t.priority === 'dringend' || t.priority === 'hoch');
    const openShoppingItems = shoppingList.filter(i => i.status === 'offen');
    const cleaningProgress = cleaningTasks.length > 0 
        ? Math.round((cleaningTasks.filter(t => t.is_completed).length / cleaningTasks.length) * 100)
        : 0;
    const lowStockArticles = articles.filter(a => a.min_stock && a.current_stock <= a.min_stock);
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayEvents = events.filter(e => e.date === today && e.status !== 'abgesagt');
    const todayReservations = reservations.filter(r => r.date === today && r.status !== 'storniert');
    const todayShifts = shifts.filter(s => s.date === today);

    // Mitarbeiter Dashboard Daten
    const myUpcomingShifts = currentEmployee ? shifts
        .filter(s => s.employee_id === currentEmployee.id)
        .filter(s => isFuture(parseISO(s.date)) || isToday(parseISO(s.date)))
        .sort((a, b) => parseISO(a.date) - parseISO(b.date))
        .slice(0, 5) : [];

    const weekEntries = currentEmployee ? timeEntries.filter(e => {
        if (e.employee_id !== currentEmployee.id) return false;
        const entryDate = parseISO(e.date);
        return entryDate >= weekStart && entryDate <= weekEnd;
    }) : [];
    const hoursThisWeek = weekEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

    const monthEntries = currentEmployee ? timeEntries.filter(e => {
        if (e.employee_id !== currentEmployee.id) return false;
        const entryDate = parseISO(e.date);
        return entryDate >= monthStart && entryDate <= monthEnd;
    }) : [];
    const hoursThisMonth = monthEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

    const approvedVacations = currentEmployee ? vacationRequests.filter(
        v => v.employee_id === currentEmployee.id && v.status === 'genehmigt' && v.type === 'Urlaub'
    ) : [];
    const usedVacationDays = approvedVacations.reduce((sum, v) => sum + (v.days_count || 0), 0);
    const totalVacationDays = currentEmployee?.vacation_days_per_year || 0;
    const remainingVacationDays = totalVacationDays - usedVacationDays;

    const activeClockEntry = currentEmployee ? clockEntries.find(
        e => e.employee_id === currentEmployee.id && e.status === 'clocked_in'
    ) : null;

    const myOpenTodos = currentEmployee ? todos.filter(
        t => (t.assigned_to === currentEmployee.email || t.assigned_to === currentEmployee.name) && t.status !== 'erledigt'
    ) : [];

    const myCleaningTasks = cleaningTasks.filter(t => !t.is_completed && t.is_active);

    const onboardingProgress = onboardingItems.length > 0 
        ? Math.round((onboardingItems.filter(i => i.is_completed).length / onboardingItems.length) * 100)
        : 100;
    
    // BiWeekly Cleaning Tasks für heute
    const dayOfWeek = new Date().getDay();
    const cycleStart = new Date(2025, 0, 6);
    const weeksDiff = Math.floor((new Date() - cycleStart) / (7 * 24 * 60 * 60 * 1000));
    const cycleWeek = weeksDiff % 2;
    
    const biweeklyPattern = (() => {
        if (dayOfWeek === 3) return cycleWeek === 0 ? 'mi_1' : 'mi_2';
        if (dayOfWeek === 4) return cycleWeek === 0 ? 'do_1' : 'do_2';
        return null;
    })();
    
    const biweeklyTasks = biweeklyPattern 
        ? cleaningTasks.filter(t => t.biweekly_pattern === biweeklyPattern && t.is_active)
        : [];
    
    const todayOpenShoppingItems = openShoppingItems.slice(0, 5);

    const getWorkingDuration = (clockIn) => {
        const now = new Date();
        const start = new Date(clockIn);
        const minutes = differenceInMinutes(now, start);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const getDayData = (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayShifts = shifts.filter(s => s.date === dateStr);
        const dayEvents = events.filter(e => e.date === dateStr && e.status !== 'abgesagt');
        const dayReservations = reservations.filter(r => r.date === dateStr && r.status !== 'storniert');
        return { dayShifts, dayEvents, dayReservations };
    };

    // Manager View
    if (permissions.isManager && !viewAsEmployee) {
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
                            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Dashboard</h1>
                            <p className="text-slate-400 text-sm mt-1">{format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewAsEmployee(true)}
                                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Mitarbeiter-Ansicht
                            </Button>
                            <HolidayCreditManager />
                        </div>
                    </div>

                    {/* Persönlicher Bereich für Manager */}
                    {currentEmployee && (
                        <>
                            <Card className="p-6 bg-slate-900/50 border-slate-800/50 backdrop-blur-xl shadow-xl">
                                <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-amber-500" />
                                    Mein Bereich
                                </h2>
                                <div className="grid sm:grid-cols-3 gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/10">
                                            <Clock className="w-8 h-8 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold text-white">{hoursThisWeek.toFixed(1)}h</p>
                                            <p className="text-sm text-slate-400">Diese Woche</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/20 shadow-lg shadow-purple-500/10">
                                            <Umbrella className="w-8 h-8 text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold text-white">{remainingVacationDays}</p>
                                            <p className="text-sm text-slate-400">Urlaubstage übrig</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/20 shadow-lg shadow-green-500/10">
                                            <Calendar className="w-8 h-8 text-green-400" />
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold text-white">{myUpcomingShifts.length}</p>
                                            <p className="text-sm text-slate-400">Kommende Schichten</p>
                                        </div>
                                    </div>
                                </div>
                                {activeClockEntry && (
                                    <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl backdrop-blur">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <LogIn className="w-5 h-5 text-green-400" />
                                                <div>
                                                    <p className="text-sm font-bold text-white">Eingestempelt</p>
                                                    <p className="text-xs text-green-400">
                                                        Seit {format(new Date(activeClockEntry.clock_in), 'HH:mm')} • {getWorkingDuration(activeClockEntry.clock_in)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Card>

                            <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                        </>
                    )}

                    {/* Management Übersicht */}
                    <div>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-amber-500" />
                            Management Übersicht
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {stats.map((stat) => (
                            <Link to={createPageUrl(stat.link)} key={stat.title}>
                                <Card className="bg-slate-900/50 border-slate-800/50 hover:border-amber-500/30 transition-all backdrop-blur-xl group hover:shadow-xl hover:shadow-amber-500/5">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`${stat.color} p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow`}>
                                                <stat.icon className="w-6 h-6 text-white" />
                                            </div>
                                            {stat.badge && <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs">{stat.badge}</Badge>}
                                        </div>
                                        <p className="text-sm text-slate-400 mb-2">{stat.title}</p>
                                        <p className="text-3xl font-bold text-white">{stat.value}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {pendingTimeEntries.length > 0 && (
                            <Link to={createPageUrl('TimeManagement')}>
                                <Card className="bg-amber-900/20 border-amber-800/30 hover:bg-amber-900/30 transition-colors">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-8 h-8 text-amber-400" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-white">Zeiterfassungen</p>
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
                                                <p className="text-sm font-medium text-white">Urlaubsanträge</p>
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
                                                <p className="text-sm font-medium text-white">Lager niedrig</p>
                                                <p className="text-xs text-red-300">{lowStockArticles.length} Artikel</p>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-red-400" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Link to={createPageUrl('Warehouse')}>
                            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
                                <CardContent className="p-4 text-center">
                                    <div className="w-12 h-12 rounded-lg bg-orange-600 mb-3 mx-auto flex items-center justify-center">
                                        <ShoppingCart className="w-6 h-6 text-white" />
                                    </div>
                                    <p className="text-sm font-medium text-white mb-1">Einkauf</p>
                                    <p className="text-xs text-slate-400">{openShoppingItems.length} offen</p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link to={createPageUrl('Cleaning')}>
                            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
                                <CardContent className="p-4 text-center">
                                    <div className="w-12 h-12 rounded-lg bg-pink-600 mb-3 mx-auto flex items-center justify-center">
                                        <Sparkles className="w-6 h-6 text-white" />
                                    </div>
                                    <p className="text-sm font-medium text-white mb-1">Putzen</p>
                                    <p className="text-xs text-slate-400">
                                        {biweeklyTasks.length > 0 
                                            ? `${biweeklyTasks.filter(t => !t.is_completed).length}/${biweeklyTasks.length} Spezial` 
                                            : `${cleaningProgress}% erledigt`
                                        }
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link to={createPageUrl('Events')}>
                            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
                                <CardContent className="p-4 text-center">
                                    <div className="w-12 h-12 rounded-lg bg-indigo-600 mb-3 mx-auto flex items-center justify-center">
                                        <Calendar className="w-6 h-6 text-white" />
                                    </div>
                                    <p className="text-sm font-medium text-white mb-1">Events</p>
                                    <p className="text-xs text-slate-400">{todayEvents.length} heute</p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link to={createPageUrl('Warehouse')}>
                            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
                                <CardContent className="p-4 text-center">
                                    <div className="w-12 h-12 rounded-lg bg-teal-600 mb-3 mx-auto flex items-center justify-center">
                                        <Package className="w-6 h-6 text-white" />
                                    </div>
                                    <p className="text-sm font-medium text-white mb-1">Lager</p>
                                    <p className="text-xs text-slate-400">{articles.length} Artikel</p>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>

                    {(todayShifts.length > 0 || todayEvents.length > 0 || todayReservations.length > 0) && (
                        <Card className="p-6 bg-slate-800 border-slate-700">
                            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-green-500" />
                                Heute • {format(new Date(), 'EEEE, d. MMMM', { locale: de })}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-slate-400 mb-2">SCHICHTEN ({todayShifts.length})</p>
                                    <div className="space-y-2">
                                        {todayShifts.slice(0, 4).map(shift => (
                                            <div key={shift.id} className="flex items-center gap-2 text-sm">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: shift.color || '#64748b' }} />
                                                <span className="text-slate-300 truncate">{shift.employee_name}</span>
                                                <span className="text-slate-500 text-xs ml-auto">{shift.start_time?.substring(0, 5)}</span>
                                            </div>
                                        ))}
                                        {todayShifts.length === 0 && <p className="text-sm text-slate-600 italic">Keine Schichten</p>}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400 mb-2">EVENTS ({todayEvents.length})</p>
                                    <div className="space-y-2">
                                        {todayEvents.map(event => (
                                            <div key={event.id} className="flex items-start gap-2 text-sm">
                                                <AlertCircle className="w-4 h-4 text-pink-500 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="text-slate-300 font-medium truncate">{event.title}</p>
                                                    {event.expected_guests && <p className="text-xs text-slate-500">{event.expected_guests} Gäste</p>}
                                                </div>
                                            </div>
                                        ))}
                                        {todayEvents.length === 0 && <p className="text-sm text-slate-600 italic">Keine Events</p>}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400 mb-2">RESERVIERUNGEN ({todayReservations.length})</p>
                                    <div className="space-y-2">
                                        {todayReservations.slice(0, 4).map(res => (
                                            <div key={res.id} className="flex items-start gap-2 text-sm">
                                                <CalendarCheck className="w-4 h-4 text-blue-500 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="text-slate-300 truncate">{res.customer_name}</p>
                                                    <p className="text-xs text-slate-500">{res.time} • {res.guests} Gäste</p>
                                                </div>
                                            </div>
                                        ))}
                                        {todayReservations.length === 0 && <p className="text-sm text-slate-600 italic">Keine Reservierungen</p>}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        );
    }

    // Employee View
    if (!currentEmployee) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center bg-slate-800 border-slate-700">
                    <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Kein Profil</h2>
                    <p className="text-slate-400">Du musst als Mitarbeiter registriert sein.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-3 sm:p-8 pb-24 md:pb-0">
            <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-lg sm:text-2xl font-bold text-white">Willkommen, {currentEmployee.name}!</h1>
                        <p className="text-slate-400 text-sm">{format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}</p>
                    </div>
                    {permissions.isManager && viewAsEmployee && (
                        <Button
                            size="sm"
                            onClick={() => setViewAsEmployee(false)}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-900"
                        >
                            Manager-Ansicht
                        </Button>
                    )}
                    {onboardingProgress < 100 && (
                        <Button
                            onClick={() => setShowOnboardingTour(true)}
                            size="sm"
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 gap-2"
                        >
                            <GraduationCap className="w-4 h-4" />
                            Erste Schritte
                        </Button>
                    )}
                </div>

                {/* Onboarding Progress */}
                {onboardingProgress < 100 && (
                    <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                <GraduationCap className="w-6 h-6 text-slate-900" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-white">Einarbeitung läuft</p>
                                <p className="text-sm text-amber-300">{onboardingProgress}% abgeschlossen</p>
                            </div>
                            <Button
                                onClick={() => setShowOnboardingTour(true)}
                                variant="outline"
                                size="sm"
                                className="border-amber-500 text-amber-400 hover:bg-amber-500/10"
                            >
                                Fortsetzen
                            </Button>
                        </div>
                    </Card>
                )}

                <Card className="p-6 bg-slate-800 border-slate-700">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl"
                                 style={{ backgroundColor: currentEmployee.color || '#64748b' }}>
                                {currentEmployee.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                {activeClockEntry ? (
                                    <>
                                        <p className="text-white font-semibold">Eingestempelt</p>
                                        <p className="text-green-400 text-sm">
                                            Seit {format(new Date(activeClockEntry.clock_in), 'HH:mm')} • {getWorkingDuration(activeClockEntry.clock_in)}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-white font-semibold">Nicht eingestempelt</p>
                                        <p className="text-slate-400 text-sm">Bereit zum Einstempeln</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {activeClockEntry ? (
                            <Button
                                onClick={() => clockOutMutation.mutate(activeClockEntry.id)}
                                disabled={clockOutMutation.isPending}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Ausstempeln
                            </Button>
                        ) : (
                            <Button
                                onClick={() => clockInMutation.mutate(currentEmployee.id)}
                                disabled={clockInMutation.isPending}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                            >
                                <LogIn className="w-4 h-4" />
                                Einstempeln
                            </Button>
                        )}
                        <Link to={createPageUrl('TerminalClock')} className="flex-1">
                            <Button variant="outline" className="w-full border-slate-600 text-slate-300">
                                Details
                            </Button>
                        </Link>
                    </div>
                </Card>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link to={createPageUrl('Calendar')}>
                        <Card className="p-4 bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                    <Calendar className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Kalender</p>
                                    <p className="font-semibold text-white">Schichten</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Recipes')}>
                        <Card className="p-4 bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-pink-600/20 flex items-center justify-center">
                                    <Wine className="w-6 h-6 text-pink-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Rezepte</p>
                                    <p className="font-semibold text-white">Nachschlagen</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Cleaning')}>
                        <Card className="p-4 bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-teal-600/20 flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-teal-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Putzen</p>
                                    <p className="font-semibold text-white">
                                        {myCleaningTasks.length} offen
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('DrinkMenu')}>
                        <Card className="p-4 bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-amber-600/20 flex items-center justify-center">
                                    <BookOpen className="w-6 h-6 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Getränke</p>
                                    <p className="font-semibold text-white">Karte</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                </div>

                <div className="grid sm:grid-cols-3 gap-6">
                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-blue-500" />
                            </div>
                            <Badge className="bg-blue-600/20 text-blue-400">Woche</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{hoursThisWeek.toFixed(1)}h</p>
                        <p className="text-sm text-slate-400">Gearbeitete Stunden</p>
                        <p className="text-xs text-slate-500 mt-2">Monat: {hoursThisMonth.toFixed(1)}h</p>
                    </Card>

                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                                <Umbrella className="w-6 h-6 text-purple-500" />
                            </div>
                            <Badge className="bg-purple-600/20 text-purple-400">Urlaub</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{remainingVacationDays}</p>
                        <p className="text-sm text-slate-400">Verbleibende Tage</p>
                        <p className="text-xs text-slate-500 mt-2">Von {totalVacationDays} gesamt</p>
                    </Card>

                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-green-500" />
                            </div>
                            <Badge className="bg-green-600/20 text-green-400">Nächste</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{myUpcomingShifts.length}</p>
                        <p className="text-sm text-slate-400">Kommende Schichten</p>
                        {myUpcomingShifts[0] && (
                            <p className="text-xs text-slate-500 mt-2">
                                Nächste: {format(parseISO(myUpcomingShifts[0].date), 'EEE, dd.MM', { locale: de })}
                            </p>
                        )}
                    </Card>
                </div>

                {biweeklyTasks.length > 0 && (
                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-pink-500" />
                            Spezielle Putzaufgaben heute
                        </h3>
                        <div className="space-y-2">
                            {biweeklyTasks.map(task => (
                                <Link key={task.id} to={createPageUrl('Cleaning')}>
                                    <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={task.is_completed}
                                            onChange={() => {}}
                                            className="w-4 h-4 rounded"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium text-sm truncate">{task.title}</p>
                                            <p className="text-xs text-slate-400">{task.area}</p>
                                        </div>
                                        {task.is_completed && (
                                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </Card>
                )}

                {(todayEvents.length > 0 || todayReservations.length > 0 || todayShifts.length > 0) && (
                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-green-500" />
                            Heute • {format(new Date(), 'EEEE, d. MMMM', { locale: de })}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs text-slate-400 mb-2 uppercase">Schichten ({todayShifts.length})</p>
                                <div className="space-y-2">
                                    {todayShifts.slice(0, 3).map(shift => (
                                        <div key={shift.id} className="flex items-center gap-2 text-sm">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: shift.color || '#64748b' }} />
                                            <span className="text-slate-300 truncate">{shift.employee_name}</span>
                                            <span className="text-slate-500 text-xs ml-auto">{shift.start_time?.substring(0, 5)}</span>
                                        </div>
                                    ))}
                                    {todayShifts.length === 0 && <p className="text-sm text-slate-500 italic">Keine Schichten</p>}
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-slate-400 mb-2 uppercase">Events ({todayEvents.length})</p>
                                <div className="space-y-2">
                                    {todayEvents.map(event => (
                                        <div key={event.id} className="text-sm">
                                            <p className="text-slate-300 font-medium truncate">{event.title}</p>
                                            {event.expected_guests && <p className="text-xs text-slate-500">{event.expected_guests} Gäste</p>}
                                        </div>
                                    ))}
                                    {todayEvents.length === 0 && <p className="text-sm text-slate-500 italic">Keine Events</p>}
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-slate-400 mb-2 uppercase">Reservierungen ({todayReservations.length})</p>
                                <div className="space-y-2">
                                    {todayReservations.slice(0, 3).map(res => (
                                        <div key={res.id} className="text-sm">
                                            <p className="text-slate-300 truncate">{res.customer_name}</p>
                                            <p className="text-xs text-slate-500">{res.time} • {res.guests} Gäste</p>
                                        </div>
                                    ))}
                                    {todayReservations.length === 0 && <p className="text-sm text-slate-500 italic">Keine Reservierungen</p>}
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-500" />
                                Kommende Schichten
                            </h2>
                            <Link to={createPageUrl('Calendar')}>
                                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">Alle</Button>
                            </Link>
                        </div>

                        {myUpcomingShifts.length === 0 ? (
                            <Card className="p-8 text-center bg-slate-800 border-slate-700">
                                <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400">Keine kommenden Schichten</p>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {myUpcomingShifts.slice(0, 3).map(shift => (
                                    <Card key={shift.id} className="p-4 bg-slate-800 border-slate-700">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-white">{format(parseISO(shift.date), 'dd')}</p>
                                                    <p className="text-xs text-slate-400 uppercase">{format(parseISO(shift.date), 'MMM', { locale: de })}</p>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-white">{format(parseISO(shift.date), 'EEEE', { locale: de })}</p>
                                                    <p className="text-sm text-slate-400">{shift.start_time} - {shift.end_time}</p>
                                                    {shift.notes && <p className="text-xs text-slate-500 mt-1">{shift.notes}</p>}
                                                </div>
                                            </div>
                                            <Badge className="bg-amber-600/20 text-amber-400">{shift.shift_type || 'Schicht'}</Badge>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <CheckSquare className="w-5 h-5 text-orange-500" />
                                Meine Aufgaben
                            </h2>
                            <Link to={createPageUrl('Todos')}>
                                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">Alle</Button>
                            </Link>
                        </div>

                        {myOpenTodos.length === 0 ? (
                            <Card className="p-8 text-center bg-slate-800 border-slate-700">
                                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                                <p className="text-slate-400">Keine offenen Aufgaben</p>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {myOpenTodos.slice(0, 3).map(todo => (
                                    <Card key={todo.id} className="p-4 bg-slate-800 border-slate-700">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <p className="font-semibold text-white">{todo.title}</p>
                                                {todo.description && (
                                                    <p className="text-sm text-slate-400 mt-1 line-clamp-1">{todo.description}</p>
                                                )}
                                                {todo.due_date && (
                                                    <p className="text-xs text-slate-500 mt-2">
                                                        Fällig: {format(parseISO(todo.due_date), 'dd.MM.yyyy', { locale: de })}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge className={
                                                todo.priority === 'dringend' ? 'bg-red-600/20 text-red-400' :
                                                todo.priority === 'hoch' ? 'bg-orange-600/20 text-orange-400' :
                                                'bg-slate-600/20 text-slate-400'
                                            }>
                                                {todo.priority}
                                            </Badge>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Schnellaktionen */}
                <Card className="p-4 bg-slate-800 border-slate-700">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Schnellaktionen</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Link to={createPageUrl('Todos')}>
                            <button className="w-full flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors">
                                <CheckSquare className="w-5 h-5 text-orange-500" />
                                <span className="text-xs font-medium text-slate-300">Neue Aufgabe</span>
                            </button>
                        </Link>
                        <Link to={createPageUrl('Cleaning')}>
                            <button className="w-full flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors">
                                <Sparkles className="w-5 h-5 text-teal-500" />
                                <span className="text-xs font-medium text-slate-300">Putzen</span>
                            </button>
                        </Link>
                        <Link to={createPageUrl('Recipes')}>
                            <button className="w-full flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors">
                                <BookOpen className="w-5 h-5 text-pink-500" />
                                <span className="text-xs font-medium text-slate-300">Rezept suchen</span>
                            </button>
                        </Link>
                        <Link to={createPageUrl('Calendar')}>
                            <button className="w-full flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors">
                                <Calendar className="w-5 h-5 text-blue-500" />
                                <span className="text-xs font-medium text-slate-300">Schichtplan</span>
                            </button>
                        </Link>
                    </div>
                </Card>
            </div>

            {/* First Steps Tour Modal */}
            {showOnboardingTour && currentEmployee && (
                <FirstStepsTour
                    employee={currentEmployee}
                    open={showOnboardingTour}
                    onClose={() => setShowOnboardingTour(false)}
                />
            )}
        </div>
    );
}