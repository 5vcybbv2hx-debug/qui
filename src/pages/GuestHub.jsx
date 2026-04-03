/**
 * GuestHub — Unified Reservations + Table Plan page.
 * 3 tabs: Heute / Reservierungen / Tischplan
 * All data shared — no context switching needed.
 */
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    Plus, Search, Download, Clock, List, Grid2x2,
    Calendar, Users, Phone, Pencil, X, AlarmClock,
    ChevronRight, Sparkles, AlertCircle, CheckCircle2, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import ReservationModal from '@/components/reservations/ReservationModal';
import ReservationCard from '@/components/reservations/ReservationCard';
import { useReservationLifecycle } from '@/features/reservations/hooks/useReservationLifecycle';
import { RES_KEYS } from '@/features/reservations/hooks/useReservations';
import { STALE } from '@/lib/queryUtils';
import QuickReservationSheet, { getTableStatus, STATUS_CONFIG } from '@/components/seating/QuickReservationSheet';
import TableModal from '@/components/seating/TableModal';
import RoomManager from '@/components/seating/RoomManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getTableDisplayName } from '@/components/tables/TableNameDisplay';

function suggestTables(tables, reservations, guestCount, date, time) {
    const available = tables.filter(t => {
        if (t.is_active === false) return false;
        return getTableStatus(t, reservations, date, time) === 'free';
    });
    return available
        .map(t => ({ table: t, score: t.capacity >= guestCount ? t.capacity - guestCount : 999 }))
        .sort((a, b) => a.score - b.score)
        .slice(0, 3)
        .map(s => s.table);
}

const STATUS_FILTERS = [
    { value: 'alle', label: 'Alle' },
    { value: 'bestätigt', label: 'Bestätigt' },
    { value: 'vorgemerkt', label: 'Vorgemerkt' },
    { value: 'storniert', label: 'Storniert' },
];

export default function GuestHub() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();

    // Main tab
    const [tab, setTab] = useState('today');

    // Reservations sub-state
    const [resTab, setResTab] = useState('aktiv');
    const [statusFilter, setStatusFilter] = useState('alle');
    const [searchTerm, setSearchTerm] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRes, setSelectedRes] = useState(null);

    // Table plan sub-state
    const [planView, setPlanView] = useState('plan'); // 'plan' | 'list'
    const [selectedTable, setSelectedTable] = useState(null);
    const [showTableModal, setShowTableModal] = useState(null);
    const [showRooms, setShowRooms] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [guestFilter, setGuestFilter] = useState('');

    // Shared date/time
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterTime, setFilterTime] = useState(() => {
        const n = new Date();
        return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
    });

    // ── Data ─────────────────────────────────────────────────────────────────
    const { data: allReservations = [], isLoading: resLoading } = useQuery({
        queryKey: RES_KEYS.active,
        queryFn: () => base44.entities.Reservation.list('-date', 300),
        staleTime: STALE.MEDIUM,
    });
    useReservationLifecycle(allReservations);

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

    // ── Reservations filtering ────────────────────────────────────────────────
    const { active, archived } = useMemo(() => {
        const search = searchTerm.toLowerCase();
        const matches = (r) =>
            (!search || r.customer_name?.toLowerCase().includes(search) || r.phone?.toLowerCase().includes(search)) &&
            (statusFilter === 'alle' || r.status === statusFilter);
        return {
            active: allReservations.filter(r => !r.is_archived && matches(r))
                .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')),
            archived: allReservations.filter(r => r.is_archived && matches(r))
                .sort((a, b) => b.date.localeCompare(a.date)),
        };
    }, [allReservations, searchTerm, statusFilter]);
    const displayed = resTab === 'aktiv' ? active : archived;

    // ── Today data ────────────────────────────────────────────────────────────
    const todayStr = new Date().toISOString().split('T')[0];
    const todayReservations = useMemo(() =>
        allReservations
            .filter(r => r.date === todayStr && r.status !== 'storniert')
            .sort((a, b) => (a.time || '').localeCompare(b.time || '')),
        [allReservations, todayStr]
    );

    // ── Tables + status ───────────────────────────────────────────────────────
    const filteredTables = useMemo(() => {
        let list = selectedRoom ? tables.filter(t => t.room === selectedRoom) : tables;
        if (guestFilter) list = list.filter(t => t.capacity >= Number(guestFilter));
        return list.sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
    }, [tables, selectedRoom, guestFilter]);

    const tableWithStatus = useMemo(() =>
        filteredTables.map(t => ({
            table: t,
            status: getTableStatus(t, allReservations, filterDate, filterTime),
            reservation: allReservations.find(r => r.status !== 'storniert' && r.date === filterDate && (r.table === t.id || r.table === t.number)) || null
        })),
        [filteredTables, allReservations, filterDate, filterTime]
    );

    const stats = useMemo(() => ({
        free: tableWithStatus.filter(t => t.status === 'free').length,
        reserved: tableWithStatus.filter(t => t.status === 'reserved').length,
        soon: tableWithStatus.filter(t => t.status === 'soon').length,
        total: tableWithStatus.filter(t => t.status !== 'inactive').length,
    }), [tableWithStatus]);

    const suggested = guestFilter
        ? suggestTables(tables, allReservations, Number(guestFilter), filterDate, filterTime)
        : [];

    // ── Mutations ─────────────────────────────────────────────────────────────
    const invalidate = () => queryClient.invalidateQueries({ queryKey: RES_KEYS.all });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Reservation.update(id, data),
        onSuccess: () => { invalidate(); setModalOpen(false); setSelectedRes(null); },
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Reservation.delete(id),
        onSuccess: invalidate,
    });
    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Reservation.create(data),
        onSuccess: () => { invalidate(); setModalOpen(false); setSelectedRes(null); },
    });

    const handleSave = (data, id) => id ? updateMutation.mutate({ id, data }) : createMutation.mutate(data);
    const handleDelete = (id) => { if (!permissions.canDeleteReservations) return; if (!confirm('Löschen?')) return; deleteMutation.mutate(id); setModalOpen(false); };
    const handleArchive = (id, isArchived) => updateMutation.mutate({ id, data: { is_archived: !isArchived } });
    const handleConfirm = (id) => updateMutation.mutate({ id, data: { status: 'bestätigt' } });
    const handleCancel = (id) => updateMutation.mutate({ id, data: { status: 'storniert' } });

    const handleExport = () => {
        const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Bar Manager//Reservierungen//DE','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Bar Reservierungen','X-WR-TIMEZONE:Europe/Berlin'];
        active.filter(r => r.status !== 'storniert').forEach(res => {
            const d = res.date.replace(/-/g,''); const t = (res.time ?? '19:00').replace(':','') + '00';
            const eh = String((parseInt((res.time ?? '19:00').split(':')[0]) + 2) % 24).padStart(2,'0');
            const et = eh + (res.time ?? '19:00').split(':')[1] + '00';
            lines.push('BEGIN:VEVENT',`UID:res-${res.id}@barmanager.app`,`DTSTAMP:${format(new Date(),"yyyyMMdd'T'HHmmss'Z'")}`,`DTSTART:${d}T${t}`,`DTEND:${d}T${et}`,`SUMMARY:${res.customer_name} (${res.guests} P.)`,`DESCRIPTION:${res.guests} Personen${res.table ? ' – Tisch ' + res.table : ''}${res.phone ? '\\nTel: ' + res.phone : ''}`,'STATUS:CONFIRMED','END:VEVENT');
        });
        lines.push('END:VCALENDAR');
        const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `reservierungen-${format(new Date(),'yyyy-MM-dd')}.ics` });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    if (!permissions.canViewReservations) return <PermissionDenied message="Keine Berechtigung." />;

    const isToday = filterDate === todayStr;

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-8">
            <div className="max-w-2xl mx-auto">

                {/* ── Sticky header ──────────────────────────────────────── */}
                <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
                    <div className="flex items-center justify-between gap-2 px-4 py-3">
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Gäste & Tische</h1>
                            <p className="text-xs text-muted-foreground">
                                {todayReservations.length} heute · {stats.free} Tische frei
                            </p>
                        </div>
                        <div className="flex gap-1.5">
                            {tab === 'reservations' && permissions.canEditReservations && (
                                <>
                                    <Button variant="outline" size="icon" onClick={handleExport} className="h-9 w-9">
                                        <Download className="w-4 h-4" />
                                    </Button>
                                    <Button onClick={() => { setSelectedRes(null); setModalOpen(true); }}
                                        className="h-9 gap-1 text-sm font-semibold"
                                        style={{ background: 'linear-gradient(135deg, var(--brand-from), var(--brand-via))', color: 'var(--brand-fg)' }}>
                                        <Plus className="w-4 h-4" />
                                        <span className="hidden sm:inline">Reservierung</span>
                                    </Button>
                                </>
                            )}
                            {tab === 'tables' && permissions.isManager && (
                                <>
                                    <Button variant="outline" size="sm" onClick={() => setShowRooms(true)} className="h-9 gap-1 text-xs">
                                        <Settings className="w-3.5 h-3.5" /><span className="hidden sm:inline">Räume</span>
                                    </Button>
                                    <Button size="sm" onClick={() => setShowTableModal({})} className="h-9 gap-1 text-xs"
                                        style={{ background: 'linear-gradient(135deg, var(--brand-from), var(--brand-via))', color: 'var(--brand-fg)' }}>
                                        <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Tisch</span>
                                    </Button>
                                </>
                            )}
                            {tab === 'today' && permissions.canEditReservations && (
                                <Button onClick={() => { setSelectedRes(null); setModalOpen(true); }}
                                    className="h-9 gap-1 text-sm font-semibold"
                                    style={{ background: 'linear-gradient(135deg, var(--brand-from), var(--brand-via))', color: 'var(--brand-fg)' }}>
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Neu</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Main tabs */}
                    <div className="flex border-t border-border">
                        {[
                            { id: 'today', label: 'Heute', icon: Clock },
                            { id: 'reservations', label: 'Reservierungen', icon: Calendar },
                            { id: 'tables', label: 'Tischplan', icon: Grid2x2 },
                        ].map(({ id, label, icon: Icon }) => (
                            <button key={id} onClick={() => setTab(id)}
                                className={cn('flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
                                    tab === id ? 'text-foreground border-b-2 border-foreground' : 'text-muted-foreground hover:text-foreground')}>
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{label}</span>
                                <span className="sm:hidden">{label.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>

                    {/* Table plan sub-controls */}
                    {tab === 'tables' && (
                        <div className="flex items-center gap-2 px-4 pb-3 pt-2 overflow-x-auto border-t border-border/50">
                            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                                className="h-9 px-3 rounded-xl border border-input bg-transparent text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring shrink-0" />
                            <input type="time" value={filterTime} onChange={e => setFilterTime(e.target.value)}
                                className="h-9 px-3 rounded-xl border border-input bg-transparent text-sm text-foreground focus:outline-none w-28 shrink-0" />
                            <div className="relative shrink-0">
                                <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <input type="number" value={guestFilter} min="1" max="20" onChange={e => setGuestFilter(e.target.value)}
                                    placeholder="P." className="h-9 pl-7 pr-3 w-20 rounded-xl border border-input bg-transparent text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                            </div>
                            {guestFilter && <button onClick={() => setGuestFilter('')} className="h-9 w-9 rounded-xl border border-input flex items-center justify-center text-muted-foreground shrink-0"><X className="w-4 h-4" /></button>}
                            <div className="ml-auto flex gap-1 shrink-0">
                                <button onClick={() => setPlanView('plan')} className={cn('h-9 w-9 rounded-xl border flex items-center justify-center', planView === 'plan' ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground')}><Grid2x2 className="w-4 h-4" /></button>
                                <button onClick={() => setPlanView('list')} className={cn('h-9 w-9 rounded-xl border flex items-center justify-center', planView === 'list' ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground')}><List className="w-4 h-4" /></button>
                            </div>
                        </div>
                    )}

                    {/* Room filter for table plan */}
                    {tab === 'tables' && rooms.length > 0 && (
                        <div className="flex gap-2 px-4 pb-2 overflow-x-auto border-t border-border/30">
                            <button onClick={() => setSelectedRoom(null)} className={cn('text-xs px-3 py-1.5 rounded-full border shrink-0 min-h-[32px]', !selectedRoom ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground')}>Alle</button>
                            {rooms.map(room => (
                                <button key={room.id} onClick={() => setSelectedRoom(room.name)} className={cn('text-xs px-3 py-1.5 rounded-full border shrink-0 min-h-[32px]', selectedRoom === room.name ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground')}>{room.name}</button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-4 py-4 space-y-4">

                    {/* ── TODAY TAB ──────────────────────────────────────── */}
                    {tab === 'today' && (
                        <div className="space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: 'Frei', count: stats.free, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
                                    { label: 'Reserviert', count: stats.reserved, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                                    { label: 'Heute', count: todayReservations.length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                                ].map(({ label, count, color, bg }) => (
                                    <div key={label} className={cn('rounded-xl border p-3 text-center', bg)}>
                                        <p className={cn('text-2xl font-bold', color)}>{count}</p>
                                        <p className="text-xs text-muted-foreground">{label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* No table assigned warnings */}
                            {todayReservations.filter(r => !r.table).length > 0 && (
                                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-300">
                                        <strong>{todayReservations.filter(r => !r.table).length}</strong> Reservierung(en) ohne Tischzuweisung
                                    </p>
                                </div>
                            )}

                            {/* Timeline */}
                            {todayReservations.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {format(new Date(), "EEEE, d. MMMM", { locale: de })}
                                    </p>
                                    {todayReservations.map(res => {
                                        const tbl = tables.find(t => t.id === res.table || t.number === res.table);
                                        const now = new Date();
                                        const [rh, rm] = (res.time || '0:0').split(':').map(Number);
                                        const diffMin = rh * 60 + rm - (now.getHours() * 60 + now.getMinutes());
                                        const isUpcoming = diffMin > 0 && diffMin <= 60;
                                        return (
                                            <button key={res.id} onClick={() => { setSelectedRes(res); setModalOpen(true); }}
                                                className={cn('w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left min-h-[68px] transition-colors hover:bg-accent/30',
                                                    isUpcoming ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card')}>
                                                <div className="flex flex-col items-center shrink-0 w-12">
                                                    <span className="text-sm font-bold text-foreground">{res.time}</span>
                                                    <span className="text-[10px] text-muted-foreground">{res.guests}P.</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="font-semibold text-foreground truncate">{res.customer_name}</p>
                                                        {isUpcoming && <span className="text-[10px] text-amber-400 shrink-0">bald</span>}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {tbl ? getTableDisplayName(tbl) : <span className="text-amber-400">Kein Tisch</span>}
                                                    </p>
                                                </div>
                                                <span className={cn('text-[10px] px-2 py-1 rounded-full border shrink-0',
                                                    res.status === 'bestätigt' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                                                    res.status === 'storniert' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                                    'bg-amber-500/10 border-amber-500/30 text-amber-400')}>
                                                    {res.status}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-border bg-secondary/20 p-8 text-center">
                                    <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">Keine Reservierungen heute</p>
                                    {permissions.canEditReservations && (
                                        <Button size="sm" className="mt-3" onClick={() => { setSelectedRes(null); setModalOpen(true); }}>
                                            <Plus className="w-4 h-4 mr-1.5" />Erste Reservierung
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── RESERVATIONS TAB ───────────────────────────────── */}
                    {tab === 'reservations' && (
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <Input placeholder="Name oder Telefon..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-10" />
                            </div>

                            <div className="flex rounded-xl bg-secondary/50 p-1 gap-1 border border-border">
                                {[{ key: 'aktiv', label: 'Aktiv', count: active.length }, { key: 'archiv', label: 'Archiv', count: archived.length }].map(({ key, label, count }) => (
                                    <button key={key} onClick={() => setResTab(key)}
                                        className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all',
                                            resTab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                                        {label}
                                        <span className={cn('inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full text-xs px-1.5', resTab === key ? 'bg-amber-500 text-slate-900 font-bold' : 'bg-muted text-muted-foreground')}>{count}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                                {STATUS_FILTERS.map(f => (
                                    <button key={f.value} onClick={() => setStatusFilter(f.value)}
                                        className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all min-h-[36px]',
                                            statusFilter === f.value ? 'bg-amber-500 border-amber-500 text-slate-900' : 'border-border text-muted-foreground hover:border-foreground')}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {resLoading ? (
                                <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-secondary/40 animate-pulse" />)}</div>
                            ) : displayed.length > 0 ? (
                                <div className="space-y-2.5">
                                    {displayed.map(res => (
                                        <ReservationCard key={res.id} reservation={res} permissions={permissions}
                                            onEdit={(r) => { setSelectedRes(r); setModalOpen(true); }}
                                            onArchive={handleArchive} onDelete={handleDelete}
                                            onConfirm={handleConfirm} onCancel={handleCancel} tables={tables} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                                    <Calendar className="w-12 h-12 opacity-30" />
                                    <p className="text-sm">Keine Einträge</p>
                                    {resTab === 'aktiv' && !searchTerm && statusFilter === 'alle' && permissions.canEditReservations && (
                                        <Button size="sm" onClick={() => { setSelectedRes(null); setModalOpen(true); }}
                                            className="bg-amber-500 hover:bg-amber-600 text-slate-900">
                                            <Plus className="w-4 h-4 mr-1.5" />Erste Reservierung
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TABLE PLAN TAB ─────────────────────────────────── */}
                    {tab === 'tables' && (
                        <div className="space-y-3">
                            {/* Suggestions */}
                            {guestFilter && suggested.length > 0 && (
                                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
                                    <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-2">
                                        <Sparkles className="w-3.5 h-3.5" />Passende Tische für {guestFilter} Personen
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                        {suggested.map(t => (
                                            <button key={t.id} onClick={() => setSelectedTable(t)}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-sm font-medium text-amber-300 min-h-[44px]">
                                                {getTableDisplayName(t)} · {t.capacity} Pl.
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {guestFilter && suggested.length === 0 && (
                                <div className="rounded-xl border border-border bg-secondary/20 p-3 text-sm text-muted-foreground text-center">
                                    Kein passender freier Tisch für {guestFilter} Personen
                                </div>
                            )}

                            {/* Stats bar */}
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

                            {/* Grid view */}
                            {planView === 'plan' && (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {tableWithStatus.map(({ table, status, reservation }) => (
                                        <button key={table.id} onClick={() => setSelectedTable(table)}
                                            className={cn('rounded-2xl border-2 p-4 text-left transition-all active:scale-95 min-h-[100px] flex flex-col justify-between',
                                                STATUS_CONFIG[status].color,
                                                suggested.some(s => s.id === table.id) && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-background')}>
                                            <div className="flex items-start justify-between gap-1">
                                                <span className="text-xl font-bold break-words flex-1">{table.name || table.number}</span>
                                                <span className={cn('w-2.5 h-2.5 rounded-full mt-1 shrink-0', STATUS_CONFIG[status].dot)} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium">{STATUS_CONFIG[status].label}</p>
                                                <p className="text-xs opacity-70">{table.capacity} Pl.</p>
                                                {reservation && <p className="text-xs font-semibold truncate mt-0.5">{reservation.time}</p>}
                                            </div>
                                        </button>
                                    ))}
                                    {permissions.isManager && (
                                        <button onClick={() => setShowTableModal({})}
                                            className="rounded-2xl border-2 border-dashed border-border p-4 min-h-[100px] flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
                                            <Plus className="w-5 h-5" />
                                            <span className="text-xs">Tisch</span>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* List view */}
                            {planView === 'list' && (
                                <div className="space-y-2">
                                    {tableWithStatus.map(({ table, status, reservation }) => (
                                        <button key={table.id} onClick={() => setSelectedTable(table)}
                                            className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-accent/30 active:scale-[0.99] transition-all min-h-[64px] text-left">
                                            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0', STATUS_CONFIG[status].color)}>
                                                {table.number}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-foreground">{getTableDisplayName(table)}</p>
                                                    {table.room && <span className="text-xs text-muted-foreground">· {table.room}</span>}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {table.capacity} Pl.{reservation ? ` · ${reservation.time} · ${reservation.customer_name} (${reservation.guests}P.)` : ''}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={cn('text-xs px-2 py-1 rounded-full border', STATUS_CONFIG[status].color)}>{STATUS_CONFIG[status].label}</span>
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
                                            <p className="text-muted-foreground text-sm">Keine Tische</p>
                                            {permissions.isManager && <Button className="mt-3" size="sm" onClick={() => setShowTableModal({})}><Plus className="w-4 h-4 mr-1.5" />Tisch anlegen</Button>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Reservation Sheet */}
            {selectedTable && (
                <QuickReservationSheet
                    table={selectedTable}
                    tables={tables}
                    reservations={allReservations}
                    checkDate={filterDate}
                    checkTime={filterTime}
                    onClose={() => setSelectedTable(null)}
                    onEditReservation={(res) => { setSelectedRes(res); setModalOpen(true); setSelectedTable(null); }}
                />
            )}

            {/* Reservation Modal */}
            <ReservationModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedRes(null); }}
                reservation={selectedRes}
                onSave={handleSave}
                onDelete={handleDelete}
                canDelete={permissions.canDeleteReservations}
            />

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
                    <DialogHeader><DialogTitle>Räume verwalten</DialogTitle></DialogHeader>
                    <RoomManager rooms={rooms} />
                </DialogContent>
            </Dialog>
        </div>
    );
}