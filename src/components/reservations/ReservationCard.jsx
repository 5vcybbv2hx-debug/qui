/**
 * ReservationCard.jsx
 * Mobile-first card for a single reservation.
 * Touch targets are minimum 44px. No horizontal overflow.
 */
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock, Users, MapPin, Phone, Repeat, Archive, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
    'vorgemerkt': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    'bestätigt':  'bg-green-500/15  text-green-400  border-green-500/30',
    'storniert':  'bg-slate-500/15  text-slate-400  border-slate-500/30',
};

const STATUS_LABELS = {
    'vorgemerkt': 'Vorgemerkt',
    'bestätigt':  'Bestätigt',
    'storniert':  'Storniert',
};

const PATTERN_LABELS = {
    'weekly':    'Wöchentlich',
    'biweekly':  'Alle 2 Wochen',
    'monthly':   'Monatlich',
};

export default function ReservationCard({ reservation: res, permissions, onEdit, onArchive, onDelete, onConfirm, onCancel, tables = [] }) {
    const dateStr = (() => {
        try { return format(parseISO(res.date), 'EEE, dd. MMM yyyy', { locale: de }); }
        catch { return res.date; }
    })();

    return (
        <div className={cn(
            'rounded-2xl border bg-card transition-colors',
            res.is_archived ? 'opacity-60' : 'hover:bg-accent/20'
        )}>
            {/* ── Top row: name + status ─────────────────────────────────── */}
            <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-base truncate">{res.customer_name}</h3>
                    {res.phone && (
                        <a
                            href={`tel:${res.phone}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 hover:text-amber-400 transition-colors"
                        >
                            <Phone className="w-3 h-3" />
                            {res.phone}
                        </a>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className={cn('text-xs font-medium border', STATUS_STYLES[res.status])}>
                        {STATUS_LABELS[res.status] ?? res.status}
                    </Badge>
                    {res.is_archived && (
                        <Badge className="text-xs border border-slate-600 text-slate-400 bg-slate-500/10">
                            Archiv
                        </Badge>
                    )}
                </div>
            </div>

            {/* ── Info pills ────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 pb-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {dateStr}
                </span>
                {res.time && (
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {res.time} Uhr
                    </span>
                )}
                <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    {res.guests} {res.guests === 1 ? 'Person' : 'Personen'}
                </span>
                {res.table && (() => {
                    const table = tables.find(t => t.id === res.table || t.table_number === res.table);
                    const displayName = table?.name || table?.table_number || res.table;
                    return (
                        <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-400" />
                            {displayName}
                        </span>
                    );
                })()}
                {res.is_recurring && res.recurring_pattern && (
                    <span className="flex items-center gap-1.5 text-blue-400">
                        <Repeat className="w-3.5 h-3.5" />
                        {PATTERN_LABELS[res.recurring_pattern] ?? res.recurring_pattern}
                    </span>
                )}
            </div>

            {res.notes && (
                <p className="px-4 pb-3 text-xs text-muted-foreground italic border-t border-border/50 pt-2 line-clamp-2">
                    {res.notes}
                </p>
            )}

            {/* ── Actions ───────────────────────────────────────────────── */}
            {permissions.canEditReservations && (
                <div className="flex gap-1 px-3 pb-3 border-t border-border/50 pt-2">
                    {/* Confirm / Cancel quick actions */}
                    {res.status === 'vorgemerkt' && !res.is_archived && (
                        <Button
                            variant="ghost" size="sm"
                            onClick={() => onConfirm?.(res.id)}
                            className="flex-1 h-9 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10 gap-1.5"
                        >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Bestätigen
                        </Button>
                    )}
                    {res.status === 'bestätigt' && !res.is_archived && (
                        <Button
                            variant="ghost" size="sm"
                            onClick={() => onCancel?.(res.id)}
                            className="flex-1 h-9 text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-500/10 gap-1.5"
                        >
                            <XCircle className="w-3.5 h-3.5" />
                            Stornieren
                        </Button>
                    )}

                    <Button
                        variant="ghost" size="icon"
                        onClick={() => onEdit?.(res)}
                        className="h-9 w-9 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 shrink-0"
                        title="Bearbeiten"
                    >
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost" size="icon"
                        onClick={() => onArchive?.(res.id, res.is_archived)}
                        className="h-9 w-9 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 shrink-0"
                        title={res.is_archived ? 'Wiederherstellen' : 'Archivieren'}
                    >
                        <Archive className="w-4 h-4" />
                    </Button>
                    {permissions.canDeleteReservations && (
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => onDelete?.(res.id)}
                            className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                            title="Löschen"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}