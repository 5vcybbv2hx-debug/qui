/**
 * SeatingChart — Mobile-first Tischplan mit 3 Tabs:
 * „Heute" (live Status), „Plan" (Grid), „Liste" (Tabelle)
 * Reservierungen direkt aus dem Tischplan heraus verwalten.
 */
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Plus, Settings, Calendar, List, Grid2x2, Users, Clock,
    ChevronRight, Pencil, X, CheckCircle2, Phone, Layers,
    Sparkles, AlarmClock
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import QuickReservationSheet, { getTableStatus, STATUS_CONFIG } from '@/components/seating/QuickReservationSheet';
import TableModal from '@/components/seating/TableModal';
import RoomManager from '@/components/seating/RoomManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePermissions } from '@/components/auth/usePermissions';

// Suggest tables for given guest count
function suggestTables(tables, reservations, guestCount, date, time) {
    const available = tables.filter(t => {
        if (t.is_active === false) return false;
        return getTableStatus(t, reservations, date, time) === 'free';
    });
    // Sort by closest fit (enough seats, not too much waste)
    const scored = available.map(t => ({
        table: t,
        score: t.capacity >= guestCount ? t.capacity - guestCount : 999
    })).sort((a, b) => a.score - b.score);
    return scored.slice(0, 3).map(s => s.table);
}

export default function SeatingChartPage() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [tab, setTab] = useState('today');
    const [selectedTable, setSelectedTable] = useState(null);
    const [showTableModal, setShowTableModal] = useState(null); // table for edit
    const [showRooms, setShowRooms] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterTime, setFilterTime] = useState(() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    });
    const [guestFilter, setGuestFilter] = useState('');

    const { data: tables = [] } = useQuery({
        queryKey: ['tables'],
        queryFn: () => base44.entities.Table.list(),
        staleTime: 2 * 60 * 1000
    });

    const { data: rooms = [] } = useQuery({
        queryKey: ['rooms'],
        queryFn: () => base44.entities.Room.list(),
        staleTime: 5 * 60 * 1000
    });

    const { data: reservations = [] } = useQuery({
        queryKey: ['reservations'],
        queryFn: () => base44.entities.Reservation.list('-date'),
        staleTime: 30 * 1000
    });

    const filteredTables = useMemo(() => {
        let list = selectedRoom ? tables.filter(t => t.room === selectedRoom) : tables;
        if (guestFilter) list = list.filter(t => t.capacity >= Number(guestFilter));
        return list.sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
    }, [tables, selectedRoom, guestFilter]);

    const todayReservations = useMemo(() =>
        reservations
            .filter(r => r.date === filterDate && r.status !== 'storniert')
            .sort((a, b) => (a.time || '').localeCompare(b.time || '')),
        [reservations, filterDate]
    );

    const tableWithStatus = useMemo(() =>
        filteredTables.map(t => ({
            table: t,
            status: getTableStatus(t, reservations, filterDate, filterTime),
            reservation: todayReservations.find(r => r.table === t.id || r.table === t.number) || null
        })),
        [filteredTables, reservations, filterDate, filterTime, todayReservations]
    );

    const stats = useMemo(() => ({
        free: tableWithStatus.filter(t => t.status === 'free').length,
        reserved: tableWithStatus.filter(t => t.status === 'reserved').length,
        soon: tableWithStatus.filter(t => t.status === 'soon').length,
        total: tableWithStatus.filter(t => t.status !== 'inactive').length,
    }), [tableWithStatus]);

    const suggested = guestFilter
        ? suggestTables(tables, reservations, Number(guestFilter), filterDate, filterTime)
        : [];

    const isToday = filterDate === new Date().toISOString().split('T')[0];

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1">
                            <h1 className="text-lg font-bold text-foreground">Tischplan</h1>
                            <p className="text-xs text-muted-foreground">
                                {stats.free} frei · {stats.reserved} reserviert · {stats.total} gesamt
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {permissions.isManager && (
                                <>
                                    <Button variant="outline" size="sm" onClick={() => setShowRooms(true)} className="h-9 gap-1 text-xs">
                                        <Settings className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Räume</span>
                                    </Button>
                                    <Button size="sm" onClick={() => setShowTableModal({})} className="h-9 gap-1 text-xs"
                                        style={{ background: 'linear-gradient(135deg, var(--brand-from), var(--brand-via))', color: 'var(--brand-fg)' }}>
                                        <Plus className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Tisch</span>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Date + Time + Guests filter */}
                    <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
                        <input type="date" value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                            className="h-9 px-3 rounded-xl border border-input bg-transparent text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring shrink-0" />
                        <input type="time" value={filterTime}
                            onChange={e => setFilterTime(e.target.value)}
                            className="h-9 px-3 rounded-xl border border-input bg-transparent text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-28 shrink-0" />
                        <div className="relative shrink-0">
                            <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input type="number" value={guestFilter} min="1" max="20"
                                onChange={e => setGuestFilter(e.target.value)}
                                placeholder="Pers."
                                className="h-9 pl-7 pr-3 w-24 rounded-xl border border-input bg-transparent text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                        </div>
                        {guestFilter && (
                            <button onClick={() => setGuestFilter('')} className="h-9 w-9 rounded-xl border border-input flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex border-t border-border">
                        {[
                            { id: 'today', label: 'Heute', icon: Clock },
                            { id: 'plan', label: 'Plan', icon: Grid2x2 },
                            { id: 'list', label: 'Liste', icon: List },
                        ].map(({ id, label, icon: Icon }) => (
                            <button key={id} onClick={() => setTab(id)}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
                                    tab === id
                                        ? 'text-foreground border-b-2 border-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}>
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Room filter */}
                    {rooms.length > 0 && (
                        <div className="flex gap-2 px-4 py-2 overflow-x-auto border-t border-border/50">
                            <button onClick={() => setSelectedRoom(null)}
                                className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors shrink-0 min-h-[32px]',
                                    !selectedRoom ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground')}>
                                Alle
                            </button>
                            {rooms.map(room => (
                                <button key={room.id} onClick={() => setSelectedRoom(room.name)}
                                    className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors shrink-0 min-h-[32px]',
                                        selectedRoom === room.name ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground')}>
                                    {room.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-4 py-4 space-y-4">
                    {/* Suggestions banner */}
                    {guestFilter && suggested.length > 0 && (
                        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
                            <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-2">
                                <Sparkles className="w-3.5 h-3.5" />
                                Passende Tische für {guestFilter} Personen
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                {suggested.map(t => (
                                    <button key={t.id} onClick={() => setSelectedTable(t)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-sm font-medium text-amber-300 min-h-[44px]">
                                        T{t.number} · {t.capacity} Pl.
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {guestFilter && suggested.length === 0 && (
                        <div className="rounded-2xl border border-border bg-secondary/20 p-3 text-sm text-muted-foreground text-center">
                            Kein passender freier Tisch für {guestFilter} Personen gefunden.
                        </div>
                    )}

                    {/* TODAY TAB */}
                    {tab === 'today' && (
                        <div className="space-y-3">
                            {/* Status summary */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: 'Frei', count: stats.free, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
                                    { label: 'Reserviert', count: stats.reserved, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                                    { label: 'Bald', count: stats.soon, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                                ].map(({ label, count, color, bg }) => (
                                    <div key={label} className={cn('rounded-xl border p-3 text-center', bg)}>
                                        <p className={cn('text-2xl font-bold', color)}>{count}</p>
                                        <p className="text-xs text-muted-foreground">{label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Today's reservations timeline */}
                            {todayReservations.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        {isToday ? 'Heute' : format(new Date(filterDate + 'T12:00'), 'EEEE, d. MMMM', { locale: de })} · {todayReservations.length} Reservierungen
                                    </p>
                                    <div className="space-y-2">
                                        {todayReservations.map(res => {
                                            const t = tables.find(tbl => tbl.id === res.table || tbl.number === res.table);
                                            return (
                                                <div key={res.id}
                                                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/30 cursor-pointer min-h-[64px]"
                                                    onClick={() => t && setSelectedTable(t)}>
                                                    <div className="flex flex-col items-center shrink-0 w-12">
                                                        <span className="text-sm font-bold text-foreground">{res.time}</span>
                                                        <span className="text-[10px] text-muted-foreground">{res.guests} P.</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-foreground truncate">{res.customer_name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {t ? `Tisch ${t.number}` : res.table ? `Tisch ${res.table}` : 'Kein Tisch'}
                                                        </p>
                                                    </div>
                                                    <span className={cn('text-[10px] px-2 py-1 rounded-full border shrink-0',
                                                        res.status === 'bestätigt' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                                                        res.status === 'storniert' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                                        'bg-amber-500/10 border-amber-500/30 text-amber-400')}>
                                                        {res.status}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {todayReservations.length === 0 && (
                                <div className="rounded-2xl border border-border bg-secondary/20 p-6 text-center">
                                    <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">Keine Reservierungen für diesen Tag</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PLAN TAB — grid of table cards */}
                    {tab === 'plan' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {tableWithStatus.map(({ table, status, reservation }) => (
                                <button key={table.id} onClick={() => setSelectedTable(table)}
                                    className={cn(
                                        'rounded-2xl border-2 p-4 text-left transition-all active:scale-95 min-h-[100px] flex flex-col justify-between',
                                        STATUS_CONFIG[status].color,
                                        suggested.some(s => s.id === table.id) && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-background'
                                    )}>
                                    <div className="flex items-start justify-between gap-1">
                                        <span className="text-2xl font-black">{table.number}</span>
                                        <span className={cn('w-2.5 h-2.5 rounded-full mt-1 shrink-0', STATUS_CONFIG[status].dot)} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium">{STATUS_CONFIG[status].label}</p>
                                        <p className="text-xs opacity-70">{table.capacity} Plätze</p>
                                        {reservation && (
                                            <p className="text-xs font-semibold truncate mt-0.5">{reservation.time} {reservation.customer_name}</p>
                                        )}
                                    </div>
                                </button>
                            ))}

                            {/* Add table button for managers */}
                            {permissions.isManager && (
                                <button onClick={() => setShowTableModal({})}
                                    className="rounded-2xl border-2 border-dashed border-border p-4 min-h-[100px] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
                                    <Plus className="w-6 h-6" />
                                    <span className="text-xs font-medium">Tisch hinzufügen</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* LIST TAB */}
                    {tab === 'list' && (
                        <div className="space-y-2">
                            {tableWithStatus.map(({ table, status, reservation }) => (
                                <button key={table.id} onClick={() => setSelectedTable(table)}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:bg-accent/30 active:scale-[0.99] transition-all min-h-[64px] text-left">
                                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0', STATUS_CONFIG[status].color)}>
                                        {table.number}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-foreground">Tisch {table.number}</p>
                                            {table.room && <span className="text-xs text-muted-foreground">· {table.room}</span>}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {table.capacity} Plätze
                                            {reservation ? ` · ${reservation.time} · ${reservation.customer_name} (${reservation.guests} P.)` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={cn('text-xs px-2 py-1 rounded-full border', STATUS_CONFIG[status].color)}>
                                            {STATUS_CONFIG[status].label}
                                        </span>
                                        {permissions.isManager && (
                                            <button onClick={e => { e.stopPropagation(); setShowTableModal(table); }}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </button>
                            ))}

                            {tableWithStatus.length === 0 && (
                                <div className="rounded-2xl border border-border bg-secondary/20 p-8 text-center">
                                    <p className="text-muted-foreground text-sm">Keine Tische vorhanden</p>
                                    {permissions.isManager && (
                                        <Button className="mt-3 h-10 gap-2" onClick={() => setShowTableModal({})}>
                                            <Plus className="w-4 h-4" />Ersten Tisch anlegen
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Reservation / Table Info Sheet */}
            {selectedTable && (
                <QuickReservationSheet
                    table={selectedTable}
                    tables={tables}
                    reservations={reservations}
                    checkDate={filterDate}
                    checkTime={filterTime}
                    onClose={() => setSelectedTable(null)}
                    onEditReservation={() => {}}
                />
            )}

            {/* Table edit modal */}
            {showTableModal !== null && (
                <TableModal
                    table={showTableModal?.id ? showTableModal : null}
                    open={true}
                    onClose={() => setShowTableModal(null)}
                    reservation={null}
                />
            )}

            {/* Rooms dialog */}
            <Dialog open={showRooms} onOpenChange={setShowRooms}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Räume verwalten</DialogTitle>
                    </DialogHeader>
                    <RoomManager rooms={rooms} />
                </DialogContent>
            </Dialog>
        </div>
    );
}