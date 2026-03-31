import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CheckCircle2, Circle, Lock, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS = {
    Kasse:     'text-amber-400',
    Bar:       'text-blue-400',
    Küche:     'text-orange-400',
    Reinigung: 'text-green-400',
    Sicherheit:'text-red-400',
    Sonstiges: 'text-slate-400',
};

export default function ClosingDisplay() {
    const [session, setSession] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [now, setNow] = useState(new Date());

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const load = async () => {
        const [allTasks, sessions] = await Promise.all([
            base44.entities.ClosingTask.filter({ is_active: true }, 'order'),
            base44.entities.ClosingSession.filter({ date: todayStr }, '-created_date')
        ]);
        setTasks(allTasks);
        if (sessions.length > 0) setSession(sessions[0]);
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 15000); // refresh every 15s
        const clock = setInterval(() => setNow(new Date()), 1000);
        return () => { clearInterval(interval); clearInterval(clock); };
    }, []);

    const itemMap = {};
    (session?.items || []).forEach(i => { itemMap[i.task_id] = i; });

    const doneCount = (session?.items || []).filter(i => i.done).length;
    const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
    const isFinalized = session?.is_complete;

    const categories = [...new Set(tasks.map(t => t.category))];

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center justify-between px-10 py-5 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <ClipboardCheck className="w-8 h-8 text-amber-500" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Tagesabschluss</h1>
                        <p className="text-sm text-slate-400">{format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-4xl font-mono font-bold text-amber-400">{format(now, 'HH:mm')}</p>
                    <p className="text-sm text-slate-400">{format(now, 'ss')} Sek.</p>
                </div>
            </div>

            {/* Progress */}
            <div className={cn('px-10 py-4 flex items-center gap-6 border-b border-white/10', isFinalized ? 'bg-green-900/20' : 'bg-amber-900/10')}>
                <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={cn('h-full rounded-full transition-all duration-700', isFinalized ? 'bg-green-500' : 'bg-amber-500')}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="text-right shrink-0">
                    <span className="text-3xl font-bold text-white">{progress}%</span>
                    <p className="text-sm text-slate-400">{doneCount} / {tasks.length}</p>
                </div>
                {isFinalized && (
                    <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/40 rounded-xl px-4 py-2">
                        <Lock className="w-5 h-5 text-green-400" />
                        <span className="font-semibold text-green-300">Abgeschlossen</span>
                    </div>
                )}
            </div>

            {/* Task grid */}
            <div className="flex-1 px-10 py-6 grid gap-6 overflow-auto" style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 3)}, 1fr)` }}>
                {categories.map(cat => {
                    const catTasks = tasks.filter(t => t.category === cat);
                    const pendingTasks = catTasks.filter(t => !itemMap[t.id]?.done);
                    const doneTasks = catTasks.filter(t => itemMap[t.id]?.done);
                    const catDone = doneTasks.length;
                    const allDone = catDone === catTasks.length && catTasks.length > 0;
                    return (
                        <div key={cat} className={cn('bg-slate-900 rounded-2xl border overflow-hidden', allDone ? 'border-green-500/30' : 'border-white/10')}>
                            <div className={cn('px-5 py-3 border-b flex items-center justify-between', allDone ? 'border-green-500/20 bg-green-900/20' : 'border-white/10')}>
                                <div className="flex items-center gap-2">
                                    {allDone && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                                    <span className={cn('font-bold text-base', CATEGORY_COLORS[cat] || 'text-slate-300')}>{cat}</span>
                                </div>
                                <span className="text-sm text-slate-400">{catDone}/{catTasks.length}</span>
                            </div>
                            <div className="p-3 space-y-2">
                                {/* Pending tasks first */}
                                {pendingTasks.map(task => (
                                    <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/80 border border-white/5">
                                        <Circle className="w-5 h-5 text-amber-400 shrink-0" />
                                        <p className="text-sm font-semibold text-white truncate">{task.title}</p>
                                    </div>
                                ))}
                                {/* Done tasks below, smaller */}
                                {doneTasks.length > 0 && pendingTasks.length > 0 && (
                                    <div className="border-t border-white/5 my-1" />
                                )}
                                {doneTasks.map(task => {
                                    const item = itemMap[task.id];
                                    return (
                                        <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-green-500/5">
                                            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-slate-500 line-through truncate">{task.title}</p>
                                                {item?.done_by && <p className="text-xs text-slate-600 truncate">{item.done_by}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            {session?.notes && (
                <div className="px-10 py-4 border-t border-white/10 bg-slate-900/50">
                    <p className="text-sm text-slate-400">📝 {session.notes}</p>
                </div>
            )}
        </div>
    );
}