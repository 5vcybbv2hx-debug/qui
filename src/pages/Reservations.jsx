import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tantml/react-query';
import { format, isSameDay, startOfWeek, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, Calendar, Users, Phone, Mail, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import ReservationModal from '@/components/reservations/ReservationModal';
import LiveSyncInstructions from '@/components/calendar/LiveSyncInstructions';

export default function Reservations() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [statusFilter, setStatusFilter] = useState('alle');

    const { data: reservations = [] } = useQuery({
        queryKey: ['reservations'],
        queryFn: () => base44.entities.Reservation.list('-date', 200)
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Reservation.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['reservations']);
            setModalOpen(false);
            setSelectedReservation(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Reservation.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['reservations']);
            setModalOpen(false);
            setSelectedReservation(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Reservation.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['reservations']);
            setModalOpen(false);
            setSelectedReservation(null);
        }
    });

    const handleSave = (data, id) => {
        if (id) {
            updateMutation.mutate({ id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (id) => {
        if (confirm('Reservierung wirklich löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleExportCalendar = () => {
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Bar Manager//Reservierungen//DE',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Bar Reservierungen',
            'X-WR-TIMEZONE:Europe/Berlin'
        ];

        reservations.forEach(res => {
            if (res.status === 'storniert') return;
            
            const date = res.date.replace(/-/g, '');
            const time = res.time.replace(':', '') + '00';
            const endTime = (parseInt(res.time.split(':')[0]) + 2).toString().padStart(2, '0') + res.time.split(':')[1] + '00';

            lines.push('BEGIN:VEVENT');
            lines.push(`UID:res-${res.id}@barmanager.app`);
            lines.push(`DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`);
            lines.push(`DTSTART:${date}T${time}`);
            lines.push(`DTEND:${date}T${endTime}`);
            lines.push(`SUMMARY:Reservierung: ${res.customer_name} (${res.guests} Pers.)`);
            let desc = `${res.guests} Personen`;
            if (res.table) desc += ` - Tisch ${res.table}`;
            if (res.phone) desc += `\\nTel: ${res.phone}`;
            if (res.notes) desc += `\\n${res.notes}`;
            lines.push(`DESCRIPTION:${desc}`);
            lines.push('STATUS:CONFIRMED');
            lines.push('END:VEVENT');
        });

        lines.push('END:VCALENDAR');
        
        const icsContent = lines.join('\r\n');
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `reservierungen-${format(new Date(), 'yyyy-MM-dd')}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    
    const getReservationsForDay = (date) => {
        return reservations.filter(res => {
            const matchesDate = isSameDay(new Date(res.date), date);
            if (statusFilter === 'alle') return matchesDate;
            return matchesDate && res.status === statusFilter;
        });
    };

    const selectedDateReservations = getReservationsForDay(selectedDate)
        .sort((a, b) => a.time.localeCompare(b.time));

    const statusColors = {
        'vorgemerkt': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'bestätigt': 'bg-green-100 text-green-700 border-green-200',
        'storniert': 'bg-slate-100 text-slate-500 border-slate-200'
    };

    const todayCount = getReservationsForDay(new Date()).filter(r => r.status !== 'storniert').length;
    const totalGuests = selectedDateReservations
        .filter(r => r.status !== 'storniert')
        .reduce((sum, r) => sum + (r.guests || 0), 0);

    if (!permissions.canViewReservations) {
        return <PermissionDenied message="Du hast keine Berechtigung, Reservierungen zu sehen." />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Reservierungen</h1>
                        <p className="text-slate-500 text-sm mt-1">
                            {todayCount} Reservierung{todayCount !== 1 ? 'en' : ''} heute
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <LiveSyncInstructions />
                        <Button 
                            variant="outline"
                            onClick={handleExportCalendar}
                            disabled={reservations.length === 0}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Kalender
                        </Button>
                        {permissions.canEditReservations && (
                            <Button 
                                onClick={() => {
                                    setSelectedReservation(null);
                                    setModalOpen(true);
                                }}
                                className="bg-slate-800 hover:bg-slate-900"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Reservierung
                            </Button>
                        )}
                    </div>
                </div>

                {/* Week Calendar */}
                <Card className="p-6 mb-6 bg-white border-0 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setWeekStart(addDays(weekStart, -7))}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <h3 className="font-semibold text-slate-800">
                            {format(weekStart, 'MMMM yyyy', { locale: de })}
                        </h3>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setWeekStart(addDays(weekStart, 7))}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {weekDays.map((day, idx) => {
                            const dayReservations = getReservationsForDay(day).filter(r => r.status !== 'storniert');
                            const isToday = isSameDay(day, new Date());
                            const isSelected = isSameDay(day, selectedDate);
                            
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDate(day)}
                                    className={cn(
                                        "p-3 rounded-xl text-center transition-all",
                                        isToday && "bg-amber-50",
                                        isSelected && "bg-slate-800 text-white",
                                        !isSelected && !isToday && "hover:bg-slate-50"
                                    )}
                                >
                                    <p className="text-xs uppercase text-slate-400 mb-1">
                                        {format(day, 'EEE', { locale: de })}
                                    </p>
                                    <p className={cn(
                                        "text-xl font-semibold mb-1",
                                        isSelected ? "text-white" : isToday ? "text-amber-600" : "text-slate-700"
                                    )}>
                                        {format(day, 'd')}
                                    </p>
                                    {dayReservations.length > 0 && (
                                        <div className={cn(
                                            "text-xs font-medium mt-1",
                                            isSelected ? "text-white/80" : "text-slate-500"
                                        )}>
                                            {dayReservations.length} Res.
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </Card>

                {/* Selected Date Details */}
                <Card className="p-6 bg-white border-0 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-slate-800">
                                {format(selectedDate, "EEEE, d. MMMM", { locale: de })}
                            </h3>
                            <p className="text-sm text-slate-500 mt-0.5">
                                {selectedDateReservations.filter(r => r.status !== 'storniert').length} Reservierungen · {totalGuests} Gäste
                            </p>
                        </div>
                        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                            <TabsList className="bg-slate-100">
                                <TabsTrigger value="alle">Alle</TabsTrigger>
                                <TabsTrigger value="bestätigt">Bestätigt</TabsTrigger>
                                <TabsTrigger value="vorgemerkt">Vorgemerkt</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {selectedDateReservations.length > 0 ? (
                        <div className="space-y-3">
                            {selectedDateReservations.map(res => (
                                <div
                                    key={res.id}
                                    onClick={() => {
                                        setSelectedReservation(res);
                                        setModalOpen(true);
                                    }}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    <div className="text-center min-w-[60px]">
                                        <p className="text-2xl font-bold text-slate-800">{res.time}</p>
                                    </div>
                                    <div className="h-12 w-px bg-slate-200" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-semibold text-slate-800">{res.customer_name}</p>
                                            <Badge variant="outline" className={cn("text-xs", statusColors[res.status])}>
                                                {res.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {res.guests} {res.guests === 1 ? 'Person' : 'Personen'}
                                            </span>
                                            {res.table && <span>· Tisch {res.table}</span>}
                                            {res.phone && (
                                                <span className="flex items-center gap-1">
                                                    · <Phone className="w-3 h-3" /> {res.phone}
                                                </span>
                                            )}
                                        </div>
                                        {res.notes && (
                                            <p className="text-xs text-slate-400 mt-1 italic">"{res.notes}"</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-lg font-medium">Keine Reservierungen</p>
                            {permissions.canEditReservations && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-3"
                                    onClick={() => {
                                        setSelectedReservation(null);
                                        setModalOpen(true);
                                    }}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Reservierung hinzufügen
                                </Button>
                            )}
                        </div>
                    )}
                </Card>

                {/* Modal */}
                <ReservationModal
                    open={modalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedReservation(null);
                    }}
                    reservation={selectedReservation}
                    selectedDate={selectedDate}
                    onSave={handleSave}
                    onDelete={handleDelete}
                />
            </div>
        </div>
    );
}