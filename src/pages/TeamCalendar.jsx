import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, Filter, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import UnifiedCalendarView from '@/components/calendar/UnifiedCalendarView';
import EventDetailsModal from '@/components/calendar/EventDetailsModal';
import ShiftSwapRequestModal from '@/components/shifts/ShiftSwapRequestModal';
import TeamCalendarExport from '@/components/calendar/TeamCalendarExport';
import { getHolidaysBW } from '@/components/shifts/getHolidays';
import DayDetailDrawer from '@/components/calendar/DayDetailDrawer';

export default function TeamCalendar() {
    const permissions = usePermissions();
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [shiftSwapData, setShiftSwapData] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const [showDayDrawer, setShowDayDrawer] = useState(false);

    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => base44.entities.Shift.list('-date', 1000)
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const { data: vacations = [] } = useQuery({
        queryKey: ['vacations'],
        queryFn: () => base44.entities.VacationRequest.filter({ status: 'genehmigt' })
    });

    const { data: maintenanceTasks = [] } = useQuery({
        queryKey: ['maintenance-tasks'],
        queryFn: () => base44.entities.MaintenanceTask.filter({ is_active: true })
    });

    // Get holidays for current and next year
    const currentYear = new Date().getFullYear();
    const holidays = [...getHolidaysBW(currentYear), ...getHolidaysBW(currentYear + 1)];



    if (!permissions.canViewShifts) {
        return <PermissionDenied />;
    }

    const handleEventClick = (event) => {
        setSelectedEvent(event);
        setShowEventModal(true);
    };

    const handleShiftSwap = (shift) => {
        setShiftSwapData(shift);
    };

    const handleDayClick = (day) => {
        setSelectedDay(day);
        setShowDayDrawer(true);
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <Calendar className="w-6 md:w-8 h-6 md:h-8 text-primary" />
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Teamkalender</h1>
                            <p className="text-muted-foreground text-sm">
                                Übersicht aller Schichten, Urlaube und Feiertage
                            </p>
                        </div>
                    </div>

                    {/* Heute im Dienst */}
                    {(() => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const todayShifts = shifts.filter(s => s.date === todayStr);
                        return (
                            <Card className="p-4">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Heute im Dienst</p>
                                {todayShifts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Keine Schichten heute eingetragen.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {todayShifts.map(s => {
                                            const emp = employees.find(e => e.id === s.employee_id);
                                            return (
                                                <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border text-sm">
                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                                        style={{ backgroundColor: emp?.color || '#64748b' }}>
                                                        {s.employee_name?.charAt(0)}
                                                    </div>
                                                    <span className="font-medium text-foreground">{s.employee_name?.split(' ')[0]}</span>
                                                    <span className="text-muted-foreground text-xs">{s.start_time}–{s.end_time}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>
                        );
                    })()}
                </div>

                {/* Calendar & Export */}
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <TeamCalendarExport
                            shifts={shifts}
                            vacations={vacations}
                            holidays={holidays}
                            employees={employees}
                        />
                    </div>

                    <UnifiedCalendarView
                        onDayClick={handleDayClick}
                        shifts={shifts}
                        vacations={vacations}
                        holidays={holidays}
                        employees={employees}
                        maintenanceTasks={maintenanceTasks}
                        onEventClick={handleEventClick}
                        selectedEmployees={selectedEmployees}
                        onEmployeeToggle={setSelectedEmployees}
                        onRoleToggle={setSelectedRoles}
                        selectedRoles={selectedRoles}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                    />
                </div>
            </div>

            {/* Event Details Modal */}
            <EventDetailsModal
                event={selectedEvent}
                open={showEventModal}
                onClose={() => {
                    setShowEventModal(false);
                    setSelectedEvent(null);
                }}
                onShiftSwap={handleShiftSwap}
            />

            {/* Day Detail Drawer */}
            <DayDetailDrawer
                open={showDayDrawer}
                onClose={() => setShowDayDrawer(false)}
                day={selectedDay}
                shifts={shifts}
                vacations={vacations}
                holidays={holidays}
                employees={employees}
                maintenanceTasks={maintenanceTasks}
            />

            {/* Shift Swap Modal */}
            {shiftSwapData && (
                <ShiftSwapRequestModal
                    shift={shiftSwapData}
                    open={!!shiftSwapData}
                    onClose={() => setShiftSwapData(null)}
                />
            )}
        </div>
    );
}