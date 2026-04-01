import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, getDay } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    CheckCircle2, Circle, Plus, Tv, History, ChevronDown, ChevronUp,
    ClipboardCheck, AlertCircle, Lock, Unlock, RefreshCw, Layers,
    Calendar, X, ChevronRight, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/components/auth/usePermissions';

const CATEGORY_COLORS = {
    Kasse:      'bg-amber-500/15 border-amber-500/30 text-amber-400',
    Bar:        'bg-blue-500/15 border-blue-500/30 text-blue-400',
    Küche:      'bg-orange-500/15 border-orange-500/30 text-orange-400',
    Reinigung:  'bg-green-500/15 border-green-500/30 text-green-400',
    Sicherheit: 'bg-red-500/15 border-red-500/30 text-red-400',
    Sonstiges:  'bg-slate-500/15 border-slate-500/30 text-slate-400',
};

const SCHEDULE_BADGE = {
    täglich:    { label: 'Täglich',     cls: 'bg-slate-500/20 text-slate-400' },
    freitags:   { label: 'Fr',          cls: 'bg-purple-500/20 text-purple-400' },
    samstags:   { label: 'Sa',          cls: 'bg-indigo-500/20 text-indigo-400' },
    wochenende: { label: 'Fr+Sa',       cls: 'bg-violet-500/20 text-violet-400' },
    events:     { label: 'Event-Tage',  cls: 'bg-rose-500/20 text-rose-400' },
};

const ROLE_BADGE = {
    Alle:       'bg-slate-500/20 text-slate-400',
    Barkeeper:  'bg-amber-500/20 text-amber-400',
    Service:    'bg-blue-500/20 text-blue-400',
    Manager:    'bg-red-500/20 text-red-400',
};

const TEMPLATES = {
    standard: {
        label: 'Standard (täglich)',
        icon: '📋',
        tasks: [
            { title: 'Kassenstand zählen', category: 'Kasse', schedule: 'täglich', required_role: 'Manager', requires_value: true, value_label: 'Betrag in €', order: 1 },
            { title: 'Kasse abschließen', category: 'Kasse', schedule: 'täglich', required_role: 'Manager', order: 2 },
            { title: 'Trinkgeld verteilen', category: 'Kasse', schedule: 'täglich', required_role: 'Manager', order: 3 },
            { title: 'Bar aufräumen & abwischen', category: 'Bar', schedule: 'täglich', required_role: 'Barkeeper', order: 4 },
            { title: 'Schneidebrett & Werkzeug spülen', category: 'Bar', schedule: 'täglich', required_role: 'Barkeeper', order: 5 },
            { title: 'Flaschen nachfüllen prüfen', category: 'Bar', schedule: 'täglich', required_role: 'Barkeeper', order: 6 },
            { title: 'Kühlschränke kontrollieren', category: 'Bar', schedule: 'täglich', required_role: 'Barkeeper', order: 7 },
            { title: 'Tische abwischen', category: 'Reinigung', schedule: 'täglich', required_role: 'Service', order: 8 },
            { title: 'Stühle hochstellen', category: 'Reinigung', schedule: 'täglich', required_role: 'Service', order: 9 },
            { title: 'Boden fegen', category: 'Reinigung', schedule: 'täglich', required_role: 'Alle', order: 10 },
            { title: 'Toiletten kontrollieren', category: 'Reinigung', schedule: 'täglich', required_role: 'Service', order: 11 },
            { title: 'Türen & Fenster schließen', category: 'Sicherheit', schedule: 'täglich', required_role: 'Manager', order: 12 },
            { title: 'Alarm aktivieren', category: 'Sicherheit', schedule: 'täglich', required_role: 'Manager', order: 13 },
        ]
    },
    freitag: {
        label: 'Freitag-Abschluss',
        icon: '🎉',
        tasks: [
            { title: 'Wochenumsatz dokumentieren', category: 'Kasse', schedule: 'freitags', required_role: 'Manager', requires_value: true, value_label: 'Wochenumsatz €', order: 1 },
            { title: 'Bestellliste für Wochenende prüfen', category: 'Bar', schedule: 'freitags', required_role: 'Barkeeper', order: 2 },
            { title: 'Eismaschine auffüllen', category: 'Bar', schedule: 'freitags', required_role: 'Barkeeper', order: 3 },
            { title: 'Garnitur vorbereiten', category: 'Bar', schedule: 'freitags', required_role: 'Barkeeper', order: 4 },
            { title: 'Boden wischen (nass)', category: 'Reinigung', schedule: 'freitags', required_role: 'Alle', order: 5 },
            { title: 'Müll rausbringen', category: 'Reinigung', schedule: 'freitags', required_role: 'Alle', order: 6 },
        ]
    },
    samstag: {
        label: 'Samstag-Abschluss',
        icon: '🌙',
        tasks: [
            { title: 'Wochenendumsatz verbuchen', category: 'Kasse', schedule: 'samstags', required_role: 'Manager', requires_value: true, value_label: 'Umsatz €', order: 1 },
            { title: 'Lagerbestand prüfen', category: 'Bar', schedule: 'samstags', required_role: 'Barkeeper', order: 2 },
            { title: 'Spirituosen auffüllen', category: 'Bar', schedule: 'samstags', required_role: 'Barkeeper', order: 3 },
            { title: 'Tiefenreinigung Bar', category: 'Reinigung', schedule: 'samstags', required_role: 'Barkeeper', order: 4 },
            { title: 'Toiletten desinfizieren', category: 'Reinigung', schedule: 'samstags', required_role: 'Service', order: 5 },
            { title: 'Außenbereich kontrollieren', category: 'Sicherheit', schedule: 'samstags', required_role: 'Manager', order: 6 },
        ]
    },
    event: {
        label: 'Event-Abschluss',
        icon: '🎊',
        tasks: [
            { title: 'Event-Einnahmen dokumentieren', category: 'Kasse', schedule: 'events', required_role: 'Manager', requires_value: true, value_label: 'Event-Umsatz €', order: 1 },
            { title: 'Equipment einsammeln & sichern', category: 'Sonstiges', schedule: 'events', required_role: 'Alle', order: 2 },
            { title: 'Dekoration abbauen', category: 'Sonstiges', schedule: 'events', required_role: 'Service', order: 3 },
            { title: 'Möbel zurückstellen', category: 'Reinigung', schedule: 'events', required_role: 'Alle', order: 4 },
            { title: 'Sondermüll entsorgen', category: 'Reinigung', schedule: 'events', required_role: 'Alle', order: 5 },
            { title: 'Schäden dokumentieren', category: 'Sonstiges', schedule: 'events', required_role: 'Manager', order: 6 },
        ]
    }
};

// Which tasks are relevant for today
function isTaskRelevantToday(task, isEventDay) {
    const dow = getDay(new Date()); // 0=Sun,1=Mon,...,5=Fri,6=Sat
    const s = task.schedule || 'täglich';
    if (s === 'täglich') return true;
    if (s === 'freitags' && dow === 5) return true;
    if (s === 'samstags' && dow === 6) return true;
    if (s === 'wochenende' && (dow === 5 || dow === 6)) return true;
    if (s === 'events' && isEventDay) return true;
    return false;
}

export default function Closing() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [currentUser, setCurrentUser] = useState(null);
    const [activeSession, setActiveSession] = useState(null);
    const [cleaningStates, setCleaningStates] = useState({});
    const [itemStates, setItemStates] = useState({});
    const [notes, setNotes] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', category: 'Kasse', schedule: 'täglich', required_role: 'Alle', order: 0 });
    const [collapsedCats, setCollapsedCats] = useState({});
    const [roleFilter, setRoleFilter] = useState('Alle');
    const [isEventDay, setIsEventDay] = useState(false);
    const [selectedHistorySession, setSelectedHistorySession] = useState(null);

    useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

    const { data: tasks = [] } = useQuery({
        queryKey: ['closing-tasks'],
        queryFn: () => base44.entities.ClosingTask.filter({ is_active: true }, 'order')
    });

    const { data: cleaningTasks = [] } = useQuery({
        queryKey: ['cleaning-tasks-for-closing'],
        queryFn: () => base44.entities.CleaningTask.filter({ is_active: true }, 'area')
    });

    const { data: sessions = [] } = useQuery({
        queryKey: ['closing-sessions'],
        queryFn: () => base44.entities.ClosingSession.list('-date', 30)
    });

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todaySession = sessions.find(s => s.date === todayStr);
    const dow = getDay(new Date());

    // Filter tasks relevant to today + role filter
    const relevantTasks = tasks.filter(t => isTaskRelevantToday(t, isEventDay));

    // Filter cleaning tasks relevant today
    const relevantCleaningTasks = cleaningTasks.filter(t => {
        const freq = t.frequency || 'täglich';
        if (freq === 'täglich') return true;
        if (freq === 'am Wochenende' && (dow === 5 || dow === 6)) return true;
        if (freq === 'an Sonderöffnungstagen' && isEventDay) return true;
        return false;
    });
    const filteredTasks = roleFilter === 'Alle'
        ? relevantTasks
        : relevantTasks.filter(t => (t.required_role || 'Alle') === roleFilter || (t.required_role || 'Alle') === 'Alle');

    useEffect(() => {
        if (todaySession) {
            setActiveSession(todaySession);
            const states = {};
            const cleanStates = {};
            (todaySession.items || []).forEach(item => {
                if (item._type === 'cleaning') {
                    cleanStates[item.task_id] = { done: item.done };
                } else {
                    states[item.task_id] = { done: item.done, value: item.value || '' };
                }
            });
            setItemStates(states);
            setCleaningStates(cleanStates);
            setNotes(todaySession.notes || '');
        }
    }, [todaySession?.id]);

    // Sync cleaningStates from live CleaningTask data (completed today)
    useEffect(() => {
        const todayStr2 = format(new Date(), 'yyyy-MM-dd');
        const states = {};
        relevantCleaningTasks.forEach(t => {
            if (t.is_completed && t.completed_at?.startsWith(todayStr2)) {
                states[t.id] = { done: true, done_by: t.completed_by };
            }
        });
        setCleaningStates(prev => ({ ...states, ...prev }));
    }, [cleaningTasks.length]);

    const sessionMutation = useMutation({
        mutationFn: ({ id, data }) => id
            ? base44.entities.ClosingSession.update(id, data)
            : base44.entities.ClosingSession.create(data),
        onSuccess: (result) => {
            if (!activeSession) setActiveSession(result);
            queryClient.invalidateQueries({ queryKey: ['closing-sessions'] });
        }
    });

    const toggleCleaningTask = async (task) => {
        const isDone = !cleaningStates[task.id]?.done && !task.is_completed;
        const newCleanStates = {
            ...cleaningStates,
            [task.id]: { done: isDone, done_by: isDone ? (currentUser?.full_name || currentUser?.email || '') : null }
        };
        setCleaningStates(newCleanStates);
        await cleaningMutation.mutateAsync({
            id: task.id,
            data: {
                is_completed: isDone,
                completed_by: isDone ? (currentUser?.full_name || currentUser?.email || '') : null,
                completed_at: isDone ? new Date().toISOString() : null
            }
        });
        await saveSession(itemStates, false, undefined, newCleanStates);
    };

    const handleFinalize = async () => {
        const undoneClosing = relevantTasks.filter(t => !itemStates[t.id]?.done);
        const undoneCleaning = relevantCleaningTasks.filter(t => !cleaningStates[t.id]?.done && !t.is_completed);
        const undone = undoneClosing.length + undoneCleaning.length;
        if (undone > 0 && !confirm(`Noch ${undone} Aufgaben offen. Trotzdem abschließen?`)) return;
        await saveSession(itemStates, true, undefined, cleaningStates);
    };

    const handleReopen = async () => {
        await sessionMutation.mutateAsync({ id: activeSession.id, data: { is_complete: false, completed_at: null } });
    };

    const applyTemplate = async (templateKey) => {
        const template = TEMPLATES[templateKey];
        if (!template) return;
        const existing = tasks.map(t => t.title.toLowerCase());
        const toCreate = template.tasks.filter(t => !existing.includes(t.title.toLowerCase()));
        if (toCreate.length === 0) { alert('Alle Aufgaben aus diesem Template sind bereits vorhanden.'); setShowTemplates(false); return; }
        await Promise.all(toCreate.map(t => base44.entities.ClosingTask.create({ ...t, is_active: true, template_tag: templateKey })));
        queryClient.invalidateQueries({ queryKey: ['closing-tasks'] });
        setShowTemplates(false);
    };

    const categories = [...new Set(filteredTasks.map(t => t.category))];
    const cleaningDoneCount = relevantCleaningTasks.filter(t => cleaningStates[t.id]?.done || t.is_completed).length;
    const doneCount = relevantTasks.filter(t => itemStates[t.id]?.done).length + cleaningDoneCount;
    const totalCount = relevantTasks.length + relevantCleaningTasks.length;
    const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    const isFinalized = activeSession?.is_complete;
    const dayLabel = dow === 5 ? '🎉 Freitag' : dow === 6 ? '🌙 Samstag' : null;

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            Tagesabschluss
                            {dayLabel && <span className="text-base font-normal text-muted-foreground">{dayLabel}</span>}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                        <Button variant="outline" size="sm" onClick={() => window.open('/ClosingDisplay', '_blank')} className="gap-1.5 text-xs">
                            <Tv className="w-3.5 h-3.5" /> TV
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowHistory(h => !h)} className="gap-1.5 text-xs">
                            <History className="w-3.5 h-3.5" /> Verlauf
                        </Button>
                        {permissions.isManager && (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)} className="gap-1.5 text-xs">
                                    <Layers className="w-3.5 h-3.5" /> Templates
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setTaskModalOpen(true)} className="gap-1.5 text-xs">
                                    <Plus className="w-3.5 h-3.5" /> Aufgabe
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {/* Event Day Toggle */}
                    <button
                        onClick={() => setIsEventDay(e => !e)}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                            isEventDay ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        Event-Tag
                    </button>
                    {/* Role Filter */}
                    {['Alle', 'Barkeeper', 'Service', 'Manager'].map(role => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                                roleFilter === role
                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                    : 'border-border text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {role}
                        </button>
                    ))}
                    <span className="ml-auto text-xs text-muted-foreground">{filteredTasks.length} Aufgaben</span>
                </div>

                {/* Progress Card */}
                <div className={cn('rounded-2xl border p-5 mb-6 transition-all', isFinalized ? 'bg-green-500/10 border-green-500/30' : 'bg-card border-border')}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {isFinalized ? <Lock className="w-5 h-5 text-green-500" /> : <ClipboardCheck className="w-5 h-5 text-amber-500" />}
                            <span className="font-semibold text-foreground">{isFinalized ? 'Abgeschlossen' : 'Fortschritt'}</span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">{progress}%</span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden mb-3">
                        <div
                            className={cn('h-full rounded-full transition-all duration-500', isFinalized ? 'bg-green-500' : 'bg-amber-500')}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {doneCount} von {totalCount} Aufgaben erledigt
                        {isFinalized && activeSession?.completed_by && (
                            <span className="ml-2 text-green-400">· abgeschlossen von {activeSession.completed_by}</span>
                        )}
                    </p>
                </div>

                {/* History Panel */}
                {showHistory && (
                    <div className="mb-6 border border-border rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-card border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-foreground text-sm">Verlauf (letzte 30 Tage)</h3>
                            <button onClick={() => setShowHistory(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                        </div>
                        {sessions.filter(s => s.date !== todayStr).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-6">Noch keine früheren Abschlüsse</p>
                        )}
                        {sessions.filter(s => s.date !== todayStr).slice(0, 15).map(s => (
                            <div key={s.id}>
                                <button
                                    onClick={() => setSelectedHistorySession(selectedHistorySession?.id === s.id ? null : s)}
                                    className="w-full flex items-center justify-between px-4 py-3 border-b border-border/50 hover:bg-accent/30 transition-colors"
                                >
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-foreground">
                                            {format(new Date(s.date), 'EEEE, dd.MM.yyyy', { locale: de })}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {s.completed_by || s.started_by || '–'}
                                            {s.notes && <span className="ml-2 italic">· {s.notes.slice(0, 40)}{s.notes.length > 40 ? '…' : ''}</span>}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="text-sm font-bold text-foreground">{s.completion_rate ?? '?'}%</div>
                                        {s.is_complete ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                                        <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', selectedHistorySession?.id === s.id && 'rotate-90')} />
                                    </div>
                                </button>
                                {selectedHistorySession?.id === s.id && (
                                    <div className="px-4 py-3 bg-secondary/30 border-b border-border/50 space-y-1">
                                        {(s.items || []).map((item, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs">
                                                {item.done
                                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                                    : <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                }
                                                <span className={item.done ? 'text-muted-foreground line-through' : 'text-foreground'}>{item.title}</span>
                                                {item.value && <span className="text-muted-foreground ml-auto">{item.value}</span>}
                                                {item.done_by && <span className="text-muted-foreground text-right shrink-0">— {item.done_by}</span>}
                                            </div>
                                        ))}
                                        {(!s.items || s.items.length === 0) && <p className="text-xs text-muted-foreground">Keine Details gespeichert.</p>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Checklists by Category */}
                {categories.map(cat => {
                    const catTasks = filteredTasks.filter(t => t.category === cat);
                    const catDone = catTasks.filter(t => itemStates[t.id]?.done).length;
                    const allDone = catDone === catTasks.length && catTasks.length > 0;
                    const collapsed = collapsedCats[cat] !== undefined ? collapsedCats[cat] : allDone;
                    const sortedCatTasks = [...catTasks].sort((a, b) => {
                        const aDone = itemStates[a.id]?.done ? 1 : 0;
                        const bDone = itemStates[b.id]?.done ? 1 : 0;
                        return aDone - bDone;
                    });
                    return (
                        <div key={cat} className="mb-4 border border-border rounded-xl overflow-hidden">
                            <button
                                onClick={() => setCollapsedCats(p => ({ ...p, [cat]: !collapsed }))}
                                className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/30 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Badge className={cn('text-xs border', CATEGORY_COLORS[cat] || CATEGORY_COLORS.Sonstiges)}>{cat}</Badge>
                                    <span className="text-sm text-muted-foreground">{catDone}/{catTasks.length}</span>
                                    {allDone && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                </div>
                                {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
                            </button>
                            {!collapsed && (
                                <div className="divide-y divide-border/50">
                                    {sortedCatTasks.map(task => {
                                        const state = itemStates[task.id] || {};
                                        const role = task.required_role || 'Alle';
                                        const sched = task.schedule || 'täglich';
                                        return (
                                            <div key={task.id} className={cn('px-4 py-3 transition-colors', state.done ? 'bg-green-500/5' : 'bg-background')}>
                                                <button
                                                    onClick={() => !isFinalized && toggleTask(task)}
                                                    disabled={isFinalized}
                                                    className="flex items-center gap-3 w-full text-left"
                                                >
                                                    {state.done
                                                        ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                                        : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                                                    }
                                                    <div className="flex-1">
                                                        <p className={cn('text-sm font-medium', state.done ? 'line-through text-muted-foreground' : 'text-foreground')}>
                                                            {task.title}
                                                        </p>
                                                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                                            {role !== 'Alle' && (
                                                                <span className={cn('text-xs px-1.5 py-0.5 rounded-md', ROLE_BADGE[role] || ROLE_BADGE.Alle)}>{role}</span>
                                                            )}
                                                            {sched !== 'täglich' && SCHEDULE_BADGE[sched] && (
                                                                <span className={cn('text-xs px-1.5 py-0.5 rounded-md', SCHEDULE_BADGE[sched].cls)}>{SCHEDULE_BADGE[sched].label}</span>
                                                            )}
                                                            {state.done && state.value && (
                                                                <span className="text-xs text-muted-foreground">Wert: {state.value}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                                {task.requires_value && !isFinalized && (
                                                    <Input
                                                        className="mt-2 h-8 text-sm"
                                                        placeholder={task.value_label || 'Wert eingeben...'}
                                                        value={state.value || ''}
                                                        onChange={e => setValue(task.id, e.target.value)}
                                                        onBlur={() => saveSession(itemStates)}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Cleaning Tasks Section — grouped by area */}
                {relevantCleaningTasks.length > 0 && (() => {
                    const areas = [...new Set(relevantCleaningTasks.map(t => t.area || 'Sonstiges'))];
                    return (
                        <div className="mb-4">
                            <div className="flex items-center gap-2 px-1 mb-2">
                                <Sparkles className="w-4 h-4 text-green-400" />
                                <span className="text-sm font-semibold text-green-400">Reinigung</span>
                                <span className="text-sm text-muted-foreground">{cleaningDoneCount}/{relevantCleaningTasks.length}</span>
                            </div>
                            {areas.map(area => {
                                const areaTasks = relevantCleaningTasks.filter(t => (t.area || 'Sonstiges') === area);
                                const areaDone = areaTasks.filter(t => cleaningStates[t.id]?.done || t.is_completed).length;
                                const areaAllDone = areaDone === areaTasks.length && areaTasks.length > 0;
                                const collapsed = collapsedCats[`_cleaning_${area}`] !== undefined ? collapsedCats[`_cleaning_${area}`] : areaAllDone;
                                const sortedAreaTasks = [...areaTasks].sort((a, b) => {
                                    const aDone = (cleaningStates[a.id]?.done || a.is_completed) ? 1 : 0;
                                    const bDone = (cleaningStates[b.id]?.done || b.is_completed) ? 1 : 0;
                                    return aDone - bDone;
                                });
                                return (
                                    <div key={area} className="mb-3 border border-green-500/30 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => setCollapsedCats(p => ({ ...p, [`_cleaning_${area}`]: !collapsed }))}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-green-500/10 hover:bg-green-500/20 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-green-300">{area}</span>
                                                <span className="text-xs text-muted-foreground">{areaDone}/{areaTasks.length}</span>
                                                {areaAllDone && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                            </div>
                                            {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
                                        </button>
                                        {!collapsed && (
                                            <div className="divide-y divide-border/50">
                                                {sortedAreaTasks.map(task => {
                                                    const isDone = cleaningStates[task.id]?.done || task.is_completed;
                                                    const doneBy = cleaningStates[task.id]?.done_by || task.completed_by;
                                                    return (
                                                        <div key={task.id} className={cn('px-4 py-3 transition-colors', isDone ? 'bg-green-500/5' : 'bg-background')}>
                                                            <button
                                                                onClick={() => !isFinalized && toggleCleaningTask(task)}
                                                                disabled={isFinalized}
                                                                className="flex items-center gap-3 w-full text-left"
                                                            >
                                                                {isDone
                                                                    ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                                                    : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                                                                }
                                                                <div className="flex-1">
                                                                    <p className={cn('text-sm font-medium', isDone ? 'line-through text-muted-foreground' : 'text-foreground')}>
                                                                        {task.title}
                                                                    </p>
                                                                    {isDone && doneBy && (
                                                                        <span className="text-xs text-muted-foreground">— {doneBy}</span>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}

                {filteredTasks.length === 0 && relevantCleaningTasks.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                        <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Keine Aufgaben für heute</p>
                        <p className="text-sm mt-1">
                            {tasks.length === 0 ? 'Füge Aufgaben über „Templates" oder „+ Aufgabe" hinzu' : 'Passe den Filter oder Event-Tag an'}
                        </p>
                    </div>
                )}

                {/* Notes */}
                <div className="mt-4">
                    <Textarea
                        placeholder="Notizen zum heutigen Abschluss..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        onBlur={() => saveSession(itemStates, false, notes)}
                        disabled={isFinalized}
                        rows={3}
                        className="text-sm"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                    {isFinalized ? (
                        <Button variant="outline" onClick={handleReopen} className="flex-1 gap-2">
                            <Unlock className="w-4 h-4" /> Wieder öffnen
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => saveSession(itemStates)} className="gap-2">
                                <RefreshCw className="w-4 h-4" /> Speichern
                            </Button>
                            <Button
                                onClick={handleFinalize}
                                className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                                disabled={doneCount === 0}
                            >
                                <Lock className="w-4 h-4" /> Abschluss bestätigen
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Templates Modal */}
            <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Templates anwenden</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground mb-4">
                        Wähle ein Template, um vordefinierte Aufgaben hinzuzufügen. Bereits vorhandene werden übersprungen.
                    </p>
                    <div className="space-y-3">
                        {Object.entries(TEMPLATES).map(([key, tpl]) => (
                            <button
                                key={key}
                                onClick={() => applyTemplate(key)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors text-left"
                            >
                                <span className="text-2xl">{tpl.icon}</span>
                                <div className="flex-1">
                                    <p className="font-medium text-foreground text-sm">{tpl.label}</p>
                                    <p className="text-xs text-muted-foreground">{tpl.tasks.length} Aufgaben</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                        ))}
                    </div>
                    <Button variant="outline" onClick={() => setShowTemplates(false)} className="mt-2 w-full">Abbrechen</Button>
                </DialogContent>
            </Dialog>

            {/* Add Task Modal */}
            <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Neue Abschluss-Aufgabe</DialogTitle></DialogHeader>
                    <div className="space-y-3 mt-2">
                        <Input
                            placeholder="Aufgabentitel"
                            value={newTask.title}
                            onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                        />
                        <select value={newTask.category} onChange={e => setNewTask(p => ({ ...p, category: e.target.value }))}
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                            {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={newTask.schedule} onChange={e => setNewTask(p => ({ ...p, schedule: e.target.value }))}
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                            {Object.entries(SCHEDULE_BADGE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <select value={newTask.required_role} onChange={e => setNewTask(p => ({ ...p, required_role: e.target.value }))}
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                            {['Alle', 'Barkeeper', 'Service', 'Manager'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="req-val" checked={newTask.requires_value || false}
                                onChange={e => setNewTask(p => ({ ...p, requires_value: e.target.checked }))} />
                            <label htmlFor="req-val" className="text-sm text-foreground">Wert erforderlich</label>
                        </div>
                        {newTask.requires_value && (
                            <Input placeholder="Feldbezeichnung (z.B. Betrag in €)" value={newTask.value_label || ''}
                                onChange={e => setNewTask(p => ({ ...p, value_label: e.target.value }))} />
                        )}
                        <div className="flex gap-2 pt-1">
                            <Button variant="outline" onClick={() => setTaskModalOpen(false)} className="flex-1">Abbrechen</Button>
                            <Button onClick={() => createTaskMutation.mutate({ ...newTask, is_active: true })}
                                disabled={!newTask.title} className="flex-1 bg-amber-600 hover:bg-amber-700">
                                Hinzufügen
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}