import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from 'date-fns';

export default function ReservationModal({ open, onClose, reservation, selectedDate, onSave, onDelete }) {
    const [formData, setFormData] = useState({
        customer_name: '',
        phone: '',
        email: '',
        date: '',
        time: '19:00',
        guests: 2,
        table: '',
        notes: '',
        status: 'vorgemerkt'
    });

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
                status: reservation.status || 'vorgemerkt'
            });
        } else if (selectedDate) {
            setFormData(prev => ({
                ...prev,
                customer_name: '',
                phone: '',
                email: '',
                date: format(selectedDate, 'yyyy-MM-dd'),
                time: '19:00',
                guests: 2,
                table: '',
                notes: '',
                status: 'vorgemerkt'
            }));
        }
    }, [reservation, selectedDate, open]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, reservation?.id);
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
                    <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                            value={formData.customer_name}
                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                            placeholder="Name des Gastes"
                            required
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
                            <Label>Uhrzeit *</Label>
                            <Input
                                type="time"
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

                    <div className="flex gap-2 pt-4">
                        {reservation && (
                            <Button
                                type="button"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => onDelete(reservation.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                            Abbrechen
                        </Button>
                        <Button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-900">
                            {reservation ? 'Speichern' : 'Hinzufügen'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}