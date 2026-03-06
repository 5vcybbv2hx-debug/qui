import React, { useState, useEffect } from 'react';
import { format, addDays, addWeeks, eachDayOfInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, Trash2, Plus, Minus, Users, Clock, Repeat, AlertCircle, Palette } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ShiftSwapRequest from './ShiftSwapRequest';
import { haptics } from "@/components/utils/haptics";

export default function ShiftModal({ open, onClose, shift, employees, selectedDate, onSave, onDelete, existingShifts = [] }) {
    const { data: shiftTypes = [] } = useQuery({
        queryKey: ['shift-types'],
        queryFn: () => base44.entities.ShiftType.filter({ is_active: true }, 'order')
    });

    const { data: defaultRules = [] } = useQuery({
        queryKey: ['default-shift-rules'],
        queryFn: () => base44.entities.DefaultShiftRule.list()
    });

    const { data: requirements = [] } = useQuery({
        queryKey: ['shift-requirements'],
        queryFn: () => base44.entities.ShiftRequirement.list()
    });

    const getColorForOrder = (order, totalTypes) => {
        const hue = 120 - (order / Math.max(totalTypes - 1, 1)) * 120;
        return `hsl(${hue}, 70%, 50%)`;
    };

    const predefinedColors = [
        '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
        '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];

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
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringData, setRecurringData] = useState({
        pattern: 'weekly',
        endDate: '',
        weekdays: []
    });

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
            setIsRecurring(false);
        } else if (selectedDate) {
            const defaultType = shiftTypes[0];
            const endDate = addWeeks(selectedDate, 4);
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
            setIsRecurring(false);
            setRecurringData({
                pattern: 'weekly',
                endDate: format(endDate, 'yyyy-MM-dd'),
                weekdays: [new Date(selectedDate).getDay()]
            });
        }
    }, [shift, selectedDate, open, shiftTypes]);

    const getDefaultShiftForEmployee = (employeeId) => {
        if (formData.date) {
            const dayName = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][new Date(formData.date).getDay()];
            const rule = defaultRules.find(r => r.employee_id === employeeId && r.day_of_week === dayName);
            if (rule) {
                const shiftType = shiftTypes.find(t => t.name === rule.shift_type);
                return {
                    shift_type: rule.shift_type,
                    start_time: shiftType?.start_time || '16:00',
                    end_time: shiftType?.end_time || '03:00'
                };
            }
        }
        const defaultType = shiftTypes[0];
        return {
            shift_type: defaultType?.name || '',
            start_time: defaultType?.start_time || '16:00',
            end_time: defaultType?.end_time || '03:00'
        };
    };

    const toggleEmployee = (employeeId) => {
        setSelectedEmployees(prev => {
            const exists = prev.find(e => e.employee_id === employeeId);
            if (exists) {
                return prev.filter(e => e.employee_id !== employeeId);
            } else {
                const defaults = getDefaultShiftForEmployee(employeeId);
                return [...prev, { employee_id: employeeId, ...defaults }];
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

    const generateRecurringDates = () => {
        if (!isRecurring || !formData.date || !recurringData.endDate) return [formData.date];
        
        const startDate = new Date(formData.date);
        const endDate = new Date(recurringData.endDate);
        const dates = [];
        
        if (recurringData.pattern === 'daily') {
            const allDates = eachDayOfInterval({ start: startDate, end: endDate });
            dates.push(...allDates.map(d => format(d, 'yyyy-MM-dd')));
        } else if (recurringData.pattern === 'weekly') {
            let currentDate = startDate;
            while (currentDate <= endDate) {
                if (recurringData.weekdays.includes(currentDate.getDay())) {
                    dates.push(format(currentDate, 'yyyy-MM-dd'));
                }
                currentDate = addDays(currentDate, 1);
            }
        }
        
        return dates;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        haptics.light();
        
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

        const datesToCreate = generateRecurringDates();
        const seriesId = isRecurring ? `series_${Date.now()}` : null;
        let shiftsCreated = 0;

        // Create shifts
        for (const date of datesToCreate) {
            for (const empData of selectedEmployees) {
                // Check for existing shifts
                const hasExisting = existingShifts.some(
                    s => s.employee_id === empData.employee_id && s.date === date
                );
                if (hasExisting) continue;

                const employee = employees.find(e => e.id === empData.employee_id);
                const shiftColor = formData.color || employee?.color || predefinedColors[0];
                const shiftData = {
                    employee_id: empData.employee_id,
                    employee_name: employee?.name || '',
                    color: shiftColor,
                    date: date,
                    start_time: empData.start_time,
                    end_time: empData.end_time,
                    shift_type: empData.shift_type,
                    notes: formData.notes,
                    is_recurring: isRecurring,
                    recurring_series_id: seriesId
                };
                
                await onSave(shiftData, null);
                shiftsCreated++;
                
                // Create notification only for first shift
                if (date === datesToCreate[0]) {
                    try {
                        if (employee?.email) {
                            const message = isRecurring
                                ? `Du wurdest für wiederkehrende Schichten ab dem ${format(new Date(date), 'dd.MM.yyyy', { locale: de })} eingeteilt (${empData.start_time} - ${empData.end_time}).`
                                : `Du wurdest für eine Schicht am ${format(new Date(date), 'dd.MM.yyyy', { locale: de })} (${empData.start_time} - ${empData.end_time}) eingeteilt.`;
                            
                            await base44.entities.Notification.create({
                                type: 'general',
                                title: 'Neue Schicht zugewiesen',
                                message: message,
                                related_id: empData.employee_id,
                                read_by: []
                            });
                        }
                    } catch (error) {
                        console.error('Fehler beim Erstellen der Benachrichtigung:', error);
                    }
                }
            }
        }
        
        alert(`${shiftsCreated} Schicht${shiftsCreated !== 1 ? 'en' : ''} erfolgreich erstellt!`);
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
                                <Input
                                    placeholder="Mitarbeiter suchen..."
                                    value={employeeSearch}
                                    onChange={(e) => setEmployeeSearch(e.target.value)}
                                    className="mb-2"
                                />
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-secondary rounded-lg">
                                    {[...employees]
                                        .filter(emp => emp.is_active !== false)
                                        .sort((a, b) => a.name?.localeCompare(b.name, 'de'))
                                        .filter(emp => emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()))
                                        .map(emp => {
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
                                                <span className="text-sm font-medium text-foreground truncate">{emp.name}</span>
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
                                                 <div key={empData.employee_id} className="p-3 bg-card rounded-lg border border-border">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div 
                                                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                            style={{ backgroundColor: employee?.color }}
                                                        >
                                                            {employee?.name?.charAt(0)}
                                                        </div>
                                                        <span className="text-sm font-medium text-foreground">{employee?.name}</span>
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

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Datum</Label>
                            {!shift && (
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={isRecurring}
                                        onCheckedChange={setIsRecurring}
                                        id="recurring-switch"
                                    />
                                    <Label htmlFor="recurring-switch" className="text-xs text-slate-600 cursor-pointer">
                                        Wiederkehrend
                                    </Label>
                                </div>
                            )}
                        </div>
                        <Input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>

                    {!shift && isRecurring && (
                        <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                                <Repeat className="w-4 h-4" />
                                Wiederholungseinstellungen
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-xs">Muster</Label>
                                <Select value={recurringData.pattern} onValueChange={(v) => setRecurringData({ ...recurringData, pattern: v })}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Täglich</SelectItem>
                                        <SelectItem value="weekly">Wöchentlich</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {recurringData.pattern === 'weekly' && (
                                <div className="space-y-2">
                                    <Label className="text-xs">Wochentage</Label>
                                    <div className="flex gap-1 flex-wrap">
                                        {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].map((day, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setRecurringData(prev => ({
                                                        ...prev,
                                                        weekdays: prev.weekdays.includes(idx)
                                                            ? prev.weekdays.filter(d => d !== idx)
                                                            : [...prev.weekdays, idx]
                                                    }));
                                                }}
                                                className={cn(
                                                    "w-9 h-9 rounded-full text-xs font-medium transition-all",
                                                    recurringData.weekdays.includes(idx)
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-white text-slate-600 hover:bg-slate-100"
                                                )}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-xs">Enddatum</Label>
                                <Input
                                    type="date"
                                    value={recurringData.endDate}
                                    onChange={(e) => setRecurringData({ ...recurringData, endDate: e.target.value })}
                                    min={formData.date}
                                    className="bg-white"
                                />
                            </div>

                            <div className="text-xs text-blue-600 flex items-start gap-1">
                                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>
                                    Es werden ca. {generateRecurringDates().length} Schichten pro Mitarbeiter erstellt
                                </span>
                            </div>
                        </div>
                    )}

                    {!shift && formData.date && (
                        <div className="space-y-2">
                            <Label className="text-xs flex items-center gap-2">
                                <AlertCircle className="w-3 h-3" />
                                Anforderungen für diesen Tag
                            </Label>
                            {(() => {
                                const dayOfWeek = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][new Date(formData.date).getDay()];
                                const dayRequirements = requirements.filter(r => r.day_of_week === dayOfWeek);
                                
                                if (dayRequirements.length === 0) {
                                    return <p className="text-xs text-slate-500 italic">Keine Anforderungen für {dayOfWeek}</p>;
                                }
                                
                                return (
                                    <div className="space-y-1">
                                        {dayRequirements.map((req, idx) => (
                                            <div key={idx} className="flex items-start gap-2 p-2 bg-secondary rounded text-xs">
                                                <span className="text-foreground flex-1 break-words">
                                                    {req.shift_type || 'Allgemein'}
                                                </span>
                                                <Badge variant="outline" className="text-xs shrink-0 text-foreground border-border">
                                                    {req.required_employees} MA
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {!shift && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Palette className="w-4 h-4" />
                                Schichtfarbe (optional)
                            </Label>
                            <div className="flex gap-2 flex-wrap">
                                {predefinedColors.map((color, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, color })}
                                        className={cn(
                                            "w-8 h-8 rounded-full transition-all",
                                            formData.color === color && "ring-2 ring-offset-2 ring-slate-400"
                                        )}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color: '' })}
                                    className={cn(
                                        "w-8 h-8 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center text-slate-400 hover:bg-slate-50",
                                        !formData.color && "ring-2 ring-offset-2 ring-slate-400"
                                    )}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-xs text-slate-500">
                                {formData.color ? 'Benutzerdefinierte Farbe' : 'Standard: Mitarbeiterfarbe'}
                            </p>
                        </div>
                    )}

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

                    {shift?.id && (
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
                                onClick={() => {
                                    haptics.light();
                                    onDelete(shift.id);
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