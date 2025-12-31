import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { Users, Calendar, CheckSquare, Sparkles, ArrowRight, Clock } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatCard from '@/components/dashboard/StatCard';

export default function Dashboard() {
    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => base44.entities.Shift.list('-date', 100)
    });

    const { data: cleaningTasks = [] } = useQuery({
        queryKey: ['cleaning'],
        queryFn: () => base44.entities.CleaningTask.list()
    });

    const { data: todos = [] } = useQuery({
        queryKey: ['todos'],
        queryFn: () => base44.entities.TodoItem.filter({ status: 'offen' }, '-created_date', 50)
    });

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    const thisWeekShifts = shifts.filter(s => {
        const date = new Date(s.date);
        return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });

    const todayShifts = shifts.filter(s => 
        format(new Date(s.date), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
    );

    const completedCleaning = cleaningTasks.filter(t => t.is_completed).length;
    const urgentTodos = todos.filter(t => t.priority === 'dringend' || t.priority === 'hoch').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                        Guten {new Date().getHours() < 12 ? 'Morgen' : new Date().getHours() < 18 ? 'Tag' : 'Abend'}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {format(now, "EEEE, d. MMMM yyyy", { locale: de })}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard 
                        title="Mitarbeiter" 
                        value={employees.length}
                        icon={Users}
                        color="bg-blue-50"
                        iconColor="text-blue-500"
                    />
                    <StatCard 
                        title="Schichten diese Woche" 
                        value={thisWeekShifts.length}
                        icon={Calendar}
                        color="bg-amber-50"
                        iconColor="text-amber-500"
                    />
                    <StatCard 
                        title="Putzliste" 
                        value={`${completedCleaning}/${cleaningTasks.length}`}
                        icon={Sparkles}
                        color="bg-emerald-50"
                        iconColor="text-emerald-500"
                    />
                    <StatCard 
                        title="Offene Todos" 
                        value={todos.length}
                        icon={CheckSquare}
                        color="bg-purple-50"
                        iconColor="text-purple-500"
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Today's Shifts */}
                    <Card className="p-6 bg-white border-0 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">Heutige Schichten</h2>
                            <Link to={createPageUrl('Shifts')}>
                                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
                                    Alle <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </div>
                        
                        {todayShifts.length > 0 ? (
                            <div className="space-y-3">
                                {todayShifts.map(shift => (
                                    <div 
                                        key={shift.id}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50"
                                    >
                                        <div 
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                                            style={{ backgroundColor: shift.color || '#64748b' }}
                                        >
                                            {shift.employee_name?.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-800">{shift.employee_name}</p>
                                            <div className="flex items-center gap-1 text-sm text-slate-500">
                                                <Clock className="w-3 h-3" />
                                                {shift.start_time} - {shift.end_time}
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-xs">
                                            {shift.shift_type}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p>Keine Schichten heute</p>
                            </div>
                        )}
                    </Card>

                    {/* Urgent Todos */}
                    <Card className="p-6 bg-white border-0 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">Wichtige Aufgaben</h2>
                            <Link to={createPageUrl('Todos')}>
                                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
                                    Alle <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </div>
                        
                        {todos.length > 0 ? (
                            <div className="space-y-3">
                                {todos.slice(0, 5).map(todo => (
                                    <div 
                                        key={todo.id}
                                        className="flex items-start gap-3 p-3 rounded-xl bg-slate-50"
                                    >
                                        <div className={`w-2 h-2 rounded-full mt-2 ${
                                            todo.priority === 'dringend' ? 'bg-red-500' :
                                            todo.priority === 'hoch' ? 'bg-orange-500' :
                                            todo.priority === 'mittel' ? 'bg-blue-500' : 'bg-slate-300'
                                        }`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-800 truncate">{todo.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {todo.category && (
                                                    <span className="text-xs text-slate-500">{todo.category}</span>
                                                )}
                                                {todo.due_date && (
                                                    <span className="text-xs text-slate-400">
                                                        • {format(new Date(todo.due_date), 'd. MMM', { locale: de })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p>Keine offenen Aufgaben</p>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <Link to={createPageUrl('Shifts')}>
                        <Card className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-50 group-hover:bg-amber-100 transition-colors">
                                    <Calendar className="w-5 h-5 text-amber-600" />
                                </div>
                                <span className="font-medium text-slate-700">Schichtplan</span>
                            </div>
                        </Card>
                    </Link>
                    <Link to={createPageUrl('Cleaning')}>
                        <Card className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                                    <Sparkles className="w-5 h-5 text-emerald-600" />
                                </div>
                                <span className="font-medium text-slate-700">Putzliste</span>
                            </div>
                        </Card>
                    </Link>
                    <Link to={createPageUrl('Todos')}>
                        <Card className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-50 group-hover:bg-purple-100 transition-colors">
                                    <CheckSquare className="w-5 h-5 text-purple-600" />
                                </div>
                                <span className="font-medium text-slate-700">Aufgaben</span>
                            </div>
                        </Card>
                    </Link>
                    <Link to={createPageUrl('Employees')}>
                        <Card className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                                    <Users className="w-5 h-5 text-blue-600" />
                                </div>
                                <span className="font-medium text-slate-700">Team</span>
                            </div>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    );
}