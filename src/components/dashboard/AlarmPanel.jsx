import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Clock, AlertTriangle, Users, MessageSquare, Sparkles,
    ChevronDown, ChevronUp, Check, ArrowRight, Pin, Wrench, ShieldAlert
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast, differenceInHours } from 'date-fns';
import { de } from 'date-fns/locale';

// ─── Scoring engine ───────────────────────────────────────────────────────────

const PRIORITY_SCORE = { kritisch: 100, hoch: 60, normal: 20, niedrig: 5 };

function timeScore(dateStr) {
    if (!dateStr) return 10;
    const d = new Date(dateStr);
    if (isToday(d)) return 50;
    if (isTomorrow(d)) return 25;
    if (isPast(d)) return 5;
    const hours = differenceInHours(d, new Date());
    if (hours <= 48) return 20;
    return 8;
}

function calcScore(priorityKey, dateStr) {
    return (PRIORITY_SCORE[priorityKey] || 20) + timeScore(dateStr);
}

// Only show entries scoring above threshold (critical=100+, high=60+)
const MIN_SCORE = 60;

// ─── Level config ─────────────────────────────────────────────────────────────
const LEVEL = {
    kritisch: { border: 'border-red-500/50', bg: 'bg-red-500/8', dot: 'bg-red-500', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'KRITISCH' },
    hoch:     { border: 'border-amber-500/40', bg: 'bg-amber-500/8', dot: 'bg-amber-400', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'HOCH' },
    normal:   { border: 'border-border', bg: 'bg-card', dot: 'bg-muted-foreground', text: 'text-muted-foreground', badge: 'bg-secondary text-muted-foreground border-border', label: 'INFO' },
};

// ─── AlarmItem ────────────────────────────────────────────────────────────────
function AlarmItem({ level = 'hoch', icon: Icon, title, sub, action, to, score }) {
    const s = LEVEL[level] || LEVEL.hoch;
    const inner = (
        <div className={cn(
            'flex items-center gap-3 rounded-xl border px-4 py-3 min-h-[56px] transition-all',
            s.border, s.bg,
            to && 'hover:opacity-80 active:scale-[0.99]'
        )}>
            <span className={cn('w-2 h-2 rounded-full shrink-0 shadow-sm', s.dot,
                level === 'kritisch' && 'animate-pulse shadow-red-500/50'
            )} />
            <Icon className={cn('w-4 h-4 shrink-0', s.text)} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight truncate">{title}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
            {!action && to && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        </div>
    );
    return to ? <Link to={to}>{inner}</Link> : inner;
}

// ─── ApproveButton (isolated so hook is always called) ─────────────────────
function ApproveButton({ entryId }) {
    const queryClient = useQueryClient();
    const approveMutation = useMutation({
        mutationFn: (id) => base44.entities.TimeEntry.update(id, {
            status: 'genehmigt',
            manager_approved_at: new Date().toISOString()
        }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-time-entries'] })
    });
    return (
        <Button
            size="sm"
            onClick={() => approveMutation.mutate(entryId)}
            disabled={approveMutation.isPending}
            className="h-10 min-w-[72px] bg-green-600 hover:bg-green-700 text-white text-xs gap-1 shrink-0"
        >
            <Check className="w-3.5 h-3.5" />OK
        </Button>
    );
}

// ─── 1. Zeiterfassungen ───────────────────────────────────────────────────────
function TimeItems({ entries }) {
    // Always critical — score = 150
    return entries.map(e => ({
        key: e.id,
        score: 150,
        level: 'kritisch',
        render: (
            <div key={e.id} className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3 min-h-[56px]',
                LEVEL.kritisch.border, LEVEL.kritisch.bg
            )}>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-500/50 shrink-0" />
                <Clock className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{e.employee_name}</p>
                    <p className="text-xs text-muted-foreground">
                        {format(parseISO(e.date), 'EEE, dd.MM.', { locale: de })} · {e.start_time}–{e.end_time}
                        {e.total_hours != null && <span className="ml-1 font-medium text-foreground">({e.total_hours}h)</span>}
                    </p>
                </div>
                <ApproveButton entryId={e.id} />
            </div>
        )
    }));
}

// ─── 2. Wartung / Defekte ─────────────────────────────────────────────────────
function maintenanceItems(tasks) {
    return tasks
        .filter(t => t.next_due_date && isPast(new Date(t.next_due_date)))
        .map(t => {
            const s = calcScore('kritisch', t.next_due_date);
            return {
                key: `maint-${t.id}`,
                score: s,
                level: 'kritisch',
                render: (
                    <AlarmItem key={`maint-${t.id}`}
                        level="kritisch" icon={Wrench} title={t.title}
                        sub={`Überfällig seit ${format(parseISO(t.next_due_date), 'dd.MM.yyyy')}`}
                        to={createPageUrl('Maintenance')}
                    />
                )
            };
        })
        .filter(i => i.score >= MIN_SCORE);
}

// ─── 3. Personal ──────────────────────────────────────────────────────────────
function staffingItem(todayShifts) {
    if (todayShifts.length === 0) {
        return [{
            key: 'staffing-none',
            score: 130,
            level: 'kritisch',
            render: (
                <AlarmItem key="staffing-none" level="kritisch" icon={Users}
                    title="Keine Schichten für heute"
                    sub="Niemand ist eingeplant — sofort handeln"
                    to={createPageUrl('Calendar')}
                />
            )
        }];
    }
    if (todayShifts.length === 1) {
        return [{
            key: 'staffing-low',
            score: 90,
            level: 'hoch',
            render: (
                <AlarmItem key="staffing-low" level="hoch" icon={Users}
                    title="Unterbesetzung heute"
                    sub="Nur 1 Mitarbeiter eingeplant"
                    to={createPageUrl('Calendar')}
                />
            )
        }];
    }
    return [];
}

// ─── 4. Team-Notizen ──────────────────────────────────────────────────────────
function noteItems(notes) {
    return notes
        .filter(n =>
            n.status !== 'archiviert' &&
            n.status !== 'erledigt' &&
            (n.is_pinned || n.priority === 'dringend' || n.priority === 'wichtig')
        )
        .map(n => {
            const prio = n.priority === 'dringend' ? 'kritisch' : 'hoch';
            const s = calcScore(n.is_pinned ? 'hoch' : prio, n.created_date);
            if (s < MIN_SCORE) return null;
            return {
                key: `note-${n.id}`,
                score: s,
                level: prio,
                render: (
                    <div key={`note-${n.id}`} className={cn(
                        'rounded-xl border px-4 py-3 min-h-[56px]',
                        prio === 'kritisch' ? 'border-red-500/40 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'
                    )}>
                        <div className="flex items-start gap-2">
                            {n.is_pinned && <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />}
                            {n.priority === 'dringend' && <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />}
                            <div className="flex-1 min-w-0">
                                {n.title && <p className="text-xs font-bold text-foreground mb-0.5">{n.title}</p>}
                                <p className="text-sm text-foreground/90 line-clamp-2">{n.message}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">{n.author_name}</p>
                            </div>
                        </div>
                    </div>
                )
            };
        })
        .filter(Boolean);
}

// ─── 5. Events heute ──────────────────────────────────────────────────────────
function eventItems(todayEvents) {
    return todayEvents.map(e => ({
        key: `event-${e.id}`,
        score: calcScore('hoch', e.date),
        level: 'hoch',
        render: (
            <AlarmItem key={`event-${e.id}`} level="hoch" icon={Sparkles}
                title={e.title}
                sub={[e.start_time && `🕐 ${e.start_time}`, e.expected_guests && `👥 ${e.expected_guests} Gäste`].filter(Boolean).join(' · ')}
                to={createPageUrl('Events')}
            />
        )
    }));
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export default function AlarmPanel({ pendingTimeEntries, maintenanceTasks, todayShifts, employees, todayEvents }) {
    const [showAll, setShowAll] = useState(false);

    const { data: notes = [] } = useQuery({
        queryKey: ['team-notes-alarm'],
        queryFn: () => base44.entities.TeamNote.list('-created_date', 50),
        staleTime: 60000
    });

    const allItems = useMemo(() => {
        const timeI = TimeItems({ entries: pendingTimeEntries });
        const maintI = maintenanceItems(maintenanceTasks || []);
        const staffI = staffingItem(todayShifts);
        const noteI = noteItems(notes);
        const eventI = eventItems(todayEvents);

        return [...timeI, ...maintI, ...staffI, ...noteI, ...eventI]
            .sort((a, b) => b.score - a.score);
    }, [pendingTimeEntries, maintenanceTasks, todayShifts, notes, todayEvents]);

    const criticalCount = allItems.filter(i => i.level === 'kritisch').length;
    const visibleItems = showAll ? allItems : allItems.slice(0, 5);

    if (allItems.length === 0) {
        return (
            <section>
                <SectionHeader criticalCount={0} total={0} />
                <Card className="border-green-500/30 bg-green-500/5">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-400 shrink-0" />
                        <p className="text-sm text-green-300 font-medium">Alles in Ordnung – kein Handlungsbedarf</p>
                    </CardContent>
                </Card>
            </section>
        );
    }

    return (
        <section>
            <SectionHeader criticalCount={criticalCount} total={allItems.length} />
            <div className="space-y-2">
                {visibleItems.map(i => i.render)}
            </div>
            {allItems.length > 5 && (
                <button
                    onClick={() => setShowAll(v => !v)}
                    className="w-full mt-2 py-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                >
                    {showAll
                        ? <><ChevronUp className="w-3.5 h-3.5" />Weniger anzeigen</>
                        : <><ChevronDown className="w-3.5 h-3.5" />+{allItems.length - 5} weitere anzeigen</>}
                </button>
            )}
        </section>
    );
}

function SectionHeader({ criticalCount, total }) {
    return (
        <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className={cn('w-4 h-4', criticalCount > 0 ? 'text-red-400' : 'text-muted-foreground')} />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex-1">Alarm-Panel</h3>
            {criticalCount > 0 && (
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs animate-pulse">
                    {criticalCount} kritisch
                </Badge>
            )}
            {total > 0 && criticalCount === 0 && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">{total} offen</Badge>
            )}
        </div>
    );
}