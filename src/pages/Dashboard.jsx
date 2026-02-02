import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, isToday, startOfWeek, endOfWeek, parseISO, addDays, isSameDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
    Calendar, Clock, CheckCircle2, AlertCircle, ArrowRight, Users, 
    ShoppingCart, Sparkles, CheckSquare, DollarSign, TrendingUp,
    CalendarCheck, Package, XCircle, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BackupManager from '@/components/backup/BackupManager';
import HolidayCreditManager from '@/components/dashboard/HolidayCreditManager';

export default function Dashboard() {
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time-entries'],
        queryFn: () => base44.entities.TimeEntry.list('-date', 100)
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

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    // Zeiterfassungen die genehmigt werden müssen
    const pendingTimeEntries = timeEntries.filter(e => e.status === 'eingereicht');

    // Urlaubsanträge
    const pendingVacationRequests = vacationRequests.filter(r => r.status === 'beantragt');

    // Schichttausch-Anfragen
    const pendingShiftSwaps = shiftSwapRequests.filter(r => r.status === 'ausstehend');

    // Todos
    const openTodos = todos.filter(t => t.status !== 'erledigt');
    const urgentTodos = openTodos.filter(t => t.priority === 'dringend' || t.priority === 'hoch');

    // Einkaufsliste
    const openShoppingItems = shoppingList.filter(i => i.status === 'offen');

    // Putzaufgaben
    const cleaningProgress = cleaningTasks.length > 0 
        ? Math.round((cleaningTasks.filter(t => t.is_completed).length / cleaningTasks.length) * 100)
        : 0;

    // Lagerbestand
    const lowStockArticles = articles.filter(a => 
        a.min_stock && a.current_stock <= a.min_stock
    );

    // Events & Reservierungen heute
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayEvents = events.filter(e => e.date === today && e.status !== 'abgesagt');
    const todayReservations = reservations.filter(r => r.date === today && r.status !== 'storniert');

    // Schichten heute
    const todayShifts = shifts.filter(s => s.date === today);

    // Wochentage für Übersicht
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // Daten pro Tag
    const getDayData = (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayShifts = shifts.filter(s => s.date === dateStr);
        const dayEvents = events.filter(e => e.date === dateStr && e.status !== 'abgesagt');
        const dayReservations = reservations.filter(r => r.date === dateStr && r.status !== 'storniert');
        
        return { dayShifts, dayEvents, dayReservations };
    };

    const stats = [
        {
            title: 'Aktive Mitarbeiter',
            value: employees.length,
            icon: Users,
            color: 'bg-blue-600',
            link: 'Employees'
        },
        {
            title: 'Schichten heute',
            value: todayShifts.length,
            icon: Calendar,
            color: 'bg-purple-600',
            link: 'Shifts'
        },
        {
            title: 'Reservierungen heute',
            value: todayReservations.length,
            icon: CalendarCheck,
            color: 'bg-green-600',
            link: 'Reservations'
        },
        {
            title: 'Offene Aufgaben',
            value: openTodos.length,
            icon: CheckSquare,
            color: 'bg-orange-600',
            link: 'Todos',
            badge: urgentTodos.length > 0 ? `${urgentTodos.length} dringend` : null
        }
    ];

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                            Manager Dashboard
                        </h1>
                        <p className="text-slate-400 text-xs sm:text-sm">
                            {format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <HolidayCreditManager />
                        <BackupManager />
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    {stats.map((stat) => (
                        <Link to={createPageUrl(stat.link)} key={stat.title}>
                            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors cursor-pointer">
                                <CardContent className="p-4 sm:p-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={`${stat.color} p-2 rounded-lg`}>
                                            <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                        </div>
                                        {stat.badge && (
                                            <Badge className="bg-red-600 text-white text-xs">{stat.badge}</Badge>
                                        )}
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-400 mb-1">{stat.title}</p>
                                    <p className="text-xl sm:text-2xl font-bold text-white">{stat.value}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Alerts Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    {/* Zeiterfassung */}
                    {pendingTimeEntries.length > 0 && (
                        <Link to={createPageUrl('TimeTracking')}>
                            <Card className="bg-amber-900/20 border-amber-800/30 hover:bg-amber-900/30 transition-colors cursor-pointer">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-8 h-8 text-amber-400" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">Zeiterfassungen</p>
                                            <p className="text-xs text-amber-300">{pendingTimeEntries.length} zu genehmigen</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-amber-400 shrink-0" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    {/* Urlaubsanträge */}
                    {pendingVacationRequests.length > 0 && (
                        <Link to={createPageUrl('Vacation')}>
                            <Card className="bg-blue-900/20 border-blue-800/30 hover:bg-blue-900/30 transition-colors cursor-pointer">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-8 h-8 text-blue-400" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">Urlaubsanträge</p>
                                            <p className="text-xs text-blue-300">{pendingVacationRequests.length} ausstehend</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-blue-400 shrink-0" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    {/* Schichttausch */}
                    {pendingShiftSwaps.length > 0 && (
                        <Link to={createPageUrl('Shifts')}>
                            <Card className="bg-purple-900/20 border-purple-800/30 hover:bg-purple-900/30 transition-colors cursor-pointer">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <Users className="w-8 h-8 text-purple-400" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">Schichttausch</p>
                                            <p className="text-xs text-purple-300">{pendingShiftSwaps.length} Anfragen</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-purple-400 shrink-0" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    {/* Niedriger Lagerbestand */}
                    {lowStockArticles.length > 0 && (
                        <Link to={createPageUrl('Articles')}>
                            <Card className="bg-red-900/20 border-red-800/30 hover:bg-red-900/30 transition-colors cursor-pointer">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="w-8 h-8 text-red-400" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">Lagerbestand niedrig</p>
                                            <p className="text-xs text-red-300">{lowStockArticles.length} Artikel</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-red-400 shrink-0" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <Link to={createPageUrl('Shopping')}>
                        <Card className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
                            <CardContent className="p-4 text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-orange-600 mb-3">
                                    <ShoppingCart className="w-6 h-6 text-white" />
                                </div>
                                <p className="text-sm font-medium text-white mb-1">Einkaufsliste</p>
                                <p className="text-xs text-slate-400">{openShoppingItems.length} offen</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Cleaning')}>
                        <Card className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
                            <CardContent className="p-4 text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-pink-600 mb-3">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <p className="text-sm font-medium text-white mb-1">Putzliste</p>
                                <p className="text-xs text-slate-400">{cleaningProgress}% erledigt</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Events')}>
                        <Card className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
                            <CardContent className="p-4 text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-600 mb-3">
                                    <Calendar className="w-6 h-6 text-white" />
                                </div>
                                <p className="text-sm font-medium text-white mb-1">Events</p>
                                <p className="text-xs text-slate-400">{todayEvents.length} heute</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Articles')}>
                        <Card className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
                            <CardContent className="p-4 text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-teal-600 mb-3">
                                    <Package className="w-6 h-6 text-white" />
                                </div>
                                <p className="text-sm font-medium text-white mb-1">Lager</p>
                                <p className="text-xs text-slate-400">{articles.length} Artikel</p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Heute Übersicht */}
                {(todayShifts.length > 0 || todayEvents.length > 0 || todayReservations.length > 0) && (
                    <Card className="p-4 sm:p-6 bg-slate-800 border-slate-700 mb-4 sm:mb-6">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-green-500" />
                            Heute • {format(new Date(), 'EEEE, d. MMMM', { locale: de })}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Schichten */}
                            <div>
                                <p className="text-xs text-slate-400 mb-2">SCHICHTEN ({todayShifts.length})</p>
                                <div className="space-y-2">
                                    {todayShifts.slice(0, 4).map(shift => (
                                        <div key={shift.id} className="flex items-center gap-2 text-sm">
                                            <div 
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: shift.color || '#64748b' }}
                                            />
                                            <span className="text-slate-300 truncate">{shift.employee_name}</span>
                                            <span className="text-slate-500 text-xs ml-auto shrink-0">
                                                {shift.start_time?.substring(0, 5)}
                                            </span>
                                        </div>
                                    ))}
                                    {todayShifts.length > 4 && (
                                        <p className="text-xs text-slate-500 ml-4">+{todayShifts.length - 4} weitere</p>
                                    )}
                                    {todayShifts.length === 0 && (
                                        <p className="text-sm text-slate-600 italic">Keine Schichten</p>
                                    )}
                                </div>
                            </div>

                            {/* Events */}
                            <div>
                                <p className="text-xs text-slate-400 mb-2">EVENTS ({todayEvents.length})</p>
                                <div className="space-y-2">
                                    {todayEvents.map(event => (
                                        <div key={event.id} className="flex items-start gap-2 text-sm">
                                            <AlertCircle className="w-4 h-4 text-pink-500 mt-0.5 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-slate-300 font-medium truncate">{event.title}</p>
                                                {event.expected_guests && (
                                                    <p className="text-xs text-slate-500">{event.expected_guests} Gäste</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {todayEvents.length === 0 && (
                                        <p className="text-sm text-slate-600 italic">Keine Events</p>
                                    )}
                                </div>
                            </div>

                            {/* Reservierungen */}
                            <div>
                                <p className="text-xs text-slate-400 mb-2">RESERVIERUNGEN ({todayReservations.length})</p>
                                <div className="space-y-2">
                                    {todayReservations.slice(0, 4).map(res => (
                                        <div key={res.id} className="flex items-start gap-2 text-sm">
                                            <CalendarCheck className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-slate-300 truncate">{res.customer_name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {res.time} • {res.guests} Gäste
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {todayReservations.length > 4 && (
                                        <p className="text-xs text-slate-500 ml-6">+{todayReservations.length - 4} weitere</p>
                                    )}
                                    {todayReservations.length === 0 && (
                                        <p className="text-sm text-slate-600 italic">Keine Reservierungen</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Wochenübersicht */}
                <Card className="p-4 sm:p-6 bg-slate-800 border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-purple-500" />
                            <span className="hidden sm:inline">Wochenübersicht</span>
                            <span className="text-sm text-slate-400">
                                {format(weekStart, 'dd.MM.')} - {format(weekEnd, 'dd.MM.')}
                            </span>
                        </h3>
                        <Link to={createPageUrl('Shifts')}>
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                                Alle ansehen
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3">
                        {weekDays.map(day => {
                            const { dayShifts, dayEvents, dayReservations } = getDayData(day);
                            const isToday = isSameDay(day, new Date());
                            
                            return (
                                <div 
                                    key={day.toString()} 
                                    className={`p-3 sm:p-4 rounded-lg ${isToday ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-slate-900'}`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0 mb-3">
                                        <div>
                                            <p className={`font-semibold text-sm sm:text-base ${isToday ? 'text-amber-400' : 'text-white'}`}>
                                                {format(day, 'EEEE', { locale: de })}
                                            </p>
                                            <p className="text-xs text-slate-400">{format(day, 'dd.MM.yyyy')}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {dayShifts.length > 0 && (
                                                <Badge variant="outline" className="text-xs border-purple-600 text-purple-400">
                                                    {dayShifts.length} Schichten
                                                </Badge>
                                            )}
                                            {dayEvents.length > 0 && (
                                                <Badge variant="outline" className="text-xs border-pink-600 text-pink-400">
                                                    {dayEvents.length} Events
                                                </Badge>
                                            )}
                                            {dayReservations.length > 0 && (
                                                <Badge variant="outline" className="text-xs border-blue-600 text-blue-400">
                                                    {dayReservations.length} Res.
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Schichten */}
                                    {dayShifts.length > 0 && (
                                        <div className="space-y-1.5 mb-2">
                                            {dayShifts.slice(0, 3).map(shift => (
                                                <div key={shift.id} className="flex items-center gap-2 text-xs">
                                                    <div 
                                                        className="w-2 h-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: shift.color || '#64748b' }}
                                                    />
                                                    <span className="text-slate-300 truncate">{shift.employee_name}</span>
                                                    <span className="text-slate-500 ml-auto shrink-0">
                                                        {shift.start_time?.substring(0, 5)} - {shift.end_time?.substring(0, 5)}
                                                    </span>
                                                </div>
                                            ))}
                                            {dayShifts.length > 3 && (
                                                <p className="text-xs text-slate-500 ml-4">+{dayShifts.length - 3} weitere</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Events */}
                                    {dayEvents.length > 0 && (
                                        <div className="space-y-1 pt-2 border-t border-slate-700">
                                            {dayEvents.map(event => (
                                                <div key={event.id} className="flex items-center gap-2 text-xs">
                                                    <AlertCircle className="w-3 h-3 text-pink-500 shrink-0" />
                                                    <span className="text-slate-300 font-medium truncate">{event.title}</span>
                                                    {event.expected_guests && (
                                                        <span className="text-slate-500 ml-auto shrink-0">({event.expected_guests} Gäste)</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {dayShifts.length === 0 && dayEvents.length === 0 && dayReservations.length === 0 && (
                                        <p className="text-xs text-slate-600 italic">Keine Einträge</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </div>
    );
}