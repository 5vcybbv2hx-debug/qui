import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Download, Search, Calendar } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ReservationModal from '@/components/reservations/ReservationModal';
import ReservationCard from '@/components/reservations/ReservationCard';
import LiveSyncInstructions from '@/components/calendar/LiveSyncInstructions';
import { useReservationLifecycle } from '@/features/reservations/hooks/useReservationLifecycle';
import { RES_KEYS } from '@/features/reservations/hooks/useReservations';
import { STALE } from '@/lib/queryUtils';

const STATUS_FILTERS = [
    { value: 'alle',        label: 'Alle' },
    { value: 'bestätigt',   label: 'Bestätigt' },
    { value: 'vorgemerkt',  label: 'Vorgemerkt' },
    { value: 'storniert',   label: 'Storniert' },
];

export default function Reservations() {
    const permissions   = usePermissions();
    const queryClient   = useQueryClient();
    const [tab, setTab]           = useState('aktiv');   // 'aktiv' | 'archiv'
    const [statusFilter, setStatusFilter] = useState('alle');
    const [searchTerm, setSearchTerm]     = useState('');
    const [modalOpen, setModalOpen]         = useState(false);
    const [selectedRes, setSelectedRes]     = useState(null);

    // ── Data ────────────────────────────────────────────────────────────────
    const { data: allReservations = [], isLoading } = useQuery({
        queryKey: RES_KEYS.active,
        queryFn:  () => base44.entities.Reservation.list('-date', 300),
        staleTime: STALE.MEDIUM,
    });

    // Run lifecycle processing once after data loads (idempotent)
    useReservationLifecycle(allReservations);

    // ── Filtering ───────────────────────────────────────────────────────────
    const { active, archived } = useMemo(() => {
        const search = searchTerm.toLowerCase();
        const matches = (r) =>
            (!search ||
                r.customer_name?.toLowerCase().includes(search) ||
                r.phone?.toLowerCase().includes(search)) &&
            (statusFilter === 'alle' || r.status === statusFilter);

        return {
            active:   allReservations.filter(r => !r.is_archived && matches(r))
                        .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')),
            archived: allReservations.filter(r =>  r.is_archived && matches(r))
                        .sort((a, b) => b.date.localeCompare(a.date)),
        };
    }, [allReservations, searchTerm, statusFilter]);

    const displayed = tab === 'aktiv' ? active : archived;

    // ── Mutations ───────────────────────────────────────────────────────────
    const invalidate = () => queryClient.invalidateQueries({ queryKey: RES_KEYS.all });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Reservation.create(data),
        onSuccess: () => { invalidate(); setModalOpen(false); setSelectedRes(null); },
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Reservation.update(id, data),
        onSuccess: () => { invalidate(); setModalOpen(false); setSelectedRes(null); },
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Reservation.delete(id),
        onSuccess:  invalidate,
    });

    const handleSave = (data, id) =>
        id ? updateMutation.mutate({ id, data }) : createMutation.mutate(data);

    const handleDelete = (id) => {
        if (!permissions.canDeleteReservations) return;
        if (!confirm('Reservierung wirklich löschen?')) return;
        deleteMutation.mutate(id);
        setModalOpen(false);
    };

    const handleArchive = (id, isArchived) =>
        updateMutation.mutate({ id, data: { is_archived: !isArchived } });

    const handleConfirm = (id) =>
        updateMutation.mutate({ id, data: { status: 'bestätigt' } });

    const handleCancel = (id) =>
        updateMutation.mutate({ id, data: { status: 'storniert' } });

    // ── Calendar export ─────────────────────────────────────────────────────
    const handleExport = () => {
        const lines = [
            'BEGIN:VCALENDAR', 'VERSION:2.0',
            'PRODID:-//Bar Manager//Reservierungen//DE',
            'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
            'X-WR-CALNAME:Bar Reservierungen',
            'X-WR-TIMEZONE:Europe/Berlin',
        ];
        active.filter(r => r.status !== 'storniert').forEach(res => {
            const d = res.date.replace(/-/g, '');
            const t = (res.time ?? '19:00').replace(':', '') + '00';
            const eh = String((parseInt((res.time ?? '19:00').split(':')[0]) + 2) % 24).padStart(2, '0');
            const et = eh + (res.time ?? '19:00').split(':')[1] + '00';
            lines.push(
                'BEGIN:VEVENT',
                `UID:res-${res.id}@barmanager.app`,
                `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
                `DTSTART:${d}T${t}`, `DTEND:${d}T${et}`,
                `SUMMARY:${res.customer_name} (${res.guests} P.)`,
                `DESCRIPTION:${res.guests} Personen${res.table ? ' – Tisch ' + res.table : ''}${res.phone ? '\\nTel: ' + res.phone : ''}`,
                'STATUS:CONFIRMED', 'END:VEVENT'
            );
        });
        lines.push('END:VCALENDAR');
        const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        const a = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(blob),
            download: `reservierungen-${format(new Date(), 'yyyy-MM-dd')}.ics`,
        });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    if (!permissions.canViewReservations) {
        return <PermissionDenied message="Du hast keine Berechtigung, Reservierungen zu sehen." />;
    }

    return (
        <div className="min-h-screen bg-background pb-8">
            <div className="max-w-2xl mx-auto px-3 pt-4 md:pt-8 space-y-4">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-foreground">Reservierungen</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {active.length} aktiv · {archived.length} archiviert
                        </p>
                    </div>
                    <div className="flex gap-1.5">
                        <LiveSyncInstructions />
                        <Button variant="outline" size="icon" onClick={handleExport} title="Kalender exportieren" className="h-9 w-9">
                            <Download className="w-4 h-4" />
                        </Button>
                        {permissions.canEditReservations && (
                            <Button
                                onClick={() => { setSelectedRes(null); setModalOpen(true); }}
                                className="h-9 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 font-semibold gap-1.5"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Reservierung</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── Search ─────────────────────────────────────────────── */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Name oder Telefon..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9 h-10 bg-card border-border"
                    />
                </div>

                {/* ── Tab switcher: Aktiv / Archiv ───────────────────────── */}
                <div className="flex rounded-xl bg-secondary/50 p-1 gap-1 border border-border">
                    {[
                        { key: 'aktiv',  label: 'Aktiv',   count: active.length },
                        { key: 'archiv', label: 'Archiv',  count: archived.length },
                    ].map(({ key, label, count }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all',
                                tab === key
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {label}
                            <span className={cn(
                                'inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full text-xs px-1.5',
                                tab === key ? 'bg-amber-500 text-slate-900 font-bold' : 'bg-muted text-muted-foreground'
                            )}>{count}</span>
                        </button>
                    ))}
                </div>

                {/* ── Status filter chips ────────────────────────────────── */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {STATUS_FILTERS.map(f => (
                        <button
                            key={f.value}
                            onClick={() => setStatusFilter(f.value)}
                            className={cn(
                                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                                statusFilter === f.value
                                    ? 'bg-amber-500 border-amber-500 text-slate-900'
                                    : 'border-border text-muted-foreground hover:border-amber-500/50 hover:text-foreground'
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* ── List ───────────────────────────────────────────────── */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-28 rounded-2xl bg-secondary/40 animate-pulse" />
                        ))}
                    </div>
                ) : displayed.length > 0 ? (
                    <div className="space-y-2.5">
                        {displayed.map(res => (
                            <ReservationCard
                                key={res.id}
                                reservation={res}
                                permissions={permissions}
                                onEdit={(r)  => { setSelectedRes(r); setModalOpen(true); }}
                                onArchive={handleArchive}
                                onDelete={handleDelete}
                                onConfirm={handleConfirm}
                                onCancel={handleCancel}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                        <Calendar className="w-12 h-12 opacity-30" />
                        <p className="text-sm font-medium">
                            {searchTerm || statusFilter !== 'alle'
                                ? 'Keine Ergebnisse für diese Filter'
                                : tab === 'aktiv' ? 'Keine aktiven Reservierungen' : 'Kein Archiv'}
                        </p>
                        {tab === 'aktiv' && !searchTerm && statusFilter === 'alle' && permissions.canEditReservations && (
                            <Button
                                size="sm"
                                onClick={() => { setSelectedRes(null); setModalOpen(true); }}
                                className="mt-1 bg-amber-500 hover:bg-amber-600 text-slate-900"
                            >
                                <Plus className="w-4 h-4 mr-1.5" />
                                Erste Reservierung
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Modal ────────────────────────────────────────────────── */}
            <ReservationModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedRes(null); }}
                reservation={selectedRes}
                onSave={handleSave}
                onDelete={handleDelete}
                canDelete={permissions.canDeleteReservations}
            />
        </div>
    );
}