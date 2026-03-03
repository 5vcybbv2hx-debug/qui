import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, Filter, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import TeamCalendarView from '@/components/calendar/TeamCalendarView';
import MobileTeamCalendarView from '@/components/calendar/MobileTeamCalendarView';
import EventDetailsModal from '@/components/calendar/EventDetailsModal';
import ShiftSwapRequestModal from '@/components/shifts/ShiftSwapRequestModal';
import TeamCalendarExport from '@/components/calendar/TeamCalendarExport';
import { getHolidaysBW } from '@/components/shifts/getHolidays';
import { useIsMobile } from '@/components/utils/useIsMobile';

export default function TeamCalendar() {
    const permissions = usePermissions();
    const isMobile = useIsMobile();
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [shiftSwapData, setShiftSwapData] = useState(null);

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

    // Get holidays for current and next year
    const currentYear = new Date().getFullYear();
    const holidays = [...getHolidaysBW(currentYear), ...getHolidaysBW(currentYear + 1)];

    // Listen for calendar event clicks
    useEffect(() => {
        const handleEventClick = (e) => {
            setSelectedEvent(e.detail);
            setShowEventModal(true);
        };
        window.addEventListener('calendar-event-click', handleEventClick);
        return () => window.removeEventListener('calendar-event-click', handleEventClick);
    }, []);

    if (!permissions.canViewShifts) {
        return <PermissionDenied />;
    }

    // Filter employees by search and role
    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(emp.role);
        return matchesSearch && matchesRole;
    });

    const availableRoles = [...new Set(employees.map(e => e.role))].filter(Boolean);

    const toggleEmployee = (empId) => {
        setSelectedEmployees(prev =>
            prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
        );
    };

    const toggleRole = (role) => {
        setSelectedRoles(prev =>
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    const handleEventClick = (event) => {
        setSelectedEvent(event);
        setShowEventModal(true);
    };

    const handleShiftSwap = (shift) => {
        setShiftSwapData(shift);
    };

    const totalEvents = shifts.length + vacations.length + holidays.length;
    const activeFilters = selectedEmployees.length + selectedRoles.length;

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-amber-400" />
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">Team-Kalender</h1>
                                <p className="text-slate-400 text-sm">
                                    Übersicht aller Schichten, Urlaube und Feiertage
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <TeamCalendarExport
                                shifts={shifts}
                                vacations={vacations}
                                holidays={holidays}
                                employees={employees}
                            />
                            <Button
                                onClick={() => setShowFilters(!showFilters)}
                                variant="outline"
                                className="border-slate-600 text-slate-300 gap-2"
                            >
                                <Filter className="w-4 h-4" />
                                Filter {activeFilters > 0 && `(${activeFilters})`}
                            </Button>
                        </div>
                    </div>

                    {/* Stats - Hidden on mobile */}
                    <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="p-4 bg-slate-800 border-slate-700">
                            <div className="text-2xl font-bold text-white">{shifts.length}</div>
                            <div className="text-sm text-slate-400">Schichten</div>
                        </Card>
                        <Card className="p-4 bg-slate-800 border-slate-700">
                            <div className="text-2xl font-bold text-white">{vacations.length}</div>
                            <div className="text-sm text-slate-400">Urlaube</div>
                        </Card>
                        <Card className="p-4 bg-slate-800 border-slate-700">
                            <div className="text-2xl font-bold text-white">{holidays.length}</div>
                            <div className="text-sm text-slate-400">Feiertage</div>
                        </Card>
                        <Card className="p-4 bg-slate-800 border-slate-700">
                            <div className="text-2xl font-bold text-white">{employees.length}</div>
                            <div className="text-sm text-slate-400">Mitarbeiter</div>
                        </Card>
                    </div>
                </div>

                {/* Filter Panel - Only on Desktop */}
                {showFilters && !isMobile && (
                    <Card className="p-6 bg-slate-800 border-slate-700 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Filter className="w-5 h-5 text-amber-400" />
                                Filter
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedEmployees([]);
                                    setSelectedRoles([]);
                                    setSearchQuery('');
                                }}
                                className="text-slate-400"
                            >
                                <X className="w-4 h-4 mr-1" />
                                Zurücksetzen
                            </Button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Role Filter */}
                            <div>
                                <h4 className="text-sm font-medium text-slate-300 mb-3">Nach Rolle filtern</h4>
                                <div className="space-y-2">
                                    {availableRoles.map(role => (
                                        <div key={role} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`role-${role}`}
                                                checked={selectedRoles.includes(role)}
                                                onCheckedChange={() => toggleRole(role)}
                                            />
                                            <label
                                                htmlFor={`role-${role}`}
                                                className="text-sm text-slate-300 cursor-pointer"
                                            >
                                                {role}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Employee Filter */}
                            <div>
                                <h4 className="text-sm font-medium text-slate-300 mb-3">Nach Mitarbeiter filtern</h4>
                                <Input
                                    placeholder="Mitarbeiter suchen..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="mb-3 bg-slate-900 border-slate-600 text-white"
                                />
                                <div className="max-h-[200px] overflow-y-auto space-y-2">
                                    {filteredEmployees.length > 0 ? (
                                        filteredEmployees.map(emp => (
                                            <div key={emp.id} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`emp-${emp.id}`}
                                                    checked={selectedEmployees.includes(emp.id)}
                                                    onCheckedChange={() => toggleEmployee(emp.id)}
                                                />
                                                <label
                                                    htmlFor={`emp-${emp.id}`}
                                                    className="text-sm text-slate-300 cursor-pointer flex items-center gap-2 flex-1"
                                                >
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: emp.color || '#64748b' }}
                                                    />
                                                    {emp.name}
                                                    <Badge variant="outline" className="text-xs ml-auto">
                                                        {emp.role}
                                                    </Badge>
                                                </label>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-slate-500 text-center py-4">
                                            Keine Mitarbeiter gefunden
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Active Filters */}
                        {activeFilters > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-700">
                                <div className="flex flex-wrap gap-2">
                                    {selectedRoles.map(role => (
                                        <Badge key={role} className="bg-amber-600 gap-1">
                                            {role}
                                            <X
                                                className="w-3 h-3 cursor-pointer hover:opacity-70"
                                                onClick={() => toggleRole(role)}
                                            />
                                        </Badge>
                                    ))}
                                    {selectedEmployees.map(empId => {
                                        const emp = employees.find(e => e.id === empId);
                                        return emp ? (
                                            <Badge key={empId} className="bg-blue-600 gap-1">
                                                {emp.name}
                                                <X
                                                    className="w-3 h-3 cursor-pointer hover:opacity-70"
                                                    onClick={() => toggleEmployee(empId)}
                                                />
                                            </Badge>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        )}
                    </Card>
                )}

                {/* Calendar */}
                {isMobile ? (
                    <MobileTeamCalendarView
                        shifts={shifts}
                        vacations={vacations}
                        holidays={holidays}
                        employees={employees}
                        onEventClick={handleEventClick}
                        selectedEmployees={selectedEmployees}
                    />
                ) : (
                    <TeamCalendarView
                        shifts={shifts}
                        vacations={vacations}
                        holidays={holidays}
                        employees={employees}
                        onEventClick={handleEventClick}
                        selectedEmployees={selectedEmployees}
                    />
                )}
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