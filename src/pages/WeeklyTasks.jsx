import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, getDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, Check, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';

// Weekday config: js getDay() index → label + short pattern prefix
const WEEKDAYS = [
    { label: 'Sonntag',    short: 'so', jsDay: 0 },
    { label: 'Montag',     short: 'mo', jsDay: 1 },
    { label: 'Dienstag',   short: 'di', jsDay: 2 },
    { label: 'Mittwoch',   short: 'mi', jsDay: 3 },
    { label: 'Donnerstag', short: 'do', jsDay: 4 },
    { label: 'Freitag',    short: 'fr', jsDay: 5 },
    { label: 'Samstag',    short: 'sa', jsDay: 6 },
];

// Detect weekday from biweekly_pattern (mi_1, do_2, mo, etc.) or default to Mittwoch for legacy null
function getTaskDay(task) {
    if (!task.biweekly_pattern) return 3; // legacy: Mittwoch
    const prefix = task.biweekly_pattern.split('_')[0];
    return WEEKDAYS.find(d => d.short === prefix)?.jsDay ?? 3;
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7) % 2 === 1 ? 1 : 2;
}

function TaskRow({ task, onComplete, onReset }) {
    return (
        <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
            task.is_completed ? "opacity-50" : "bg-card border border-border"
        )}>
            <button
                onClick={() => onComplete(task)}
                className={cn(
                    "w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    task.is_completed
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-border hover:border-emerald-500 active:scale-95"
                )}
            >
                {task.is_completed && <Check className="w-4 h-4 text-white" />}
            </button>
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-sm font-medium",
                    task.is_completed ? "line-through text-muted-foreground" : "text-foreground"
                )}>
                    {task.title}
                </p>
                {task.is_completed && task.completed_by && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                        ✓ {task.completed_by}
                        {task.completed_at && ` · ${format(new Date(task.completed_at), 'HH:mm')}`}
                    </p>
                )}
                {!task.is_completed && task.assigned_to_name && (
                    <p className="text-xs text-muted-foreground mt-0.5">→ {task.assigned_to_name}</p>
                )}
            </div>
            {task.is_completed && (
                <button
                    onClick={() => onReset(task)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}

function DaySection({ label, tasks, isToday, onComplete, onReset }) {
    const [doneOpen, setDoneOpen] = useState(false);
    const open = tasks.filter(t => !t.is_completed);
    const done = tasks.filter(t => t.is_completed);

    return (
        <div className={cn(
            "rounded-2xl border overflow-hidden",
            isToday
                ? "border-amber-500 shadow-md shadow-amber-500/10"
                : "border-border"
        )}>
            {/* Day header */}
            <div className={cn(
                "flex items-center justify-between px-4 py-3",
                isToday ? "bg-amber-500/10" : "bg-card"
            )}>
                <div className="flex items-center gap-2">
                    {isToday && (
                        <span className="text-xs font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                            Heute
                        </span>
                    )}
                    <span className={cn("font-semibold", isToday ? "text-amber-500" : "text-foreground")}>
                        {label}
                    </span>
                </div>
                <span className="text-sm text-muted-foreground">
                    {done.length}/{tasks.length} erledigt
                </span>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-border">
                <div
                    className={cn("h-full transition-all", isToday ? "bg-amber-500" : "bg-emerald-500")}
                    style={{ width: tasks.length ? `${(done.length / tasks.length) * 100}%` : '0%' }}
                />
            </div>

            {/* Open tasks */}
            <div className="px-3 py-2 space-y-2 bg-background">
                {open.length === 0 && done.length > 0 && (
                    <p className="text-center text-sm text-emerald-500 py-3 font-medium">✓ Alle Aufgaben erledigt!</p>
                )}
                {open.map(task => (
                    <TaskRow key={task.id} task={task} onComplete={onComplete} onReset={onReset} />
                ))}
            </div>

            {/* Done tasks (collapsible) */}
            {done.length > 0 && (
                <div className="border-t border-border">
                    <button
                        onClick={() => setDoneOpen(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
                    >
                        <span>{done.length} erledigt</span>
                        {doneOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {doneOpen && (
                        <div className="px-3 pb-2 space-y-1.5 bg-background">
                            {done.map(task => (
                                <TaskRow key={task.id} task={task} onComplete={onComplete} onReset={onReset} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function WeeklyTasks() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', weekday: 'mi', biweekly: 'every' });

    const todayJsDay = getDay(new Date());
    const currentWeek = getWeekNumber(new Date());

    const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });

    const { data: allTasks = [] } = useQuery({
        queryKey: ['weekly-cleaning-tasks'],
        queryFn: () => base44.entities.CleaningTask.filter({ area: 'Wochentagsaufgaben', is_active: true })
    });

    const { data: shifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: () => base44.entities.Shift.list() });
    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    // Filter tasks relevant for this week (biweekly logic)
    const relevantTasks = useMemo(() => {
        return allTasks.filter(task => {
            if (!task.biweekly_pattern) return true; // legacy = every week
            const parts = task.biweekly_pattern.split('_');
            if (parts.length === 1) return true; // prefix only = every week
            const weekNum = parseInt(parts[parts.length - 1]);
            return !weekNum || weekNum === currentWeek;
        });
    }, [allTasks, currentWeek]);

    // Group by weekday, only show days that have tasks
    const tasksByDay = useMemo(() => {
        const map = {};
        relevantTasks.forEach(task => {
            const jsDay = getTaskDay(task);
            if (!map[jsDay]) map[jsDay] = [];
            map[jsDay].push(task);
        });
        return map;
    }, [relevantTasks]);

    // Sort: today first, then rest of week in order
    const sortedDays = useMemo(() => {
        const days = Object.keys(tasksByDay).map(Number);
        days.sort((a, b) => {
            if (a === todayJsDay) return -1;
            if (b === todayJsDay) return 1;
            // future days before past days
            const aFuture = a > todayJsDay;
            const bFuture = b > todayJsDay;
            if (aFuture && !bFuture) return -1;
            if (!aFuture && bFuture) return 1;
            return a - b;
        });
        return days;
    }, [tasksByDay, todayJsDay]);

    const totalTasks = relevantTasks.length;
    const doneTasks = relevantTasks.filter(t => t.is_completed).length;

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.CleaningTask.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weekly-cleaning-tasks'] })
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.CleaningTask.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weekly-cleaning-tasks'] });
            setModalOpen(false);
            setFormData({ title: '', weekday: 'mi', biweekly: 'every' });
        }
    });

    const handleComplete = (task) => {
        const displayName = user?.full_name ?? user?.email ?? '';
        updateMutation.mutate({
            id: task.id,
            data: {
                is_completed: !task.is_completed,
                completed_by: task.is_completed ? null : displayName,
                completed_at: task.is_completed ? null : new Date().toISOString()
            }
        });
    };

    const handleReset = (task) => {
        updateMutation.mutate({ id: task.id, data: { is_completed: false, completed_by: null, completed_at: null } });
    };

    const getTodaysAushilfe = () => {
        const todayDate = format(new Date(), 'yyyy-MM-dd');
        const todayShifts = shifts.filter(s => s.date === todayDate);
        return todayShifts.map(s => employees.find(e => e.id === s.employee_id)).find(e => e?.role === 'Aushilfe');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const aushilfe = getTodaysAushilfe();
        let pattern = null;
        if (formData.biweekly === 'every') {
            pattern = formData.weekday; // e.g. 'mi', 'do', 'mo'
        } else {
            pattern = `${formData.weekday}_${formData.biweekly}`; // e.g. 'mi_1', 'do_2'
        }
        createMutation.mutate({
            title: formData.title,
            area: 'Wochentagsaufgaben',
            frequency: 'wöchentlich',
            biweekly_pattern: pattern,
            assigned_to: aushilfe?.id || null,
            assigned_to_name: aushilfe?.name || null,
            is_active: true,
        });
    };

    if (permissions.isLoading) return null;
    if (!permissions.canViewCleaning) return <PermissionDenied />;

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-8">
            <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Wochenaufgaben</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">
                            {format(new Date(), "EEEE, d. MMMM", { locale: de })} · KW {getWeekNumber(new Date()) === 1 ? 'ungerade' : 'gerade'}
                        </p>
                    </div>
                    {permissions.canEditCleaning && (
                        <Button onClick={() => setModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
                            <Plus className="w-4 h-4" />
                            Aufgabe
                        </Button>
                    )}
                </div>

                {/* Overall progress */}
                {totalTasks > 0 && (
                    <div className="bg-card border border-border rounded-2xl px-4 py-3 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-foreground">Fortschritt diese Woche</span>
                            <span className="text-muted-foreground">{doneTasks} / {totalTasks}</span>
                        </div>
                        <div className="h-2 bg-border rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
                            />
                        </div>
                        {doneTasks === totalTasks && totalTasks > 0 && (
                            <p className="text-xs text-emerald-500 font-medium text-center">🎉 Alle Aufgaben diese Woche erledigt!</p>
                        )}
                    </div>
                )}

                {/* No tasks at all */}
                {totalTasks === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        <p className="text-lg font-medium">Keine Aufgaben diese Woche</p>
                        <p className="text-sm mt-1">Füge wiederkehrende Aufgaben hinzu.</p>
                    </div>
                )}

                {/* Day sections */}
                {sortedDays.map(jsDay => {
                    const wd = WEEKDAYS.find(d => d.jsDay === jsDay);
                    const tasks = tasksByDay[jsDay] || [];
                    return (
                        <DaySection
                            key={jsDay}
                            label={wd?.label ?? 'Unbekannt'}
                            tasks={tasks}
                            isToday={jsDay === todayJsDay}
                            onComplete={handleComplete}
                            onReset={handleReset}
                        />
                    );
                })}

                {/* Add Modal */}
                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Neue Wochenaufgabe</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                            <div className="space-y-2">
                                <Label>Aufgabe *</Label>
                                <Input
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="z.B. Kühlschrank putzen"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Wochentag</Label>
                                <Select value={formData.weekday} onValueChange={v => setFormData({ ...formData, weekday: v, biweekly: 'every' })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {WEEKDAYS.map(d => (
                                            <SelectItem key={d.short} value={d.short}>{d.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Turnus</Label>
                                <Select value={formData.biweekly} onValueChange={v => setFormData({ ...formData, biweekly: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="every">Jede Woche</SelectItem>
                                        <SelectItem value="1">Nur Woche 1 (ungerade KW)</SelectItem>
                                        <SelectItem value="2">Nur Woche 2 (gerade KW)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Abbrechen</Button>
                                <Button type="submit" disabled={createMutation.isPending} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
                                    Hinzufügen
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}