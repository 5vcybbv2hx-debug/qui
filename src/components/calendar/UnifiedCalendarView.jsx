import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, isSameMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function UnifiedCalendarView({
    shifts = [],
    vacations = [],
    holidays = [],
    employees = [],
    onEventClick = () => {},
    selectedEmployees = [],
    onEmployeeToggle = () => {},
    onRoleToggle = () => {},
    selectedRoles = [],
    searchQuery = '',
    onSearchChange = () => {}
}) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showFilterModal, setShowFilterModal] = useState(false);

    // Calendar grid generation
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Get events for a specific day
    const getEventsForDay = (day) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayEvents = [];

        // Shifts
        shifts.forEach(shift => {
            if (shift.date === dayStr) {
                if (selectedEmployees.length === 0 || selectedEmployees.includes(shift.employee_id)) {
                    dayEvents.push({
                        type: 'shift',
                        id: shift.id,
                        data: shift,
                        color: shift.color || '#f59e0b'
                    });
                }
            }
        });

        // Vacations
        vacations.forEach(vacation => {
            const vacStart = new Date(vacation.start_date);
            const vacEnd = new Date(vacation.end_date);
            if (day >= vacStart && day <= vacEnd) {
                if (selectedEmployees.length === 0 || selectedEmployees.includes(vacation.employee_id)) {
                    dayEvents.push({
                        type: 'vacation',
                        id: vacation.id,
                        data: vacation,
                        color: '#10b981'
                    });
                }
            }
        });

        // Holidays
        holidays.forEach(holiday => {
            if (holiday.date === dayStr) {
                dayEvents.push({
                    type: 'holiday',
                    id: holiday.id,
                    data: holiday,
                    color: '#ef4444'
                });
            }
        });

        return dayEvents;
    };

    const availableRoles = useMemo(() => {
        return [...new Set(employees.map(e => e.role))].filter(Boolean);
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(emp.role);
            return matchesSearch && matchesRole;
        });
    }, [employees, searchQuery, selectedRoles]);

    const activeFilters = selectedEmployees.length + selectedRoles.length;

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center justify-between md:justify-start gap-4">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-foreground">
                            {format(currentDate, 'MMMM yyyy', { locale: de })}
                        </h2>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={() => setShowFilterModal(true)}
                    className="gap-2 w-full md:w-auto"
                >
                    <Filter className="w-4 h-4" />
                    Filter {activeFilters > 0 && `(${activeFilters})`}
                </Button>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-sm text-muted-foreground">
                    {format(currentDate, 'MMMM yyyy', { locale: de })}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
                <div className="min-w-full bg-card border border-border rounded-lg">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 border-b border-border bg-secondary/50">
                        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                            <div key={day} className="p-2 md:p-4 text-center font-semibold text-sm md:text-base text-foreground border-r border-border last:border-r-0">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7">
                        {days.map(day => {
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const isToday = isSameDay(day, new Date());
                            const dayEvents = getEventsForDay(day);

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={cn(
                                        'border-r border-b border-border p-2 md:p-3 min-h-[80px] md:min-h-[120px] cursor-pointer transition-colors hover:bg-accent/50',
                                        !isCurrentMonth && 'bg-muted/20 opacity-50',
                                        isToday && 'bg-primary/10 border-primary'
                                    )}
                                >
                                    {/* Day Number */}
                                    <div className={cn(
                                        'text-sm md:text-base font-semibold mb-1',
                                        isToday && 'text-primary'
                                    )}>
                                        {format(day, 'd')}
                                    </div>

                                    {/* Events */}
                                    <div className="space-y-1">
                                        {dayEvents.slice(0, 3).map(event => (
                                            <div
                                                key={event.id}
                                                onClick={() => onEventClick(event)}
                                                className="text-xs p-1 rounded bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 truncate hover:opacity-80 transition-opacity"
                                            >
                                                {event.type === 'shift' && `${event.data.employee_name}`}
                                                {event.type === 'vacation' && `Urlaub: ${event.data.employee_name}`}
                                                {event.type === 'holiday' && `${event.data.name}`}
                                            </div>
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <div className="text-xs text-muted-foreground">
                                                +{dayEvents.length - 3} mehr
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Filter Modal */}
            <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>Filter</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    onEmployeeToggle([]);
                                    onRoleToggle([]);
                                    onSearchChange('');
                                }}
                            >
                                <X className="w-4 h-4" />
                                Zurücksetzen
                            </Button>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Role Filter */}
                        <div>
                            <h4 className="text-sm font-semibold mb-3">Nach Rolle</h4>
                            <div className="space-y-2">
                                {availableRoles.map(role => (
                                    <div key={role} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`role-${role}`}
                                            checked={selectedRoles.includes(role)}
                                            onCheckedChange={() => {
                                                const newRoles = selectedRoles.includes(role)
                                                    ? selectedRoles.filter(r => r !== role)
                                                    : [...selectedRoles, role];
                                                onRoleToggle(newRoles);
                                            }}
                                        />
                                        <label htmlFor={`role-${role}`} className="text-sm cursor-pointer">
                                            {role}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Employee Search & Filter */}
                        <div>
                            <h4 className="text-sm font-semibold mb-3">Nach Mitarbeiter</h4>
                            <Input
                                placeholder="Suchen..."
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="mb-3"
                            />
                            <div className="max-h-[200px] overflow-y-auto space-y-2">
                                {filteredEmployees.map(emp => (
                                    <div key={emp.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`emp-${emp.id}`}
                                            checked={selectedEmployees.includes(emp.id)}
                                            onCheckedChange={() => {
                                                const newEmployees = selectedEmployees.includes(emp.id)
                                                    ? selectedEmployees.filter(id => id !== emp.id)
                                                    : [...selectedEmployees, emp.id];
                                                onEmployeeToggle(newEmployees);
                                            }}
                                        />
                                        <label htmlFor={`emp-${emp.id}`} className="text-sm cursor-pointer flex items-center gap-2 flex-1">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: emp.color || '#64748b' }}
                                            />
                                            {emp.name}
                                            <Badge variant="outline" className="text-xs ml-auto">
                                                {emp.role}
                                            </Badge>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}