import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ErrorState } from '@/components/ui/StateDisplay';
import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/queryUtils';
import ProvisionalShiftEntry from '@/components/provisional/ProvisionalShiftEntry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, ChevronLeft, ChevronRight, CalendarDays, List, RefreshCw } from 'lucide-react';
import {
    format, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth,
    isSameDay, parseISO, isAfter, isBefore, differenceInMinutes,
    subMonths, addMonths, addWeeks, subWeeks, isEqual
} from 'date-fns';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import MyShiftsCalendarSync from '@/components/calendar/MyShiftsCalendarSync';

// ── Hilfsfunktion: Nachtschicht-sichere Dauer ────────────────────────────────
function shiftDurationMinutes(start_time, end_time) {
    const [sh, sm] = start_time.split(':').map(Number);
    const [eh, em] = end_time.split(':').map(Number);
    let startMin = sh * 60 + sm;
    let endMin   = eh * 60 + em;
    if (endMin <= startMin) endMin += 24 * 60; // Nachtschicht über Mitternacht
    return endMin - startMin;
}

function shiftDurationHours(start_time, end_time) {
    return (shiftDurationMinutes(start_time, end_time) / 60).toFixed(1);
}

// ── Nächste Schicht Hero ─────────────────────────────────────────────────────
function NextShiftHero({ shifts }) {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const next = useMemo(() => {
        return [...shifts]
            .filter(s => s.date >= todayStr)
            .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))[0] || null;
    }, [shifts, todayStr]);

    if (!next) return null;

    const shiftDate  = parseISO(next.date);
    const isToday    = isSameDay(shiftDate, today);
    const isTomorrow = isSameDay(shiftDate, addDays(today, 1));
    const hours      = shiftDurationHours(next.start_time, next.end_time);

    const label = isToday ? 'Heute' : isTomorrow ? 'Morgen' : format(shiftDate, 'EEEE, dd. MMM', { locale: de });

    return (
        <div className={cn(
            "rounded-2xl p-5 border",
            isToday
                ? "bg-amber-500/10 border-amber-500/40"
                : "bg-card border-border"
        )}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                {isToday ? '⚡ Nächste Schicht — Heute' : 'Nächste Schicht'}
            </p>
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className={cn("text-xl font-bold", isToday ? "text-amber-400" : "text-foreground")}>{label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {next.start_time} – {next.end_time}
                        <span className="ml-2 text-xs">({hours} Std.)</span>
                    </p>
                    {next.shift_type && (
                        <Badge variant="outline" className="mt-2 text-xs">{next.shift_type}</Badge>
                    )}
                </div>
                <div className={cn(
                    "w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0",
                    isToday ? "bg-amber-500 text-slate-900" : "bg-secondary text-foreground"
                )}>
                    <span className="text-xs font-semibold">{format(shiftDate, 'MMM', { locale: de })}</span>
                    <span className="text-2xl font-bold leading-none">{format(shiftDate, 'd')}</span>
                </div>
            </div>
        </div>
    );
}

// ── Schicht-Karte ─────────────────────────────────────────────────────────────
function ShiftCard({ shift, highlight = false }) {
    const hours = shiftDurationHours(shift.start_time, shift.end_time);
    return (
        <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl border transition-all",
            highlight ? "border-amber-500/40 bg-amber-500/8" : "border-border bg-card"
        )}>
            <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                highlight ? "bg-amber-500 text-slate-900" : "bg-secondary text-muted-foreground"
            )}>
                <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">
                    {shift.start_time} – {shift.end_time}
                </p>
                <p className="text-xs text-muted-foreground">
                    {hours} Std.{shift.shift_type ? ` · ${shift.shift_type}` : ''}
                </p>
                {shift.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{shift.notes}</p>}
            </div>
        </div>
    );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function MyShiftsPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weekStart, setWeekStart]       = useState(() => startOfWeek(new Date(), { locale: de }));
    const { data: employee }              = useCurrentEmployee();

    const { data: provisionalAccess } = useQuery({
        queryKey: ['my-provisional-access', employee?.id],
        queryFn: async () => {
            if (!employee) return null;
            const all = await base44.entities.ProvisionalShiftAccess.filter({ employee_id: employee.id, is_active: true });
            return all[0] || null;
        },
        enabled: !!employee,
        staleTime: STALE.SLOW,
    });

    const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
        queryKey: ['my-shifts', employee?.id],
        queryFn: async () => {
            if (!employee) return [];
            // Alle Schichten des Mitarbeiters laden, dann client-seitig filtern
            const all = await base44.entities.Shift.filter({ employee_id: employee.id }, 'date', 500);
            const from = format(subMonths(new Date(), 1), 'yyyy-MM-dd');
            const to   = format(addMonths(new Date(), 3), 'yyyy-MM-dd');
            return all.filter(s => s.date >= from && s.date <= to);
        },
        enabled: !!employee,
        staleTime: STALE.MEDIUM,
    });

    const { data: weekTeam = [] } = useQuery({
        queryKey: ['team-week'],
        queryFn: () => {
            const today   = format(new Date(), 'yyyy-MM-dd');
            const in7days = format(addDays(new Date(), 6), 'yyyy-MM-dd');
            return base44.entities.Shift.filter({ date_gte: today, date_lte: in7days }, 'date', 100);
        },
        staleTime: STALE.MEDIUM,
    });

    // ── Wochenansicht: 7 Tage ab weekStart ────────────────────────────────────
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const date      = addDays(weekStart, i);
            const dayShifts = shifts.filter(s => isSameDay(parseISO(s.date), date));
            return { date, shifts: dayShifts };
        });
    }, [weekStart, shifts]);

    // ── Monatsstatistiken ──────────────────────────────────────────────────────
    const monthStats = useMemo(() => {
        const start = startOfMonth(selectedDate);
        const end   = endOfMonth(selectedDate);
        const monthShifts = shifts.filter(s => {
            const d = parseISO(s.date);
            return (isAfter(d, start) || isSameDay(d, start)) &&
                   (isBefore(d, end)  || isSameDay(d, end));
        });
        const totalMinutes = monthShifts.reduce((acc, s) => acc + shiftDurationMinutes(s.start_time, s.end_time), 0);
        return {
            totalShifts: monthShifts.length,
            totalHours:  (totalMinutes / 60).toFixed(1),
            shifts:      monthShifts,
        };
    }, [shifts, selectedDate]);

    // ── Monatskalender ─────────────────────────────────────────────────────────
    const monthCalendar = useMemo(() => {
        const start     = startOfMonth(selectedDate);
        const end       = endOfMonth(selectedDate);
        const startWeek = startOfWeek(start, { locale: de });
        const endWeek   = endOfWeek(end, { locale: de });
        const days      = [];
        let cur         = startWeek;
        while (cur <= endWeek) {
            days.push({
                date:           cur,
                shifts:         shifts.filter(s => isSameDay(parseISO(s.date), cur)),
                isCurrentMonth: cur >= start && cur <= end,
            });
            cur = addDays(cur, 1);
        }
        return days;
    }, [shifts, selectedDate]);

    // ── Kommende Schichten (Liste) ─────────────────────────────────────────────
    const upcomingShifts = useMemo(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        return shifts.filter(s => s.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
    }, [shifts]);

    // ── Team-Schichten ─────────────────────────────────────────────────────────
    const teamDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const date    = addDays(new Date(), i);
            const dateStr = format(date, 'yyyy-MM-dd');
            return { date, dateStr, shifts: weekTeam.filter(s => s.date === dateStr) };
        });
    }, [weekTeam]);

    if (!employee) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Lade Profil…</span>
                </div>
            </div>
        );
    }

    // ── Tab-Konfiguration ──────────────────────────────────────────────────────
    const tabCols = provisionalAccess ? 6 : 5;

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

                {/* Header */}
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Meine Schichten</h1>
                    <p className="text-muted-foreground text-sm mt-1">Deine persönliche Schichtübersicht</p>
                </div>

                {/* Nächste Schicht Hero */}
                {!shiftsLoading && <NextShiftHero shifts={shifts} />}

                {/* Tabs */}
                <Tabs defaultValue="week" className="space-y-5">
                    <TabsList className={cn("grid w-full", `grid-cols-${tabCols}`)}>
                        {provisionalAccess && (
                            <TabsTrigger value="wunsch" className="text-amber-400 text-xs px-1">Wunsch</TabsTrigger>
                        )}
                        <TabsTrigger value="week"  className="text-xs px-1">Woche</TabsTrigger>
                        <TabsTrigger value="month" className="text-xs px-1">Monat</TabsTrigger>
                        <TabsTrigger value="list"  className="text-xs px-1">Liste</TabsTrigger>
                        <TabsTrigger value="team"  className="text-xs px-1">Team</TabsTrigger>
                        <TabsTrigger value="sync"  className="text-xs px-1">Sync</TabsTrigger>
                    </TabsList>

                    {/* ── Wunschschichten ── */}
                    {provisionalAccess && (
                        <TabsContent value="wunsch">
                            <ProvisionalShiftEntry employee={employee} access={provisionalAccess} />
                        </TabsContent>
                    )}

                    {/* ── Wochenansicht ── */}
                    <TabsContent value="week" className="space-y-3">
                        {/* Navigation */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setWeekStart(w => subWeeks(w, 1))}
                                className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <p className="text-sm font-semibold text-foreground">
                                {format(weekStart, 'dd.MM.', { locale: de })} – {format(addDays(weekStart, 6), 'dd.MM.yyyy', { locale: de })}
                            </p>
                            <button
                                onClick={() => setWeekStart(w => addWeeks(w, 1))}
                                className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* 7 Tage */}
                        <div className="space-y-2">
                            {weekDays.map(({ date, shifts: dayShifts }) => {
                                const isToday   = isSameDay(date, new Date());
                                const isPast    = date < new Date() && !isToday;
                                return (
                                    <div
                                        key={date.toISOString()}
                                        className={cn(
                                            "rounded-xl border overflow-hidden",
                                            isToday   ? "border-amber-500/40" : "border-border",
                                            isPast    && "opacity-50"
                                        )}
                                    >
                                        {/* Tag-Header */}
                                        <div className={cn(
                                            "flex items-center justify-between px-4 py-2.5",
                                            isToday ? "bg-amber-500/10" : "bg-card"
                                        )}>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-sm font-semibold",
                                                    isToday ? "text-amber-400" : "text-foreground"
                                                )}>
                                                    {format(date, 'EEE', { locale: de })}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(date, 'dd.MM.')}
                                                </span>
                                            </div>
                                            {isToday && (
                                                <Badge className="bg-amber-500 text-slate-900 text-xs font-semibold">Heute</Badge>
                                            )}
                                            {dayShifts.length === 0 && (
                                                <span className="text-xs text-muted-foreground/50">Frei</span>
                                            )}
                                        </div>

                                        {/* Schichten */}
                                        {dayShifts.length > 0 && (
                                            <div className="px-3 pb-3 pt-1 space-y-1.5 bg-background">
                                                {dayShifts.map(shift => (
                                                    <ShiftCard key={shift.id} shift={shift} highlight={isToday} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </TabsContent>

                    {/* ── Monatsansicht ── */}
                    <TabsContent value="month" className="space-y-4">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <Card className="border-border">
                                <CardContent className="pt-4 pb-4">
                                    <p className="text-xs text-muted-foreground mb-1">Schichten</p>
                                    <p className="text-3xl font-bold text-foreground">{monthStats.totalShifts}</p>
                                </CardContent>
                            </Card>
                            <Card className="border-border">
                                <CardContent className="pt-4 pb-4">
                                    <p className="text-xs text-muted-foreground mb-1">Stunden</p>
                                    <p className="text-3xl font-bold text-foreground">{monthStats.totalHours}</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Monatsnavigation */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setSelectedDate(d => subMonths(d, 1))}
                                className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <h2 className="text-base font-bold text-foreground">
                                {format(selectedDate, 'MMMM yyyy', { locale: de })}
                            </h2>
                            <button
                                onClick={() => setSelectedDate(d => addMonths(d, 1))}
                                className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Kalender */}
                        <Card className="border-border">
                            <CardContent className="p-3">
                                {/* Wochentage Header */}
                                <div className="grid grid-cols-7 mb-1">
                                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                                        <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
                                    ))}
                                </div>
                                {/* Tage */}
                                <div className="grid grid-cols-7 gap-1">
                                    {monthCalendar.map(({ date, shifts: dayShifts, isCurrentMonth }) => {
                                        const isToday = isSameDay(date, new Date());
                                        return (
                                            <div
                                                key={date.toISOString()}
                                                className={cn(
                                                    "aspect-square rounded-lg flex flex-col items-center justify-center relative",
                                                    !isCurrentMonth && "opacity-20",
                                                    isToday && "bg-amber-500 text-slate-900",
                                                    !isToday && dayShifts.length > 0 && "bg-amber-500/15 border border-amber-500/30",
                                                    !isToday && dayShifts.length === 0 && "bg-card"
                                                )}
                                            >
                                                <span className={cn(
                                                    "text-xs font-semibold",
                                                    isToday ? "text-slate-900" : "text-foreground"
                                                )}>
                                                    {format(date, 'd')}
                                                </span>
                                                {dayShifts.length > 0 && !isToday && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-0.5" />
                                                )}
                                                {dayShifts.length > 0 && isToday && (
                                                    <span className="text-[10px] font-bold text-slate-900/70">{dayShifts.length}×</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Schicht-Liste des Monats */}
                        {monthStats.shifts.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Schichten im {format(selectedDate, 'MMMM', { locale: de })}</p>
                                {monthStats.shifts.map(shift => {
                                    const d = parseISO(shift.date);
                                    return (
                                        <div key={shift.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                                            <div className="w-10 h-10 rounded-xl bg-secondary flex flex-col items-center justify-center shrink-0">
                                                <span className="text-[10px] text-muted-foreground font-semibold">{format(d, 'EEE', { locale: de })}</span>
                                                <span className="text-sm font-bold text-foreground">{format(d, 'd')}</span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-foreground">{shift.start_time} – {shift.end_time}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {shiftDurationHours(shift.start_time, shift.end_time)} Std.
                                                    {shift.shift_type && ` · ${shift.shift_type}`}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* ── Liste ── */}
                    <TabsContent value="list" className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            {upcomingShifts.length} kommende Schichten
                        </p>
                        {upcomingShifts.length === 0 ? (
                            <Card className="p-10 text-center border-border/40">
                                <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                                <p className="text-muted-foreground">Keine kommenden Schichten</p>
                            </Card>
                        ) : (
                            <div className="space-y-2">
                                {upcomingShifts.map(shift => {
                                    const d       = parseISO(shift.date);
                                    const isToday = isSameDay(d, new Date());
                                    const hours   = shiftDurationHours(shift.start_time, shift.end_time);
                                    return (
                                        <div key={shift.id} className={cn(
                                            "flex items-start gap-3 p-4 rounded-xl border transition-all",
                                            isToday ? "border-amber-500/40 bg-amber-500/8" : "border-border bg-card"
                                        )}>
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0",
                                                isToday ? "bg-amber-500 text-slate-900" : "bg-secondary text-foreground"
                                            )}>
                                                <span className="text-[10px] font-semibold">{format(d, 'MMM', { locale: de })}</span>
                                                <span className="text-lg font-bold leading-none">{format(d, 'd')}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-semibold text-foreground text-sm">
                                                        {format(d, 'EEEE, dd.MM.yyyy', { locale: de })}
                                                    </p>
                                                    {isToday && (
                                                        <Badge className="bg-amber-500 text-slate-900 text-xs font-semibold">Heute</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-0.5">
                                                    {shift.start_time} – {shift.end_time}
                                                    <span className="ml-1 text-xs">({hours} Std.)</span>
                                                </p>
                                                {shift.shift_type && (
                                                    <Badge variant="outline" className="mt-1.5 text-xs">{shift.shift_type}</Badge>
                                                )}
                                                {shift.notes && (
                                                    <p className="text-xs text-muted-foreground mt-1">{shift.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* ── Team ── */}
                    <TabsContent value="team" className="space-y-3">
                        {teamDays.map(({ date, dateStr, shifts: dayShifts }) => {
                            const isToday = isSameDay(date, new Date());
                            return (
                                <Card key={dateStr} className={cn("border-border", isToday && "border-amber-500/40")}>
                                    <CardHeader className="pb-2 pt-3 px-4">
                                        <CardTitle className="flex items-center gap-2 text-sm">
                                            <Users className="w-4 h-4 text-muted-foreground" />
                                            <span className={isToday ? "text-amber-400" : "text-foreground"}>
                                                {format(date, 'EEEE, dd.MM.', { locale: de })}
                                            </span>
                                            {isToday && <Badge className="bg-amber-500 text-slate-900 text-xs">Heute</Badge>}
                                            <span className="ml-auto text-xs font-normal text-muted-foreground">{dayShifts.length} Schichten</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-3">
                                        {dayShifts.length > 0 ? (
                                            <div className="space-y-1.5">
                                                {dayShifts.map(shift => {
                                                    const isMe = shift.employee_id === employee.id;
                                                    return (
                                                        <div key={shift.id} className={cn(
                                                            "flex items-center gap-3 p-2.5 rounded-xl",
                                                            isMe ? "bg-amber-500/10 border border-amber-500/30" : "bg-secondary/50"
                                                        )}>
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                                                                <span className="text-slate-900 font-bold text-xs">
                                                                    {shift.employee_name?.charAt(0)?.toUpperCase() || '?'}
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={cn("font-semibold text-sm truncate", isMe ? "text-amber-400" : "text-foreground")}>
                                                                    {shift.employee_name}
                                                                    {isMe && <span className="ml-1 text-xs font-normal">(Du)</span>}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {shift.start_time} – {shift.end_time}
                                                                    {shift.shift_type && ` · ${shift.shift_type}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-center text-muted-foreground/50 text-xs py-3">Keine Schichten</p>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </TabsContent>

                    {/* ── Kalender-Sync ── */}
                    <TabsContent value="sync">
                        <MyShiftsCalendarSync employeeId={employee.id} existingToken={employee.calendar_token} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}