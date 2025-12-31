import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ShiftCalendar from '@/components/shifts/ShiftCalendar';
import ShiftModal from '@/components/shifts/ShiftModal';
import CalendarExport from '@/components/shifts/CalendarExport';
import LiveSyncInstructions from '@/components/calendar/LiveSyncInstructions';

export default function Shifts() {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);

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

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Shift.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['shifts']);
            setModalOpen(false);
            setSelectedShift(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['shifts']);
            setModalOpen(false);
            setSelectedShift(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Shift.delete(id),
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

    // Get shifts for selected date
    const selectedDateShifts = selectedDate 
        ? shifts.filter(s => s.date === format(selectedDate, 'yyyy-MM-dd'))
        : [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Schichtplan</h1>
                        <p className="text-slate-500 text-sm mt-1">Verwalte die Arbeitszeiten deines Teams</p>
                    </div>
                    <div className="flex gap-2">
                        <LiveSyncInstructions />
                        <CalendarExport shifts={shifts} reservations={reservations} />
                        <Button 
                            onClick={() => handleAddShift(new Date())}
                            className="bg-slate-800 hover:bg-slate-900"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Neue Schicht
                        </Button>
                    </div>
                </div>

                {/* Calendar */}
                <ShiftCalendar 
                    shifts={shifts}
                    employees={employees}
                    onAddShift={handleAddShift}
                    onSelectShift={handleSelectShift}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                />

                {/* Selected Date Details */}
                {selectedDate && (
                    <Card className="mt-6 p-6 bg-white border-0 shadow-sm">
                        <h3 className="font-semibold text-slate-800 mb-4">
                            {format(selectedDate, "EEEE, d. MMMM", { locale: de })}
                        </h3>
                        
                        {selectedDateShifts.length > 0 ? (
                            <div className="grid gap-3">
                                {selectedDateShifts.map(shift => (
                                    <div 
                                        key={shift.id}
                                        onClick={() => handleSelectShift(shift)}
                                        className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                                    >
                                        <div 
                                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                                            style={{ backgroundColor: shift.color || '#64748b' }}
                                        >
                                            {shift.employee_name?.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-800">{shift.employee_name}</p>
                                            <p className="text-sm text-slate-500">
                                                {shift.start_time} - {shift.end_time} · {shift.shift_type}
                                            </p>
                                        </div>
                                        {shift.notes && (
                                            <p className="text-sm text-slate-400 italic hidden md:block">
                                                "{shift.notes}"
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p>Keine Schichten an diesem Tag</p>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-3"
                                    onClick={() => handleAddShift(selectedDate)}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Schicht hinzufügen
                                </Button>
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
                    onSave={handleSave}
                    onDelete={handleDelete}
                />
            </div>
        </div>
    );
}