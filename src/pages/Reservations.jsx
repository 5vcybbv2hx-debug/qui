import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query'
import { STALE } from '@/lib/queryUtils';;
import { format, parseISO, addDays } from 'date-fns';
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
import {
    useReservations, useArchivedReservations, RES_KEYS,
    useCreateReservation, useUpdateReservation, useDeleteReservation,
} from '@/features/reservations/hooks/useReservations';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_FILTERS = [
    { value: 'alle',        label: 'Alle' },
    { value: 'bestätigt',   label: 'Bestätigt' },
    { value: 'vorgemerkt',  label: 'Vorgemerkt' },
    { value: 'storniert',   label: 'Storniert' },
    { value: 'no-show',     label: 'No-Show' },
];

export default function Reservations() {
    const permissions   = usePermissions();
    const [tab, setTab]           = useState('aktiv');   // 'aktiv' | 'archiv'
    const [statusFilter, setStatusFilter] = useState('alle');
    const [searchTerm, setSearchTerm]     = useState('');
    const [modalOpen, setModalOpen]         = useState(false);
    const [selectedRes, setSelectedRes]     = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    // ── Data ────────────────────────────────────────────────────────────────
    const { data: activeReservations = [], isLoading } = useReservations();
    const { data: archivedReservations = [] } = useArchivedReservations();

    const { data: tables = [] } = useQuery({
        queryKey: ['tables'],
        queryFn: () => base44.entities.Table.list(),
        staleTime: STALE.MEDIUM
    });

    // Run lifecycle processing once after data loads (idempotent)
    useReservationLifecycle(activeReservations);

    // ── Filtering ───────────────────────────────────────────────────────────
    const { active, archived } = useMemo(() => {
        const search = searchTerm.toLowerCase();
        const matches = (r) =>
            (!search ||
                r.customer_name?.toLowerCase().includes(search) ||
                r.phone?.toLowerCase().includes(search)) &&
            (statusFilter === 'alle' || r.status === statusFilter);

        return {
            active:   activeReservations.filter(matches)
                        .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')),
            archived: archivedReservations.filter(matches)
                        .sort((a, b) => b.date.localeCompare(a.date)),
        };
    }, [activeReservations, archivedReservations, searchTerm, statusFilter]);

    const displayed = tab === 'aktiv' ? active : archived;

    // ── Mutations ───────────────────────────────────────────────────────────
    const createMutation = useCreateReservation();
    const updateMutation = useUpdateReservation();
    const deleteMutation = useDeleteReservation();

    const handleSave = (data, id) => {
        if (id) {
            updateMutation.mutate({ id, data }, { onSuccess: () => { setModalOpen(false); setSelectedRes(null); } });
        } else {
            createMutation.mutate(data, { onSuccess: () => { setModalOpen(false); setSelectedRes(null); } });
        }
    };

    const handleDelete = (id) => {
        if (!permissions.canDeleteReservations) return;
        setDeleteConfirmId(id);
    };

    const confirmDelete = () => {
        if (!deleteConfirmId) return;
        deleteMutation.mutate(deleteConfirmId);
        setModalOpen(false);
        setDeleteConfirmId(null);
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
            const timeStr = res.time ?? '19:00';
            const [hh, mm] = timeStr.split(':').map(Number);
            // Start datetime
            const startDate = parseISO(res.date);
            startDate.setHours(hh, mm, 0, 0);
            // End datetime: +2h, properly rolls over midnight
            const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

            const fmt = (d) => format(d, "yyyyMMdd'T'HHmmss");
            lines.push(
                'BEGIN:VEVENT',
                `UID:res-${res.id}@barmanager.app`,
                `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
                `DTSTART:${fmt(startDate)}`,
                `DTEND:${fmt(endDate)}`,
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
                                className="h-9 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 font-semibold gap-1.5"
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
                                tab === key ? 'bg-amber-500 text-primary-foreground font-bold' : 'bg-muted text-muted-foreground'
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
                                    ? 'bg-amber-500 border-amber-500 text-primary-foreground'
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
                            <div key={i} className="h-28 rounded-2xl skeleton animate-shimmer" />
                        ))}
                    </div>
                ) : displayed.length > 0 ? (
                    <div className="space-y-2.5">
                        {displayed.map((res, idx) => (
                            <div key={res.id} className="animate-stagger" style={{ '--delay': `${idx * 45}ms` }}>
                            <ReservationCard
                                key={res.id + '-card'}
                                reservation={res}
                                permissions={permissions}
                                onEdit={(r)  => { setSelectedRes(r); setModalOpen(true); }}
                                onArchive={handleArchive}
                                onDelete={handleDelete}
                                onConfirm={handleConfirm}
                                onCancel={handleCancel}
                                tables={tables}
                            />
                            </div>
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
                                className="mt-1 bg-amber-500 hover:bg-amber-600"
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

            {/* ── Delete confirm ────────────────────────────────────────── */}
            <AlertDialog open={!!deleteConfirmId} onOpenChange={(o) => { if (!o) setDeleteConfirmId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reservierung löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Diese Aktion kann nicht rückgängig gemacht werden.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
                            Löschen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}