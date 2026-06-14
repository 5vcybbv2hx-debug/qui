/**
 * WeeklyTasks — Manager Wochenplaner
 * Zeitachse immer sichtbar (07:00–23:00), 7 Tage als Spalten.
 * Klick auf Slot → Todo einplanen ODER neuen Termin anlegen.
 * Backlog-Panel: alle offenen, noch nicht eingeplanten Todos.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE } from '@/lib/queryUtils';
import {
    format, addDays, startOfWeek, isSameDay, parseISO, isToday
} from 'date-fns';
import { de } from 'date-fns/locale';
import {
    ChevronLeft, ChevronRight, Plus, X, Clock, CalendarDays,
    CheckSquare, Trash2, GripVertical, Circle, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import {
    Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

// ── Konstanten ────────────────────────────────────────────────────────────────
// HOUR_START / HOUR_END werden als State verwaltet (konfigurierbar)
// Stunden 0–27 erlaubt (>23 = nächster Tag, z.B. 25 = 01:00)
const SLOT_H       = 56; // px pro Stunde
const MIN_DURATION = 30;

function displayHour(h) {
    // 24 → "00", 25 → "01", etc.
    return String(h % 24).padStart(2, '0') + ':00';
}

const PRIORITY_STRIPE = {
    dringend: 'bg-red-500',
    hoch:     'bg-orange-500',
    mittel:   'bg-blue-500',
    niedrig:  'bg-slate-400',
};

const APPOINTMENT_COLORS = {
    amber:  { bg: 'bg-amber-500/20',  border: 'border-amber-500/50',  text: 'text-amber-300',  dot: 'bg-amber-500' },
    blue:   { bg: 'bg-blue-500/20',   border: 'border-blue-500/50',   text: 'text-blue-300',   dot: 'bg-blue-500'  },
    green:  { bg: 'bg-green-500/20',  border: 'border-green-500/50',  text: 'text-green-300',  dot: 'bg-green-500' },
    purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-300', dot: 'bg-purple-500'},
    red:    { bg: 'bg-red-500/20',    border: 'border-red-500/50',    text: 'text-red-300',    dot: 'bg-red-500'   },
};

function timeToMinutes(t) {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}
function minutesToTime(m) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
function minutesToPx(minutes, hourStart) {
    return ((minutes - hourStart * 60) / 60) * SLOT_H;
}
function durationToPx(minutes) {
    return (minutes / 60) * SLOT_H;
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function WeeklyTasks() {
    const permissions  = usePermissions();
    const queryClient  = useQueryClient();

    // ── Woche ─────────────────────────────────────────────────────────────────
    const [weekStart, setWeekStart] = useState(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 })
    );

    // ── Zeitachse (konfigurierbar) ────────────────────────────────────────────
    // Default: 10:00–26:00 (= bis 02:00 nächsten Tag)
    const [hourStart, setHourStart] = useState(10);
    const [hourEnd,   setHourEnd]   = useState(26);
    const hours = Array.from(
        { length: hourEnd - hourStart },
        (_, i) => hourStart + i
    );
    const totalPx = (hourEnd - hourStart) * SLOT_H;
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekLabel = `${format(weekStart, 'd. MMM')} – ${format(addDays(weekStart, 6), 'd. MMM yyyy', { locale: de })}`;

    // ── UI State ──────────────────────────────────────────────────────────────
    const [slotPopover,    setSlotPopover]    = useState(null); // { date, hour }
    const [editItem,       setEditItem]       = useState(null); // { type: 'todo'|'appointment', item }
    const [backlogOpen,    setBacklogOpen]    = useState(true);
    const [newTitle,       setNewTitle]       = useState('');
    const [newTime,        setNewTime]        = useState('');
    const [newDuration,    setNewDuration]    = useState(60);
    const [newColor,       setNewColor]       = useState('blue');
    const [newMode,        setNewMode]        = useState('appointment'); // 'appointment' | 'todo-pick'
    const gridRef = useRef(null);

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: todos = [] } = useQuery({
        queryKey: ['todos'],
        queryFn: () => base44.entities.TodoItem.filter({ is_archived: false }, '-created_date', 300),
        staleTime: 60_000,
    });

    const weekStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');

    const { data: appointments = [] } = useQuery({
        queryKey: ['manager-appointments', weekStr],
        queryFn: () => base44.entities.ManagerAppointment.filter({}),
        staleTime: 30_000,
    });

    // ── Mutations ─────────────────────────────────────────────────────────────
    const updateTodo = useMutation({
        mutationFn: ({ id, data }) => base44.entities.TodoItem.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
    });

    const createAppointment = useMutation({
        mutationFn: (data) => base44.entities.ManagerAppointment.create(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manager-appointments'] }),
    });

    const updateAppointment = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ManagerAppointment.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manager-appointments'] }),
    });

    const deleteAppointment = useMutation({
        mutationFn: (id) => base44.entities.ManagerAppointment.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manager-appointments'] }),
    });

    const deleteTodoPlanning = (todo) => {
        updateTodo.mutate({ id: todo.id, data: { planned_date: null, planned_time: null } });
    };

    // ── Derived ───────────────────────────────────────────────────────────────
    // Todos die in dieser Woche eingeplant sind
    const plannedTodos = useMemo(() =>
        todos.filter(t =>
            t.planned_date &&
            t.planned_date >= weekStr &&
            t.planned_date <= weekEndStr
        ), [todos, weekStr, weekEndStr]
    );

    // Backlog: offen, nicht erledigt, nicht diese Woche eingeplant
    const backlogTodos = useMemo(() =>
        todos.filter(t =>
            t.status !== 'erledigt' &&
            !t.is_archived &&
            (!t.planned_date || t.planned_date < weekStr || t.planned_date > weekEndStr)
        ).sort((a, b) => {
            const po = { dringend: 0, hoch: 1, mittel: 2, niedrig: 3 };
            return (po[a.priority] ?? 2) - (po[b.priority] ?? 2);
        }), [todos, weekStr, weekEndStr]
    );

    // Woche-Appointments
    const weekAppointments = useMemo(() =>
        appointments.filter(a =>
            a.date >= weekStr && a.date <= weekEndStr
        ), [appointments, weekStr, weekEndStr]
    );

    // ── Slot-Klick Handler ────────────────────────────────────────────────────
    const handleSlotClick = (date, hour) => {
        setNewTitle('');
        setNewTime(minutesToTime(hour * 60));
        setNewDuration(60);
        setNewColor('blue');
        setNewMode('appointment');
        setSlotPopover({ date, hour });
    };

    const handleCreateAppointment = () => {
        if (!newTitle.trim() || !slotPopover) return;
        const startMin = timeToMinutes(newTime);
        const endMin   = startMin + newDuration;
        createAppointment.mutate({
            title:      newTitle.trim(),
            date:       format(slotPopover.date, 'yyyy-MM-dd'),
            start_time: newTime,
            end_time:   minutesToTime(endMin),
            duration:   newDuration,
            color:      newColor,
        });
        setSlotPopover(null);
    };

    const handlePlanTodo = (todo, date, time) => {
        updateTodo.mutate({
            id: todo.id,
            data: {
                planned_date: format(date, 'yyyy-MM-dd'),
                planned_time: time,
                planned_duration: newDuration,
            },
        });
        setSlotPopover(null);
    };

    // Scroll zu aktueller Zeit
    useEffect(() => {
        if (!gridRef.current) return;
        const now = new Date();
        const px = minutesToPx(now.getHours() * 60 + now.getMinutes() - hourStart * 60);
        gridRef.current.scrollTop = Math.max(0, px - 120);
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────
    // Nur Manager/Admin darf diese Seite sehen (guard AFTER all hooks)
    if (!permissions.isManager && !permissions.isAdmin) {
        return <PermissionDenied message="Diese Ansicht ist nur für Manager verfügbar." />;
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">

            {/* ── Top-Bar ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <CalendarDays className="w-5 h-5 text-amber-500" />
                    <div>
                        <h1 className="text-base font-bold text-foreground leading-none">Wochenplaner</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">{weekLabel}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline"
                        onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                        className="h-8 px-2.5 text-xs">
                        Heute
                    </Button>
                    <div className="flex border border-border rounded-lg overflow-hidden">
                        <button onClick={() => setWeekStart(d => addDays(d, -7))}
                            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => setWeekStart(d => addDays(d, 7))}
                            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent border-l border-border">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <Button size="sm" variant="outline"
                        onClick={() => setBacklogOpen(o => !o)}
                        className={cn('h-8 px-2.5 text-xs gap-1.5',
                            backlogOpen ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : '')}>
                        <CheckSquare className="w-3.5 h-3.5" />
                        Backlog
                        {backlogTodos.length > 0 && (
                            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {backlogTodos.length}
                            </span>
                        )}
                    </Button>

                    {/* Zeitachse konfigurieren */}
                    <div className="flex items-center gap-1 border border-border rounded-lg px-2 h-8 bg-card">
                        <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                        <select
                            value={hourStart}
                            onChange={e => setHourStart(Number(e.target.value))}
                            className="h-full bg-transparent text-xs text-foreground border-none outline-none cursor-pointer pr-1"
                            title="Startzeit">
                            {Array.from({ length: 24 }, (_, i) => i).map(h => (
                                <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
                            ))}
                        </select>
                        <span className="text-muted-foreground text-xs">–</span>
                        <select
                            value={hourEnd}
                            onChange={e => setHourEnd(Number(e.target.value))}
                            className="h-full bg-transparent text-xs text-foreground border-none outline-none cursor-pointer pr-1"
                            title="Endzeit">
                            {Array.from({ length: 18 }, (_, i) => i + 16).map(h => (
                                <option key={h} value={h}>
                                    {h < 24 ? String(h).padStart(2,'0') : String(h-24).padStart(2,'0')}:00
                                    {h >= 24 ? ' (+1)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">

                {/* ── Kalender-Hauptbereich ─────────────────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Tages-Header (sticky) */}
                    <div className="flex border-b border-border bg-card sticky top-[57px] z-20">
                        {/* Zeitachsen-Label-Spalte */}
                        <div className="w-14 shrink-0" />
                        {weekDays.map((day, i) => {
                            const isNow = isToday(day);
                            return (
                                <div key={i}
                                    className={cn(
                                        'flex-1 text-center py-2 border-l border-border',
                                        isNow && 'bg-amber-500/8'
                                    )}>
                                    <p className={cn('text-[11px] font-semibold uppercase tracking-wider',
                                        isNow ? 'text-amber-500' : 'text-muted-foreground')}>
                                        {format(day, 'EEE', { locale: de })}
                                    </p>
                                    <p className={cn('text-lg font-bold leading-tight',
                                        isNow ? 'text-amber-500' : 'text-foreground')}>
                                        {format(day, 'd')}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Zeitachse + Grid (scrollbar) */}
                    <div ref={gridRef} className="flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="flex" style={{ height: `${totalPx}px`, minHeight: '100%' }}>

                            {/* Zeitachse links */}
                            <div className="w-14 shrink-0 relative">
                                {hours.map(h => (
                                    <div key={h}
                                        className="absolute left-0 right-0 flex items-start justify-end pr-2"
                                        style={{ top: `${(h - hourStart) * SLOT_H}px`, height: `${SLOT_H}px` }}>
                                        <span className="text-[10px] text-muted-foreground font-mono -mt-2">
                                            {displayHour(h)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* 7 Tages-Spalten */}
                            {weekDays.map((day, di) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const isNow = isToday(day);
                                const now = new Date();
                                const nowPx = isNow
                                    ? minutesToPx(now.getHours() * 60 + now.getMinutes() - hourStart * 60)
                                    : null;

                                // Einträge für diesen Tag
                                const dayTodos = plannedTodos.filter(t => t.planned_date === dateStr);
                                const dayAppts = weekAppointments.filter(a => a.date === dateStr);

                                return (
                                    <div key={di}
                                        className={cn(
                                            'flex-1 border-l border-border relative',
                                            isNow && 'bg-amber-500/4'
                                        )}>

                                        {/* Stunden-Linien + klickbare Slots */}
                                        {hours.map(h => (
                                            <div key={h}
                                                className="absolute left-0 right-0 border-t border-border/40 cursor-pointer hover:bg-accent/30 transition-colors group"
                                                style={{ top: `${(h - hourStart) * SLOT_H}px`, height: `${SLOT_H}px` }}
                                                onClick={() => handleSlotClick(day, h)}>
                                                {/* Halbe-Stunden-Linie */}
                                                <div className="absolute left-0 right-0 border-t border-border/20"
                                                    style={{ top: `${SLOT_H / 2}px` }} />
                                                {/* Hover-Hint */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Plus className="w-4 h-4 text-muted-foreground/50" />
                                                </div>
                                            </div>
                                        ))}

                                        {/* Jetzt-Linie */}
                                        {nowPx !== null && (
                                            <div className="absolute left-0 right-0 z-10 pointer-events-none"
                                                style={{ top: `${nowPx}px` }}>
                                                <div className="flex items-center">
                                                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1" />
                                                    <div className="flex-1 border-t-2 border-red-500" />
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Eingeplante Todos ── */}
                                        {dayTodos.map(todo => {
                                            if (!todo.planned_time) return null;
                                            const startMin = timeToMinutes(todo.planned_time);
                                            if (startMin < hourStart * 60 || startMin >= hourEnd * 60) return null;
                                            const dur  = todo.planned_duration || 60;
                                            const top  = minutesToPx(startMin, hourStart);
                                            const h    = Math.max(durationToPx(dur), 24);
                                            const pCfg = PRIORITY_STRIPE[todo.priority] || PRIORITY_STRIPE.mittel;

                                            return (
                                                <div key={todo.id}
                                                    className="absolute left-0.5 right-0.5 z-10 rounded-lg border border-blue-500/30 bg-blue-500/15 overflow-hidden cursor-pointer hover:bg-blue-500/25 transition-colors flex"
                                                    style={{ top: `${top}px`, height: `${h}px`, minHeight: '24px' }}
                                                    onClick={e => { e.stopPropagation(); setEditItem({ type: 'todo', item: todo }); }}>
                                                    <div className={cn('w-1 shrink-0', pCfg)} />
                                                    <div className="flex-1 px-1.5 py-1 min-w-0">
                                                        <p className="text-[11px] font-semibold text-blue-200 truncate leading-tight">
                                                            {todo.planned_time} {todo.title}
                                                        </p>
                                                        {h > 36 && todo.category && (
                                                            <p className="text-[10px] text-blue-300/70 truncate">{todo.category}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* ── Termine ── */}
                                        {dayAppts.map(appt => {
                                            const startMin = timeToMinutes(appt.start_time);
                                            if (startMin < hourStart * 60 || startMin >= hourEnd * 60) return null;
                                            const dur  = appt.duration || 60;
                                            const top  = minutesToPx(startMin, hourStart);
                                            const h    = Math.max(durationToPx(dur), 24);
                                            const col  = APPOINTMENT_COLORS[appt.color] || APPOINTMENT_COLORS.blue;

                                            return (
                                                <div key={appt.id}
                                                    className={cn(
                                                        'absolute left-0.5 right-0.5 z-10 rounded-lg border overflow-hidden cursor-pointer transition-colors',
                                                        col.bg, col.border,
                                                        `hover:brightness-110`
                                                    )}
                                                    style={{ top: `${top}px`, height: `${h}px`, minHeight: '24px' }}
                                                    onClick={e => { e.stopPropagation(); setEditItem({ type: 'appointment', item: appt }); }}>
                                                    <div className="flex-1 px-1.5 py-1 min-w-0">
                                                        <p className={cn('text-[11px] font-semibold truncate leading-tight', col.text)}>
                                                            {appt.start_time} {appt.title}
                                                        </p>
                                                        {h > 36 && appt.notes && (
                                                            <p className={cn('text-[10px] truncate', col.text, 'opacity-70')}>
                                                                {appt.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Backlog-Panel (rechts) ────────────────────────────── */}
                {backlogOpen && (
                    <div className="w-64 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
                        <div className="px-3 py-3 border-b border-border">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Backlog · {backlogTodos.length} offen
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                Klick auf Slot → Todo einplanen
                            </p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                            {backlogTodos.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Check className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-xs">Alles eingeplant!</p>
                                </div>
                            ) : backlogTodos.map(todo => {
                                const stripe = PRIORITY_STRIPE[todo.priority] || PRIORITY_STRIPE.mittel;
                                return (
                                    <div key={todo.id}
                                        className="flex gap-2 p-2 rounded-xl border border-border bg-background hover:bg-accent/30 transition-colors cursor-default group">
                                        <div className={cn('w-1 rounded-full shrink-0', stripe)} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-foreground truncate">{todo.title}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                {todo.category && (
                                                    <span className="text-[10px] text-muted-foreground">{todo.category}</span>
                                                )}
                                                {todo.due_date && (
                                                    <span className="text-[10px] text-amber-400">{todo.due_date}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Slot-Popover: Neuer Eintrag ──────────────────────────────── */}
            {slotPopover && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => setSlotPopover(null)}>
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-4 space-y-4"
                        onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-foreground text-sm">
                                    {format(slotPopover.date, 'EEEE, d. MMMM', { locale: de })}
                                </p>
                                <p className="text-xs text-muted-foreground">{newTime} Uhr</p>
                            </div>
                            <button onClick={() => setSlotPopover(null)}
                                className="text-muted-foreground hover:text-foreground">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modus-Toggle */}
                        <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl border border-border">
                            {[
                                { key: 'appointment', label: '📅 Neuer Termin' },
                                { key: 'todo-pick',   label: '✅ Todo einplanen' },
                            ].map(({ key, label }) => (
                                <button key={key} onClick={() => setNewMode(key)}
                                    className={cn(
                                        'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                        newMode === key
                                            ? 'bg-card text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Neuer Termin */}
                        {newMode === 'appointment' && (
                            <div className="space-y-3">
                                <Input
                                    autoFocus
                                    placeholder="Titel des Termins…"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreateAppointment()}
                                    className="h-10"
                                />
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <p className="text-[10px] text-muted-foreground mb-1">Startzeit</p>
                                        <input type="time" value={newTime}
                                            onChange={e => setNewTime(e.target.value)}
                                            className="w-full h-9 px-2 rounded-lg border border-border bg-background text-sm text-foreground" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-muted-foreground mb-1">Dauer</p>
                                        <select value={newDuration} onChange={e => setNewDuration(Number(e.target.value))}
                                            className="w-full h-9 px-2 rounded-lg border border-border bg-background text-sm text-foreground">
                                            {[15, 30, 45, 60, 90, 120].map(m => (
                                                <option key={m} value={m}>{m < 60 ? `${m} Min` : `${m / 60} Std`}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {/* Farbe */}
                                <div>
                                    <p className="text-[10px] text-muted-foreground mb-1.5">Farbe</p>
                                    <div className="flex gap-2">
                                        {Object.entries(APPOINTMENT_COLORS).map(([key, col]) => (
                                            <button key={key} onClick={() => setNewColor(key)}
                                                className={cn(
                                                    'w-7 h-7 rounded-full transition-all',
                                                    col.dot,
                                                    newColor === key ? 'ring-2 ring-offset-2 ring-offset-card ring-white scale-110' : 'opacity-60 hover:opacity-100'
                                                )} />
                                        ))}
                                    </div>
                                </div>
                                <Button onClick={handleCreateAppointment}
                                    disabled={!newTitle.trim()}
                                    className="w-full h-9 bg-amber-600 hover:bg-amber-700 text-white">
                                    Termin anlegen
                                </Button>
                            </div>
                        )}

                        {/* Todo einplanen */}
                        {newMode === 'todo-pick' && (
                            <div className="space-y-2 max-h-72 overflow-y-auto">
                                {backlogTodos.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">
                                        Keine offenen Todos im Backlog
                                    </p>
                                ) : backlogTodos.map(todo => {
                                    const stripe = PRIORITY_STRIPE[todo.priority] || PRIORITY_STRIPE.mittel;
                                    return (
                                        <button key={todo.id}
                                            onClick={() => handlePlanTodo(todo, slotPopover.date, newTime)}
                                            className="w-full flex gap-2 p-2.5 rounded-xl border border-border bg-background hover:bg-accent/50 transition-colors text-left">
                                            <div className={cn('w-1.5 rounded-full shrink-0', stripe)} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{todo.title}</p>
                                                {todo.category && (
                                                    <p className="text-xs text-muted-foreground">{todo.category}</p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                                {/* Dauer-Wahl */}
                                <div className="pt-2 border-t border-border">
                                    <p className="text-[10px] text-muted-foreground mb-1.5">Dauer</p>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {[30, 60, 90, 120].map(m => (
                                            <button key={m} onClick={() => setNewDuration(m)}
                                                className={cn(
                                                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                                                    newDuration === m
                                                        ? 'bg-amber-500 border-amber-500 text-white'
                                                        : 'border-border text-muted-foreground'
                                                )}>
                                                {m < 60 ? `${m}'` : `${m / 60}h`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Edit-Dialog: Termin / Todo-Planung ───────────────────────── */}
            <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base">
                            {editItem?.type === 'appointment' ? '📅 Termin' : '✅ Eingeplantes Todo'}
                        </DialogTitle>
                    </DialogHeader>
                    {editItem?.type === 'appointment' && (
                        <div className="space-y-3">
                            <Input
                                value={editItem.item.title}
                                onChange={e => setEditItem(prev => ({
                                    ...prev,
                                    item: { ...prev.item, title: e.target.value }
                                }))}
                                className="h-10"
                            />
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <p className="text-[10px] text-muted-foreground mb-1">Startzeit</p>
                                    <input type="time" value={editItem.item.start_time}
                                        onChange={e => setEditItem(prev => ({
                                            ...prev,
                                            item: { ...prev.item, start_time: e.target.value }
                                        }))}
                                        className="w-full h-9 px-2 rounded-lg border border-border bg-background text-sm text-foreground" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] text-muted-foreground mb-1">Dauer (Min)</p>
                                    <select value={editItem.item.duration}
                                        onChange={e => setEditItem(prev => ({
                                            ...prev,
                                            item: { ...prev.item, duration: Number(e.target.value) }
                                        }))}
                                        className="w-full h-9 px-2 rounded-lg border border-border bg-background text-sm text-foreground">
                                        {[15, 30, 45, 60, 90, 120].map(m => (
                                            <option key={m} value={m}>{m < 60 ? `${m} Min` : `${m / 60} Std`}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => {
                                        updateAppointment.mutate({
                                            id: editItem.item.id,
                                            data: {
                                                title:      editItem.item.title,
                                                start_time: editItem.item.start_time,
                                                duration:   editItem.item.duration,
                                                end_time:   minutesToTime(timeToMinutes(editItem.item.start_time) + editItem.item.duration),
                                            }
                                        });
                                        setEditItem(null);
                                    }}
                                    className="flex-1 h-9 bg-amber-600 hover:bg-amber-700 text-white text-sm">
                                    Speichern
                                </Button>
                                <Button variant="outline" size="sm"
                                    onClick={() => {
                                        deleteAppointment.mutate(editItem.item.id);
                                        setEditItem(null);
                                    }}
                                    className="h-9 text-red-400 border-red-500/30 hover:bg-red-500/10">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                    {editItem?.type === 'todo' && (
                        <div className="space-y-3">
                            <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                                <p className="font-semibold text-foreground text-sm">{editItem.item.title}</p>
                                {editItem.item.description && (
                                    <p className="text-xs text-muted-foreground mt-1">{editItem.item.description}</p>
                                )}
                                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                                    {editItem.item.planned_time && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />{editItem.item.planned_time} Uhr
                                        </span>
                                    )}
                                    {editItem.item.category && (
                                        <Badge variant="outline" className="text-[10px] h-4">{editItem.item.category}</Badge>
                                    )}
                                </div>
                            </div>
                            <Button variant="outline"
                                onClick={() => {
                                    deleteTodoPlanning(editItem.item);
                                    setEditItem(null);
                                }}
                                className="w-full h-9 text-sm text-muted-foreground hover:text-foreground">
                                Aus Wochenplan entfernen
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}