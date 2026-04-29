/**
 * OperativeListen.jsx — Zentrales operatives Hub
 * Bündelt Putzliste, Auffüllen, Einkauf, Opening, Closing in einer Ansicht.
 * Mobile-first, schnelle Bedienung.
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    Brush, RefreshCw, ShoppingCart, CheckSquare, ChevronRight,
    CheckCircle2, Circle, Zap, Sun, Moon, Package, Filter, Search
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePermissions } from '@/components/auth/usePermissions';
import { getCalendarDayForDate, getSpecialDayLabel, getSpecialDayColor } from '@/lib/businessCalendarUtils';

const today = format(new Date(), 'yyyy-MM-dd');
const weekday = format(new Date(), 'EEEE', { locale: de });

// ── Section Card ───────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, color, count, total, children, linkTo }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const done = count === total && total > 0;

    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', color)}>
                        <Icon className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{title}</h3>
                    {total > 0 && (
                        <Badge className={cn('text-[10px] px-1.5 py-0', done ? 'bg-green-600 text-white' : 'bg-secondary text-muted-foreground')}>
                            {count}/{total}
                        </Badge>
                    )}
                </div>
                {linkTo && (
                    <Link to={createPageUrl(linkTo)} className="text-[10px] text-muted-foreground flex items-center gap-0.5 hover:text-foreground">
                        Alle <ChevronRight className="w-3 h-3" />
                    </Link>
                )}
            </div>
            {total > 0 && (
                <div className="h-1 bg-secondary rounded-full mb-2 overflow-hidden">
                    <div
                        className={cn('h-full rounded-full transition-all', done ? 'bg-green-500' : 'bg-primary')}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            )}
            {children}
        </div>
    );
}

// ── Task Row ───────────────────────────────────────────────────────────────

function TaskRow({ title, subtitle, done, onToggle, specialLabel, specialColor }) {
    return (
        <Card className={cn('border mb-1.5 transition-all', done ? 'border-green-500/20 bg-green-500/5 opacity-70' : 'border-border bg-card')}>
            <CardContent className="p-3 flex items-center gap-3">
                <button
                    onClick={onToggle}
                    className={cn(
                        'shrink-0 w-7 h-7 flex items-center justify-center rounded-full border-2 transition-all',
                        done ? 'border-green-500 bg-green-500/20' : 'border-muted-foreground hover:border-primary active:scale-90'
                    )}
                >
                    {done
                        ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                        : <Circle className="w-4 h-4 text-muted-foreground" />
                    }
                </button>
                <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium truncate', done ? 'line-through text-muted-foreground' : 'text-foreground')}>{title}</p>
                    {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
                </div>
                {specialLabel && (
                    <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0 border', specialColor || 'bg-amber-500/20 text-amber-300 border-amber-500/30')}>
                        {specialLabel}
                    </Badge>
                )}
            </CardContent>
        </Card>
    );
}

// ── MAIN ──────────────────────────────────────────────────────────────────

export default function OperativeListen() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [filter, setFilter] = useState('alle'); // 'alle' | 'offen' | 'erledigt'

    // Betriebskalender
    const { data: calendarDays = [] } = useQuery({
        queryKey: ['business-calendar'],
        queryFn: () => base44.entities.BusinessCalendarDay.list('-date', 100),
    });
    const calendarEntry = getCalendarDayForDate(today, calendarDays);
    const specialLabel = getSpecialDayLabel(calendarEntry);
    const specialColor = calendarEntry ? getSpecialDayColor(calendarEntry.day_type) : '';

    // Cleaning Tasks
    const { data: cleaningTasks = [] } = useQuery({
        queryKey: ['cleaning-tasks-operative'],
        queryFn: () => base44.entities.CleaningTask.filter({ is_active: true }),
    });

    // Restock Items
    const { data: restockItems = [] } = useQuery({
        queryKey: ['restock-items-operative'],
        queryFn: () => base44.entities.RestockItem.filter({ status: 'offen' }),
    });

    // Shopping Items
    const { data: shoppingItems = [] } = useQuery({
        queryKey: ['shopping-items-operative'],
        queryFn: () => base44.entities.ShoppingList.filter({ status: 'offen' }),
    });

    // Todos (offen, heute fällig oder ohne Datum)
    const { data: todos = [] } = useQuery({
        queryKey: ['todos-operative'],
        queryFn: () => base44.entities.TodoItem.filter({ status: 'offen' }),
    });

    // Filter cleaning by today's weekday + special day rules
    const todayCleaningTasks = cleaningTasks.filter(t => {
        if (!t.is_active) return false;
        const alreadyDone = t.is_completed && t.last_reset === today;
        if (alreadyDone && filter === 'offen') return false;
        if (!alreadyDone && filter === 'erledigt') return false;

        const specialRules = t.special_day_rules || {};
        const inWeekdays = !t.due_weekdays || t.due_weekdays.length === 0 || t.due_weekdays.includes(weekday);

        // Sonderregel-Check
        let matchesSpecial = false;
        if (calendarEntry) {
            if (specialRules.include_special_openings && calendarEntry.is_special_opening) matchesSpecial = true;
            if (specialRules.include_pre_holidays && calendarEntry.is_pre_holiday) matchesSpecial = true;
            if (specialRules.include_holidays && calendarEntry.is_holiday) matchesSpecial = true;
            if (specialRules.include_event_days && calendarEntry.is_event_day) matchesSpecial = true;
            if (specialRules.include_long_nights && calendarEntry.is_long_night) matchesSpecial = true;
            if (specialRules.include_inventory_days && calendarEntry.is_inventory_day) matchesSpecial = true;
            if (specialRules.include_cleaning_only_days && calendarEntry.is_cleaning_only_day) matchesSpecial = true;
        }
        if (specialRules.only_special_days) return matchesSpecial;
        return inWeekdays || matchesSpecial;
    });

    const todayTodos = todos.filter(t => {
        if (t.is_archived) return false;
        if (filter === 'offen') return t.status !== 'erledigt';
        if (filter === 'erledigt') return t.status === 'erledigt';
        return !t.due_date || t.due_date <= today;
    }).slice(0, 8);

    // Mutations
    const cleaningMutation = useMutation({
        mutationFn: ({ id, done }) => base44.entities.CleaningTask.update(id, {
            is_completed: done,
            completed_by: permissions.employeeName || 'Mitarbeiter',
            completed_at: done ? new Date().toISOString() : null,
            last_reset: today,
        }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cleaning-tasks-operative'] }),
    });

    const todoMutation = useMutation({
        mutationFn: (id) => base44.entities.TodoItem.update(id, {
            status: 'erledigt',
            completed_by: permissions.employeeName || 'Mitarbeiter',
            completed_at: new Date().toISOString(),
        }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos-operative'] }),
    });

    const doneClean = todayCleaningTasks.filter(t => t.is_completed && t.last_reset === today).length;
    const doneShop  = shoppingItems.filter(i => i.status === 'erledigt').length;

    return (
        <div className="min-h-screen bg-background pb-28 md:pb-8">
            <div className="max-w-xl mx-auto px-3 py-4">

                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Zap className="w-5 h-5 text-primary" />
                            Operative Listen
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {format(new Date(), "EEEE, d. MMMM", { locale: de })}
                        </p>
                    </div>
                    {specialLabel && (
                        <Badge className={cn('text-xs px-2 py-1 border font-semibold', specialColor)}>
                            {specialLabel}
                        </Badge>
                    )}
                </div>

                {/* Hinweis Sondertag */}
                {calendarEntry && calendarEntry.day_type !== 'normal' && (
                    <Card className="mb-4 border-amber-500/20 bg-amber-500/5">
                        <CardContent className="p-3 flex items-start gap-2">
                            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-amber-300">
                                    Heute: {specialLabel}
                                    {calendarEntry.title && ` — ${calendarEntry.title}`}
                                </p>
                                {calendarEntry.opening_time_override && (
                                    <p className="text-xs text-amber-400/80">
                                        Sonderöffnung: {calendarEntry.opening_time_override}
                                        {calendarEntry.closing_time_override ? ` – ${calendarEntry.closing_time_override}` : ''}
                                    </p>
                                )}
                                {calendarEntry.notes && <p className="text-xs text-muted-foreground mt-0.5">{calendarEntry.notes}</p>}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Filter */}
                <div className="flex gap-1.5 mb-4 bg-secondary/20 rounded-xl p-1">
                    {[
                        { id: 'alle', label: 'Alle' },
                        { id: 'offen', label: 'Offen' },
                        { id: 'erledigt', label: 'Erledigt' },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={cn(
                                'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                                filter === f.id ? 'bg-card text-foreground shadow' : 'text-muted-foreground'
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Putzliste */}
                {todayCleaningTasks.length > 0 && (
                    <SectionCard
                        icon={Brush}
                        title="Putzliste"
                        color="bg-teal-600"
                        count={doneClean}
                        total={todayCleaningTasks.length}
                        linkTo="Cleaning"
                    >
                        {todayCleaningTasks.map(t => {
                            const done = t.is_completed && t.last_reset === today;
                            const isSpecial = t.special_day_rules && Object.values(t.special_day_rules).some(Boolean);
                            return (
                                <TaskRow
                                    key={t.id}
                                    title={t.title}
                                    subtitle={t.area}
                                    done={done}
                                    onToggle={() => cleaningMutation.mutate({ id: t.id, done: !done })}
                                    specialLabel={isSpecial && specialLabel ? specialLabel : null}
                                    specialColor={specialColor}
                                />
                            );
                        })}
                    </SectionCard>
                )}

                {/* Auffüllliste */}
                {restockItems.length > 0 && filter !== 'erledigt' && (
                    <SectionCard
                        icon={RefreshCw}
                        title="Auffüllliste"
                        color="bg-amber-600"
                        count={0}
                        total={restockItems.length}
                        linkTo="Restock"
                    >
                        {restockItems.slice(0, 5).map(i => (
                            <TaskRow
                                key={i.id}
                                title={i.article_name || i.name || 'Artikel'}
                                subtitle={i.quantity ? `${i.quantity} ${i.unit || ''}` : null}
                                done={false}
                                onToggle={() => {}}
                            />
                        ))}
                        {restockItems.length > 5 && (
                            <Link to={createPageUrl('Restock')}>
                                <p className="text-xs text-muted-foreground text-center py-2 hover:text-foreground">
                                    +{restockItems.length - 5} weitere → Auffüllliste öffnen
                                </p>
                            </Link>
                        )}
                    </SectionCard>
                )}

                {/* Einkaufsliste */}
                {shoppingItems.length > 0 && filter !== 'erledigt' && (
                    <SectionCard
                        icon={ShoppingCart}
                        title="Einkaufsliste"
                        color="bg-yellow-600"
                        count={doneShop}
                        total={shoppingItems.length}
                        linkTo="Shopping"
                    >
                        {shoppingItems.slice(0, 4).map(i => (
                            <TaskRow
                                key={i.id}
                                title={i.name || i.article_name || 'Artikel'}
                                subtitle={i.quantity ? `${i.quantity} ${i.unit || ''}` : null}
                                done={i.status === 'erledigt'}
                                onToggle={() => {}}
                            />
                        ))}
                        {shoppingItems.length > 4 && (
                            <Link to={createPageUrl('Shopping')}>
                                <p className="text-xs text-muted-foreground text-center py-2 hover:text-foreground">
                                    +{shoppingItems.length - 4} weitere → Einkaufsliste öffnen
                                </p>
                            </Link>
                        )}
                    </SectionCard>
                )}

                {/* Aufgaben */}
                {todayTodos.length > 0 && (
                    <SectionCard
                        icon={CheckSquare}
                        title="Aufgaben"
                        color="bg-orange-600"
                        count={todayTodos.filter(t => t.status === 'erledigt').length}
                        total={todayTodos.length}
                        linkTo="Todos"
                    >
                        {todayTodos.map(t => (
                            <TaskRow
                                key={t.id}
                                title={t.title}
                                subtitle={t.assigned_to || null}
                                done={t.status === 'erledigt'}
                                onToggle={() => t.status !== 'erledigt' && todoMutation.mutate(t.id)}
                            />
                        ))}
                    </SectionCard>
                )}

                {/* Leer */}
                {todayCleaningTasks.length === 0 && todayTodos.length === 0 && restockItems.length === 0 && shoppingItems.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500/50" />
                        <p className="text-sm font-medium">Alles erledigt!</p>
                        <p className="text-xs mt-1">Keine offenen Listen für heute.</p>
                    </div>
                )}

                {/* Link Betriebskalender */}
                {permissions.isManager && (
                    <Link to={createPageUrl('BusinessCalendar')}>
                        <Card className="mt-4 border-border bg-card hover:bg-accent/30 transition-all">
                            <CardContent className="p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                    <Zap className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-foreground">Betriebskalender</p>
                                    <p className="text-xs text-muted-foreground">Sondertage verwalten</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </CardContent>
                        </Card>
                    </Link>
                )}
            </div>
        </div>
    );
}