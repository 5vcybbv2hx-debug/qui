import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, Trash2, Plus, Minus, Users, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import ShiftSwapRequest from './ShiftSwapRequest';

export default function ShiftModal({ open, onClose, shift, employees, selectedDate, onSave, onDelete, existingShifts = [] }) {
    const { data: shiftTypes = [] } = useQuery({
        queryKey: ['shift-types'],
        queryFn: () => base44.entities.ShiftType.filter({ is_active: true }, 'order')
    });

    const getColorForOrder = (order, totalTypes) => {
        const hue = 120 - (order / Math.max(totalTypes - 1, 1)) * 120;
        return `hsl(${hue}, 70%, 50%)`;
    };

    const [formData, setFormData] = useState({
        employee_id: '',
        employee_name: '',
        date: '',
        start_time: '16:00',
        end_time: '03:00',
        shift_type: '',
        notes: '',
        color: ''
    });

    const [selectedEmployees, setSelectedEmployees] = useState([]);

    useEffect(() => {
        if (shift) {
            setFormData({
                employee_id: shift.employee_id || '',
                employee_name: shift.employee_name || '',
                date: shift.date || '',
                start_time: shift.start_time || '18:00',
                end_time: shift.end_time || '02:00',
                shift_type: shift.shift_type || '',
                notes: shift.notes || '',
                color: shift.color || ''
            });
            setSelectedEmployees([]);
        } else if (selectedDate) {
            const defaultType = shiftTypes[0];
            setFormData({
                employee_id: '',
                employee_name: '',
                date: format(selectedDate, 'yyyy-MM-dd'),
                start_time: defaultType?.start_time || '16:00',
                end_time: defaultType?.end_time || '03:00',
                shift_type: defaultType?.name || '',
                notes: '',
                color: ''
            });
            setSelectedEmployees([]);
        }
    }, [shift, selectedDate, open, shiftTypes]);

    const toggleEmployee = (employeeId) => {
        setSelectedEmployees(prev => {
            const exists = prev.find(e => e.employee_id === employeeId);
            if (exists) {
                return prev.filter(e => e.employee_id !== employeeId);
            } else {
                const defaultType = shiftTypes[0];
                return [...prev, { 
                    employee_id: employeeId, 
                    shift_type: defaultType?.name || '',
                    start_time: defaultType?.start_time || '16:00',
                    end_time: defaultType?.end_time || '03:00'
                }];
            }
        });
    };

    const updateEmployeeShiftType = (employeeId, shiftTypeName) => {
        const shiftType = shiftTypes.find(t => t.name === shiftTypeName);
        setSelectedEmployees(prev => 
            prev.map(e => 
                e.employee_id === employeeId 
                    ? { 
                        ...e, 
                        shift_type: shiftTypeName,
                        start_time: shiftType?.start_time || e.start_time,
                        end_time: shiftType?.end_time || e.end_time
                    }
                    : e
            )
        );
    };

    const handleShiftTypeChange = (shiftTypeName) => {
        const shiftType = shiftTypes.find(t => t.name === shiftTypeName);
        setFormData(prev => ({
            ...prev,
            shift_type: shiftTypeName,
            start_time: shiftType?.start_time || prev.start_time,
            end_time: shiftType?.end_time || prev.end_time
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (shift) {
            // Edit existing shift
            onSave(formData, shift.id);
            return;
        }

        // Create shifts for all selected employees
        if (selectedEmployees.length === 0) {
            alert('Bitte wähle mindestens einen Mitarbeiter aus.');
            return;
        }

        // Check for existing shifts
        for (const empData of selectedEmployees) {
            const hasExisting = existingShifts.some(
                s => s.employee_id === empData.employee_id && s.date === formData.date
            );
            if (hasExisting) {
                const employee = employees.find(e => e.id === empData.employee_id);
                alert(`Fehler: ${employee?.name} hat bereits eine Schicht an diesem Tag.`);
                return;
            }
        }

        // Create shifts
        for (const empData of selectedEmployees) {
            const employee = employees.find(e => e.id === empData.employee_id);
            const shiftData = {
                employee_id: empData.employee_id,
                employee_name: employee?.name || '',
                color: employee?.color || '',
                date: formData.date,
                start_time: empData.start_time,
                end_time: empData.end_time,
                shift_type: empData.shift_type,
                notes: formData.notes
            };
            
            await onSave(shiftData, null);
            
            // Create notification
            try {
                if (employee?.email) {
                    await base44.entities.Notification.create({
                        type: 'general',
                        title: 'Neue Schicht zugewiesen',
                        message: `Du wurdest für eine Schicht am ${format(new Date(shiftData.date), 'dd.MM.yyyy', { locale: de })} (${shiftData.start_time} - ${shiftData.end_time}) eingeteilt.`,
                        related_id: empData.employee_id,
                        read_by: []
                    });
                }
            } catch (error) {
                console.error('Fehler beim Erstellen der Benachrichtigung:', error);
            }
        }
        
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        {shift ? 'Schicht bearbeiten' : 'Neue Schicht'}
                    </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-5 mt-4">
                    {!shift && (
                        <>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Mitarbeiter wählen
                                    </Label>
                                    <span className="text-xs text-slate-500">
                                        {selectedEmployees.length} ausgewählt
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg">
                                    {employees.map(emp => {
                                        const isSelected = selectedEmployees.some(e => e.employee_id === emp.id);
                                        return (
                                            <button
                                                key={emp.id}
                                                type="button"
                                                onClick={() => toggleEmployee(emp.id)}
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded-lg border-2 transition-all text-left",
                                                    isSelected 
                                                        ? "border-amber-500 bg-amber-50" 
                                                        : "border-slate-200 hover:border-slate-300 bg-white"
                                                )}
                                            >
                                                <div 
                                                    className={cn(
                                                        "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
                                                        isSelected && "ring-2 ring-amber-500 ring-offset-2"
                                                    )}
                                                    style={{ backgroundColor: emp.color }}
                                                >
                                                    {emp.name?.charAt(0)}
                                                </div>
                                                <span className="text-sm font-medium text-slate-800 truncate">{emp.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {selectedEmployees.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Schichttypen zuweisen
                                    </Label>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {selectedEmployees.map(empData => {
                                            const employee = employees.find(e => e.id === empData.employee_id);
                                            return (
                                                <div key={empData.employee_id} className="p-3 bg-white rounded-lg border border-slate-200">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div 
                                                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                            style={{ backgroundColor: employee?.color }}
                                                        >
                                                            {employee?.name?.charAt(0)}
                                                        </div>
                                                        <span className="text-sm font-medium">{employee?.name}</span>
                                                    </div>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {shiftTypes.map(type => {
                                                            const isSelected = empData.shift_type === type.name;
                                                            const color = getColorForOrder(type.order || 0, shiftTypes.length);
                                                            return (
                                                                <button
                                                                    key={type.id}
                                                                    type="button"
                                                                    onClick={() => updateEmployeeShiftType(empData.employee_id, type.name)}
                                                                    className={cn(
                                                                        "px-2 py-1 rounded text-xs font-medium transition-all",
                                                                        isSelected 
                                                                            ? "bg-amber-500 text-white" 
                                                                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                                                    )}
                                                                >
                                                                    {type.name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {shift && (
                        <div className="space-y-2">
                            <Label>Mitarbeiter</Label>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                    style={{ backgroundColor: formData.color }}
                                >
                                    {formData.employee_name?.charAt(0)}
                                </div>
                                <span className="font-medium">{formData.employee_name}</span>
                            </div>
                        </div>
                    )}

                    {shift && (
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Schichttyp & Zeiten
                            </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {shiftTypes.map((type, index) => {
                                    const isSelected = formData.shift_type === type.name;
                                    const color = getColorForOrder(type.order || 0, shiftTypes.length);
                                    return (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => handleShiftTypeChange(type.name)}
                                            className={cn(
                                                "p-3 rounded-lg border-2 transition-all text-left",
                                                isSelected 
                                                    ? "border-amber-500 bg-amber-50" 
                                                    : "border-slate-200 hover:border-slate-300 bg-white"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div 
                                                    className="w-3 h-3 rounded"
                                                    style={{ backgroundColor: color }}
                                                />
                                                <span className="font-medium text-sm">{type.name}</span>
                                            </div>
                                            {type.start_time && (
                                                <p className="text-xs text-slate-500">
                                                    {type.start_time} - {type.end_time}
                                                </p>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Datum</Label>
                        <Input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>

                    {shift && (
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
                        <Button 
                            type="submit" 
                            className="flex-1 bg-amber-600 hover:bg-amber-700"
                            disabled={!shift && selectedEmployees.length === 0}
                        >
                            {shift ? 'Speichern' : `${selectedEmployees.length} Schicht${selectedEmployees.length !== 1 ? 'en' : ''} erstellen`}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}