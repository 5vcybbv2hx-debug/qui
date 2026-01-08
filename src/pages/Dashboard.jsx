import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, isToday, isPast, isFuture, startOfWeek, endOfWeek, parseISO, differenceInHours } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Users, CheckSquare, Sparkles, Clock, AlertCircle, TrendingUp, ArrowRight, Package, ShoppingCart, CalendarCheck, BookOpen } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#f59e0b', '#3b82f6', '#ef4444', '#22c55e', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
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
        queryFn: () => base44.entities.Shift.list('-date', 200)
    });

    const { data: cleaningTasks = [] } = useQuery({
        queryKey: ['cleaning'],
        queryFn: () => base44.entities.CleaningTask.list()
    });

    const { data: todos = [] } = useQuery({
        queryKey: ['todos'],
        queryFn: () => base44.entities.TodoItem.list('-due_date', 100)
    });

    const { data: events = [] } = useQuery({
        queryKey: ['events'],
        queryFn: () => base44.entities.Event.list('-date', 50)
    });

    const { data: reservations = [] } = useQuery({
        queryKey: ['reservations'],
        queryFn: () => base44.entities.Reservation.list('-date', 50)
    });

    const { data: shoppingItems = [] } = useQuery({
        queryKey: ['shopping'],
        queryFn: () => base44.entities.ShoppingList.list()
    });

    const { data: recipes = [] } = useQuery({
        queryKey: ['recipes'],
        queryFn: () => base44.entities.Recipe.list()
    });

    const weekStart = startOfWeek(new Date(), { locale: de, weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { locale: de, weekStartsOn: 1 });

    // Shifts Analysis
    const todayShifts = shifts.filter(s => isToday(parseISO(s.date)));
    const weekShifts = shifts.filter(s => {
        const date = parseISO(s.date);
        return date >= weekStart && date <= weekEnd;
    });
    
    const weekHours = useMemo(() => {
        return weekShifts.reduce((sum, shift) => {
            const start = new Date(`2000-01-01T${shift.start_time}`);
            const end = new Date(`2000-01-01T${shift.end_time}`);
            return sum + differenceInHours(end, start);
        }, 0);
    }, [weekShifts]);

    // Cleaning Progress
    const completedCleaning = cleaningTasks.filter(t => t.is_completed).length;
    const cleaningProgress = cleaningTasks.length > 0 ? (completedCleaning / cleaningTasks.length) * 100 : 0;

    // Todos Analysis
    const openTodos = todos.filter(t => t.status !== 'erledigt');
    const overdueTodos = openTodos.filter(t => t.due_date && isPast(parseISO(t.due_date)));
    const urgentTodos = openTodos.filter(t => t.priority === 'dringend' || t.priority === 'hoch');

    // Events & Reservations
    const upcomingEvents = events.filter(e => 
        e.status !== 'abgesagt' && isFuture(parseISO(e.date))
    ).slice(0, 3);

    const todayReservations = reservations.filter(r => 
        r.status !== 'storniert' && isToday(parseISO(r.date))
    );

    const weekReservations = reservations.filter(r => {
        const date = parseISO(r.date);
        return r.status !== 'storniert' && date >= weekStart && date <= weekEnd;
    });

    // Shopping
    const openShoppingItems = shoppingItems.filter(s => s.status === 'offen');

    // Todo Priority Distribution
    const todoPriorityData = useMemo(() => {
        const priorities = {};
        openTodos.forEach(todo => {
            const priority = todo.priority || 'mittel';
            priorities[priority] = (priorities[priority] || 0) + 1;
        });
        return Object.entries(priorities).map(([name, value]) => ({ name, value }));
    }, [openTodos]);

    // Shift Type Distribution
    const shiftTypeData = useMemo(() => {
        const types = {};
        weekShifts.forEach(shift => {
            const type = shift.shift_type || 'Nicht angegeben';
            types[type] = (types[type] || 0) + 1;
        });
        return Object.entries(types).map(([name, value]) => ({ name, value }));
    }, [weekShifts]);

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Willkommen zurück, {user?.full_name?.split(' ')[0] || 'Chef'}! 👋
                    </h1>
                    <p className="text-slate-400">
                        {format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
                    </p>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Link to={createPageUrl('Shifts')}>
                        <Card className="p-6 bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center">
                                    <Calendar className="w-6 h-6 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{todayShifts.length}</p>
                                    <p className="text-sm text-slate-400">Schichten heute</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('TimeTracking')}>
                        <Card className="p-6 bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-amber-600/20 flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{weekHours}h</p>
                                    <p className="text-sm text-slate-400">Stunden diese Woche</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Todos')}>
                        <Card className="p-6 bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center">
                                    <AlertCircle className="w-6 h-6 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{overdueTodos.length}</p>
                                    <p className="text-sm text-slate-400">Überfällige Aufgaben</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Cleaning')}>
                        <Card className="p-6 bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{cleaningProgress.toFixed(0)}%</p>
                                    <p className="text-sm text-slate-400">Putzfortschritt</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                </div>

                {/* Alerts & Warnings */}
                {(overdueTodos.length > 0 || todayShifts.length === 0 || openShoppingItems.length > 10) && (
                    <Card className="p-6 bg-slate-800 border-slate-700 mb-8">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                            Wichtige Hinweise
                        </h3>
                        <div className="space-y-2">
                            {overdueTodos.length > 0 && (
                                <Link to={createPageUrl('Todos')}>
                                    <div className="flex items-center gap-3 p-3 bg-red-900/20 rounded-lg border border-red-800/30 hover:bg-red-900/30 transition-colors cursor-pointer">
                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                        <span className="text-sm text-slate-300">
                                            {overdueTodos.length} überfällige Aufgabe{overdueTodos.length > 1 ? 'n' : ''}
                                        </span>
                                    </div>
                                </Link>
                            )}
                            {todayShifts.length === 0 && (
                                <Link to={createPageUrl('Shifts')}>
                                    <div className="flex items-center gap-3 p-3 bg-amber-900/20 rounded-lg border border-amber-800/30 hover:bg-amber-900/30 transition-colors cursor-pointer">
                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                        <span className="text-sm text-slate-300">Keine Schichten für heute eingeplant</span>
                                    </div>
                                </Link>
                            )}
                            {openShoppingItems.length > 10 && (
                                <Link to={createPageUrl('Shopping')}>
                                    <div className="flex items-center gap-3 p-3 bg-blue-900/20 rounded-lg border border-blue-800/30 hover:bg-blue-900/30 transition-colors cursor-pointer">
                                        <ShoppingCart className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm text-slate-300">
                                            {openShoppingItems.length} offene Artikel auf der Einkaufsliste
                                        </span>
                                    </div>
                                </Link>
                            )}
                        </div>
                    </Card>
                )}

                {/* Charts Row */}
                <div className="grid lg:grid-cols-2 gap-6 mb-8">
                    {/* Shift Types */}
                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <h3 className="font-semibold text-white mb-4">Schichttypen diese Woche</h3>
                        {shiftTypeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={shiftTypeData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={90}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {shiftTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#1e293b', 
                                            border: '1px solid #334155',
                                            borderRadius: '8px',
                                            color: '#f1f5f9'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-slate-500">
                                Keine Schichten diese Woche
                            </div>
                        )}
                    </Card>

                    {/* Todo Priorities */}
                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <h3 className="font-semibold text-white mb-4">Aufgaben nach Priorität</h3>
                        {todoPriorityData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={todoPriorityData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                                    <YAxis tick={{ fill: '#94a3b8' }} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#1e293b', 
                                            border: '1px solid #334155',
                                            borderRadius: '8px'
                                        }}
                                        labelStyle={{ color: '#f1f5f9' }}
                                    />
                                    <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-slate-500">
                                Keine offenen Aufgaben
                            </div>
                        )}
                    </Card>
                </div>

                {/* Content Grid */}
                <div className="grid lg:grid-cols-3 gap-6 mb-8">
                    {/* Today's Schedule */}
                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-purple-500" />
                                Heute
                            </h3>
                            <Link to={createPageUrl('Shifts')}>
                                <Button variant="ghost" size="sm" className="text-slate-400">
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                        {todayShifts.length > 0 ? (
                            <div className="space-y-2">
                                {todayShifts.slice(0, 4).map(shift => (
                                    <Link to={createPageUrl('Shifts')} key={shift.id}>
                                        <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                                            <div 
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                                                style={{ backgroundColor: shift.color || '#64748b' }}
                                            >
                                                {shift.employee_name?.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{shift.employee_name}</p>
                                                <p className="text-xs text-slate-400">
                                                    {shift.start_time} - {shift.end_time}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                {todayReservations.length > 0 && (
                                    <div className="pt-2 border-t border-slate-700">
                                        <p className="text-xs text-slate-500 mb-2">{todayReservations.length} Reservierung(en)</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm text-center py-8">Keine Schichten</p>
                        )}
                    </Card>

                    {/* Upcoming Events */}
                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-pink-500" />
                                Events
                            </h3>
                            <Link to={createPageUrl('Events')}>
                                <Button variant="ghost" size="sm" className="text-slate-400">
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                        {upcomingEvents.length > 0 ? (
                            <div className="space-y-2">
                                {upcomingEvents.map(event => (
                                    <Link to={createPageUrl('Events')} key={event.id}>
                                        <div className="p-3 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors">
                                            <p className="text-sm font-medium text-white">{event.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-slate-400">
                                                    {format(parseISO(event.date), 'dd.MM.yyyy')}
                                                </p>
                                                {event.expected_guests && (
                                                    <span className="text-xs text-slate-500">
                                                        • {event.expected_guests} Gäste
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm text-center py-8">Keine Events geplant</p>
                        )}
                    </Card>

                    {/* Cleaning Progress */}
                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-green-500" />
                                Putzliste
                            </h3>
                            <Link to={createPageUrl('Cleaning')}>
                                <Button variant="ghost" size="sm" className="text-slate-400">
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-400">Fortschritt</span>
                                    <span className="text-white font-semibold">{completedCleaning}/{cleaningTasks.length}</span>
                                </div>
                                <Progress value={cleaningProgress} className="h-3" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-900 rounded-lg">
                                    <p className="text-2xl font-bold text-white">{completedCleaning}</p>
                                    <p className="text-xs text-slate-400">Erledigt</p>
                                </div>
                                <div className="p-3 bg-slate-900 rounded-lg">
                                    <p className="text-2xl font-bold text-white">{cleaningTasks.length - completedCleaning}</p>
                                    <p className="text-xs text-slate-400">Offen</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <Link to={createPageUrl('Employees')}>
                        <Card className="p-4 bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <Users className="w-8 h-8 text-blue-500" />
                                <div>
                                    <p className="text-xl font-bold text-white">{employees.length}</p>
                                    <p className="text-xs text-slate-400">Mitarbeiter</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Reservations')}>
                        <Card className="p-4 bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <CalendarCheck className="w-8 h-8 text-indigo-500" />
                                <div>
                                    <p className="text-xl font-bold text-white">{weekReservations.length}</p>
                                    <p className="text-xs text-slate-400">Reservierungen</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Shopping')}>
                        <Card className="p-4 bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <ShoppingCart className="w-8 h-8 text-orange-500" />
                                <div>
                                    <p className="text-xl font-bold text-white">{openShoppingItems.length}</p>
                                    <p className="text-xs text-slate-400">Einkaufsliste</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Todos')}>
                        <Card className="p-4 bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <CheckSquare className="w-8 h-8 text-amber-500" />
                                <div>
                                    <p className="text-xl font-bold text-white">{openTodos.length}</p>
                                    <p className="text-xs text-slate-400">Offene Aufgaben</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Recipes')}>
                        <Card className="p-4 bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <BookOpen className="w-8 h-8 text-pink-500" />
                                <div>
                                    <p className="text-xl font-bold text-white">{recipes.length}</p>
                                    <p className="text-xs text-slate-400">Rezepte</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Link to={createPageUrl('Shifts')}>
                        <Card className="p-4 hover:bg-slate-700 transition-colors cursor-pointer bg-slate-800 border-slate-700">
                            <Calendar className="w-8 h-8 text-purple-500 mb-2" />
                            <p className="text-sm font-medium text-white">Schichtplan</p>
                        </Card>
                    </Link>
                    <Link to={createPageUrl('ShiftAnalytics')}>
                        <Card className="p-4 hover:bg-slate-700 transition-colors cursor-pointer bg-slate-800 border-slate-700">
                            <TrendingUp className="w-8 h-8 text-blue-500 mb-2" />
                            <p className="text-sm font-medium text-white">Analyse</p>
                        </Card>
                    </Link>
                    <Link to={createPageUrl('Reservations')}>
                        <Card className="p-4 hover:bg-slate-700 transition-colors cursor-pointer bg-slate-800 border-slate-700">
                            <CalendarCheck className="w-8 h-8 text-indigo-500 mb-2" />
                            <p className="text-sm font-medium text-white">Reservierungen</p>
                        </Card>
                    </Link>
                    <Link to={createPageUrl('Events')}>
                        <Card className="p-4 hover:bg-slate-700 transition-colors cursor-pointer bg-slate-800 border-slate-700">
                            <TrendingUp className="w-8 h-8 text-pink-500 mb-2" />
                            <p className="text-sm font-medium text-white">Events</p>
                        </Card>
                    </Link>
                    <Link to={createPageUrl('Shopping')}>
                        <Card className="p-4 hover:bg-slate-700 transition-colors cursor-pointer bg-slate-800 border-slate-700">
                            <ShoppingCart className="w-8 h-8 text-orange-500 mb-2" />
                            <p className="text-sm font-medium text-white">Einkauf</p>
                        </Card>
                    </Link>
                    <Link to={createPageUrl('Employees')}>
                        <Card className="p-4 hover:bg-slate-700 transition-colors cursor-pointer bg-slate-800 border-slate-700">
                            <Users className="w-8 h-8 text-blue-500 mb-2" />
                            <p className="text-sm font-medium text-white">Team</p>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    );
}