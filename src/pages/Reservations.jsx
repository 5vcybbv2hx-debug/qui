import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isSameDay, startOfWeek, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, Calendar, Users, Phone, Mail, ChevronLeft, ChevronRight, Download, PartyPopper, Search } from 'lucide-react';
import SavedFilters from '@/components/filters/SavedFilters';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const [searchTerm, setSearchTerm] = useState('');
    const [guestFilter, setGuestFilter] = useState('alle');

    const { data: allReservations = [] } = useQuery({
        queryKey: ['reservations'],
        queryFn: () => base44.entities.Reservation.list('-date', 200)
    });

    const reservations = allReservations.filter(res => {
        const matchesSearch = res.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            res.phone?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGuests = guestFilter === 'alle' ||
            (guestFilter === 'klein' && res.guests <= 4) ||
            (guestFilter === 'mittel' && res.guests > 4 && res.guests <= 8) ||
            (guestFilter === 'gross' && res.guests > 8);
        return matchesSearch && matchesGuests;
    });

    const { data: events = [] } = useQuery({
        queryKey: ['events'],
        queryFn: () => base44.entities.Event.list('-date', 50)
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

    const selectedDateEvents = events.filter(e => 
        isSameDay(new Date(e.date), selectedDate) && e.status !== 'abgesagt'
    );

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
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Reservierungen</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {todayCount} Reservierung{todayCount !== 1 ? 'en' : ''} heute
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <LiveSyncInstructions />
                        <Button 
                            variant="outline"
                            onClick={handleExportCalendar}
                            disabled={allReservations.length === 0}
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

                {/* Filters */}
                <Card className="p-4 bg-slate-800 border-slate-700 mb-4">
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Name oder Telefon suchen..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-slate-900 border-slate-700"
                                />
                            </div>
                            <Select value={guestFilter} onValueChange={setGuestFilter}>
                                <SelectTrigger className="w-full sm:w-40 bg-slate-900 border-slate-700">
                                    <SelectValue placeholder="Gästezahl" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="alle">Alle Größen</SelectItem>
                                    <SelectItem value="klein">Klein (1-4)</SelectItem>
                                    <SelectItem value="mittel">Mittel (5-8)</SelectItem>
                                    <SelectItem value="gross">Groß (9+)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <SavedFilters
                            storageKey="reservations_saved_filters"
                            currentFilters={{ searchTerm, guestFilter, statusFilter }}
                            onApplyFilter={(filters) => {
                                setSearchTerm(filters.searchTerm || '');
                                setGuestFilter(filters.guestFilter || 'alle');
                                setStatusFilter(filters.statusFilter || 'alle');
                            }}
                        />
                    </div>
                </Card>

                {/* Week Calendar */}
                <Card className="p-4 mb-4 bg-slate-800 border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setWeekStart(addDays(weekStart, -7))}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <h3 className="font-medium text-white text-sm">
                            {format(weekStart, 'MMMM yyyy', { locale: de })}
                        </h3>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setWeekStart(addDays(weekStart, 7))}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {weekDays.map((day, idx) => {
                            const dayReservations = getReservationsForDay(day).filter(r => r.status !== 'storniert');
                            const isToday = isSameDay(day, new Date());
                            const isSelected = isSameDay(day, selectedDate);
                            
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDate(day)}
                                    className={cn(
                                        "p-2 rounded text-center transition-colors",
                                        isToday && "bg-amber-900/30",
                                        isSelected && "bg-slate-700",
                                        !isSelected && !isToday && "hover:bg-slate-700/50"
                                    )}
                                >
                                    <p className="text-xs text-slate-500 mb-1">
                                        {format(day, 'EEE', { locale: de })}
                                    </p>
                                    <p className={cn(
                                        "text-lg font-semibold",
                                        isSelected ? "text-white" : isToday ? "text-amber-400" : "text-slate-300"
                                    )}>
                                        {format(day, 'd')}
                                    </p>
                                    {dayReservations.length > 0 && (
                                        <div className="w-1 h-1 rounded-full bg-green-500 mx-auto mt-1" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </Card>

                {/* Selected Date Events */}
                {selectedDateEvents.length > 0 && (
                    <Card className="p-3 bg-purple-900/20 border-purple-800/30 mb-4">
                        <div className="flex items-center gap-2">
                            <PartyPopper className="w-4 h-4 text-purple-400" />
                            <p className="text-sm text-white flex-1">Event: {selectedDateEvents[0].title}</p>
                            <Link to={createPageUrl('Events')}>
                                <Button variant="ghost" size="sm" className="text-purple-400 h-7 text-xs">
                                    Details
                                </Button>
                            </Link>
                        </div>
                    </Card>
                )}

                {/* Selected Date Details */}
                <Card className="p-4 bg-slate-800 border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="font-medium text-white text-sm">
                                {format(selectedDate, "d. MMM", { locale: de })}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {selectedDateReservations.filter(r => r.status !== 'storniert').length} Reservierungen
                            </p>
                        </div>
                        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                            <TabsList className="bg-slate-900 h-8">
                                <TabsTrigger value="alle" className="text-xs h-7">Alle</TabsTrigger>
                                <TabsTrigger value="bestätigt" className="text-xs h-7">OK</TabsTrigger>
                                <TabsTrigger value="vorgemerkt" className="text-xs h-7">Offen</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {selectedDateReservations.length > 0 ? (
                        <div className="space-y-2">
                            {selectedDateReservations.map(res => (
                                <div
                                    key={res.id}
                                    onClick={() => {
                                        setSelectedReservation(res);
                                        setModalOpen(true);
                                    }}
                                    className="flex items-center gap-3 p-3 rounded bg-slate-900 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
                                >
                                    <div className="text-center min-w-[50px]">
                                        <p className="text-lg font-semibold text-white">{res.time}</p>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-white text-sm">{res.customer_name}</p>
                                        <p className="text-xs text-slate-400">
                                            {res.guests} Pers.
                                            {res.table && ` · Tisch ${res.table}`}
                                        </p>
                                    </div>
                                    <Badge className={cn("text-xs", statusColors[res.status])}>
                                        {res.status === 'bestätigt' ? '✓' : res.status === 'vorgemerkt' ? '?' : 'X'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Keine Reservierungen</p>
                            {permissions.canEditReservations && (
                                <Button 
                                    variant="link" 
                                    size="sm" 
                                    className="mt-1 text-xs"
                                    onClick={() => {
                                        setSelectedReservation(null);
                                        setModalOpen(true);
                                    }}
                                >
                                    Hinzufügen
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