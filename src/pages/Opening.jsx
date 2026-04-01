import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    CheckCircle2, Circle, Plus, History, ChevronDown, ChevronUp,
    Sun, Lock, Unlock, RefreshCw, X, ChevronRight, Play, AlertCircle
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

const ROLE_BADGE = {
    Alle:      'bg-slate-500/20 text-slate-400',
    Barkeeper: 'bg-amber-500/20 text-amber-400',
    Service:   'bg-blue-500/20 text-blue-400',
    Manager:   'bg-red-500/20 text-red-400',
};

export default function Opening() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [currentUser, setCurrentUser] = useState(null);
    const [activeSession, setActiveSession] = useState(null);
    const [started, setStarted] = useState(false);
    const [itemStates, setItemStates] = useState({});
    const [notes, setNotes] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', category: 'Kasse', required_role: 'Alle', order: 0 });
    const [collapsedCats, setCollapsedCats] = useState({});
    const [roleFilter, setRoleFilter] = useState('Alle');
    const [selectedHistorySession, setSelectedHistorySession] = useState(null);

    useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

    const { data: tasks = [] } = useQuery({
        queryKey: ['opening-tasks'],
        queryFn: () => base44.entities.OpeningTask.filter({ is_active: true }, 'order')
    });

    const { data: sessions = [] } = useQuery({
        queryKey: ['opening-sessions'],
        queryFn: () => base44.entities.OpeningSession.list('-date', 30)
    });

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todaySession = sessions.find(s => s.date === todayStr);

    useEffect(() => {
        if (todaySession) {
            setActiveSession(todaySession);
            setStarted(true);
            const states = {};
            (todaySession.items || []).forEach(item => {
                states[item.task_id] = { done: item.done, value: item.value || '' };
            });
            setItemStates(states);
            setNotes(todaySession.notes || '');
        }
    }, [todaySession?.id]);

    const filteredTasks = roleFilter === 'Alle'
        ? tasks
        : tasks.filter(t => (t.required_role || 'Alle') === roleFilter || (t.required_role || 'Alle') === 'Alle');

    const sessionMutation = useMutation({
        mutationFn: ({ id, data }) => id
            ? base44.entities.OpeningSession.update(id, data)
            : base44.entities.OpeningSession.create(data),
        onSuccess: (result) => {
            if (!activeSession?.id && result?.id) setActiveSession(result);
            queryClient.invalidateQueries({ queryKey: ['opening-sessions'] });
        }
    });

    const buildItems = (states) => tasks.map(t => ({
        task_id: t.id,
        title: t.title,
        category: t.category,
        required_role: t.required_role,
        done: states[t.id]?.done || false,
        value: states[t.id]?.value || '',
        done_by: states[t.id]?.done ? (currentUser?.full_name || currentUser?.email || '') : null,
        done_at: states[t.id]?.done ? new Date().toISOString() : null,
    }));

    const saveSession = async (states, isComplete = false, notesVal) => {
        const items = buildItems(states);
        const done = items.filter(i => i.done).length;
        const rate = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
        const data = {
            date: todayStr,
            items,
            notes: notesVal !== undefined ? notesVal : notes,
            completion_rate: rate,
            is_complete: isComplete,
            started_by: activeSession?.started_by || currentUser?.full_name || currentUser?.email,
            started_at: activeSession?.started_at || new Date().toISOString(),
            ...(isComplete ? {
                completed_by: currentUser?.full_name || currentUser?.email,
                completed_at: new Date().toISOString()
            } : {})
        };
        const result = await sessionMutation.mutateAsync({ id: activeSession?.id, data });
        if (!activeSession?.id && result?.id) setActiveSession(result);
    };

    const handleStart = async () => {
        setStarted(true);
        await saveSession({});
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

    const createTaskMutation = useMutation({
        mutationFn: (data) => base44.entities.OpeningTask.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['opening-tasks'] });
            setTaskModalOpen(false);
        }
    });

    const categories = [...new Set(filteredTasks.map(t => t.category))];
    const doneCount = tasks.filter(t => itemStates[t.id]?.done).length;
    const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
    const isFinalized = activeSession?.is_complete;

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Sun className="w-6 h-6 text-amber-400" />
                            Tageseröffnung
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                        <Button variant="outline" size="sm" onClick={() => setShowHistory(h => !h)} className="gap-1.5 text-xs">
                            <History className="w-3.5 h-3.5" /> Verlauf
                        </Button>
                        {permissions.isManager && (
                            <Button variant="outline" size="sm" onClick={() => setTaskModalOpen(true)} className="gap-1.5 text-xs">
                                <Plus className="w-3.5 h-3.5" /> Aufgabe
                            </Button>
                        )}
                    </div>
                </div>

                {/* Manual Start Gate */}
                {!started && (
                    <div className="text-center py-16 border border-dashed border-border rounded-2xl mb-6">
                        <Sun className="w-16 h-16 mx-auto mb-4 text-amber-400 opacity-70" />
                        <h2 className="text-xl font-bold text-foreground mb-2">Eröffnung starten</h2>
                        <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                            Starte die Tageseröffnung manuell, um die Checkliste zu beginnen.
                        </p>
                        <Button onClick={handleStart} className="bg-amber-500 hover:bg-amber-600 gap-2 px-6">
                            <Play className="w-4 h-4" /> Eröffnung starten
                        </Button>
                        {tasks.length === 0 && permissions.isManager && (
                            <p className="text-xs text-muted-foreground mt-4">
                                Noch keine Aufgaben – füge sie über „+ Aufgabe" hinzu.
                            </p>
                        )}
                    </div>
                )}

                {/* Role Filter (only when started) */}
                {started && (
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
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
                )}

                {/* Progress Card */}
                {started && (
                    <div className={cn('rounded-2xl border p-5 mb-6 transition-all', isFinalized ? 'bg-green-500/10 border-green-500/30' : 'bg-card border-border')}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {isFinalized ? <Lock className="w-5 h-5 text-green-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
                                <span className="font-semibold text-foreground">{isFinalized ? 'Eröffnung abgeschlossen' : 'Fortschritt'}</span>
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
                            {activeSession?.started_by && (
                                <span className="ml-2 text-muted-foreground/70">· gestartet von {activeSession.started_by}</span>
                            )}
                            {isFinalized && activeSession?.completed_by && (
                                <span className="ml-2 text-green-400">· abgeschlossen von {activeSession.completed_by}</span>
                            )}
                        </p>
                    </div>
                )}

                {/* History Panel */}
                {showHistory && (
                    <div className="mb-6 border border-border rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-card border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-foreground text-sm">Verlauf (letzte 30 Tage)</h3>
                            <button onClick={() => setShowHistory(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                        </div>
                        {sessions.filter(s => s.date !== todayStr).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-6">Noch keine früheren Eröffnungen</p>
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

                {/* Checklists */}
                {started && categories.map(cat => {
                    const catTasks = filteredTasks.filter(t => t.category === cat);
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
                                        const role = task.required_role || 'Alle';
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
                                                        {role !== 'Alle' && (
                                                            <span className={cn('text-xs px-1.5 py-0.5 rounded-md mt-0.5 inline-block', ROLE_BADGE[role] || ROLE_BADGE.Alle)}>{role}</span>
                                                        )}
                                                        {state.done && state.value && (
                                                            <span className="text-xs text-muted-foreground ml-1">Wert: {state.value}</span>
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

                {started && tasks.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                        <Sun className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Noch keine Aufgaben</p>
                        <p className="text-sm mt-1">Füge Aufgaben über „+ Aufgabe" hinzu</p>
                    </div>
                )}

                {/* Notes */}
                {started && (
                    <div className="mt-4">
                        <Textarea
                            placeholder="Notizen zur heutigen Eröffnung..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            onBlur={() => saveSession(itemStates, false, notes)}
                            disabled={isFinalized}
                            rows={3}
                            className="text-sm"
                        />
                    </div>
                )}

                {/* Action Buttons */}
                {started && (
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
                                    <Lock className="w-4 h-4" /> Eröffnung abschließen
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Add Task Modal */}
            <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Neue Eröffnungs-Aufgabe</DialogTitle></DialogHeader>
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
                        <select value={newTask.required_role} onChange={e => setNewTask(p => ({ ...p, required_role: e.target.value }))}
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                            {['Alle', 'Barkeeper', 'Service', 'Manager'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="req-val-o" checked={newTask.requires_value || false}
                                onChange={e => setNewTask(p => ({ ...p, requires_value: e.target.checked }))} />
                            <label htmlFor="req-val-o" className="text-sm text-foreground">Wert erforderlich</label>
                        </div>
                        {newTask.requires_value && (
                            <Input placeholder="Feldbezeichnung (z.B. Kassenstand €)" value={newTask.value_label || ''}
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