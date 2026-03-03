import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isWeekend } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function MobileTeamCalendarView({ 
    shifts = [], 
    vacations = [], 
    holidays = [],
    employees = [],
    onEventClick,
    selectedEmployees = []
}) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);

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

    const dayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

    return (
        <>
            {/* Calendar Grid */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-amber-400" />
                        {format(currentDate, 'MMMM yyyy', { locale: de })}
                    </h2>
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                            className="border-slate-600 text-slate-300 h-8 w-8 p-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentDate(new Date())}
                            className="border-slate-600 text-slate-300 h-8 px-2 text-xs"
                        >
                            Heute
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                            className="border-slate-600 text-slate-300 h-8 w-8 p-0"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-0 bg-slate-900/50">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-0">
                    {days.map(day => {
                        const events = getEventsForDay(day);
                        const isToday = isSameDay(day, new Date());
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isWeekendDay = isWeekend(day);
                        const isSelected = selectedDay && isSameDay(day, selectedDay);

                        return (
                            <button
                                key={day.toString()}
                                onClick={() => setSelectedDay(day)}
                                className={cn(
                                    "aspect-square flex flex-col items-center justify-center p-2 border-b border-r border-slate-700 transition-all active:scale-95",
                                    "text-xs md:text-sm font-medium",
                                    isCurrentMonth ? "bg-slate-900" : "bg-slate-900/50",
                                    isWeekendDay && "bg-slate-800/50",
                                    isToday && "ring-inset ring-2 ring-amber-500",
                                    isSelected && "ring-inset ring-2 ring-blue-500 bg-slate-800",
                                    isToday && !isSelected ? "text-amber-400" : isCurrentMonth ? "text-white" : "text-slate-500"
                                )}
                            >
                                <div>{format(day, 'd')}</div>
                                {events.length > 0 && (
                                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                                        {events.slice(0, 3).map((event, idx) => (
                                            <div
                                                key={idx}
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{ backgroundColor: event.color }}
                                            />
                                        ))}
                                        {events.length > 3 && (
                                            <div className="w-1 h-1 rounded-full bg-slate-500" />
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-3 p-3 border-t border-slate-700 text-xs bg-slate-900/50">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded" style={{ backgroundColor: '#64748b' }}></div>
                        <span className="text-slate-400">Schicht</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded bg-purple-600"></div>
                        <span className="text-slate-400">Urlaub</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded bg-red-600"></div>
                        <span className="text-slate-400">Feiertag</span>
                    </div>
                </div>
            </div>

            {/* Day Details Modal */}
            <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
                <DialogContent className="bg-slate-800 border-slate-700 max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {selectedDay && format(selectedDay, 'EEEE, d. MMMM yyyy', { locale: de })}
                        </DialogTitle>
                    </DialogHeader>

                    {dayEvents.length > 0 ? (
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {dayEvents.map((event, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        onEventClick?.(event);
                                        setSelectedDay(null);
                                    }}
                                    className="w-full p-4 rounded-lg text-left transition-all active:scale-95 hover:opacity-90"
                                    style={{ backgroundColor: event.color + '20', borderLeft: `4px solid ${event.color}` }}
                                >
                                    <div className="font-semibold text-white">{event.label}</div>
                                    {event.type === 'shift' && (
                                        <div className="text-xs text-slate-300 mt-1">
                                            {event.data.start_time} - {event.data.end_time}
                                        </div>
                                    )}
                                    {event.data.notes && (
                                        <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                                            {event.data.notes}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-slate-400">
                            <p className="text-sm">Keine Einträge für diesen Tag</p>
                        </div>
                    )}

                    <Button
                        onClick={() => setSelectedDay(null)}
                        variant="outline"
                        className="w-full border-slate-600 text-slate-300"
                    >
                        Schließen
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
}