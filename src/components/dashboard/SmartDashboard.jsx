import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TeamNotes from '@/components/dashboard/TeamNotes';
import ShiftSwapMarketplaceCard from '@/components/shifts/ShiftSwapMarketplaceCard';
import ActiveStaffPanel from '@/components/dashboard/ActiveStaffPanel';
import TimeApprovalPanel from '@/components/dashboard/TimeApprovalPanel';
import TimeEntryReview from '@/components/dashboard/TimeEntryReview';
import AlarmPanel from '@/components/dashboard/AlarmPanel';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Clock, ArrowRight, CheckSquare, Zap, Circle, Sparkles, CalendarCheck,
    Users, Calendar, Lightbulb, LogIn, LogOut, Wrench, TrendingDown, ShoppingCart
} from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, differenceInMinutes } from 'date-fns';
import { isActiveEntry, getTodayOperationDate, getOperationDate, formatDuration, calcWorkMinutes, buildTimeEntryFromClock } from '@/lib/nightUtils';
import { de } from 'date-fns/locale';
import { getTaskStatus } from '@/lib/maintenanceUtils';

// ─── helpers ────────────────────────────────────────────────────────────────

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Guten Morgen';
    if (h < 17) return 'Guten Tag';
    if (h < 21) return 'Guten Abend';
    return 'Nachtschicht';
}

function getOperationPhase() {
    const h = new Date().getHours();
    if (h >= 6 && h < 11)  return { label: 'Vorbereitung', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
    if (h >= 11 && h < 15) return { label: 'Mittagsbetrieb', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
    if (h >= 15 && h < 18) return { label: 'Ruhephase', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' };
    if (h >= 18 && h < 23) return { label: 'Abendbetrieb', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' };
    return { label: 'Nachtschicht', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' };
}

// ─── mini widgets ────────────────────────────────────────────────────────────

function AlertPill({ icon: Icon, label, color = 'text-red-400', bg = 'bg-red-500/10 border-red-500/30', to }) {
    const inner = (
        <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap', bg, color)}>
            <Icon className="w-3 h-3" />{label}
        </div>
    );
    return to ? <Link to={to}>{inner}</Link> : inner;
}

function QuickLink({ page, icon: Icon, label, sub, color }) {
    return (
        <Link to={createPageUrl(page)}>
            <Card className="bg-card border-border hover:bg-accent/50 active:scale-95 transition-all">
                <CardContent className="p-4 text-center">
                    <div className={cn('w-11 h-11 rounded-xl mx-auto mb-2 flex items-center justify-center', color)}>
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
                    {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
                </CardContent>
            </Card>
        </Link>
    );
}

// ─── Tab: HEUTE ─────────────────────────────────────────────────────────────

function TodayTab({ todayShifts, todayEvents, todayReservations, myTodos, employees, teamNotes, currentUser, isManager, currentEmployee }) {
    return (
        <div className="space-y-5">
            {/* Schichten heute */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
                        <Clock className="w-4 h-4 text-blue-400" />Schichten heute
                    </h3>
                    <Link to={createPageUrl('Calendar')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                        Alle <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
                {todayShifts.length === 0 ? (
                    <Card className="p-4 text-center bg-card border-border">
                        <p className="text-sm text-muted-foreground">Keine Schichten eingetragen</p>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {todayShifts.map(s => {
                            const emp = employees.find(e => e.id === s.employee_id);
                            return (
                                <Card key={s.id} className="bg-card border-border">
                                    <CardContent className="p-3 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                            style={{ backgroundColor: s.color || emp?.color || '#64748b' }}>
                                            {s.employee_name?.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{s.employee_name}</p>
                                            <p className="text-xs text-muted-foreground">{s.start_time}–{s.end_time}</p>
                                        </div>
                                        {s.shift_type && <Badge className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/30">{s.shift_type}</Badge>}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Schichttausch */}
            {currentEmployee && (
                <section>
                    <ShiftSwapMarketplaceCard currentEmployee={currentEmployee} />
                </section>
            )}

            {/* Team-Notizen (kompakt) */}
            <section>
                <TeamNotes isManager={isManager} currentUser={currentUser} compact />
            </section>

            {/* Aufgaben */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
                        <CheckSquare className="w-4 h-4 text-orange-400" />Aufgaben
                    </h3>
                    <Link to={createPageUrl('Todos')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                        Alle <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
                {myTodos.length === 0 ? (
                    <Card className="p-4 text-center bg-card border-border">
                        <p className="text-sm text-muted-foreground">Keine offenen Aufgaben</p>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {myTodos.slice(0, 4).map(t => (
                            <Link key={t.id} to={createPageUrl('Todos')}>
                                <Card className={cn('border transition-colors hover:bg-accent/30',
                                    t.priority === 'dringend' ? 'border-red-500/30 bg-red-500/5' : 'border-border bg-card'
                                )}>
                                    <CardContent className="p-3 flex items-center gap-3">
                                        {t.priority === 'dringend'
                                            ? <Zap className="w-4 h-4 text-red-400 shrink-0" />
                                            : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                                        <p className="text-sm text-foreground truncate flex-1">{t.title}</p>
                                        <Badge className={cn('text-[10px] border shrink-0',
                                            t.priority === 'dringend' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                            t.priority === 'hoch' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                            'bg-secondary text-muted-foreground border-border'
                                        )}>{t.priority}</Badge>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                        {myTodos.length > 4 && (
                            <Link to={createPageUrl('Todos')} className="block text-center text-xs text-muted-foreground hover:text-foreground py-2">
                                +{myTodos.length - 4} weitere →
                            </Link>
                        )}
                    </div>
                )}
            </section>

            {/* Events heute */}
            {todayEvents.length > 0 && (
                <section>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wide mb-3">
                        <Sparkles className="w-4 h-4 text-purple-400" />Events heute
                    </h3>
                    <div className="space-y-2">
                        {todayEvents.map(e => (
                            <Card key={e.id} className="border-purple-500/30 bg-purple-500/5">
                                <CardContent className="p-3">
                                    <p className="text-sm font-semibold text-foreground">{e.title}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                        {e.start_time && <span>🕐 {e.start_time}</span>}
                                        {e.expected_guests && <span>👥 {e.expected_guests} Gäste</span>}
                                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">{e.event_type}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {/* Reservierungen kompakt */}
            {todayReservations.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
                            <CalendarCheck className="w-4 h-4 text-green-400" />Reservierungen ({todayReservations.length})
                        </h3>
                        <Link to={createPageUrl('Reservations')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                            Alle <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {todayReservations.slice(0, 3).map(r => (
                            <Card key={r.id} className="bg-card border-border">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <CalendarCheck className="w-4 h-4 text-green-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{r.customer_name}</p>
                                        <p className="text-xs text-muted-foreground">{r.time} · {r.guests} Gäste</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

// ─── Tab: TEAM ───────────────────────────────────────────────────────────────

function TeamTab({ employees, todayShifts, currentUser, isManager }) {
    return (
        <div className="space-y-5">
            <TeamNotes isManager={isManager} currentUser={currentUser} />

            <section>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wide mb-3">
                    <Users className="w-4 h-4 text-blue-400" />Team heute ({todayShifts.length} Schichten)
                </h3>
                {todayShifts.length === 0 ? (
                    <Card className="p-4 text-center bg-card border-border">
                        <p className="text-sm text-muted-foreground">Keine Schichten heute</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {todayShifts.map(s => {
                            const emp = employees.find(e => e.id === s.employee_id);
                            return (
                                <Card key={s.id} className="bg-card border-border">
                                    <CardContent className="p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                style={{ backgroundColor: s.color || emp?.color || '#64748b' }}>
                                                {s.employee_name?.charAt(0)}
                                            </div>
                                            <p className="text-xs font-medium text-foreground truncate">{s.employee_name}</p>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">{s.start_time}–{s.end_time}</p>
                                        {s.shift_type && <p className="text-[10px] text-blue-400 mt-0.5">{s.shift_type}</p>}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}

// ─── Tab: PLANUNG ────────────────────────────────────────────────────────────

function PlanningTab({ upcomingEvents, upcomingShifts }) {
    return (
        <div className="space-y-5">
            {/* Schnelllinks */}
            <div className="grid grid-cols-3 gap-3">
                <QuickLink page="Calendar" icon={Calendar} label="Schichtplan" color="bg-blue-600" />
                <QuickLink page="Events" icon={Sparkles} label="Events" color="bg-purple-600" />
                <QuickLink page="Reservations" icon={CalendarCheck} label="Reservierungen" color="bg-green-600" />
            </div>

            {/* Nächste Events */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
                        <Sparkles className="w-4 h-4 text-purple-400" />Kommende Events
                    </h3>
                    <Link to={createPageUrl('Events')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                        Alle <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
                {upcomingEvents.length === 0 ? (
                    <Card className="p-4 text-center bg-card border-border">
                        <p className="text-sm text-muted-foreground">Keine kommenden Events</p>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {upcomingEvents.slice(0, 5).map(e => (
                            <Link key={e.id} to={createPageUrl('Events')}>
                                <Card className="bg-card border-border hover:bg-accent/30 transition-colors">
                                    <CardContent className="p-3 flex items-center gap-3">
                                        <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(parseISO(e.date), 'EEE, dd.MM.yyyy', { locale: de })}
                                                {e.start_time && ` · ${e.start_time}`}
                                            </p>
                                        </div>
                                        <Badge className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/30 shrink-0">{e.event_type}</Badge>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Nächste Schichten */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
                        <Calendar className="w-4 h-4 text-blue-400" />Nächste Schichten
                    </h3>
                    <Link to={createPageUrl('Calendar')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                        Alle <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
                {upcomingShifts.length === 0 ? (
                    <Card className="p-4 text-center bg-card border-border">
                        <p className="text-sm text-muted-foreground">Keine geplanten Schichten</p>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {upcomingShifts.slice(0, 5).map(s => (
                            <Card key={s.id} className="bg-card border-border">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="text-center w-10 shrink-0">
                                        <p className="text-lg font-bold text-foreground leading-none">{format(parseISO(s.date), 'dd')}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase">{format(parseISO(s.date), 'MMM', { locale: de })}</p>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">{format(parseISO(s.date), 'EEEE', { locale: de })}</p>
                                        <p className="text-xs text-muted-foreground">{s.employee_name} · {s.start_time}–{s.end_time}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {/* Eventideen */}
            <div>
                <Link to={createPageUrl('Events') + '?tab=ideas'}>
                    <Card className="bg-card border-border hover:bg-accent/30 transition-colors">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                                <Lightbulb className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">Eventideen</p>
                                <p className="text-xs text-muted-foreground">Ideen sammeln und planen</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}

// ─── Tab: MANAGER ────────────────────────────────────────────────────────────

function ManagerTab({ stats, alerts, employees, todos, shopping, articles, pendingTimeEntries, maintenanceTasks, todayShifts, todayEvents, isManager, currentUser, activeStaffCount }) {
    const urgentTodos = todos.filter(t => t.priority === 'dringend' || t.priority === 'hoch');
    const lowStock = articles.filter(a => a.min_stock != null && a.current_stock <= a.min_stock);
    const openShopping = shopping.filter(s => s.status === 'offen');

    const kpis = [
        { label: 'Mitarbeiter', value: employees.length, icon: Users, color: 'bg-blue-600', to: 'Employees' },
        { label: 'Offene Aufgaben', value: todos.filter(t => t.status !== 'erledigt').length, icon: CheckSquare, color: urgentTodos.length > 0 ? 'bg-red-600' : 'bg-orange-600', to: 'Todos' },
        { label: 'Einkauf offen', value: openShopping.length, icon: ShoppingCart, color: 'bg-amber-600', to: 'Shopping' },
        { label: 'Lager niedrig', value: lowStock.length, icon: TrendingDown, color: lowStock.length > 0 ? 'bg-red-600' : 'bg-teal-600', to: 'Articles' },
    ];

    return (
        <div className="space-y-5">
            {/* Aktive Mitarbeiter */}
            <section>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-400" />
                    Aktive Mitarbeiter
                    {activeStaffCount > 0 && (
                        <span className="ml-auto bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {activeStaffCount}
                        </span>
                    )}
                </h3>
                <ActiveStaffPanel />
            </section>

            {/* Zeiten genehmigen */}
            <section>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-amber-400" />
                    Zeiten zur Genehmigung
                    {pendingTimeEntries.length > 0 && (
                        <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {pendingTimeEntries.length}
                        </span>
                    )}
                </h3>
                <TimeApprovalPanel />
            </section>

            {/* Alarm-Panel */}
            <AlarmPanel
                pendingTimeEntries={pendingTimeEntries}
                maintenanceTasks={maintenanceTasks}
                todayShifts={todayShifts}
                employees={employees}
                todayEvents={todayEvents}
                isManager={isManager}
                currentUser={currentUser}
            />

            {/* Wichtige Hinweise */}
            {alerts.length > 0 && (
                <section>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">Wichtige Hinweise</h3>
                    <div className="space-y-2">
                        {alerts.map((a, i) => (
                            <Link key={i} to={createPageUrl(a.to)}>
                                <Card className={cn('border transition-colors hover:opacity-80', a.cardClass)}>
                                    <CardContent className="p-3 flex items-center gap-3">
                                        <a.icon className={cn('w-5 h-5 shrink-0', a.iconClass)} />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-foreground">{a.title}</p>
                                            <p className={cn('text-xs', a.textClass)}>{a.sub}</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Schnellaktionen */}
            <section>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">Schnellaktionen</h3>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { page: 'Employees', icon: Users, label: 'Mitarbeiter', color: 'bg-blue-600' },
                        { page: 'Shifts', icon: Calendar, label: 'Schichten', color: 'bg-purple-600' },
                        { page: 'Events', icon: Sparkles, label: 'Events', color: 'bg-pink-600' },
                        { page: 'Todos', icon: CheckSquare, label: 'Aufgaben', color: 'bg-orange-600' },
                        { page: 'Shopping', icon: ShoppingCart, label: 'Einkauf', color: 'bg-amber-600' },
                        { page: 'Cleaning', icon: Sparkles, label: 'Reinigung', color: 'bg-teal-600' },
                    ].map(({ page, icon: Icon, label, color }) => (
                        <Link key={label} to={createPageUrl(page)}>
                            <Card className="bg-card border-border hover:bg-accent/30 active:scale-95 transition-all">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color)}>
                                        <Icon className="w-4 h-4 text-white" />
                                    </div>
                                    <p className="text-sm font-medium text-foreground">{label}</p>
                                    <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto" />
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}

// ─── Clock Widget (für Mitarbeiter ohne Manager-Rechte) ──────────────────────

function ClockWidget({ currentEmployee }) {
    const queryClient = useQueryClient();

    const { data: clockEntries = [] } = useQuery({
        queryKey: ['clock-entries'],
        queryFn: () => base44.entities.ClockEntry.list('-clock_in', 200),
        refetchInterval: 60000,
    });

    // Night-safe: find active entry by status, not by date
    const activeClockEntry = clockEntries.find(e =>
        e.employee_id === currentEmployee?.id && isActiveEntry(e)
    );

    const clockInMutation = useMutation({
        mutationFn: () => base44.entities.ClockEntry.create({
            employee_id: currentEmployee.id,
            employee_name: currentEmployee.name,
            clock_in: new Date().toISOString(),
            status: 'clocked_in',
        }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clock-entries'] }),
    });

    const clockOutMutation = useMutation({
        mutationFn: async (entryId) => {
            const entry = clockEntries.find(e => e.id === entryId);
            const now = new Date().toISOString();
            const timeEntryData = buildTimeEntryFromClock(entry, now);
            const totalMinutes = calcWorkMinutes(entry.clock_in, now);
            const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
            await base44.entities.ClockEntry.update(entryId, {
                clock_out: now,
                total_hours: totalHours,
                status: 'clocked_out',
            });
            await base44.entities.TimeEntry.create(timeEntryData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clock-entries'] });
            queryClient.invalidateQueries({ queryKey: ['time-entries'] });
        },
    });

    if (!currentEmployee) return null;

    const getWorkingDuration = (clockIn) => {
        const minutes = calcWorkMinutes(clockIn, new Date());
        return formatDuration(minutes);
    };

    return (
        <Card className={cn('border', activeClockEntry ? 'border-green-500/40 bg-green-500/5' : 'border-border bg-card')}>
            <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: currentEmployee.color || '#64748b' }}>
                    {currentEmployee.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    {activeClockEntry ? (
                        <>
                            <p className="text-sm font-semibold text-green-400">Eingestempelt</p>
                            <p className="text-xs text-muted-foreground">Seit {format(new Date(activeClockEntry.clock_in), 'HH:mm')} · {getWorkingDuration(activeClockEntry.clock_in)}</p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-semibold text-foreground">Nicht eingestempelt</p>
                            <p className="text-xs text-muted-foreground">{currentEmployee.name}</p>
                        </>
                    )}
                </div>
                <div className="flex gap-2 shrink-0">
                    {activeClockEntry ? (
                        <Button size="sm" onClick={() => clockOutMutation.mutate(activeClockEntry.id)}
                            disabled={clockOutMutation.isPending}
                            className="h-9 bg-red-600 hover:bg-red-700 text-white gap-1 text-xs">
                            <LogOut className="w-3 h-3" />Aus
                        </Button>
                    ) : (
                        <Button size="sm" onClick={() => clockInMutation.mutate()}
                            disabled={clockInMutation.isPending}
                            className="h-9 bg-green-600 hover:bg-green-700 text-white gap-1 text-xs">
                            <LogIn className="w-3 h-3" />Ein
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function SmartDashboard({ currentUser, currentEmployee, isManager }) {
    const [activeTab, setActiveTab] = useState('heute');
    const today = format(new Date(), 'yyyy-MM-dd');
    const phase = getOperationPhase();

    // Data queries
    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => base44.entities.Shift.list('-date', 1000)
    });
    const { data: events = [] } = useQuery({
        queryKey: ['events'],
        queryFn: () => base44.entities.Event.list('date', 50)
    });
    const { data: reservations = [] } = useQuery({
        queryKey: ['reservations'],
        queryFn: () => base44.entities.Reservation.list('-date', 50)
    });
    const { data: todos = [] } = useQuery({
        queryKey: ['todos'],
        queryFn: () => base44.entities.TodoItem.filter({ is_archived: false })
    });
    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });
    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list()
    });
    const { data: shopping = [] } = useQuery({
        queryKey: ['shopping-list'],
        queryFn: () => base44.entities.ShoppingList.list()
    });
    const { data: maintenanceTasks = [] } = useQuery({
        queryKey: ['maintenance-tasks'],
        queryFn: () => base44.entities.MaintenanceTask.filter({ is_active: true }),
        enabled: isManager
    });
    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time-entries'],
        queryFn: () => base44.entities.TimeEntry.list('-date', 100),
        enabled: !!currentEmployee
    });
    const { data: pendingTimeEntries = [] } = useQuery({
        queryKey: ['pending-time-entries'],
        queryFn: () => base44.entities.TimeEntry.filter({ status: 'eingereicht' }),
        enabled: isManager
    });
    const { data: vacationRequests = [] } = useQuery({
        queryKey: ['vacation-requests'],
        queryFn: () => base44.entities.VacationRequest.list('-created_date', 50),
        enabled: isManager
    });

    // Night-safe today = operation date (not calendar date)
    const todayOperationDate = getTodayOperationDate();

    // Derived
    const todayShifts = shifts.filter(s => s.date === today);
    const todayEvents = events.filter(e => e.date === today && e.status !== 'abgesagt');
    const todayReservations = reservations.filter(r => r.date === today && r.status !== 'storniert');
    const upcomingEvents = events.filter(e => new Date(e.date) > new Date());
    const openTodos = todos.filter(t => t.status !== 'erledigt');

    const myTodos = currentEmployee
        ? openTodos.filter(t => t.assigned_to === currentEmployee.email || t.assigned_to === currentEmployee.name)
        : openTodos;

    const upcomingShifts = useMemo(() => {
        const future = shifts.filter(s => s.date >= today);
        return future.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);
    }, [shifts, today]);

    // Stats for personal employee area
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEntries = timeEntries.filter(e => {
        if (e.employee_id !== currentEmployee?.id) return false;
        const d = parseISO(e.date);
        return d >= weekStart && d <= weekEnd;
    });
    const hoursThisWeek = weekEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

    const myUpcomingShifts = shifts.filter(s => s.employee_id === currentEmployee?.id && s.date >= today);
    const approvedVacations = vacationRequests.filter(v => v.employee_id === currentEmployee?.id && v.status === 'genehmigt' && v.type === 'Urlaub');
    const usedVacationDays = approvedVacations.reduce((sum, v) => sum + (v.days_count || 0), 0);
    const remainingVacationDays = (currentEmployee?.vacation_days_per_year || 0) - usedVacationDays;

    // Alerts
    const lowStockArticles = articles.filter(a => a.min_stock && a.current_stock <= a.min_stock);
    const pendingVacationRequests = vacationRequests.filter(r => r.status === 'beantragt');
    const urgentMaintenance = maintenanceTasks.filter(t => getTaskStatus(t) === 'überfällig');
    const todayEvents_count = todayEvents.length;

    const alerts = useMemo(() => {
        const list = [];
        if (urgentMaintenance.length > 0)
            list.push({ icon: Wrench, title: 'Wartung überfällig', sub: `${urgentMaintenance.length} Aufgaben`, to: 'Maintenance', cardClass: 'border-red-500/30 bg-red-500/5', iconClass: 'text-red-400', textClass: 'text-red-300' });
        if (lowStockArticles.length > 0)
            list.push({ icon: TrendingDown, title: 'Lager niedrig', sub: `${lowStockArticles.length} Artikel`, to: 'Articles', cardClass: 'border-amber-500/30 bg-amber-500/5', iconClass: 'text-amber-400', textClass: 'text-amber-300' });
        if (pendingVacationRequests.length > 0)
            list.push({ icon: Calendar, title: 'Urlaubsanträge', sub: `${pendingVacationRequests.length} ausstehend`, to: 'MyArea', cardClass: 'border-blue-500/30 bg-blue-500/5', iconClass: 'text-blue-400', textClass: 'text-blue-300' });
        return list;
    }, [urgentMaintenance, lowStockArticles, pendingVacationRequests]);

    const tabs = [
        { id: 'heute', label: 'Heute' },
        { id: 'team', label: 'Team' },
        { id: 'planung', label: 'Planung' },
        ...(isManager ? [{ id: 'manager', label: 'Manager' }] : [])
    ];

    return (
        <div className="min-h-screen bg-background pb-28 md:pb-8">
            <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">

                {/* ── TOP SECTION ── */}
                <div className="space-y-3">
                    {/* Greeting + date */}
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                                {getGreeting()}{currentEmployee ? `, ${currentEmployee.name.split(' ')[0]}` : ''}!
                            </h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
                            </p>
                        </div>
                        <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shrink-0', phase.bg, phase.color)}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {phase.label}
                        </div>
                    </div>

                    {/* Alert Pills */}
                    {isManager && (alerts.length > 0 || todayEvents.length > 0) && (
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {todayEvents_count > 0 && (
                                <AlertPill icon={Sparkles} label={`${todayEvents_count} Event${todayEvents_count > 1 ? 's' : ''} heute`}
                                    color="text-purple-300" bg="bg-purple-500/10 border-purple-500/30" to={createPageUrl('Events')} />
                            )}
                            {alerts.map((a, i) => (
                                <AlertPill key={i} icon={a.icon} label={a.sub ? `${a.title}: ${a.sub}` : a.title}
                                    color={a.textClass} bg={a.cardClass} to={createPageUrl(a.to)} />
                            ))}
                        </div>
                    )}

                    {/* Personal stats bar (compact) */}
                    {currentEmployee && (
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: 'Stunden', value: `${hoursThisWeek.toFixed(1)}h`, sub: 'diese Woche' },
                                { label: 'Urlaub', value: remainingVacationDays, sub: 'Tage übrig' },
                                { label: 'Schichten', value: myUpcomingShifts.length, sub: 'kommend' },
                            ].map(s => (
                                <Card key={s.label} className="bg-card border-border">
                                    <CardContent className="p-3 text-center">
                                        <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Clock widget */}
                    {currentEmployee && <ClockWidget currentEmployee={currentEmployee} />}
                </div>

                {/* ── TABS ── */}
                <div className="flex gap-1 p-1 bg-card border border-border rounded-xl sticky top-[calc(4rem+env(safe-area-inset-top))] md:top-2 z-10">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex-1 py-2.5 px-2 rounded-lg text-sm font-semibold transition-all relative',
                                activeTab === tab.id
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {tab.label}
                            {tab.id === 'manager' && isManager && pendingTimeEntries.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                                    {pendingTimeEntries.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── TAB CONTENT ── */}
                <div>
                    {activeTab === 'heute' && (
                        <TodayTab
                            todayShifts={todayShifts}
                            todayEvents={todayEvents}
                            todayReservations={todayReservations}
                            myTodos={myTodos}
                            employees={employees}
                            currentUser={currentUser}
                            isManager={isManager}
                            currentEmployee={currentEmployee}
                        />
                    )}
                    {activeTab === 'team' && (
                        <TeamTab
                            employees={employees}
                            todayShifts={todayShifts}
                            currentUser={currentUser}
                            isManager={isManager}
                        />
                    )}
                    {activeTab === 'planung' && (
                        <PlanningTab
                            upcomingEvents={upcomingEvents}
                            upcomingShifts={upcomingShifts}
                        />
                    )}
                    {activeTab === 'manager' && isManager && (
                        <ManagerTab
                            stats={[]}
                            alerts={alerts}
                            employees={employees}
                            todos={openTodos}
                            shopping={shopping}
                            articles={articles}
                            pendingTimeEntries={pendingTimeEntries}
                            maintenanceTasks={maintenanceTasks}
                            todayShifts={todayShifts}
                            todayEvents={todayEvents}
                            isManager={isManager}
                            currentUser={currentUser}
                            activeStaffCount={0}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}