import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfDay, isSameDay, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const DAYS_VISIBLE = 7;

const STATUS_COLORS = {
    vorgemerkt: 'bg-amber-500/80 border-amber-400 text-amber-50',
    'bestätigt': 'bg-emerald-500/80 border-emerald-400 text-emerald-50',
    storniert: 'bg-gray-400/50 border-gray-400 text-gray-300 line-through'
};

function QuickReservationForm({ open, onClose, onSave, onDelete, reservation, prefillDate, prefillTable, tables }) {
    const [form, setForm] = React.useState({
        customer_name: '',
        phone: '',
        date: prefillDate || '',
        time: '19:00',
        guests: 2,
        table: prefillTable || '',
        notes: '',
        status: 'vorgemerkt'
    });

    React.useEffect(() => {
        if (reservation) {
            setForm({
                customer_name: reservation.customer_name || '',
                phone: reservation.phone || '',
                date: reservation.date || '',
                time: reservation.time || '19:00',
                guests: reservation.guests || 2,
                table: reservation.table || '',
                notes: reservation.notes || '',
                status: reservation.status || 'vorgemerkt'
            });
        } else {
            setForm({
                customer_name: '',
                phone: '',
                date: prefillDate || '',
                time: '19:00',
                guests: 2,
                table: prefillTable || '',
                notes: '',
                status: 'vorgemerkt'
            });
        }
    }, [reservation, prefillDate, prefillTable, open]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form, reservation?.id);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{reservation ? 'Reservierung bearbeiten' : 'Neue Reservierung'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                            value={form.customer_name}
                            onChange={e => setForm({ ...form, customer_name: e.target.value })}
                            placeholder="Name des Gastes"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Telefon</Label>
                            <Input
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                placeholder="+49..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Personen *</Label>
                            <Input
                                type="number"
                                min="1"
                                value={form.guests}
                                onChange={e => setForm({ ...form, guests: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Datum *</Label>
                            <Input
                                type="date"
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Uhrzeit *</Label>
                            <Input
                                type="time"
                                value={form.time}
                                onChange={e => setForm({ ...form, time: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Tisch</Label>
                        <Select value={form.table} onValueChange={v => setForm({ ...form, table: v })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Tisch wählen..." />
                            </SelectTrigger>
                            <SelectContent>
                                {tables.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.table_number} ({t.capacity} Plätze)</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="vorgemerkt">Vorgemerkt</SelectItem>
                                <SelectItem value="bestätigt">Bestätigt</SelectItem>
                                <SelectItem value="storniert">Storniert</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Notizen</Label>
                        <Textarea
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            placeholder="Besondere Wünsche..."
                            rows={2}
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        {reservation && (
                            <Button
                                type="button"
                                variant="outline"
                                className="text-red-500 border-red-400 hover:bg-red-500/10"
                                onClick={() => onDelete(reservation.id)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">Abbrechen</Button>
                        <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
                            {reservation ? 'Speichern' : 'Buchen'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function TableCalendarView({ tables, reservations }) {
    const queryClient = useQueryClient();
    const [startDate, setStartDate] = useState(startOfDay(new Date()));
    const [modalState, setModalState] = useState({ open: false, reservation: null, prefillDate: null, prefillTable: null });

    const days = Array.from({ length: DAYS_VISIBLE }, (_, i) => addDays(startDate, i));

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Reservation.create(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] })
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Reservation.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] })
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Reservation.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] })
    });

    const handleSave = (formData, id) => {
        if (id) {
            updateMutation.mutate({ id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
        setModalState({ open: false, reservation: null, prefillDate: null, prefillTable: null });
    };

    const handleDelete = (id) => {
        deleteMutation.mutate(id);
        setModalState({ open: false, reservation: null, prefillDate: null, prefillTable: null });
    };

    const getReservationsForCell = (tableId, date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return reservations.filter(r => r.table === tableId && r.date === dateStr && r.status !== 'storniert');
    };

    const occupancyRate = (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const booked = reservations.filter(r => r.date === dateStr && r.status !== 'storniert').length;
        return tables.length > 0 ? Math.round((booked / tables.length) * 100) : 0;
    };

    const today = startOfDay(new Date());

    return (
        <div className="space-y-3">
            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setStartDate(d => addDays(d, -7))}>
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">
                        {format(startDate, 'd. MMMM', { locale: de })} – {format(addDays(startDate, DAYS_VISIBLE - 1), 'd. MMMM yyyy', { locale: de })}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setStartDate(startOfDay(new Date()))}>
                        Heute
                    </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStartDate(d => addDays(d, 7))}>
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[700px] border-collapse">
                    <thead>
                        <tr className="bg-card">
                            <th className="p-3 text-left text-xs font-semibold text-muted-foreground border-b border-r border-border w-28 sticky left-0 bg-card z-10">
                                Tisch
                            </th>
                            {days.map(day => {
                                const isToday = isSameDay(day, today);
                                const rate = occupancyRate(day);
                                return (
                                    <th key={day.toISOString()} className={cn(
                                        "p-2 text-center border-b border-r border-border min-w-[120px]",
                                        isToday ? 'bg-primary/10' : 'bg-card'
                                    )}>
                                        <div className={cn("text-xs font-bold", isToday ? 'text-primary' : 'text-foreground')}>
                                            {format(day, 'EEE', { locale: de })}
                                        </div>
                                        <div className={cn("text-lg font-bold", isToday ? 'text-primary' : 'text-foreground')}>
                                            {format(day, 'd')}
                                        </div>
                                        <div className="mt-1 h-1 rounded-full bg-border overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all", rate > 80 ? 'bg-red-400' : rate > 50 ? 'bg-amber-400' : 'bg-emerald-400')}
                                                style={{ width: `${rate}%` }}
                                            />
                                        </div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">{rate}% ausgelastet</div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {tables.map((table, tIdx) => (
                            <tr key={table.id} className={tIdx % 2 === 0 ? 'bg-background' : 'bg-card/40'}>
                                <td className={cn(
                                    "p-3 border-r border-border sticky left-0 z-10 font-medium text-sm",
                                    tIdx % 2 === 0 ? 'bg-background' : 'bg-card/40'
                                )}>
                                    <div className="font-bold text-foreground">{table.table_number}</div>
                                    <div className="text-xs text-muted-foreground">{table.capacity} Plätze</div>
                                </td>
                                {days.map(day => {
                                    const cellReservations = getReservationsForCell(table.id, day);
                                    const isToday = isSameDay(day, today);
                                    return (
                                        <td key={day.toISOString()} className={cn(
                                            "p-1.5 border-r border-b border-border align-top",
                                            isToday ? 'bg-primary/5' : ''
                                        )}>
                                            <div className="space-y-1 min-h-[50px]">
                                                {cellReservations.map(res => (
                                                    <button
                                                        key={res.id}
                                                        onClick={() => setModalState({ open: true, reservation: res, prefillDate: null, prefillTable: null })}
                                                        className={cn(
                                                            "w-full text-left px-2 py-1 rounded border text-[11px] font-medium leading-tight transition-opacity hover:opacity-80",
                                                            STATUS_COLORS[res.status] || STATUS_COLORS.vorgemerkt
                                                        )}
                                                    >
                                                        <div className="truncate">{res.customer_name}</div>
                                                        <div className="opacity-80">{res.time} · {res.guests}P</div>
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setModalState({
                                                        open: true,
                                                        reservation: null,
                                                        prefillDate: format(day, 'yyyy-MM-dd'),
                                                        prefillTable: table.id
                                                    })}
                                                    className="w-full flex items-center justify-center h-7 rounded border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {tables.length === 0 && (
                            <tr>
                                <td colSpan={DAYS_VISIBLE + 1} className="text-center text-muted-foreground py-12 text-sm">
                                    Keine Tische in diesem Raum.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/80 inline-block" /> Vorgemerkt</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/80 inline-block" /> Bestätigt</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-400/50 inline-block" /> Storniert</span>
                <span className="ml-auto flex items-center gap-2">
                    Auslastung:
                    <span className="flex items-center gap-1"><span className="w-4 h-1.5 rounded bg-emerald-400 inline-block" /> &lt;50%</span>
                    <span className="flex items-center gap-1"><span className="w-4 h-1.5 rounded bg-amber-400 inline-block" /> 50–80%</span>
                    <span className="flex items-center gap-1"><span className="w-4 h-1.5 rounded bg-red-400 inline-block" /> &gt;80%</span>
                </span>
            </div>

            <QuickReservationForm
                open={modalState.open}
                onClose={() => setModalState({ open: false, reservation: null, prefillDate: null, prefillTable: null })}
                onSave={handleSave}
                onDelete={handleDelete}
                reservation={modalState.reservation}
                prefillDate={modalState.prefillDate}
                prefillTable={modalState.prefillTable}
                tables={tables}
            />
        </div>
    );
}