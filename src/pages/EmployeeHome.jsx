import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
    CheckSquare, AlertTriangle, Sparkles, ClipboardCheck,
    Sun, ScanLine, Search, ChevronRight, Circle, CheckCircle2,
    Clock, CalendarClock, Zap, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import BarcodeScanner from '@/components/restock/BarcodeScanner';
import GlobalSearch from '@/components/search/GlobalSearch';

export default function EmployeeHome() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Guten Morgen' : hour < 17 ? 'Guten Tag' : 'Guten Abend';

    // Todos today / urgent
    const { data: todos = [] } = useQuery({
        queryKey: ['employee-home-todos'],
        queryFn: () => base44.entities.TodoItem.filter({ is_archived: false })
    });

    // Cleaning tasks for today (not completed)
    const { data: cleaningTasks = [] } = useQuery({
        queryKey: ['employee-home-cleaning'],
        queryFn: () => base44.entities.CleaningTask.filter({ is_completed: false, is_active: true })
    });

    // Today's closing session
    const { data: closingSessions = [] } = useQuery({
        queryKey: ['employee-home-closing'],
        queryFn: () => base44.entities.ClosingSession.filter({ date: todayStr })
    });

    // Today's opening session
    const { data: openingSessions = [] } = useQuery({
        queryKey: ['employee-home-opening'],
        queryFn: () => base44.entities.OpeningSession.filter({ date: todayStr })
    });

    // Today's Stationsplan
    const { data: stationPlans = [] } = useQuery({
        queryKey: ['employee-home-stationsplan', todayStr],
        queryFn: () => base44.entities.Stationsplan.filter({ date: todayStr })
    });
    const todayPlanId = stationPlans[0]?.id;

    const { data: stationAssignments = [] } = useQuery({
        queryKey: ['employee-home-assignments', todayPlanId],
        queryFn: () => base44.entities.StationAssignment.filter({ stationsplan_id: todayPlanId }),
        enabled: !!todayPlanId
    });

    const myAssignment = currentUser
        ? stationAssignments.find(a => a.employee_name === currentUser.full_name)
        : null;

    const urgentTodos = todos.filter(t => t.status !== 'erledigt' && t.priority === 'dringend');
    const highTodos = todos.filter(t => t.status !== 'erledigt' && t.priority === 'hoch');
    const openTodos = todos.filter(t => t.status !== 'erledigt' && t.priority !== 'dringend');
    const dueTodayTodos = todos.filter(t => t.status !== 'erledigt' && t.due_date === todayStr);

    const closingSession = closingSessions[0] || null;
    const openingSession = openingSessions[0] || null;

    const closingProgress = closingSession?.completion_rate ?? null;
    const openingProgress = openingSession?.completion_rate ?? null;

    const handleScan = (code) => {
        setScannerOpen(false);
        navigate(createPageUrl('Shopping') + `?scan=${code}`);
    };

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

                {/* Greeting */}
                <div className="pt-2">
                    <h1 className="text-2xl font-bold text-foreground">
                        {greeting}{currentUser?.full_name ? `, ${currentUser.full_name.split(' ')[0]}` : ''} 👋
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => setScannerOpen(true)}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 active:scale-95 transition-all"
                    >
                        <ScanLine className="w-6 h-6 text-amber-400" />
                        <span className="text-xs font-medium text-amber-400">Scannen</span>
                    </button>
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 active:scale-95 transition-all"
                    >
                        <Search className="w-6 h-6 text-blue-400" />
                        <span className="text-xs font-medium text-blue-400">Suche</span>
                    </button>
                    <Link
                        to={createPageUrl('Closing')}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 active:scale-95 transition-all"
                    >
                        <ClipboardCheck className="w-6 h-6 text-violet-400" />
                        <span className="text-xs font-medium text-violet-400">Abschluss</span>
                    </Link>
                </div>

                {/* Mein Stationsplan */}
                {myAssignment && (myAssignment.area || myAssignment.role) && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                            <MapPin className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-amber-400/70 font-medium uppercase tracking-wide">Dein Bereich heute</p>
                            <p className="text-base font-bold text-amber-300 truncate">
                                {[myAssignment.area, myAssignment.role].filter(Boolean).join(' – ')}
                            </p>
                            {myAssignment.secondary_role && (
                                <p className="text-xs text-amber-400/60">Zusatz: {myAssignment.secondary_role}</p>
                            )}
                            {myAssignment.note && (
                                <p className="text-xs text-amber-400/60 italic">{myAssignment.note}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Opening / Closing Status */}
                {(urgentTodos.length > 0 || highTodos.length > 0) && (
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Dringend</h2>
                        </div>
                        <div className="space-y-2">
                            {[...urgentTodos, ...highTodos].slice(0, 5).map(todo => (
                                <Link key={todo.id} to={createPageUrl('Todos')}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors">
                                    <Zap className="w-4 h-4 text-red-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{todo.title}</p>
                                        {todo.due_date && (
                                            <p className="text-xs text-muted-foreground">Fällig: {format(parseISO(todo.due_date), 'dd.MM.', { locale: de })}</p>
                                        )}
                                    </div>
                                    <Badge className={cn('text-xs shrink-0', todo.priority === 'dringend' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30')}>
                                        {todo.priority}
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Today's Tasks */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Aufgaben heute</h2>
                        </div>
                        <Link to={createPageUrl('Todos')} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                            Alle <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {dueTodayTodos.length > 0 ? (
                        <div className="space-y-2">
                            {dueTodayTodos.slice(0, 6).map(todo => (
                                <Link key={todo.id} to={createPageUrl('Todos')}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors">
                                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{todo.title}</p>
                                        {todo.assigned_to && <p className="text-xs text-muted-foreground">{todo.assigned_to}</p>}
                                    </div>
                                    <Badge className="text-xs bg-secondary text-muted-foreground border-border shrink-0">{todo.category}</Badge>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 border border-dashed border-border rounded-xl">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                            <p className="text-sm text-muted-foreground">Keine Aufgaben für heute fällig</p>
                        </div>
                    )}
                </section>

                {/* Cleaning Tasks */}
                {cleaningTasks.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-sky-400" />
                                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Reinigung offen</h2>
                            </div>
                            <Link to={createPageUrl('Cleaning')} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                                Alle <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="space-y-2">
                            {cleaningTasks.slice(0, 4).map(task => (
                                <Link key={task.id} to={createPageUrl('Cleaning')}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors">
                                    <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                                        <p className="text-xs text-muted-foreground">{task.area} · {task.frequency}</p>
                                    </div>
                                </Link>
                            ))}
                            {cleaningTasks.length > 4 && (
                                <Link to={createPageUrl('Cleaning')} className="block text-center text-xs text-muted-foreground hover:text-foreground py-2">
                                    +{cleaningTasks.length - 4} weitere →
                                </Link>
                            )}
                        </div>
                    </section>
                )}

            </div>

            {/* Scanner */}
            <BarcodeScanner
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleScan}
                title="Artikel scannen"
                mode="default"
            />

            {/* Search */}
            <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>
    );
}