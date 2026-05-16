/**
 * BusinessCalendar.jsx — Betriebskalender & Sondertage
 * Mobile-first, einfache Bedienung für Betreiber/Manager
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, parseISO, getDay } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    ChevronLeft, ChevronRight, Plus, Save,
    Palmtree, AlertTriangle,
    Clock, Info, Trash2, Wand2, Leaf
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/components/auth/usePermissions';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { getHolidaysBW, getHolidayName } from '@/components/shifts/getHolidays';

// ── Konfiguration ──────────────────────────────────────────────────────────

export const DAY_TYPES = [
    { id: 'normal',                   label: 'Normaler Betrieb',      color: 'bg-slate-500',   textColor: 'text-slate-300',  dot: 'bg-slate-400'   },
    { id: 'sonderoeffnung',           label: 'Sonderöffnung',         color: 'bg-amber-600',   textColor: 'text-amber-300',  dot: 'bg-amber-400'   },
    { id: 'vorfeiertag',              label: 'Vorfeiertag',           color: 'bg-orange-600',  textColor: 'text-orange-300', dot: 'bg-orange-400'  },
    { id: 'feiertag',                 label: 'Feiertag',              color: 'bg-red-600',     textColor: 'text-red-300',    dot: 'bg-red-400'     },
    { id: 'eventtag',                 label: 'Eventtag',              color: 'bg-purple-600',  textColor: 'text-purple-300', dot: 'bg-purple-400'  },
    { id: 'lange_nacht',              label: 'Lange Nacht',           color: 'bg-indigo-600',  textColor: 'text-indigo-300', dot: 'bg-indigo-400'  },
    { id: 'inventurtag',              label: 'Inventurtag',           color: 'bg-cyan-600',    textColor: 'text-cyan-300',   dot: 'bg-cyan-400'    },
    { id: 'geschlossen',              label: 'Geschlossen',           color: 'bg-slate-700',   textColor: 'text-slate-400',  dot: 'bg-slate-500'   },
    { id: 'geschlossen_mit_reinigung',label: 'Geschl. + Reinigung',   color: 'bg-teal-700',    textColor: 'text-teal-300',   dot: 'bg-teal-400'    },
    { id: 'saisonstart',              label: 'Saisonstart',           color: 'bg-green-600',   textColor: 'text-green-300',  dot: 'bg-green-400'   },
    { id: 'saisonende',               label: 'Saisonende',            color: 'bg-yellow-700',  textColor: 'text-yellow-300', dot: 'bg-yellow-400'  },
    { id: 'betriebsferien',           label: 'Betriebsferien',        color: 'bg-pink-700',    textColor: 'text-pink-300',   dot: 'bg-pink-400'    },
    { id: 'wartungstag',              label: 'Wartungstag',           color: 'bg-zinc-600',    textColor: 'text-zinc-300',   dot: 'bg-zinc-400'    },
];

export function getDayTypeConfig(id) {
    return DAY_TYPES.find(d => d.id === id) || DAY_TYPES[0];
}

// ── Tag-Drawer ─────────────────────────────────────────────────────────────

function DayDrawer({ day, existing, open, onClose, onSave, onDelete, canEdit, cleaningTasks = [] }) {
    const initialDate = day ? format(day, 'yyyy-MM-dd') : '';
    const [dateStr, setDateStr] = useState(initialDate);
    const [form, setForm] = useState({
        day_type: existing?.day_type || 'normal',
        title: existing?.title || '',
        description: existing?.description || '',
        opening_time_override: existing?.opening_time_override || '',
        closing_time_override: existing?.closing_time_override || '',
        notes: existing?.notes || '',
    });
    // Terrassen-Aufgaben für Saisonstart/-ende
    const [selectedTasks, setSelectedTasks] = useState([]);

    useEffect(() => {
        setDateStr(day ? format(day, 'yyyy-MM-dd') : '');
        setForm({
            day_type: existing?.day_type || 'normal',
            title: existing?.title || '',
            description: existing?.description || '',
            opening_time_override: existing?.opening_time_override || '',
            closing_time_override: existing?.closing_time_override || '',
            notes: existing?.notes || '',
        });
        setSelectedTasks([]);
    }, [existing, day]);

    const cfg = getDayTypeConfig(form.day_type);
    const isClosed = ['geschlossen', 'geschlossen_mit_reinigung', 'betriebsferien'].includes(form.day_type);
    const isSaison = ['saisonstart', 'saisonende'].includes(form.day_type);

    // Terrassen-Reinigungsaufgaben
    const terrassenTasks = cleaningTasks.filter(t =>
        t.area?.toLowerCase().includes('terrasse') || t.area?.toLowerCase().includes('außen')
    );

    const handleSave = () => {
        onSave({
            date: dateStr,
            ...form,
            is_closed: isClosed,
            is_special_opening: form.day_type === 'sonderoeffnung',
            is_pre_holiday: form.day_type === 'vorfeiertag',
            is_holiday: form.day_type === 'feiertag',
            is_event_day: form.day_type === 'eventtag',
            is_long_night: form.day_type === 'lange_nacht',
            is_inventory_day: form.day_type === 'inventurtag',
            is_cleaning_only_day: form.day_type === 'geschlossen_mit_reinigung',
            season_tasks: isSaison ? selectedTasks : [],
        });
    };

    if (!day) return null;

    return (
        <Drawer open={open} onOpenChange={onClose}>
            <DrawerContent className="bg-card border-border max-h-[90vh]">
                <DrawerHeader className="border-b border-border pb-3">
                    <DrawerTitle className="text-foreground">
                        {existing ? 'Sondertag bearbeiten' : 'Neuer Sondertag'}
                    </DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto p-4 space-y-4 pb-8">

                    {/* Datum änderbar */}
                    {canEdit && (
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Datum</p>
                            <input
                                type="date"
                                value={dateStr}
                                onChange={e => setDateStr(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm"
                            />
                        </div>
                    )}

                    {!canEdit && existing && (
                        <div className={cn('px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2', cfg.color, 'text-white')}>
                            <Info className="w-4 h-4" />
                            {cfg.label}
                            {existing.title && ` — ${existing.title}`}
                        </div>
                    )}

                    {canEdit && (
                        <>
                            {/* Tagesart */}
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Tagesart</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {DAY_TYPES.map(dt => (
                                        <button
                                            key={dt.id}
                                            onClick={() => setForm(f => ({ ...f, day_type: dt.id }))}
                                            className={cn(
                                                'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all text-left',
                                                form.day_type === dt.id
                                                    ? `${dt.color} text-white border-transparent`
                                                    : 'bg-secondary/30 border-border text-muted-foreground hover:border-primary/50'
                                            )}
                                        >
                                            <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', dt.dot)} />
                                            <span className="text-xs leading-tight">{dt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Titel */}
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Bezeichnung (optional)</p>
                                <input
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="z.B. Silvester-Party"
                                    className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground"
                                />
                            </div>

                            {/* Sonderöffnungszeiten */}
                            {!isClosed && (
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Sonderöffnungszeiten (optional)</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <label className="text-xs text-muted-foreground mb-1 block">Von</label>
                                            <input
                                                type="time"
                                                value={form.opening_time_override}
                                                onChange={e => setForm(f => ({ ...f, opening_time_override: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-sm"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-muted-foreground mb-1 block">Bis</label>
                                            <input
                                                type="time"
                                                value={form.closing_time_override}
                                                onChange={e => setForm(f => ({ ...f, closing_time_override: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-sm"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Bei Nachtbetrieb: Schließzeit z.B. 04:00 (nächster Tag)</p>
                                </div>
                            )}

                            {/* Terrassen-Aufgaben bei Saisonstart/-ende */}
                            {isSaison && terrassenTasks.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                        <Leaf className="w-3.5 h-3.5 text-green-400" />
                                        Terrassen-Aufgaben aktivieren
                                    </p>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        {form.day_type === 'saisonstart' ? 'Welche Aufgaben sollen zum Saisonstart erledigt werden?' : 'Welche Aufgaben sollen zum Saisonende erledigt werden?'}
                                    </p>
                                    <div className="space-y-1.5">
                                        {terrassenTasks.map(task => (
                                            <label key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTasks.includes(task.id)}
                                                    onChange={e => setSelectedTasks(prev =>
                                                        e.target.checked ? [...prev, task.id] : prev.filter(id => id !== task.id)
                                                    )}
                                                    className="rounded"
                                                />
                                                <div>
                                                    <p className="text-sm text-foreground">{task.title}</p>
                                                    <p className="text-xs text-muted-foreground">{task.area}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notiz */}
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Notiz</p>
                                <textarea
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Interne Notiz..."
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground resize-none"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 pt-2">
                                {existing && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onDelete(existing.id)}
                                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                                <Button onClick={handleSave} className="flex-1 bg-primary hover:bg-primary/90 gap-2">
                                    <Save className="w-4 h-4" />
                                    Speichern
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Hinweis Zeiterfassung */}
                    {existing && isClosed && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-300">Zeiterfassung ist auch an diesem Tag möglich — Mitarbeiter können uneingeschränkt stempeln.</p>
                        </div>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}

// ── Monatskalender ─────────────────────────────────────────────────────────

function MonthCalendar({ currentMonth, specialDays, onDayClick, openingHours }) {
    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    const firstDayOfWeek = startOfMonth(currentMonth).getDay();
    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const DE_DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const holidays = [
        ...getHolidaysBW(currentMonth.getFullYear()),
        ...getHolidaysBW(currentMonth.getFullYear() + 1),
    ];

    const getSpecialDay = (date) => specialDays.find(s => s.date === format(date, 'yyyy-MM-dd'));
    const getHoliday = (date) => getHolidayName(date, holidays);
    const getOpeningHour = (date) => {
        const weekdayName = DE_DAYS[date.getDay()];
        return openingHours?.find(o => o.day_of_week === weekdayName);
    };

    return (
        <div>
            {/* Wochentage Header */}
            <div className="grid grid-cols-7 mb-1">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: offset }).map((_, i) => <div key={`e-${i}`} />)}
                {days.map(day => {
                    const special = getSpecialDay(day);
                    const holiday = getHoliday(day);
                    const oh = getOpeningHour(day);
                    const cfg = special ? getDayTypeConfig(special.day_type) : null;
                    const today = isToday(day);
                    const isRegularClosed = !special && oh?.is_closed;
                    const isHolidayDay = !special && !!holiday;

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => onDayClick(day, special)}
                            className={cn(
                                'relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all active:scale-95 text-xs font-medium',
                                today && !special && !isHolidayDay ? 'ring-2 ring-primary bg-primary/10 text-primary font-bold' : '',
                                special ? `${cfg.color} text-white` :
                                isHolidayDay ? 'bg-red-500/20 text-red-300' :
                                isRegularClosed ? 'bg-slate-700/40 text-muted-foreground' :
                                'hover:bg-accent/50 text-foreground',
                            )}
                            title={holiday || (oh?.is_closed ? 'Regulär geschlossen' : oh ? `${oh.open_time || ''}–${oh.close_time || ''}` : '')}
                        >
                            <span>{format(day, 'd')}</span>
                            {/* Dot für Feiertag */}
                            {isHolidayDay && (
                                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-400" />
                            )}
                            {/* Dot für Sondertag mit Titel */}
                            {special && special.title && !isHolidayDay && (
                                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60" />
                            )}
                        </button>
                    );
                })}
            </div>
            {/* Öffnungszeiten-Legende */}
            {openingHours && openingHours.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Öffnungszeiten dieser Woche</p>
                    <div className="grid grid-cols-7 gap-0.5 text-center">
                        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((label, idx) => {
                            const dayName = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][idx];
                            const oh = openingHours.find(o => o.day_of_week === dayName);
                            return (
                                <div key={label}>
                                    <p className="text-[9px] text-muted-foreground">{label}</p>
                                    {oh?.is_closed ? (
                                        <p className="text-[9px] text-slate-500 font-medium">–</p>
                                    ) : oh ? (
                                        <p className="text-[9px] text-green-400 font-medium leading-tight">{oh.open_time?.slice(0,5) || '?'}</p>
                                    ) : (
                                        <p className="text-[9px] text-muted-foreground/40">–</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Liste kommender Sondertage ─────────────────────────────────────────────

function UpcomingList({ specialDays, onDayClick }) {
    const upcoming = [...specialDays]
        .filter(d => d.day_type !== 'normal' && d.date >= format(new Date(), 'yyyy-MM-dd'))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10);

    if (upcoming.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground text-sm">
                Keine kommenden Sondertage eingetragen
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {upcoming.map(d => {
                const cfg = getDayTypeConfig(d.day_type);
                const date = parseISO(d.date);
                return (
                    <button
                        key={d.id}
                        onClick={() => onDayClick(date, d)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-left"
                    >
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', cfg.color)}>
                            <span className="text-white font-bold text-sm">{format(date, 'd')}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <Badge className={cn('text-[10px] px-1.5 py-0', cfg.color, 'text-white border-0')}>{cfg.label}</Badge>
                                {d.is_closed && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Geschlossen</Badge>}
                            </div>
                            <p className="text-sm font-semibold text-foreground truncate">{d.title || format(date, "EEEE, d. MMM", { locale: de })}</p>
                            {d.opening_time_override && (
                                <p className="text-xs text-muted-foreground">{d.opening_time_override}{d.closing_time_override ? ` – ${d.closing_time_override}` : ''}</p>
                            )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                );
            })}
        </div>
    );
}

// ── Feiertage ─────────────────────────────────────────────────────────────

function HolidayList() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const year = new Date().getFullYear();
    const holidays = [
        ...getHolidaysBW(year),
        ...getHolidaysBW(year + 1),
    ]
    .filter(h => format(h.date, 'yyyy-MM-dd') >= today)
    .slice(0, 8);

    return (
        <div className="mt-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Nächste Feiertage (BW)</p>
            <div className="space-y-1.5">
                {holidays.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-red-300">{format(h.date, 'd')}</span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">{h.name}</p>
                            <p className="text-xs text-muted-foreground">{format(h.date, "EEEE, d. MMMM yyyy", { locale: de })}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── MAIN ──────────────────────────────────────────────────────────────────

export default function BusinessCalendar() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedExisting, setSelectedExisting] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [view, setView] = useState('kalender'); // 'kalender' | 'liste'

    const canEdit = permissions.isManager || permissions.isAdmin;
    const [autoFilling, setAutoFilling] = useState(false);

    const { data: specialDays = [] } = useQuery({
        queryKey: ['business-calendar'],
        queryFn: () => base44.entities.BusinessCalendarDay.list('-date', 500),
    });

    const { data: openingHours = [] } = useQuery({
        queryKey: ['opening-hours'],
        queryFn: () => base44.entities.OpeningHours.list(),
        enabled: canEdit,
    });

    const { data: cleaningTasks = [] } = useQuery({
        queryKey: ['cleaning-tasks-all'],
        queryFn: () => base44.entities.CleaningTask.list(),
        enabled: canEdit,
    });

    // Wochentag-Index (0=So, 1=Mo...) → OpeningHours-Eintrag
    const DE_DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

    const handleAutoFill = async () => {
        if (openingHours.length === 0) {
            alert('Keine Standardöffnungszeiten hinterlegt. Bitte zuerst unter Einstellungen → Öffnungszeiten eintragen.');
            return;
        }
        setAutoFilling(true);
        const monthDays = eachDayOfInterval({
            start: startOfMonth(currentMonth),
            end: endOfMonth(currentMonth),
        });
        const existingDates = new Set(specialDays.map(d => d.date));
        const toCreate = [];

        for (const day of monthDays) {
            const dateStr = format(day, 'yyyy-MM-dd');
            if (existingDates.has(dateStr)) continue; // bereits eingetragen

            const weekdayName = DE_DAYS[getDay(day)];
            const oh = openingHours.find(o => o.day_of_week === weekdayName);
            if (!oh) continue;

            toCreate.push({
                date: dateStr,
                day_type: oh.is_closed ? 'geschlossen' : 'normal',
                title: '',
                is_closed: oh.is_closed || false,
                is_special_opening: false,
                is_pre_holiday: false,
                is_holiday: false,
                is_event_day: false,
                is_long_night: false,
                is_inventory_day: false,
                is_cleaning_only_day: false,
                opening_time_override: oh.is_closed ? '' : (oh.open_time || ''),
                closing_time_override: oh.is_closed ? '' : (oh.close_time || ''),
                notes: oh.is_closed ? 'Regulär geschlossen' : '',
                updated_by: permissions.employeeName || 'Auto-Befüllung',
            });
        }

        // In Batches von 10 erstellen
        for (let i = 0; i < toCreate.length; i += 10) {
            await Promise.all(toCreate.slice(i, i + 10).map(d => base44.entities.BusinessCalendarDay.create(d)));
        }

        queryClient.invalidateQueries({ queryKey: ['business-calendar'] });
        setAutoFilling(false);
    };

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (selectedExisting) {
                return base44.entities.BusinessCalendarDay.update(selectedExisting.id, { ...data, updated_by: permissions.employeeName || 'Manager' });
            }
            return base44.entities.BusinessCalendarDay.create({ ...data, updated_by: permissions.employeeName || 'Manager' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-calendar'] });
            setDrawerOpen(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.BusinessCalendarDay.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-calendar'] });
            setDrawerOpen(false);
        },
    });

    const handleDayClick = (day, existing) => {
        setSelectedDay(day);
        setSelectedExisting(existing || null);
        setDrawerOpen(true);
    };

    // Stats
    const thisMonthDays = specialDays.filter(d => d.date.startsWith(format(currentMonth, 'yyyy-MM')));
    const closedCount = thisMonthDays.filter(d => d.is_closed).length;
    const specialCount = thisMonthDays.filter(d => d.day_type !== 'normal').length;

    return (
        <div className="min-h-screen bg-background pb-28 md:pb-8">
            <div className="max-w-2xl mx-auto px-3 py-4">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Betriebskalender</h1>
                        <p className="text-xs text-muted-foreground">Sondertage & besondere Öffnungszeiten</p>
                    </div>
                    {canEdit && (
                        <div className="flex gap-2">
                            <Button
                                onClick={handleAutoFill}
                                disabled={autoFilling}
                                size="sm"
                                variant="outline"
                                className="gap-1 text-xs border-primary/40 text-primary hover:bg-primary/10"
                                title="Monat anhand Standardöffnungszeiten automatisch befüllen"
                            >
                                <Wand2 className="w-3.5 h-3.5" />
                                {autoFilling ? 'Befülle...' : 'Auto'}
                            </Button>
                            <Button
                                onClick={() => handleDayClick(new Date(), null)}
                                size="sm"
                                className="bg-primary gap-1"
                            >
                                <Plus className="w-4 h-4" /> Sondertag
                            </Button>
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <Card className="bg-card border-border">
                        <CardContent className="p-3 text-center">
                            <p className="text-xl font-bold text-foreground">{specialCount}</p>
                            <p className="text-[10px] text-muted-foreground">Sondertage</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-3 text-center">
                            <p className="text-xl font-bold text-red-400">{closedCount}</p>
                            <p className="text-[10px] text-muted-foreground">Geschlossen</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-3 text-center">
                            <p className="text-xl font-bold text-amber-400">{specialDays.filter(d => d.date >= format(new Date(), 'yyyy-MM-dd') && d.day_type !== 'normal').length}</p>
                            <p className="text-[10px] text-muted-foreground">Kommend</p>
                        </CardContent>
                    </Card>
                </div>

                {/* View Toggle */}
                <div className="flex bg-secondary/30 rounded-xl p-1 mb-4 gap-1">
                    {[{ id: 'kalender', label: 'Kalender' }, { id: 'liste', label: 'Übersicht' }].map(v => (
                        <button
                            key={v.id}
                            onClick={() => setView(v.id)}
                            className={cn(
                                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                                view === v.id ? 'bg-card text-foreground shadow' : 'text-muted-foreground'
                            )}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>

                {/* Kalender View */}
                {view === 'kalender' && (
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            {/* Monat Navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent/50">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <h2 className="text-base font-bold text-foreground">
                                    {format(currentMonth, 'MMMM yyyy', { locale: de })}
                                </h2>
                                <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent/50">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                            <MonthCalendar
                                currentMonth={currentMonth}
                                specialDays={specialDays}
                                onDayClick={handleDayClick}
                                openingHours={openingHours}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Liste View */}
                {view === 'liste' && (
                    <>
                        <UpcomingList specialDays={specialDays} onDayClick={handleDayClick} />
                        {/* Nächste Feiertage */}
                        <HolidayList />
                    </>
                )}

                {/* Legende */}
                <div className="mt-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Legende</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {DAY_TYPES.filter(d => d.id !== 'normal').map(dt => (
                            <div key={dt.id} className="flex items-center gap-2">
                                <div className={cn('w-3 h-3 rounded-full shrink-0', dt.dot)} />
                                <span className="text-xs text-muted-foreground">{dt.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hinweis Zeiterfassung */}
                <Card className="mt-4 border-blue-500/20 bg-blue-500/5">
                    <CardContent className="p-3 flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-300">
                            Zeiterfassung ist unabhängig vom Betriebskalender — Mitarbeiter können immer stempeln, auch an geschlossenen Tagen.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Day Drawer */}
            <DayDrawer
                day={selectedDay}
                existing={selectedExisting}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onSave={(data) => saveMutation.mutate(data)}
                onDelete={(id) => deleteMutation.mutate(id)}
                canEdit={canEdit}
                cleaningTasks={cleaningTasks}
            />
        </div>
    );
}