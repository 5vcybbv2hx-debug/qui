import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    CheckCircle2, Circle, Plus, Tv, History, ChevronDown, ChevronUp,
    ClipboardCheck, AlertCircle, Lock, Unlock, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/components/auth/usePermissions';

const CATEGORY_COLORS = {
    Kasse:     'bg-amber-500/15 border-amber-500/30 text-amber-400',
    Bar:       'bg-blue-500/15 border-blue-500/30 text-blue-400',
    Küche:     'bg-orange-500/15 border-orange-500/30 text-orange-400',
    Reinigung: 'bg-green-500/15 border-green-500/30 text-green-400',
    Sicherheit:'bg-red-500/15 border-red-500/30 text-red-400',
    Sonstiges: 'bg-slate-500/15 border-slate-500/30 text-slate-400',
};

export default function Closing() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [currentUser, setCurrentUser] = useState(null);
    const [activeSession, setActiveSession] = useState(null);
    const [itemStates, setItemStates] = useState({}); // { taskId: { done, value } }
    const [notes, setNotes] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', category: 'Kasse', order: 0 });
    const [collapsedCats, setCollapsedCats] = useState({});

    useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

    const { data: tasks = [] } = useQuery({
        queryKey: ['closing-tasks'],
        queryFn: () => base44.entities.ClosingTask.filter({ is_active: true }, 'order')
    });

    const { data: sessions = [] } = useQuery({
        queryKey: ['closing-sessions'],
        queryFn: () => base44.entities.ClosingSession.list('-date', 30)
    });

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todaySession = sessions.find(s => s.date === todayStr);

    // Load today's session state
    useEffect(() => {
        if (todaySession) {
            setActiveSession(todaySession);
            const states = {};
            (todaySession.items || []).forEach(item => {
                states[item.task_id] = { done: item.done, value: item.value || '' };
            });
            setItemStates(states);
            setNotes(todaySession.notes || '');
        }
    }, [todaySession?.id]);

    const sessionMutation = useMutation({
        mutationFn: ({ id, data }) => id
            ? base44.entities.ClosingSession.update(id, data)
            : base44.entities.ClosingSession.create(data),
        onSuccess: () => queryClient.invalidateQueries(['closing-sessions'])
    });

    const createTaskMutation = useMutation({
        mutationFn: (data) => base44.entities.ClosingTask.create(data),
        onSuccess: () => { queryClient.invalidateQueries(['closing-tasks']); setTaskModalOpen(false); }
    });

    const buildItems = (states) => tasks.map(t => ({
        task_id: t.id,
        title: t.title,
        category: t.category,
        done: states[t.id]?.done || false,
        value: states[t.id]?.value || '',
        done_by: states[t.id]?.done ? (currentUser?.full_name || currentUser?.email || '') : null,
        done_at: states[t.id]?.done ? new Date().toISOString() : null,
    }));

    const saveSession = async (states, isComplete = false) => {
        const items = buildItems(states);
        const done = items.filter(i => i.done).length;
        const rate = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
        const data = {
            date: todayStr,
            items,
            notes,
            completion_rate: rate,
            is_complete: isComplete,
            started_by: activeSession?.started_by || currentUser?.full_name || currentUser?.email,
            started_at: activeSession?.started_at || new Date().toISOString(),
            ...(isComplete ? {
                completed_by: currentUser?.full_name || currentUser?.email,
                completed_at: new Date().toISOString()
            } : {})
        };
        await sessionMutation.mutateAsync({ id: activeSession?.id, data });
    };

    const toggleTask = async (task) => {
        const newStates = {
            ...itemStates,
            [task.id]: { done: !itemStates[task.id]?.done, value: itemStates[task.id]?.value || '' }
        };
        setItemStates(newStates);
        await saveSession(newStates);
    };

    const setValue = (taskId, value) => {
        setItemStates(prev => ({ ...prev, [taskId]: { ...prev[taskId], value } }));
    };

    const handleFinalize = async () => {
        const undone = tasks.filter(t => !itemStates[t.id]?.done);
        if (undone.length > 0 && !confirm(`Noch ${undone.length} Aufgaben offen. Trotzdem abschließen?`)) return;
        await saveSession(itemStates, true);
    };

    const handleReopen = async () => {
        await sessionMutation.mutateAsync({ id: activeSession.id, data: { is_complete: false, completed_at: null } });
    };

    const categories = [...new Set(tasks.map(t => t.category))];
    const doneCount = tasks.filter(t => itemStates[t.id]?.done).length;
    const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
    const isFinalized = activeSession?.is_complete;

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Tagesabschluss</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('/ClosingDisplay', '_blank')}
                            className="gap-1.5 text-xs"
                        >
                            <Tv className="w-3.5 h-3.5" />
                            TV
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowHistory(h => !h)}
                            className="gap-1.5 text-xs"
                        >
                            <History className="w-3.5 h-3.5" />
                            Verlauf
                        </Button>
                        {permissions.isManager && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTaskModalOpen(true)}
                                className="gap-1.5 text-xs"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Aufgabe
                            </Button>
                        )}
                    </div>
                </div>

                {/* Progress Card */}
                <div className={cn(
                    'rounded-2xl border p-5 mb-6 transition-all',
                    isFinalized ? 'bg-green-500/10 border-green-500/30' : 'bg-card border-border'
                )}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {isFinalized
                                ? <Lock className="w-5 h-5 text-green-500" />
                                : <ClipboardCheck className="w-5 h-5 text-amber-500" />
                            }
                            <span className="font-semibold text-foreground">
                                {isFinalized ? 'Abgeschlossen' : 'Fortschritt'}
                            </span>
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
                        {doneCount} von {tasks.length} Aufgaben erledigt
                        {isFinalized && activeSession?.completed_by && (
                            <span className="ml-2 text-green-400">· abgeschlossen von {activeSession.completed_by}</span>
                        )}
                    </p>
                </div>

                {/* History Panel */}
                {showHistory && (
                    <div className="mb-6 border border-border rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-card border-b border-border">
                            <h3 className="font-semibold text-foreground text-sm">Letzte Abschlüsse</h3>
                        </div>
                        {sessions.filter(s => s.date !== todayStr).slice(0, 10).map(s => (
                            <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-0">
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        {format(new Date(s.date), 'dd.MM.yyyy', { locale: de })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {s.completed_by || s.started_by || '–'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-sm font-bold text-foreground">{s.completion_rate ?? '?'}%</div>
                                    {s.is_complete
                                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        : <AlertCircle className="w-4 h-4 text-amber-500" />
                                    }
                                </div>
                            </div>
                        ))}
                        {sessions.filter(s => s.date !== todayStr).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-6">Noch keine früheren Abschlüsse</p>
                        )}
                    </div>
                )}

                {/* Checklists by Category */}
                {categories.map(cat => {
                    const catTasks = tasks.filter(t => t.category === cat);
                    const catDone = catTasks.filter(t => itemStates[t.id]?.done).length;
                    const collapsed = collapsedCats[cat];
                    return (
                        <div key={cat} className="mb-4 border border-border rounded-xl overflow-hidden">
                            <button
                                onClick={() => setCollapsedCats(p => ({ ...p, [cat]: !p[cat] }))}
                                className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/30 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Badge className={cn('text-xs border', CATEGORY_COLORS[cat] || CATEGORY_COLORS.Sonstiges)}>{cat}</Badge>
                                    <span className="text-sm text-muted-foreground">{catDone}/{catTasks.length}</span>
                                </div>
                                {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
                            </button>

                            {!collapsed && (
                                <div className="divide-y divide-border/50">
                                    {catTasks.map(task => {
                                        const state = itemStates[task.id] || {};
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
                                                        {state.done && state.value && (
                                                            <p className="text-xs text-muted-foreground mt-0.5">Wert: {state.value}</p>
                                                        )}
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

                {tasks.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                        <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Noch keine Aufgaben</p>
                        <p className="text-sm mt-1">Füge Aufgaben über „+ Aufgabe" hinzu</p>
                    </div>
                )}

                {/* Notes */}
                <div className="mt-4">
                    <Textarea
                        placeholder="Notizen zum heutigen Abschluss..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        onBlur={() => saveSession(itemStates)}
                        disabled={isFinalized}
                        rows={3}
                        className="text-sm"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                    {isFinalized ? (
                        <Button variant="outline" onClick={handleReopen} className="flex-1 gap-2">
                            <Unlock className="w-4 h-4" />
                            Wieder öffnen
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => saveSession(itemStates)} className="gap-2">
                                <RefreshCw className="w-4 h-4" />
                                Speichern
                            </Button>
                            <Button
                                onClick={handleFinalize}
                                className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                                disabled={doneCount === 0}
                            >
                                <Lock className="w-4 h-4" />
                                Abschluss bestätigen
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Add Task Modal */}
            <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Neue Abschluss-Aufgabe</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-2">
                        <Input
                            placeholder="Aufgabentitel"
                            value={newTask.title}
                            onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                        />
                        <select
                            value={newTask.category}
                            onChange={e => setNewTask(p => ({ ...p, category: e.target.value }))}
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                        >
                            {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="req-val"
                                checked={newTask.requires_value}
                                onChange={e => setNewTask(p => ({ ...p, requires_value: e.target.checked }))}
                            />
                            <label htmlFor="req-val" className="text-sm text-foreground">Wert erforderlich</label>
                        </div>
                        {newTask.requires_value && (
                            <Input
                                placeholder="Feldbezeichnung (z.B. Betrag in €)"
                                value={newTask.value_label || ''}
                                onChange={e => setNewTask(p => ({ ...p, value_label: e.target.value }))}
                            />
                        )}
                        <div className="flex gap-2 pt-1">
                            <Button variant="outline" onClick={() => setTaskModalOpen(false)} className="flex-1">Abbrechen</Button>
                            <Button
                                onClick={() => createTaskMutation.mutate(newTask)}
                                disabled={!newTask.title}
                                className="flex-1 bg-amber-600 hover:bg-amber-700"
                            >
                                Hinzufügen
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}