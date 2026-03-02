import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, Calendar, Users, Phone, Download, Search, Edit, Trash2, Archive, RepeatIcon } from 'lucide-react';
import SavedFilters from '@/components/filters/SavedFilters';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    const [statusFilter, setStatusFilter] = useState('alle');
    const [searchTerm, setSearchTerm] = useState('');
    const [guestFilter, setGuestFilter] = useState('alle');
    const [showArchived, setShowArchived] = useState(false);

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
        const matchesStatus = statusFilter === 'alle' || res.status === statusFilter;
        const matchesArchived = showArchived || !res.is_archived;
        return matchesSearch && matchesGuests && matchesStatus && matchesArchived;
    });

    const sortedReservations = [...reservations].sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '').localeCompare(b.time || '');
    });



    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Reservation.create(data),
        onSuccess: (newReservation) => {
            queryClient.setQueryData(['reservations'], (old) => 
                old ? [...old, newReservation] : [newReservation]
            );
            queryClient.invalidateQueries(['reservations']);
            setModalOpen(false);
            setSelectedReservation(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Reservation.update(id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries(['reservations']);
            const previous = queryClient.getQueryData(['reservations']);
            queryClient.setQueryData(['reservations'], (old) => 
                old.map(res => res.id === id ? { ...res, ...data } : res)
            );
            return { previous };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['reservations'], context.previous);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['reservations']);
            setModalOpen(false);
            setSelectedReservation(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Reservation.delete(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries(['reservations']);
            const previous = queryClient.getQueryData(['reservations']);
            queryClient.setQueryData(['reservations'], (old) => 
                old.filter(res => res.id !== id)
            );
            return { previous };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['reservations'], context.previous);
        },
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
        if (!permissions.canDeleteReservations) {
            alert('Nur Manager können Reservierungen löschen.');
            return;
        }
        if (confirm('Reservierung wirklich löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleArchive = (id, currentArchiveStatus) => {
        updateMutation.mutate({ 
            id, 
            data: { is_archived: !currentArchiveStatus } 
        });
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

    const statusColors = {
        'vorgemerkt': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'bestätigt': 'bg-green-100 text-green-700 border-green-200',
        'storniert': 'bg-slate-100 text-slate-500 border-slate-200'
    };

    if (!permissions.canViewReservations) {
        return <PermissionDenied message="Du hast keine Berechtigung, Reservierungen zu sehen." />;
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Reservierungen</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {reservations.length} Reservierung{reservations.length !== 1 ? 'en' : ''}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <LiveSyncInstructions />
                        <Button 
                            variant="outline"
                            onClick={handleExportCalendar}
                            disabled={allReservations.length === 0}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
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
                                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 shadow-lg shadow-amber-500/20"
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
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-40 bg-slate-900 border-slate-700">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="alle">Alle Status</SelectItem>
                                    <SelectItem value="bestätigt">Bestätigt</SelectItem>
                                    <SelectItem value="vorgemerkt">Vorgemerkt</SelectItem>
                                    <SelectItem value="storniert">Storniert</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="showArchived"
                                    checked={showArchived}
                                    onChange={(e) => setShowArchived(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-700"
                                />
                                <Label htmlFor="showArchived" className="text-sm text-slate-300 cursor-pointer">
                                    Archivierte anzeigen
                                </Label>
                            </div>
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

                {/* Reservations List */}
                {sortedReservations.length > 0 ? (
                    <div className="space-y-3">
                        {sortedReservations.map(res => (
                            <Card 
                                key={res.id}
                                className="p-5 bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Calendar className="w-5 h-5 text-amber-400" />
                                            <h3 className="font-semibold text-white text-lg">{res.customer_name}</h3>
                                            <Badge className={statusColors[res.status]}>
                                                {res.status}
                                            </Badge>
                                            {res.is_recurring && (
                                                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                                    <RepeatIcon className="w-3 h-3 mr-1" />
                                                    Wiederkehrend
                                                </Badge>
                                            )}
                                            {res.is_archived && (
                                                <Badge className="bg-slate-200 text-slate-600">
                                                    Archiviert
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-4 text-sm mb-2">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                <span>{format(parseISO(res.date), 'dd. MMMM yyyy', { locale: de })}</span>
                                            </div>
                                            
                                            {res.time && (
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <span>🕐</span>
                                                    <span>{res.time} Uhr</span>
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <Users className="w-4 h-4 text-slate-400" />
                                                <span>{res.guests} Person{res.guests !== 1 ? 'en' : ''}</span>
                                            </div>

                                            {res.table && (
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <span>📍</span>
                                                    <span>Tisch {res.table}</span>
                                                </div>
                                            )}
                                        </div>

                                        {res.phone && (
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <Phone className="w-3 h-3" />
                                                <span>{res.phone}</span>
                                            </div>
                                        )}
                                        
                                        {res.notes && (
                                            <p className="text-xs text-slate-500 mt-2 italic">{res.notes}</p>
                                        )}
                                    </div>
                                    
                                    <div className="flex gap-1">
                                        {permissions.canEditReservations && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setSelectedReservation(res);
                                                        setModalOpen(true);
                                                    }}
                                                    className="h-8 w-8 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleArchive(res.id, res.is_archived)}
                                                    className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                                                    title={res.is_archived ? 'Wiederherstellen' : 'Archivieren'}
                                                >
                                                    <Archive className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                        {permissions.canDeleteReservations && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(res.id)}
                                                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="p-12 bg-slate-800 border-slate-700">
                        <div className="text-center text-slate-400">
                            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Keine Reservierungen gefunden</p>
                            <p className="text-sm mt-1">
                                {searchTerm || guestFilter !== 'alle' || statusFilter !== 'alle'
                                    ? 'Versuche andere Filter' 
                                    : 'Füge die erste Reservierung hinzu'}
                            </p>
                        </div>
                    </Card>
                )}

                {/* Modal */}
                <ReservationModal
                    open={modalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedReservation(null);
                    }}
                    reservation={selectedReservation}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    canDelete={permissions.canDeleteReservations}
                />
            </div>
        </div>
    );
}