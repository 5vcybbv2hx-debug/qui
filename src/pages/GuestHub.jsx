/**
 * GuestHub — Unified Reservations + Table Plan page.
 * 3 tabs: Heute / Reservierungen / Tischplan
 * All data shared — no context switching needed.
 */
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingState, EmptyState } from '@/components/ui/StateDisplay';
import { useErrorHandler } from '@/components/error/ErrorHandler';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    Plus, Search, Download, Clock, Grid2x2, X, List,
    Calendar, Users, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import ReservationModal from '@/components/reservations/ReservationModal';
import { useReservationLifecycle } from '@/features/reservations/hooks/useReservationLifecycle';
import { RES_KEYS } from '@/features/reservations/hooks/useReservations';
import { STALE } from '@/lib/queryUtils';
import QuickReservationSheet, { getTableStatus, getReservationTables } from '@/components/seating/QuickReservationSheet';
import TableModal from '@/components/seating/TableModal';
import RoomManager from '@/components/seating/RoomManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import GuestHubTodayTab from '@/components/reservations/GuestHubTodayTab';
import GuestHubReservationsTab from '@/components/reservations/GuestHubReservationsTab';
import GuestHubTablesTab from '@/components/seating/GuestHubTablesTab';

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
     const { data: allReservations = [], isLoading: resLoading, isError: resError, error: resErrorObj } = useQuery({
         queryKey: RES_KEYS.active,
         queryFn: () => base44.entities.Reservation.list('-date', 300),
         staleTime: STALE.MEDIUM,
     });
     const { handleError } = useErrorHandler();
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
        filteredTables.map(t => {
            const dayRes = allReservations.filter(r =>
                r.status !== 'storniert' &&
                !r.is_archived &&
                r.date === filterDate &&
                getReservationTables(r).includes(t.table_number)
            ).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            // Nächste/aktive für Anzeige
            const reservation = dayRes.find(r => {
                const [rh, rm] = (r.time || '00:00').split(':').map(Number);
                const [fh, fm] = filterTime.split(':').map(Number);
                return Math.abs(rh * 60 + rm - (fh * 60 + fm)) < 90;
            }) || dayRes[0] || null;
            return {
                table: t,
                status: getTableStatus(t, allReservations, filterDate, filterTime),
                reservation,
                dayReservations: dayRes
            };
        }),
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

    if (resError) {
        return (
            <div className="min-h-screen bg-background p-4 flex items-center justify-center">
                {handleError({ error: resErrorObj, title: 'Reservierungen konnten nicht geladen werden', onRetry: () => queryClient.invalidateQueries(RES_KEYS.all) })}
            </div>
        );
    }

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
                         <GuestHubTodayTab
                             todayReservations={todayReservations}
                             tables={tables}
                             stats={stats}
                             permissions={permissions}
                             onAddReservation={() => { setSelectedRes(null); setModalOpen(true); }}
                             onEditReservation={(res) => { setSelectedRes(res); setModalOpen(true); }}
                         />
                     )}

                    {/* ── RESERVATIONS TAB ───────────────────────────────── */}
                     {tab === 'reservations' && (
                         <GuestHubReservationsTab
                             active={active}
                             archived={archived}
                             resTab={resTab}
                             setResTab={setResTab}
                             statusFilter={statusFilter}
                             setStatusFilter={setStatusFilter}
                             searchTerm={searchTerm}
                             setSearchTerm={setSearchTerm}
                             permissions={permissions}
                             tables={tables}
                             resLoading={resLoading}
                             onEdit={(r) => { setSelectedRes(r); setModalOpen(true); }}
                             onArchive={handleArchive}
                             onDelete={handleDelete}
                             onConfirm={handleConfirm}
                             onCancel={handleCancel}
                             onAddReservation={() => { setSelectedRes(null); setModalOpen(true); }}
                         />
                     )}

                    {/* ── TABLE PLAN TAB ─────────────────────────────────── */}
                     {tab === 'tables' && (
                         <GuestHubTablesTab
                             tableWithStatus={tableWithStatus}
                             stats={stats}
                             guestFilter={guestFilter}
                             suggested={suggested}
                             permissions={permissions}
                             planView={planView}
                             onTableSelect={setSelectedTable}
                             onCreateTable={(t) => setShowTableModal(t)}
                             onEditTable={(t) => setShowTableModal(t)}
                         />
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
                isManager={permissions.isManager}
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