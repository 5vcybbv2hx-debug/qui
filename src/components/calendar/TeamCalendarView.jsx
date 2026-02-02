import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isWeekend } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TeamCalendarView({ 
    shifts = [], 
    vacations = [], 
    holidays = [],
    employees = [],
    onEventClick,
    selectedEmployees = []
}) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const getEventsForDay = (day) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const events = [];

        // Schichten
        shifts
            .filter(shift => shift.date === dayStr)
            .filter(shift => selectedEmployees.length === 0 || selectedEmployees.includes(shift.employee_id))
            .forEach(shift => {
                const employee = employees.find(e => e.id === shift.employee_id);
                events.push({
                    type: 'shift',
                    data: shift,
                    employee: employee,
                    color: employee?.color || '#64748b',
                    label: `${shift.employee_name} (${shift.start_time}-${shift.end_time})`
                });
            });

        // Urlaube
        vacations
            .filter(vacation => {
                const start = new Date(vacation.start_date);
                const end = new Date(vacation.end_date);
                return day >= start && day <= end;
            })
            .filter(vacation => selectedEmployees.length === 0 || selectedEmployees.includes(vacation.employee_id))
            .forEach(vacation => {
                events.push({
                    type: 'vacation',
                    data: vacation,
                    color: '#8b5cf6',
                    label: `🏖️ ${vacation.employee_name}`
                });
            });

        // Feiertage
        holidays
            .filter(holiday => isSameDay(holiday.date, day))
            .forEach(holiday => {
                events.push({
                    type: 'holiday',
                    data: holiday,
                    color: '#ef4444',
                    label: `🎉 ${holiday.name}`
                });
            });

        return events;
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-amber-400" />
                    {format(currentDate, 'MMMM yyyy', { locale: de })}
                </h2>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                        className="border-slate-600 text-slate-300"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDate(new Date())}
                        className="border-slate-600 text-slate-300"
                    >
                        Heute
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                        className="border-slate-600 text-slate-300"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-2">
                    {days.map(day => {
                        const events = getEventsForDay(day);
                        const isToday = isSameDay(day, new Date());
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isWeekendDay = isWeekend(day);

                        return (
                            <div
                                key={day.toString()}
                                className={cn(
                                    "min-h-[100px] p-2 rounded-lg border transition-all",
                                    isCurrentMonth ? "bg-slate-900 border-slate-700" : "bg-slate-900/50 border-slate-800",
                                    isWeekendDay && "bg-slate-800/50",
                                    isToday && "ring-2 ring-amber-500"
                                )}
                            >
                                <div className={cn(
                                    "text-sm font-medium mb-2",
                                    isToday ? "text-amber-400" : isCurrentMonth ? "text-white" : "text-slate-500"
                                )}>
                                    {format(day, 'd')}
                                </div>

                                <div className="space-y-1">
                                    {events.slice(0, 3).map((event, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => onEventClick?.(event)}
                                            className={cn(
                                                "w-full text-left px-2 py-1 rounded text-xs truncate transition-all hover:scale-105",
                                                "text-white font-medium cursor-pointer"
                                            )}
                                            style={{ backgroundColor: event.color }}
                                            title={event.label}
                                        >
                                            {event.label}
                                        </button>
                                    ))}
                                    {events.length > 3 && (
                                        <button
                                            onClick={() => onEventClick?.({ type: 'multiple', events, date: day })}
                                            className="w-full text-left px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                                        >
                                            +{events.length - 3} weitere
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 p-4 border-t border-slate-700 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#64748b' }}></div>
                    <span className="text-slate-400">Schicht</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-purple-600"></div>
                    <span className="text-slate-400">Urlaub</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-600"></div>
                    <span className="text-slate-400">Feiertag</span>
                </div>
            </div>
        </div>
    );
}