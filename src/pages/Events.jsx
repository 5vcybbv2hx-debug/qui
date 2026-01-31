import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Music, Users, Trash2, Edit, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import SavedFilters from '@/components/filters/SavedFilters';

const eventTypeColors = {
    'Party': 'bg-purple-100 text-purple-700 border-purple-200',
    'Livemusik': 'bg-pink-100 text-pink-700 border-pink-200',
    'DJ-Night': 'bg-blue-100 text-blue-700 border-blue-200',
    'Special Event': 'bg-amber-100 text-amber-700 border-amber-200',
    'Private Feier': 'bg-green-100 text-green-700 border-green-200',
    'Sonstiges': 'bg-slate-100 text-slate-700 border-slate-200'
};

const statusColors = {
    'geplant': 'bg-yellow-100 text-yellow-700',
    'bestätigt': 'bg-green-100 text-green-700',
    'abgesagt': 'bg-red-100 text-red-700'
};

export default function Events() {
    const queryClient = useQueryClient();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('alle');
    const [statusFilter, setStatusFilter] = useState('alle');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        start_time: '',
        end_time: '',
        event_type: 'Party',
        expected_guests: '',
        notes: '',
        status: 'geplant'
    });

    const { data: allEvents = [] } = useQuery({
        queryKey: ['events'],
        queryFn: () => base44.entities.Event.list('date')
    });

    const events = allEvents.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'alle' || event.event_type === typeFilter;
        const matchesStatus = statusFilter === 'alle' || event.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Event.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['events']);
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['events']);
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Event.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['events']);
        }
    });

    const openModal = (event = null, date = null) => {
        if (event) {
            setSelectedEvent(event);
            setFormData({
                title: event.title,
                description: event.description || '',
                date: event.date,
                start_time: event.start_time || '',
                end_time: event.end_time || '',
                event_type: event.event_type || 'Party',
                expected_guests: event.expected_guests || '',
                notes: event.notes || '',
                status: event.status || 'geplant'
            });
        } else {
            setSelectedEvent(null);
            setFormData({
                title: '',
                description: '',
                date: date ? format(date, 'yyyy-MM-dd') : '',
                start_time: '20:00',
                end_time: '02:00',
                event_type: 'Party',
                expected_guests: '',
                notes: '',
                status: 'geplant'
            });
        }
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedEvent(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedEvent) {
            updateMutation.mutate({ id: selectedEvent.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id) => {
        if (confirm('Event wirklich löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    // Calendar generation
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const getEventsForDay = (day) => {
        return events.filter(event => isSameDay(new Date(event.date), day));
    };

    const selectedDayEvents = selectedDate 
        ? events.filter(e => isSameDay(new Date(e.date), selectedDate)).sort((a, b) => {
            if (!a.start_time) return 1;
            if (!b.start_time) return -1;
            return a.start_time.localeCompare(b.start_time);
        })
        : [];

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Events</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {events.length} Event{events.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <Button 
                        onClick={() => openModal()}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Event hinzufügen
                    </Button>
                </div>

                {/* Filters */}
                <Card className="p-4 bg-slate-800 border-slate-700 mb-6">
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Event suchen..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-slate-900 border-slate-700"
                                />
                            </div>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-full sm:w-40 bg-slate-900 border-slate-700">
                                    <SelectValue placeholder="Typ" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="alle">Alle Typen</SelectItem>
                                    <SelectItem value="Party">Party</SelectItem>
                                    <SelectItem value="Livemusik">Livemusik</SelectItem>
                                    <SelectItem value="Special Event">Special Event</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-40 bg-slate-900 border-slate-700">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="alle">Alle Status</SelectItem>
                                    <SelectItem value="geplant">Geplant</SelectItem>
                                    <SelectItem value="bestätigt">Bestätigt</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <SavedFilters
                            storageKey="events_saved_filters"
                            currentFilters={{ searchTerm, typeFilter, statusFilter }}
                            onApplyFilter={(filters) => {
                                setSearchTerm(filters.searchTerm || '');
                                setTypeFilter(filters.typeFilter || 'alle');
                                setStatusFilter(filters.statusFilter || 'alle');
                            }}
                        />
                    </div>
                </Card>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Calendar */}
                    <div className="lg:col-span-2">
                        <Card className="p-4 bg-slate-800 border-slate-700">
                            {/* Month Navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <h2 className="text-lg font-semibold text-white">
                                    {format(currentMonth, 'MMMM yyyy', { locale: de })}
                                </h2>
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                                    <div key={day} className="text-center text-xs text-slate-500 py-1">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((day, idx) => {
                                    const dayEvents = getEventsForDay(day);
                                    const isToday = isSameDay(day, new Date());
                                    const isCurrentMonth = isSameMonth(day, currentMonth);
                                    const isSelected = selectedDate && isSameDay(day, selectedDate);

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedDate(day)}
                                            className={cn(
                                                "min-h-16 p-1 rounded text-left transition-colors",
                                                isToday && "bg-amber-900/30",
                                                isSelected && "bg-slate-700",
                                                !isToday && !isSelected && "hover:bg-slate-700/50",
                                                !isCurrentMonth && "opacity-30"
                                            )}
                                        >
                                            <div className={cn(
                                                "text-xs mb-1",
                                                isToday ? "text-amber-400 font-semibold" : "text-slate-400"
                                            )}>
                                                {format(day, 'd')}
                                            </div>
                                            {dayEvents.length > 0 && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>

                    {/* Selected Day Events */}
                    <div>
                        <Card className="p-4 bg-slate-800 border-slate-700">
                            <h3 className="font-medium text-white mb-3 text-sm">
                                {selectedDate ? format(selectedDate, 'dd. MMM yyyy', { locale: de }) : 'Datum wählen'}
                            </h3>
                            
                            {selectedDayEvents.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedDayEvents.map(event => (
                                        <div key={event.id} 
                                            onClick={() => openModal(event)}
                                            className="p-3 bg-slate-900 rounded border border-slate-700 hover:border-slate-600 cursor-pointer"
                                        >
                                            <div className="flex items-start justify-between mb-1">
                                                <p className="font-medium text-white text-sm">{event.title}</p>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(event.id);
                                                    }}
                                                    className="h-6 w-6 text-slate-400 hover:text-red-400"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                {event.start_time || 'Keine Zeit'}
                                                {event.expected_guests && ` · ${event.expected_guests} Gäste`}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : selectedDate ? (
                                <div className="text-center py-6 text-slate-500">
                                    <p className="text-sm">Keine Events</p>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => openModal(null, selectedDate)}
                                        className="mt-1 text-xs"
                                    >
                                        Hinzufügen
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 text-center py-6">
                                    Datum wählen
                                </p>
                            )}
                        </Card>
                    </div>
                </div>

                {/* Modal */}
                <Dialog open={modalOpen} onOpenChange={closeModal}>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedEvent ? 'Event bearbeiten' : 'Neues Event'}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Titel *</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="z.B. 80s Party Night"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Beschreibung</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Details zum Event..."
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Event-Art</Label>
                                    <Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Party">Party</SelectItem>
                                            <SelectItem value="Livemusik">Livemusik</SelectItem>
                                            <SelectItem value="DJ-Night">DJ-Night</SelectItem>
                                            <SelectItem value="Special Event">Special Event</SelectItem>
                                            <SelectItem value="Private Feier">Private Feier</SelectItem>
                                            <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="geplant">Geplant</SelectItem>
                                            <SelectItem value="bestätigt">Bestätigt</SelectItem>
                                            <SelectItem value="abgesagt">Abgesagt</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Datum *</Label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Startzeit</Label>
                                    <Input
                                        type="time"
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Endzeit</Label>
                                    <Input
                                        type="time"
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Erwartete Gästeanzahl</Label>
                                <Input
                                    type="number"
                                    value={formData.expected_guests}
                                    onChange={(e) => setFormData({ ...formData, expected_guests: e.target.value })}
                                    placeholder="z.B. 150"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Notizen</Label>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Zusätzliche Infos..."
                                    rows={2}
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                                    Abbrechen
                                </Button>
                                <Button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-900">
                                    {selectedEvent ? 'Speichern' : 'Hinzufügen'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}