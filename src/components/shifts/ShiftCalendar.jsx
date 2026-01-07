import React, { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, Palmtree } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ShiftCalendar({ shifts, employees, requirements = [], onAddShift, onSelectShift, selectedDate, setSelectedDate }) {
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    
    const getShiftsForDay = (date) => {
        return shifts.filter(shift => isSameDay(new Date(shift.date), date));
    };
    
    const getEmployeeColor = (employeeId) => {
        const employee = employees.find(e => e.id === employeeId);
        return employee?.color || '#64748b';
    };

    const getDayRequirement = (date) => {
        const dayName = format(date, 'EEEE', { locale: de });
        const dayNameGerman = {
            'Monday': 'Montag',
            'Tuesday': 'Dienstag', 
            'Wednesday': 'Mittwoch',
            'Thursday': 'Donnerstag',
            'Friday': 'Freitag',
            'Saturday': 'Samstag',
            'Sunday': 'Sonntag'
        }[dayName] || dayName;
        
        const reqs = requirements.filter(r => r.day_of_week === dayNameGerman);
        if (reqs.length === 0) return null;
        
        const totalRequired = reqs.reduce((sum, r) => sum + r.required_employees, 0);
        return totalRequired;
    };

    return (
        <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-700">
                <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setWeekStart(addDays(weekStart, -7))}
                    className="hover:bg-slate-700 text-slate-300"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <h3 className="font-semibold text-white text-sm sm:text-base">
                    {format(weekStart, 'MMMM yyyy', { locale: de })}
                </h3>
                <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setWeekStart(addDays(weekStart, 7))}
                    className="hover:bg-slate-700 text-slate-300"
                >
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 divide-x divide-slate-700">
                {weekDays.map((day, idx) => {
                    const dayShifts = getShiftsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const required = getDayRequirement(day);
                    const understaffed = required && dayShifts.length < required;
                    
                    return (
                        <div 
                            key={idx} 
                            className={cn(
                                "min-h-[120px] sm:min-h-[140px] p-2 cursor-pointer transition-colors",
                                isToday && "bg-amber-900/20",
                                isSelected && "bg-slate-700",
                                understaffed && "border-l-2 border-red-500"
                            )}
                            onClick={() => setSelectedDate(day)}
                        >
                            {/* Day Header */}
                            <div className="text-center mb-2">
                                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-500">
                                    {format(day, 'EEE', { locale: de })}
                                </p>
                                <div className="flex items-center justify-center gap-1">
                                    <p className={cn(
                                        "text-base sm:text-lg font-semibold mt-1",
                                        isToday ? "text-amber-500" : "text-slate-300"
                                    )}>
                                        {format(day, 'd')}
                                    </p>
                                    {required && (
                                        <Badge 
                                            variant="outline" 
                                            className={cn(
                                                "text-[9px] px-1 h-4 mt-1",
                                                understaffed ? "border-red-500 text-red-500" : "border-green-500 text-green-500"
                                            )}
                                        >
                                            {dayShifts.length}/{required}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            
                            {/* Shifts */}
                            <div className="space-y-1">
                                {dayShifts.slice(0, 3).map((shift) => (
                                    <div
                                        key={shift.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectShift(shift);
                                        }}
                                        className="px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium truncate hover:opacity-80 transition-opacity"
                                        style={{ 
                                            backgroundColor: `${getEmployeeColor(shift.employee_id)}20`,
                                            color: getEmployeeColor(shift.employee_id)
                                        }}
                                    >
                                        {shift.employee_name}
                                    </div>
                                ))}
                                {dayShifts.length > 3 && (
                                    <p className="text-[10px] text-slate-400 text-center">
                                        +{dayShifts.length - 3} mehr
                                    </p>
                                )}
                            </div>
                            
                            {/* Add Button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full mt-2 h-6 text-xs text-slate-500 hover:text-slate-300 opacity-0 hover:opacity-100 transition-opacity hover:bg-slate-700"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddShift(day);
                                }}
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                Schicht
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}