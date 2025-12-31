import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ShiftModal({ open, onClose, shift, employees, selectedDate, onSave, onDelete }) {
    const [formData, setFormData] = useState({
        employee_id: '',
        employee_name: '',
        date: '',
        start_time: '18:00',
        end_time: '02:00',
        shift_type: 'Spätschicht',
        notes: '',
        color: ''
    });

    useEffect(() => {
        if (shift) {
            setFormData({
                employee_id: shift.employee_id || '',
                employee_name: shift.employee_name || '',
                date: shift.date || '',
                start_time: shift.start_time || '18:00',
                end_time: shift.end_time || '02:00',
                shift_type: shift.shift_type || 'Spätschicht',
                notes: shift.notes || '',
                color: shift.color || ''
            });
        } else if (selectedDate) {
            setFormData(prev => ({
                ...prev,
                employee_id: '',
                employee_name: '',
                date: format(selectedDate, 'yyyy-MM-dd'),
                start_time: '18:00',
                end_time: '02:00',
                shift_type: 'Spätschicht',
                notes: '',
                color: ''
            }));
        }
    }, [shift, selectedDate]);

    const handleEmployeeChange = (employeeId) => {
        const employee = employees.find(e => e.id === employeeId);
        setFormData(prev => ({
            ...prev,
            employee_id: employeeId,
            employee_name: employee?.name || '',
            color: employee?.color || ''
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, shift?.id);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        {shift ? 'Schicht bearbeiten' : 'Neue Schicht'}
                    </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>Mitarbeiter</Label>
                        <Select value={formData.employee_id} onValueChange={handleEmployeeChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Mitarbeiter auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map(emp => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: emp.color }}
                                            />
                                            {emp.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Datum</Label>
                        <Input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Startzeit</Label>
                            <Input
                                type="time"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Endzeit</Label>
                            <Input
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Schichttyp</Label>
                        <Select value={formData.shift_type} onValueChange={(v) => setFormData({ ...formData, shift_type: v })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Frühschicht">Frühschicht</SelectItem>
                                <SelectItem value="Spätschicht">Spätschicht</SelectItem>
                                <SelectItem value="Nachtschicht">Nachtschicht</SelectItem>
                                <SelectItem value="Doppelschicht">Doppelschicht</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Notizen</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Optionale Anmerkungen..."
                            rows={2}
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        {shift && (
                            <Button
                                type="button"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => onDelete(shift.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                            Abbrechen
                        </Button>
                        <Button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-900">
                            {shift ? 'Speichern' : 'Hinzufügen'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}