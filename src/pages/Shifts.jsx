import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, Users, Filter, X, ExternalLink, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
import { usePermissions } from '@/components/auth/usePermissions';

export default function Shifts() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [filters, setFilters] = useState({
        employee: 'all',
        shiftType: 'all'
    });
    const [showFilters, setShowFilters] = useState(false);

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => base44.entities.Shift.list('-date', 200)
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
                (old || []).map(shift => shift.id === id ? { ...shift, ...data } : shift)
            );
            return { previous };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['shifts'], context.previous);
        },
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
            queryClient.setQueryData(['shifts'], (old) => 
                (old || []).filter(shift => shift.id !== id)
            );
            return { previous };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['shifts'], context.previous);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['shifts']);
            setModalOpen(false);
            setSelectedShift(null);
        }
    });

    const handleAddShift = (date) => {
        setSelectedShift(null);
        setSelectedDate(date);
        setModalOpen(true);
    };

    const handleSelectShift = (shift) => {
        setSelectedShift(shift);
        setSelectedDate(null);
        setModalOpen(true);
    };

    const handleSave = (data, id) => {
        if (id) {
            updateMutation.mutate({ id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (id) => {
        if (confirm('Schicht wirklich löschen?')) {
            deleteMutation.mutate(id);
        }
    };



    // Filter shifts
    const filteredShifts = shifts.filter(shift => {
        if (filters.employee !== 'all' && shift.employee_id !== filters.employee) return false;
        if (filters.shiftType !== 'all' && shift.shift_type !== filters.shiftType) return false;
        return true;
    });

    // Get shifts for selected date
    const selectedDateShifts = selectedDate 
        ? filteredShifts
            .filter(s => s.date === format(selectedDate, 'yyyy-MM-dd'))
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
        : [];

    const handleShiftMove = async (shiftId, newDate) => {
        const shift = shifts.find(s => s.id === shiftId);
        if (!shift) return;
        
        await updateMutation.mutateAsync({
            id: shiftId,
            data: { ...shift, date: format(newDate, 'yyyy-MM-dd') }
        });
    };

    const handleBackup = async () => {
        try {
            const { data } = await base44.functions.invoke('backupShifts');
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `schichten-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error('Backup fehlgeschlagen:', error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="flex flex-col gap-3 mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Schichtplan</h1>
                        <p className="text-slate-400 text-sm mt-1">Verwalte die Arbeitszeiten deines Teams</p>
                    </div>
                    <div className="flex gap-2 flex-wrap overflow-x-auto pb-2">
                        <Button
                            variant={showFilters ? "secondary" : "outline"}
                            onClick={() => setShowFilters(!showFilters)}
                            className="border-slate-600 text-slate-300"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Filter
                        </Button>
                        <ShiftSwapManager />
                        {permissions.isAdmin && <MonthlyStaffingCheck />}
                        {permissions.canEditShifts && <ShiftRequirementsManager />}
                        {permissions.canEditShifts && <OpeningHoursManager />}
                        <LiveSyncInstructions />
                        <CalendarExport shifts={shifts} reservations={reservations} />
                        {permissions.canEditShifts && (
                            <Button 
                                onClick={() => handleAddShift(new Date())}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Neue Schicht
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <Card className="p-4 bg-slate-800 border-slate-700 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <Filter className="w-4 h-4" />
                                Filter
                            </h3>
                            {(filters.employee !== 'all' || filters.shiftType !== 'all') && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setFilters({ employee: 'all', shiftType: 'all' })}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4 mr-1" />
                                    Zurücksetzen
                                </Button>
                            )}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-400 mb-2 block">Mitarbeiter</label>
                                <select
                                    value={filters.employee}
                                    onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-600"
                                >
                                    <option value="all">Alle Mitarbeiter</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 mb-2 block">Schichttyp</label>
                                <select
                                    value={filters.shiftType}
                                    onChange={(e) => setFilters({ ...filters, shiftType: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-600"
                                >
                                    <option value="all">Alle Schichttypen</option>
                                    <option value="Aufmachen">Aufmachen</option>
                                    <option value="Frühschicht">Frühschicht</option>
                                    <option value="Spätschicht">Spätschicht</option>
                                    <option value="Sonderschicht">Sonderschicht</option>
                                </select>
                            </div>
                        </div>
                        {(filters.employee !== 'all' || filters.shiftType !== 'all') && (
                            <div className="mt-4 text-sm text-slate-400">
                                {filteredShifts.length} Schicht{filteredShifts.length !== 1 ? 'en' : ''} gefunden
                            </div>
                        )}
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
                    <Card className="mt-6 p-5 bg-slate-800 border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white text-lg">
                                {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
                            </h3>
                            {permissions.canEditShifts && (
                                <Button 
                                    size="sm" 
                                    className="bg-amber-600 hover:bg-amber-700"
                                    onClick={() => handleAddShift(selectedDate)}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Schicht hinzufügen
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
                                            className={`flex items-center gap-3 p-3 rounded-lg bg-slate-900 transition-colors border border-slate-700 ${permissions.canEditShifts ? 'cursor-pointer hover:bg-slate-700 hover:border-amber-600' : 'cursor-default'}`}
                                        >
                                            <div 
                                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                                style={{ backgroundColor: employee?.color || '#64748b' }}
                                            >
                                                {shift.employee_name?.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-white truncate">{shift.employee_name}</p>
                                                    {shift.shift_type && (
                                                        <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30 text-[10px]">
                                                            {shift.shift_type}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-400 font-mono">
                                                    {shift.start_time} - {shift.end_time}
                                                </p>
                                                {shift.notes && (
                                                    <p className="text-xs text-slate-500 mt-1 italic truncate">
                                                        {shift.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-400">
                                <div className="w-16 h-16 rounded-full bg-slate-900/50 flex items-center justify-center mx-auto mb-3">
                                    <Users className="w-8 h-8 text-slate-600" />
                                </div>
                                <p className="text-base mb-2">Keine Schichten geplant</p>
                                <p className="text-sm text-slate-500">Klicke oben auf "Schicht hinzufügen"</p>
                            </div>
                        )}
                    </Card>
                )}

                {/* Modal */}
                <ShiftModal
                    open={modalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedShift(null);
                    }}
                    shift={selectedShift}
                    employees={employees}
                    selectedDate={selectedDate}
                    existingShifts={shifts}
                    onSave={handleSave}
                    onDelete={handleDelete}
                />
            </div>
        </div>
    );
}