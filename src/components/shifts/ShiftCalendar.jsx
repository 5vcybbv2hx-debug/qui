import React, { useState, useMemo } from 'react';
import { format, startOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, isSameDay, isSameMonth, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Palmtree, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getHolidaysBW, getHolidayName } from './getHolidays';
import { usePermissions } from '@/components/auth/usePermissions';

export default function ShiftCalendar({ shifts, allShifts, employees, requirements = [], vacationRequests = [], onAddShift, onSelectShift, onShiftMove, selectedDate, setSelectedDate }) {
    const permissions = usePermissions();
    const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [draggedShift, setDraggedShift] = useState(null);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    
    // Feiertage für das aktuelle Jahr und das nächste Jahr laden
    const holidays = useMemo(() => {
        const year = currentDate.getFullYear();
        return [...getHolidaysBW(year), ...getHolidaysBW(year + 1)];
    }, [currentDate]);
    
    // Generate calendar days based on view mode
    const calendarDays = viewMode === 'week'
        ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
        : (() => {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
            const calEnd = addDays(startOfWeek(monthEnd, { weekStartsOn: 1 }), 6);
            
            const days = [];
            let day = calStart;
            while (day <= calEnd) {
                days.push(day);
                day = addDays(day, 1);
            }
            return days;
        })();
    
    const getShiftsForDay = (date) => {
        return shifts
            .filter(shift => isSameDay(new Date(shift.date), date))
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
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

    const handleNavigation = (direction) => {
        if (viewMode === 'week') {
            setCurrentDate(addWeeks(currentDate, direction));
        } else {
            setCurrentDate(addMonths(currentDate, direction));
        }
    };

    const handleDragStart = (e, shift) => {
        if (!permissions.canEditShifts) {
            e.preventDefault();
            return;
        }
        setDraggedShift(shift);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetDate) => {
        e.preventDefault();
        if (!permissions.canEditShifts) {
            setDraggedShift(null);
            return;
        }
        if (draggedShift && onShiftMove) {
            const currentDate = new Date(draggedShift.date);
            const newDate = startOfDay(targetDate);
            
            if (!isSameDay(currentDate, newDate)) {
                onShiftMove(draggedShift.id, newDate);
            }
        }
        setDraggedShift(null);
    };

    const handleDragEnd = () => {
        setDraggedShift(null);
    };

    return (
        <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-900/50 border-b border-slate-700">
                <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleNavigation(-1)}
                    className="hover:bg-slate-700 text-slate-300"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-white text-base sm:text-lg">
                        {format(currentDate, 'MMMM yyyy', { locale: de })}
                    </h3>
                    <Button
                        variant={viewMode === 'week' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode(viewMode === 'week' ? 'month' : 'week')}
                        className={cn(
                            "text-xs h-7",
                            viewMode === 'week' && "bg-amber-600 hover:bg-amber-700"
                        )}
                    >
                        <CalendarIcon className="w-3 h-3 mr-1" />
                        {viewMode === 'week' ? 'Woche' : 'Monat'}
                    </Button>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleNavigation(1)}
                    className="hover:bg-slate-700 text-slate-300"
                >
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-slate-700 bg-slate-900/30">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, idx) => (
                    <div key={idx} className="py-2 text-center border-r border-slate-700 last:border-r-0">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {day}
                        </span>
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-700">
                {calendarDays.map((day, idx) => {
                    const dayShifts = getShiftsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const required = getDayRequirement(day);
                    const understaffed = required && dayShifts.length < required;
                    const isCurrentMonth = viewMode === 'month' ? isSameMonth(day, currentDate) : true;
                    
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayVacations = vacationRequests.filter(v => 
                        v.status === 'genehmigt' &&
                        dateStr >= v.start_date && 
                        dateStr <= v.end_date
                    );
                    
                    const holidayName = getHolidayName(day, holidays);
                    
                    return (
                        <div 
                            key={idx} 
                            className={cn(
                                "relative group cursor-pointer transition-all",
                                viewMode === 'week' ? "min-h-[110px]" : "min-h-[80px]",
                                isToday && "bg-amber-500/5 ring-2 ring-inset ring-amber-500/30",
                                isSelected && "bg-amber-600/10 ring-2 ring-inset ring-amber-600",
                                understaffed && "bg-red-500/5",
                                !isCurrentMonth && "opacity-40 bg-slate-900/30"
                            )}
                            onClick={() => setSelectedDate(day)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, day)}
                        >
                            {/* Day Number Badge */}
                            <div className="absolute top-1.5 right-1.5 z-10">
                                <div className={cn(
                                    "flex items-center gap-1 px-1.5 py-0.5 rounded-md",
                                    isToday ? "bg-amber-600 text-white" : "bg-slate-900/50 text-slate-300"
                                )}>
                                    <span className="text-xs font-bold">
                                        {format(day, 'd')}
                                    </span>
                                    {required && (
                                        <Badge 
                                            variant="outline" 
                                            className={cn(
                                                "text-[9px] px-1 h-3.5 border",
                                                understaffed 
                                                    ? "bg-red-500/10 border-red-500 text-red-400" 
                                                    : "bg-green-500/10 border-green-500 text-green-400"
                                            )}
                                        >
                                            {dayShifts.length}/{required}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            
                            {/* Feiertag Banner */}
                            {holidayName && (
                                <div className="absolute top-1.5 left-1.5 right-16 z-10">
                                    <div className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-semibold truncate shadow-sm">
                                        {holidayName}
                                    </div>
                                </div>
                            )}
                            
                            {/* Content Area */}
                            <div className="p-1.5 pt-8 h-full flex flex-col gap-0.5 overflow-y-auto max-h-[200px]">
                                {/* Shifts */}
                                {dayShifts.map((shift) => (
                                    <div
                                        key={shift.id}
                                        draggable={permissions.canEditShifts}
                                        onDragStart={(e) => handleDragStart(e, shift)}
                                        onDragEnd={handleDragEnd}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (permissions.canEditShifts) {
                                                onSelectShift(shift);
                                            }
                                        }}
                                        className={cn(
                                            "px-1.5 py-1 rounded text-[10px] font-medium transition-transform flex items-center gap-1 flex-shrink-0",
                                            permissions.canEditShifts ? "cursor-move hover:scale-105" : "cursor-default",
                                            draggedShift?.id === shift.id && "opacity-50 scale-95"
                                        )}
                                        style={{ 
                                            backgroundColor: getEmployeeColor(shift.employee_id),
                                            color: '#ffffff'
                                        }}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] truncate font-semibold leading-tight">
                                                {shift.employee_name.split(' ')[0]}
                                            </p>
                                            <p className="text-[9px] opacity-80 leading-tight">
                                                {shift.start_time.slice(0,5)}-{shift.end_time.slice(0,5)}
                                            </p>
                                        </div>
                                        {shift.shift_type && (
                                            <Badge className="text-[8px] h-3.5 px-1 bg-white/20 border-0 text-white">
                                                {shift.shift_type.slice(0,3)}
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                                
                                {/* Vacations */}
                                {dayVacations.length > 0 && (
                                    <Link
                                        to={createPageUrl('Vacation')}
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-1.5 py-0.5 bg-amber-600/20 border border-amber-600/30 rounded text-[9px] text-amber-400 flex items-center gap-1 hover:bg-amber-600/30 transition-colors font-medium flex-shrink-0"
                                    >
                                        <Palmtree className="w-2.5 h-2.5" />
                                        <span className="truncate">
                                            {dayVacations.length === 1 
                                                ? dayVacations[0].employee_name.split(' ')[0]
                                                : `${dayVacations.length}`
                                            }
                                        </span>
                                    </Link>
                                )}
                            </div>
                            
                            {/* Hover Add Button */}
                            {permissions.canEditShifts && (
                                <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full h-6 rounded-none bg-slate-900/90 hover:bg-amber-600 text-slate-400 hover:text-white border-t border-slate-700"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAddShift(day);
                                        }}
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        <span className="text-[10px]">Schicht</span>
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}