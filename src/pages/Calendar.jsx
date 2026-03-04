import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    CalendarDays, Users, Plus, Download, Filter, X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ShiftCalendar from '@/components/shifts/ShiftCalendar';
import ShiftModal from '@/components/shifts/ShiftModal';
import CalendarExport from '@/components/shifts/CalendarExport';
import LiveSyncInstructions from '@/components/calendar/LiveSyncInstructions';
import OpeningHoursManager from '@/components/shifts/OpeningHoursManager';
import ShiftRequirementsManager from '@/components/shifts/ShiftRequirementsManager';
import ShiftSwapManager from '@/components/shifts/ShiftSwapManager';
import MonthlyStaffingCheck from '@/components/shifts/MonthlyStaffingCheck';
import TeamCalendarExport from '@/components/calendar/TeamCalendarExport';
import EventDetailsModal from '@/components/calendar/EventDetailsModal';
import ShiftSwapRequestModal from '@/components/shifts/ShiftSwapRequestModal';
import UnifiedCalendarView from '@/components/calendar/UnifiedCalendarView';
import DayDetailModal from '@/components/calendar/DayDetailModal';
import { getHolidaysBW } from '@/components/shifts/getHolidays';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';

const VIEWS = [
    { id: 'schichtplan', label: 'Schichtplan', icon: CalendarDays },
    { id: 'team', label: 'Team-Übersicht', icon: Users },
];

export default function CalendarPage() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();

    const [view, setView] = useState('schichtplan');

    // Schichtplan state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [filters, setFilters] = useState({ employee: 'all', shiftType: 'all' });
    const [showFilters, setShowFilters] = useState(false);

    // Team-Ansicht state
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [shiftSwapData, setShiftSwapData] = useState(null);
    const [selectedDayDetail, setSelectedDayDetail] = useState(null);

    // --- Shared data ---
    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => base44.entities.Shift.list('-date', 1000)
    });

    const { data: reservations = [] } = useQuery({
        queryKey: ['reservations'],
        queryFn: () => base44.entities.Reservation.list('-date', 200)
    });

    const { data: requirements = [] } = useQuery({
        queryKey: ['shift-requirements'],
        queryFn: () => base44.entities.ShiftRequirement.list()
    });

    const { data: vacationRequests = [] } = useQuery({
        queryKey: ['vacation-requests'],
        queryFn: () => base44.entities.VacationRequest.list()
    });

    const approvedVacations = vacationRequests.filter(v => v.status === 'genehmigt');

    const currentYear = new Date().getFullYear();
    const holidays = [...getHolidaysBW(currentYear), ...getHolidaysBW(currentYear + 1)];

    // --- Mutations (Schichtplan) ---
    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Shift.create(data),
        onSuccess: (newShift) => {
            queryClient.setQueryData(['shifts'], (old) => [newShift, ...(old || [])]);
            queryClient.invalidateQueries(['shifts']);
            setModalOpen(false);
            setSelectedShift(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries(['shifts']);
            const previous = queryClient.getQueryData(['shifts']);
            queryClient.setQueryData(['shifts'], (old) =>
                (old || []).map(s => s.id === id ? { ...s, ...data } : s)
            );
            return { previous };
        },
        onError: (err, vars, context) => queryClient.setQueryData(['shifts'], context.previous),
        onSuccess: () => {
            queryClient.invalidateQueries(['shifts']);
            setModalOpen(false);
            setSelectedShift(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Shift.delete(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries(['shifts']);
            const previous = queryClient.getQueryData(['shifts']);
            queryClient.setQueryData(['shifts'], (old) => (old || []).filter(s => s.id !== id));
            return { previous };
        },
        onError: (err, vars, context) => queryClient.setQueryData(['shifts'], context.previous),
        onSuccess: () => {
            queryClient.invalidateQueries(['shifts']);
            setModalOpen(false);
            setSelectedShift(null);
        }
    });

    if (!permissions.canViewShifts) {
        return <PermissionDenied message="Du hast keine Berechtigung für den Kalender." />;
    }

    // --- Handlers ---
    const handleAddShift = (date) => { setSelectedShift(null); setSelectedDate(date); setModalOpen(true); };
    const handleSelectShift = (shift) => { setSelectedShift(shift); setSelectedDate(null); setModalOpen(true); };
    const handleSave = (data, id) => id ? updateMutation.mutate({ id, data }) : createMutation.mutate(data);
    const handleDelete = (id) => { if (confirm('Schicht wirklich löschen?')) deleteMutation.mutate(id); };
    const handleShiftMove = async (shiftId, newDate) => {
        const shift = shifts.find(s => s.id === shiftId);
        if (!shift) return;
        await updateMutation.mutateAsync({ id: shiftId, data: { ...shift, date: format(newDate, 'yyyy-MM-dd') } });
    };
    const handleBackup = async () => {
        const { data } = await base44.functions.invoke('backupShifts');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `schichten-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); a.remove();
    };
    const handleEventClick = (event) => { setSelectedEvent(event); setShowEventModal(true); };

    const filteredShifts = shifts.filter(shift => {
        if (filters.employee !== 'all' && shift.employee_id !== filters.employee) return false;
        if (filters.shiftType !== 'all' && shift.shift_type !== filters.shiftType) return false;
        return true;
    });

    const selectedDateShifts = selectedDate
        ? filteredShifts
            .filter(s => s.date === format(selectedDate, 'yyyy-MM-dd'))
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
        : [];

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Kalender</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">Schichtplan & Team-Übersicht</p>
                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-card border border-border rounded-lg p-1 gap-1">
                        {VIEWS.map(v => (
                            <button
                                key={v.id}
                                onClick={() => setView(v.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    view === v.id
                                        ? 'bg-amber-600 text-white shadow'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <v.icon className="w-4 h-4" />
                                {v.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ======================== SCHICHTPLAN ======================== */}
                {view === 'schichtplan' && (
                    <>
                        {/* Toolbar */}
                        <div className="flex gap-2 flex-wrap mb-6">
                            <Button
                                variant={showFilters ? "secondary" : "outline"}
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <Filter className="w-4 h-4 mr-2" />
                                Filter
                            </Button>
                            <ShiftSwapManager />
                            {permissions.isAdmin && <MonthlyStaffingCheck />}
                            {permissions.canEditShifts && <ShiftRequirementsManager />}
                            {permissions.canEditShifts && <OpeningHoursManager />}
                            <Button variant="outline" onClick={handleBackup} title="Backup als JSON">
                                <Download className="w-4 h-4 mr-2" />
                                Sicherung
                            </Button>
                            <LiveSyncInstructions />
                            <CalendarExport shifts={shifts} reservations={reservations} />
                            {permissions.canEditShifts && (
                                <Button onClick={() => handleAddShift(new Date())} className="bg-amber-600 hover:bg-amber-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Neue Schicht
                                </Button>
                            )}
                        </div>

                        {/* Filter Panel */}
                        {showFilters && (
                            <Card className="p-4 mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Filter className="w-4 h-4" /> Filter
                                    </h3>
                                    {(filters.employee !== 'all' || filters.shiftType !== 'all') && (
                                        <Button variant="ghost" size="sm" onClick={() => setFilters({ employee: 'all', shiftType: 'all' })}>
                                            <X className="w-4 h-4 mr-1" /> Zurücksetzen
                                        </Button>
                                    )}
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-muted-foreground mb-2 block">Mitarbeiter</label>
                                        <select
                                            value={filters.employee}
                                            onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                        >
                                            <option value="all">Alle Mitarbeiter</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground mb-2 block">Schichttyp</label>
                                        <select
                                            value={filters.shiftType}
                                            onChange={(e) => setFilters({ ...filters, shiftType: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                        >
                                            <option value="all">Alle Schichttypen</option>
                                            <option value="Aufmachen">Aufmachen</option>
                                            <option value="Frühschicht">Frühschicht</option>
                                            <option value="Spätschicht">Spätschicht</option>
                                            <option value="Sonderschicht">Sonderschicht</option>
                                        </select>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Calendar */}
                        <ShiftCalendar
                            shifts={filteredShifts}
                            allShifts={shifts}
                            employees={employees}
                            requirements={requirements}
                            vacationRequests={vacationRequests}
                            onAddShift={handleAddShift}
                            onSelectShift={handleSelectShift}
                            onShiftMove={handleShiftMove}
                            selectedDate={selectedDate}
                            setSelectedDate={setSelectedDate}
                        />

                        {/* Selected Date Details */}
                        {selectedDate && (
                            <Card className="mt-6 p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-lg">
                                        {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
                                    </h3>
                                    {permissions.canEditShifts && (
                                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => handleAddShift(selectedDate)}>
                                            <Plus className="w-4 h-4 mr-2" /> Schicht hinzufügen
                                        </Button>
                                    )}
                                </div>
                                {selectedDateShifts.length > 0 ? (
                                    <div className="grid gap-2">
                                        {selectedDateShifts.map(shift => {
                                            const employee = employees.find(e => e.id === shift.employee_id);
                                            return (
                                                <div
                                                    key={shift.id}
                                                    onClick={() => permissions.canEditShifts && handleSelectShift(shift)}
                                                    className={`flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border transition-colors ${permissions.canEditShifts ? 'cursor-pointer hover:border-amber-600' : 'cursor-default'}`}
                                                >
                                                    <div
                                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                                        style={{ backgroundColor: employee?.color || '#64748b' }}
                                                    >
                                                        {shift.employee_name?.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold truncate">{shift.employee_name}</p>
                                                            {shift.shift_type && (
                                                                <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30 text-[10px]">
                                                                    {shift.shift_type}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground font-mono">{shift.start_time} - {shift.end_time}</p>
                                                        {shift.notes && <p className="text-xs text-muted-foreground mt-1 italic truncate">{shift.notes}</p>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                        <p>Keine Schichten geplant</p>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Shift Modal */}
                        <ShiftModal
                            open={modalOpen}
                            onClose={() => { setModalOpen(false); setSelectedShift(null); }}
                            shift={selectedShift}
                            employees={employees}
                            selectedDate={selectedDate}
                            existingShifts={shifts}
                            onSave={handleSave}
                            onDelete={handleDelete}
                        />
                    </>
                )}

                {/* ======================== TEAM-ÜBERSICHT ======================== */}
                {view === 'team' && (
                    <>
                        {/* Stats + Export */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            <Card className="p-4">
                                <div className="text-2xl font-bold">{shifts.length}</div>
                                <div className="text-sm text-muted-foreground">Schichten</div>
                            </Card>
                            <Card className="p-4">
                                <div className="text-2xl font-bold">{approvedVacations.length}</div>
                                <div className="text-sm text-muted-foreground">Urlaube</div>
                            </Card>
                            <Card className="p-4">
                                <div className="text-2xl font-bold">{holidays.length}</div>
                                <div className="text-sm text-muted-foreground">Feiertage</div>
                            </Card>
                            <Card className="p-4 flex flex-col justify-between">
                                <div className="text-2xl font-bold">{employees.length}</div>
                                <div className="text-sm text-muted-foreground">Mitarbeiter</div>
                            </Card>
                        </div>

                        <div className="flex justify-end mb-4">
                            <TeamCalendarExport
                                shifts={shifts}
                                vacations={approvedVacations}
                                holidays={holidays}
                                employees={employees}
                            />
                        </div>

                        <UnifiedCalendarView
                            shifts={shifts}
                            vacations={approvedVacations}
                            holidays={holidays}
                            employees={employees}
                            onEventClick={handleEventClick}
                            selectedEmployees={selectedEmployees}
                            onEmployeeToggle={setSelectedEmployees}
                            onRoleToggle={setSelectedRoles}
                            selectedRoles={selectedRoles}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                        />

                        {/* Event Modal */}
                        <EventDetailsModal
                            event={selectedEvent}
                            open={showEventModal}
                            onClose={() => { setShowEventModal(false); setSelectedEvent(null); }}
                            onShiftSwap={(shift) => setShiftSwapData(shift)}
                        />

                        {shiftSwapData && (
                            <ShiftSwapRequestModal
                                shift={shiftSwapData}
                                open={!!shiftSwapData}
                                onClose={() => setShiftSwapData(null)}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}