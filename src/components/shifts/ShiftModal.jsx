import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, Trash2, Plus, Minus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import ShiftSwapRequest from './ShiftSwapRequest';

export default function ShiftModal({ open, onClose, shift, employees, selectedDate, onSave, onDelete, existingShifts = [] }) {
    const [formData, setFormData] = useState({
        employee_id: '',
        employee_name: '',
        date: '',
        start_time: '16:00',
        end_time: '03:00',
        shift_type: 'Aufmachen',
        notes: '',
        color: ''
    });

    const [multipleShifts, setMultipleShifts] = useState([
        { employee_id: '', start_time: '16:00', end_time: '03:00' },
        { employee_id: '', start_time: '16:00', end_time: '03:00' },
        { employee_id: '', start_time: '16:00', end_time: '03:00' }
    ]);
    
    const [isMultiMode, setIsMultiMode] = useState(false);

    useEffect(() => {
        if (shift) {
            setIsMultiMode(false);
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
            setIsMultiMode(false);
            setFormData(prev => ({
                ...prev,
                employee_id: '',
                employee_name: '',
                date: format(selectedDate, 'yyyy-MM-dd'),
                start_time: '16:00',
                end_time: '03:00',
                shift_type: 'Aufmachen',
                notes: '',
                color: ''
            }));
            setMultipleShifts([
                { employee_id: '', start_time: '16:00', end_time: '03:00' },
                { employee_id: '', start_time: '16:00', end_time: '03:00' },
                { employee_id: '', start_time: '16:00', end_time: '03:00' }
            ]);
        }
    }, [shift, selectedDate, open]);

    const handleEmployeeChange = (employeeId) => {
        const employee = employees.find(e => e.id === employeeId);
        setFormData(prev => ({
            ...prev,
            employee_id: employeeId,
            employee_name: employee?.name || '',
            color: employee?.color || ''
        }));
    };

    const handleShiftTypeChange = (shiftType) => {
        let start_time = formData.start_time;
        let end_time = formData.end_time;

        // Auto-fill times based on shift type
        if (shiftType === 'Aufmachen') {
            start_time = '16:00';
            end_time = '03:00';
        } else if (shiftType === 'Frühschicht') {
            start_time = '20:00';
            end_time = '05:00';
        } else if (shiftType === 'Spätschicht') {
            start_time = '21:00';
            end_time = '05:00';
        }
        // For Sonderschicht, keep current times (manual entry)

        setFormData(prev => ({
            ...prev,
            shift_type: shiftType,
            start_time,
            end_time
        }));
    };

    const addShiftSlot = () => {
        if (multipleShifts.length < 9) {
            setMultipleShifts([...multipleShifts, { 
                employee_id: '', 
                start_time: formData.start_time, 
                end_time: formData.end_time 
            }]);
        }
    };

    const removeShiftSlot = (index) => {
        if (multipleShifts.length > 1) {
            setMultipleShifts(multipleShifts.filter((_, i) => i !== index));
        }
    };

    const updateShiftSlot = (index, field, value) => {
        const updated = [...multipleShifts];
        updated[index][field] = value;
        setMultipleShifts(updated);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (isMultiMode) {
            // Validate: No employee can have multiple shifts on the same day
            const shiftsToSave = multipleShifts
                .filter(s => s.employee_id)
                .map(s => {
                    const employee = employees.find(e => e.id === s.employee_id);
                    return {
                        employee_id: s.employee_id,
                        employee_name: employee?.name || '',
                        color: employee?.color || '',
                        date: formData.date,
                        start_time: s.start_time,
                        end_time: s.end_time,
                        shift_type: formData.shift_type,
                        notes: formData.notes
                    };
                });

            // Check for duplicates within the new shifts
            const employeeIds = shiftsToSave.map(s => s.employee_id);
            const duplicates = employeeIds.filter((id, index) => employeeIds.indexOf(id) !== index);
            if (duplicates.length > 0) {
                const employee = employees.find(e => e.id === duplicates[0]);
                alert(`Fehler: ${employee?.name} wurde mehrmals für denselben Tag eingetragen.`);
                return;
            }

            // Check against existing shifts
            for (const newShift of shiftsToSave) {
                const hasExisting = existingShifts.some(
                    s => s.employee_id === newShift.employee_id && 
                         s.date === newShift.date
                );
                if (hasExisting) {
                    const employee = employees.find(e => e.id === newShift.employee_id);
                    alert(`Fehler: ${employee?.name} hat bereits eine Schicht an diesem Tag.`);
                    return;
                }
            }
            
            // Save all shifts
            shiftsToSave.forEach(shiftData => onSave(shiftData, null));
            onClose();
        } else {
            // Single shift validation (only for new shifts)
            if (!shift) {
                const hasExisting = existingShifts.some(
                    s => s.employee_id === formData.employee_id && 
                         s.date === formData.date
                );
                if (hasExisting) {
                    const employee = employees.find(e => e.id === formData.employee_id);
                    alert(`Fehler: ${employee?.name} hat bereits eine Schicht an diesem Tag.`);
                    return;
                }
            }
            
            onSave(formData, shift?.id);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        {shift ? 'Schicht bearbeiten' : 'Neue Schicht'}
                    </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {!shift && (
                        <div className="flex gap-2 pb-2 border-b">
                            <Button
                                type="button"
                                variant={!isMultiMode ? "default" : "outline"}
                                size="sm"
                                onClick={() => setIsMultiMode(false)}
                                className={cn(!isMultiMode && "bg-amber-600 hover:bg-amber-700")}
                            >
                                Einzeln
                            </Button>
                            <Button
                                type="button"
                                variant={isMultiMode ? "default" : "outline"}
                                size="sm"
                                onClick={() => setIsMultiMode(true)}
                                className={cn(isMultiMode && "bg-amber-600 hover:bg-amber-700")}
                            >
                                Mehrere ({multipleShifts.length})
                            </Button>
                        </div>
                    )}

                    {!isMultiMode ? (
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
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Mitarbeiter</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addShiftSlot}
                                    disabled={multipleShifts.length >= 9}
                                    className="h-7 text-xs"
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Hinzufügen
                                </Button>
                            </div>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                {multipleShifts.map((slot, index) => (
                                    <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <div className="flex gap-2 items-start mb-3">
                                            <Select 
                                                value={slot.employee_id} 
                                                onValueChange={(value) => updateShiftSlot(index, 'employee_id', value)}
                                                className="flex-1"
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Wählen..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {employees.map(emp => (
                                                        <SelectItem key={emp.id} value={emp.id}>
                                                            <div className="flex items-center gap-2">
                                                                <div 
                                                                    className="w-2 h-2 rounded-full"
                                                                    style={{ backgroundColor: emp.color }}
                                                                />
                                                                {emp.name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeShiftSlot(index)}
                                                disabled={multipleShifts.length === 1}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                type="time"
                                                value={slot.start_time}
                                                onChange={(e) => updateShiftSlot(index, 'start_time', e.target.value)}
                                            />
                                            <Input
                                                type="time"
                                                value={slot.end_time}
                                                onChange={(e) => updateShiftSlot(index, 'end_time', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Schichttyp</Label>
                        <Select value={formData.shift_type} onValueChange={handleShiftTypeChange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Aufmachen">Aufmachen (16:00 - 03:00)</SelectItem>
                                <SelectItem value="Frühschicht">Frühschicht (20:00 - 05:00)</SelectItem>
                                <SelectItem value="Spätschicht">Spätschicht (21:00 - 05:00)</SelectItem>
                                <SelectItem value="Sonderschicht">Sonderschicht (manuell)</SelectItem>
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

                    {!isMultiMode && (
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
                    )}

                    <div className="space-y-2">
                        <Label>Notizen</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Optionale Anmerkungen..."
                            rows={2}
                        />
                    </div>

                    {shift && (
                        <div className="pt-2 border-t">
                            <ShiftSwapRequest shift={shift} onSuccess={onClose} />
                        </div>
                    )}

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
                        <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700">
                            {shift ? 'Speichern' : isMultiMode ? 'Alle hinzufügen' : 'Hinzufügen'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}