import React, { useState } from 'react';
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
    ChevronDown, ChevronUp, Check, ArrowRight, Pin, Wrench
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

// ─── Section wrapper ─────────────────────────────────────────────────────────
function AlarmSection({ level = 'critical', icon: Icon, title, badge, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);

    const levelStyles = {
        critical: { border: 'border-red-500/40', bg: 'bg-red-500/5', dot: 'bg-red-500', text: 'text-red-400', badgeBg: 'bg-red-500/20 text-red-300 border-red-500/30' },
        warning:  { border: 'border-amber-500/40', bg: 'bg-amber-500/5', dot: 'bg-amber-500', text: 'text-amber-400', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
        info:     { border: 'border-blue-500/30', bg: 'bg-blue-500/5', dot: 'bg-blue-400', text: 'text-blue-400', badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
        neutral:  { border: 'border-border', bg: 'bg-card', dot: 'bg-muted-foreground', text: 'text-muted-foreground', badgeBg: 'bg-secondary text-muted-foreground border-border' },
    };

    const s = levelStyles[level];

    return (
        <div className={cn('rounded-xl border overflow-hidden', s.border, s.bg)}>
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left min-h-[52px]"
            >
                <span className={cn('w-2 h-2 rounded-full shrink-0', s.dot)} />
                <Icon className={cn('w-4 h-4 shrink-0', s.text)} />
                <span className="text-sm font-bold text-foreground flex-1">{title}</span>
                {badge != null && badge > 0 && (
                    <Badge className={cn('text-xs font-bold mr-1', s.badgeBg)}>{badge}</Badge>
                )}
                {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>
            {open && (
                <div className="px-3 pb-3 space-y-2">
                    {children}
                </div>
            )}
        </div>
    );
}

// ─── 1. Zeiterfassungen ───────────────────────────────────────────────────────
function TimeSection({ entries }) {
    const queryClient = useQueryClient();

    const approveMutation = useMutation({
        mutationFn: (id) => base44.entities.TimeEntry.update(id, {
            status: 'genehmigt',
            manager_approved_at: new Date().toISOString()
        }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-time-entries'] })
    });

    if (!entries.length) return null;

    return (
        <AlarmSection level="critical" icon={Clock} title="Zeiterfassungen bestätigen" badge={entries.length}>
            {entries.slice(0, 5).map(e => (
                <div key={e.id} className="flex items-center gap-3 bg-background/60 rounded-lg p-3 min-h-[52px]">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{e.employee_name}</p>
                        <p className="text-xs text-muted-foreground">
                            {format(parseISO(e.date), 'EEE, dd.MM.', { locale: de })} · {e.start_time}–{e.end_time}
                            {e.total_hours && <span className="ml-1 text-foreground font-medium">({e.total_hours}h)</span>}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(e.id)}
                        disabled={approveMutation.isPending}
                        className="h-9 min-w-[80px] bg-green-600 hover:bg-green-700 text-white text-xs gap-1 shrink-0"
                    >
                        <Check className="w-3.5 h-3.5" />OK
                    </Button>
                </div>
            ))}
            {entries.length > 5 && (
                <Link to={createPageUrl('TimeManagement')} className="block text-center text-xs text-red-400 hover:text-red-300 py-2">
                    +{entries.length - 5} weitere →
                </Link>
            )}
        </AlarmSection>
    );
}

// ─── 2. Wartung / Defekte ─────────────────────────────────────────────────────
function MaintenanceSection({ tasks }) {
    const overdue = tasks.filter(t => {
        if (!t.next_due_date) return false;
        return new Date(t.next_due_date) <= new Date();
    });
    if (!overdue.length) return null;

    return (
        <AlarmSection level="critical" icon={Wrench} title="Defekte & Wartung überfällig" badge={overdue.length}>
            {overdue.slice(0, 4).map(t => (
                <Link key={t.id} to={createPageUrl('Maintenance')}>
                    <div className="flex items-center gap-3 bg-background/60 rounded-lg p-3 hover:bg-background min-h-[52px]">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                            <p className="text-xs text-red-300">Fällig: {format(parseISO(t.next_due_date), 'dd.MM.yyyy')}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                </Link>
            ))}
        </AlarmSection>
    );
}

// ─── 3. Personal / Unterbesetzung ─────────────────────────────────────────────
function StaffingSection({ todayShifts, employees }) {
    const staffedToday = new Set(todayShifts.map(s => s.employee_id)).size;
    const totalActive = employees.length;
    const isUnderstaffed = todayShifts.length === 0 && totalActive > 0;
    const lowStaff = todayShifts.length > 0 && todayShifts.length < 2;

    if (!isUnderstaffed && !lowStaff) return null;

    return (
        <AlarmSection level="warning" icon={Users} title="Personalbesetzung" defaultOpen={true}>
            <div className="bg-background/60 rounded-lg p-3">
                {isUnderstaffed ? (
                    <p className="text-sm text-amber-300 font-medium">⚠ Keine Schichten für heute eingetragen</p>
                ) : (
                    <p className="text-sm text-amber-300 font-medium">⚠ Nur {todayShifts.length} Mitarbeiter eingeplant</p>
                )}
                <Link to={createPageUrl('Calendar')} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1">
                    Schichtplan öffnen <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
        </AlarmSection>
    );
}

// ─── 4. Wichtige Team-Notizen ─────────────────────────────────────────────────
function TeamNotesSection() {
    const { data: notes = [] } = useQuery({
        queryKey: ['team-notes-alarm'],
        queryFn: () => base44.entities.TeamNote.list('-created_date', 50),
        staleTime: 60000
    });

    const critical = notes.filter(n =>
        n.status !== 'archiviert' &&
        n.status !== 'erledigt' &&
        (n.is_pinned || n.priority === 'dringend' || n.priority === 'wichtig')
    );

    if (!critical.length) return null;

    return (
        <AlarmSection level="warning" icon={MessageSquare} title="Wichtige Team-Notizen" badge={critical.length}>
            {critical.slice(0, 3).map(n => (
                <div key={n.id} className={cn(
                    'rounded-lg p-3 min-h-[52px]',
                    n.priority === 'dringend' ? 'bg-red-500/10 border border-red-500/20' :
                    n.is_pinned ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-background/60'
                )}>
                    <div className="flex items-start gap-2">
                        {n.is_pinned && <Pin className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />}
                        {n.priority === 'dringend' && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                            {n.title && <p className="text-xs font-semibold text-foreground">{n.title}</p>}
                            <p className="text-xs text-foreground/80 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{n.author_name}</p>
                        </div>
                    </div>
                </div>
            ))}
            {critical.length > 3 && (
                <p className="text-xs text-center text-muted-foreground py-1">+{critical.length - 3} weitere im Team-Tab</p>
            )}
        </AlarmSection>
    );
}

// ─── 5. Heutige Events ────────────────────────────────────────────────────────
function EventsSection({ todayEvents }) {
    if (!todayEvents.length) return null;

    return (
        <AlarmSection level="info" icon={Sparkles} title="Events heute" badge={todayEvents.length} defaultOpen={true}>
            {todayEvents.map(e => (
                <Link key={e.id} to={createPageUrl('Events')}>
                    <div className="flex items-center gap-3 bg-background/60 rounded-lg p-3 hover:bg-background min-h-[52px]">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                {e.start_time && <span>🕐 {e.start_time}</span>}
                                {e.expected_guests && <span>👥 {e.expected_guests} Gäste</span>}
                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">{e.event_type}</Badge>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                </Link>
            ))}
        </AlarmSection>
    );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export default function AlarmPanel({ pendingTimeEntries, maintenanceTasks, todayShifts, employees, todayEvents }) {
    const hasAnything =
        pendingTimeEntries.length > 0 ||
        todayEvents.length > 0 ||
        todayShifts.length < 2;

    return (
        <section>
            <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Alarm-Panel</h3>
                {pendingTimeEntries.length > 0 && (
                    <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">{pendingTimeEntries.length} offen</Badge>
                )}
            </div>

            <div className="space-y-3">
                <TimeSection entries={pendingTimeEntries} />
                <MaintenanceSection tasks={maintenanceTasks} />
                <StaffingSection todayShifts={todayShifts} employees={employees} />
                <TeamNotesSection />
                <EventsSection todayEvents={todayEvents} />

                {!hasAnything && (
                    <Card className="border-green-500/30 bg-green-500/5">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Check className="w-5 h-5 text-green-400" />
                            <p className="text-sm text-green-300 font-medium">Alles in Ordnung – kein Handlungsbedarf</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </section>
    );
}