/**
 * QuickReservationSheet — Bottom Sheet für schnelle Reservierungserstellung oder Tisch-Details.
 * Öffnet sich wenn ein Tisch angetippt wird.
 */
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    X, Calendar, Clock, Users, CheckCircle2, Phone, Pencil,
    ChevronRight, Sparkles, AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

// Prüft ob zwei Zeitfenster sich überschneiden (mit 90 Min Puffer)
function timesOverlap(resTime, checkTime, bufferMin = 90) {
    if (!resTime || !checkTime) return false;
    const [rh, rm] = resTime.split(':').map(Number);
    const [ch, cm] = checkTime.split(':').map(Number);
    const rMin = rh * 60 + rm;
    const cMin = ch * 60 + cm;
    return Math.abs(rMin - cMin) < bufferMin;
}

export function getTableStatus(table, reservations, checkDate, checkTime) {
    if (!table.is_active && table.is_active !== undefined) return 'inactive';
    const relevant = reservations.filter(r =>
        r.status !== 'storniert' &&
        r.date === checkDate &&
        (r.table === table.id || r.table === table.number)
    );
    if (relevant.length === 0) return 'free';
    const now = relevant.find(r => timesOverlap(r.time, checkTime, 90));
    if (now) return 'reserved';
    const soon = relevant.find(r => {
        const [rh, rm] = r.time.split(':').map(Number);
        const [ch, cm] = checkTime.split(':').map(Number);
        const diff = rh * 60 + rm - (ch * 60 + cm);
        return diff > 0 && diff <= 120;
    });
    if (soon) return 'soon';
    return 'free';
}

export const STATUS_CONFIG = {
    free:     { label: 'Frei',         color: 'bg-green-500/20 border-green-500/50 text-green-400',  dot: 'bg-green-400' },
    reserved: { label: 'Reserviert',   color: 'bg-red-500/20 border-red-500/50 text-red-400',        dot: 'bg-red-400' },
    soon:     { label: 'Bald belegt',  color: 'bg-amber-500/20 border-amber-500/50 text-amber-400',  dot: 'bg-amber-400' },
    inactive: { label: 'Gesperrt',     color: 'bg-secondary/50 border-border text-muted-foreground', dot: 'bg-muted-foreground' },
};

export default function QuickReservationSheet({ table, reservations, tables, onClose, onEditReservation, checkDate, checkTime }) {
    const queryClient = useQueryClient();
    const status = getTableStatus(table, reservations, checkDate, checkTime);
    const activeReservation = status === 'reserved' || status === 'soon'
        ? reservations.find(r =>
            r.status !== 'storniert' &&
            r.date === checkDate &&
            (r.table === table.id || r.table === table.number)
          )
        : null;

    const [mode, setMode] = useState(status === 'free' ? 'new' : 'info');
    const [form, setForm] = useState({
        customer_name: '',
        phone: '',
        guests: table.capacity || 2,
        date: checkDate,
        time: checkTime,
        notes: ''
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Reservation.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
            toast.success('Reservierung erstellt');
            onClose();
        },
        onError: (e) => toast.error('Fehler: ' + e.message)
    });

    const handleCreate = () => {
        if (!form.customer_name.trim()) { toast.error('Name erforderlich'); return; }
        createMutation.mutate({
            ...form,
            guests: Number(form.guests),
            table: table.id,
            status: 'vorgemerkt',
            source: 'intern'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 bg-card border-t border-border rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-border" />
                </div>

                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
                    <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0',
                        STATUS_CONFIG[status].color
                    )}>
                        {table.number}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-foreground">Tisch {table.number}</p>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full border flex items-center gap-1', STATUS_CONFIG[status].color)}>
                                <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_CONFIG[status].dot)} />
                                {STATUS_CONFIG[status].label}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {table.capacity} Plätze{table.room ? ` · ${table.room}` : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Info mode — reserved table */}
                {mode === 'info' && activeReservation && (
                    <div className="p-5 space-y-4">
                        <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span className="font-semibold text-foreground">{activeReservation.customer_name}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground">Uhrzeit</p>
                                    <p className="font-medium text-foreground">{activeReservation.time}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Personen</p>
                                    <p className="font-medium text-foreground">{activeReservation.guests}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Status</p>
                                    <p className="font-medium text-foreground capitalize">{activeReservation.status}</p>
                                </div>
                            </div>
                            {activeReservation.phone && (
                                <a href={`tel:${activeReservation.phone}`}
                                    className="flex items-center gap-2 text-sm text-blue-400 min-h-[44px]">
                                    <Phone className="w-4 h-4" />{activeReservation.phone}
                                </a>
                            )}
                            {activeReservation.notes && (
                                <p className="text-sm text-muted-foreground italic">„{activeReservation.notes}"</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {onEditReservation && (
                                <Button variant="outline" className="flex-1 h-12 gap-2"
                                    onClick={() => { onEditReservation(activeReservation); onClose(); }}>
                                    <Pencil className="w-4 h-4" />Bearbeiten
                                </Button>
                            )}
                            <Button className="flex-1 h-12 gap-2" onClick={() => setMode('new')}>
                                <Calendar className="w-4 h-4" />Neue Reservierung
                            </Button>
                        </div>
                    </div>
                )}

                {/* New reservation form */}
                {mode === 'new' && (
                    <div className="p-5 space-y-4">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            Reservierung für Tisch {table.number}
                        </p>

                        {/* Name */}
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
                            <input
                                type="text"
                                value={form.customer_name}
                                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                                placeholder="Gast-Name"
                                className="w-full h-12 px-4 rounded-xl border border-input bg-transparent text-foreground text-base focus:outline-none focus:ring-1 focus:ring-ring"
                                autoFocus
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefon (optional)</label>
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                placeholder="+49 ..."
                                className="w-full h-12 px-4 rounded-xl border border-input bg-transparent text-foreground text-base focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                        </div>

                        {/* Date + Time */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Datum</label>
                                <input type="date" value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                    className="w-full h-12 px-3 rounded-xl border border-input bg-transparent text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Uhrzeit</label>
                                <input type="time" value={form.time}
                                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                                    className="w-full h-12 px-3 rounded-xl border border-input bg-transparent text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                            </div>
                        </div>

                        {/* Guests */}
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Personen</label>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setForm(f => ({ ...f, guests: Math.max(1, f.guests - 1) }))}
                                    className="w-12 h-12 rounded-xl border border-input text-foreground text-xl flex items-center justify-center hover:bg-accent">−</button>
                                <span className="text-xl font-bold text-foreground w-8 text-center">{form.guests}</span>
                                <button onClick={() => setForm(f => ({ ...f, guests: Math.min(20, f.guests + 1) }))}
                                    className="w-12 h-12 rounded-xl border border-input text-foreground text-xl flex items-center justify-center hover:bg-accent">+</button>
                                {form.guests > table.capacity && (
                                    <span className="text-xs text-amber-400 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />Über Kapazität
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notiz (optional)</label>
                            <input type="text" value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="Besondere Wünsche..."
                                className="w-full h-12 px-4 rounded-xl border border-input bg-transparent text-foreground text-base focus:outline-none focus:ring-1 focus:ring-ring" />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1 h-12" onClick={onClose}>Abbrechen</Button>
                            <Button
                                className="flex-1 h-12 gap-2 font-semibold"
                                onClick={handleCreate}
                                disabled={createMutation.isPending}
                                style={{ background: 'linear-gradient(135deg, var(--brand-from), var(--brand-via))', color: 'var(--brand-fg)' }}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Reservieren
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}