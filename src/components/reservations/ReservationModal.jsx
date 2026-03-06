import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertCircle, RepeatIcon, MapPin } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, isSameDay, addWeeks, addMonths } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from "@/components/ui/switch";
import { haptics } from "@/components/utils/haptics";

export default function ReservationModal({ open, onClose, reservation, onSave, onDelete, canDelete = false }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        customer_name: '',
        phone: '',
        email: '',
        date: '',
        time: '19:00',
        guests: 2,
        table: '',
        notes: '',
        status: 'vorgemerkt',
        is_recurring: false,
        recurring_pattern: 'weekly',
        recurring_end_date: ''
    });

    const { data: events = [] } = useQuery({
        queryKey: ['events'],
        queryFn: () => base44.entities.Event.list('-date', 50),
        enabled: open
    });

    const createRecurringMutation = useMutation({
        mutationFn: async (data) => {
            const seriesId = `series_${Date.now()}`;
            const reservations = [];
            let currentDate = new Date(data.date);
            const endDate = data.recurring_end_date ? new Date(data.recurring_end_date) : addMonths(currentDate, 6);
            
            while (currentDate <= endDate) {
                const resData = {
                    ...data,
                    date: format(currentDate, 'yyyy-MM-dd'),
                    is_recurring: true,
                    recurring_series_id: seriesId
                };
                delete resData.recurring_end_date;
                reservations.push(resData);
                
                if (data.recurring_pattern === 'weekly') {
                    currentDate = addWeeks(currentDate, 1);
                } else if (data.recurring_pattern === 'biweekly') {
                    currentDate = addWeeks(currentDate, 2);
                } else if (data.recurring_pattern === 'monthly') {
                    currentDate = addMonths(currentDate, 1);
                }
            }
            
            return await base44.entities.Reservation.bulkCreate(reservations);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['reservations']);
            onClose();
        }
    });

    const hasEventOnDate = formData.date && events.some(e => 
        isSameDay(new Date(e.date), new Date(formData.date)) && e.status !== 'abgesagt'
    );

    useEffect(() => {
        if (reservation) {
            setFormData({
                customer_name: reservation.customer_name || '',
                phone: reservation.phone || '',
                email: reservation.email || '',
                date: reservation.date || '',
                time: reservation.time || '19:00',
                guests: reservation.guests || 2,
                table: reservation.table || '',
                notes: reservation.notes || '',
                status: reservation.status || 'vorgemerkt',
                is_recurring: false,
                recurring_pattern: 'weekly',
                recurring_end_date: ''
            });
        } else {
            setFormData({
                customer_name: '',
                phone: '',
                email: '',
                date: '',
                time: '19:00',
                guests: 2,
                table: '',
                notes: '',
                status: 'vorgemerkt',
                is_recurring: false,
                recurring_pattern: 'weekly',
                recurring_end_date: ''
            });
        }
    }, [reservation, open]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (hasEventOnDate) {
            return;
        }
        
        haptics.light();
        if (formData.is_recurring && !reservation) {
            createRecurringMutation.mutate(formData);
        } else {
            onSave(formData, reservation?.id);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        {reservation ? 'Reservierung bearbeiten' : 'Neue Reservierung'}
                    </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {hasEventOnDate && (
                        <Alert className="bg-red-50 border-red-200">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                                An diesem Tag findet ein Event statt. Reservierungen können nicht angenommen werden.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                            value={formData.customer_name}
                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                            placeholder="Name des Gastes"
                            required
                            disabled={hasEventOnDate}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Telefon</Label>
                            <Input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+49..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>E-Mail</Label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="email@..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Datum *</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Uhrzeit * (bis 21:00 Uhr)</Label>
                            <Input
                                type="time"
                                max="21:00"
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Personen *</Label>
                            <Input
                                type="number"
                                min="1"
                                value={formData.guests}
                                onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tisch</Label>
                            <Input
                                value={formData.table}
                                onChange={(e) => setFormData({ ...formData, table: e.target.value })}
                                placeholder="z.B. T5"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
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
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Besondere Wünsche..."
                            rows={2}
                        />
                    </div>

                    {!reservation && (
                        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <RepeatIcon className="w-4 h-4 text-slate-600" />
                                    <Label htmlFor="recurring" className="cursor-pointer">Wiederkehrend (z.B. Stammtisch)</Label>
                                </div>
                                <Switch
                                    id="recurring"
                                    checked={formData.is_recurring}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                                />
                            </div>

                            {formData.is_recurring && (
                                <div className="space-y-3 mt-3 pl-6">
                                    <div className="space-y-2">
                                        <Label>Wiederholung</Label>
                                        <Select 
                                            value={formData.recurring_pattern} 
                                            onValueChange={(v) => setFormData({ ...formData, recurring_pattern: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="weekly">Wöchentlich</SelectItem>
                                                <SelectItem value="biweekly">Alle 2 Wochen</SelectItem>
                                                <SelectItem value="monthly">Monatlich</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Endet am (optional)</Label>
                                        <Input
                                            type="date"
                                            value={formData.recurring_end_date}
                                            onChange={(e) => setFormData({ ...formData, recurring_end_date: e.target.value })}
                                            min={formData.date}
                                        />
                                        <p className="text-xs text-slate-500">Leer lassen für 6 Monate</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2 pt-4">
                        {reservation && canDelete && (
                            <Button
                                type="button"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                    haptics.light();
                                    onDelete(reservation.id);
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                            Abbrechen
                        </Button>
                        <Button 
                            type="submit" 
                            className="flex-1 bg-slate-800 hover:bg-slate-900"
                            disabled={hasEventOnDate || createRecurringMutation.isPending}
                        >
                            {createRecurringMutation.isPending 
                                ? 'Erstelle Serie...' 
                                : reservation 
                                    ? 'Speichern' 
                                    : formData.is_recurring 
                                        ? 'Serie erstellen' 
                                        : 'Hinzufügen'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}