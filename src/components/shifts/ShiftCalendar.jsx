import React, { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ShiftCalendar({ shifts, employees, onAddShift, onSelectShift, selectedDate, setSelectedDate }) {
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    
    const getShiftsForDay = (date) => {
        return shifts.filter(shift => isSameDay(new Date(shift.date), date));
    };
    
    const getEmployeeColor = (employeeId) => {
        const employee = employees.find(e => e.id === employeeId);
        return employee?.color || '#64748b';
    };

    return (
        <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setWeekStart(addDays(weekStart, -7))}
                    className="hover:bg-slate-700 text-slate-300"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <h3 className="font-semibold text-white">
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
                    
                    return (
                        <div 
                            key={idx} 
                            className={cn(
                                "min-h-[140px] p-2 cursor-pointer transition-colors",
                                isToday && "bg-amber-900/20",
                                isSelected && "bg-slate-700"
                            )}
                            onClick={() => setSelectedDate(day)}
                        >
                            {/* Day Header */}
                            <div className="text-center mb-2">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                                    {format(day, 'EEE', { locale: de })}
                                </p>
                                <p className={cn(
                                    "text-lg font-semibold mt-1",
                                    isToday ? "text-amber-500" : "text-slate-300"
                                )}>
                                    {format(day, 'd')}
                                </p>
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
                                        className="px-2 py-1 rounded-lg text-xs font-medium truncate hover:opacity-80 transition-opacity"
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