import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Music, Users, Trash2, Edit } from 'lucide-react';
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

    const { data: events = [] } = useQuery({
        queryKey: ['events'],
        queryFn: () => base44.entities.Event.list('date')
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
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

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Calendar */}
                    <div className="lg:col-span-2">
                        <Card className="p-6 bg-slate-800 border-slate-700 shadow-sm">
                            {/* Month Navigation */}
                            <div className="flex items-center justify-between mb-6">
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                                <h2 className="text-xl font-semibold text-white">
                                    {format(currentMonth, 'MMMM yyyy', { locale: de })}
                                </h2>
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 gap-2 mb-2">
                                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                                    <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-2">
                                {calendarDays.map((day, idx) => {
                                    const dayEvents = getEventsForDay(day);
                                    const isToday = isSameDay(day, new Date());
                                    const isCurrentMonth = isSameMonth(day, currentMonth);
                                    const isSelected = selectedDate && isSameDay(day, selectedDate);

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedDate(day)}
                                            className={cn(
                                                "min-h-24 p-2 rounded-lg border-2 cursor-pointer transition-all",
                                                isToday && "border-amber-500",
                                                isSelected && "bg-slate-700 border-slate-600",
                                                !isToday && !isSelected && "border-slate-700 hover:border-slate-600",
                                                !isCurrentMonth && "opacity-30"
                                            )}
                                        >
                                            <div className={cn(
                                                "text-sm font-medium mb-1",
                                                isToday ? "text-amber-500" : "text-slate-300"
                                            )}>
                                                {format(day, 'd')}
                                            </div>
                                            <div className="space-y-1">
                                                {dayEvents.slice(0, 2).map(event => (
                                                    <div
                                                        key={event.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openModal(event);
                                                        }}
                                                        className={cn(
                                                            "text-[10px] px-1.5 py-0.5 rounded border truncate font-medium",
                                                            eventTypeColors[event.event_type]
                                                        )}
                                                    >
                                                        {event.title}
                                                    </div>
                                                ))}
                                                {dayEvents.length > 2 && (
                                                    <div className="text-[9px] text-slate-400 text-center">
                                                        +{dayEvents.length - 2}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>

                    {/* Selected Day Events */}
                    <div className="space-y-4">
                        <Card className="p-4 bg-slate-800 border-slate-700 shadow-sm">
                            <h3 className="font-semibold text-white mb-3">
                                {selectedDate ? format(selectedDate, 'dd. MMMM yyyy', { locale: de }) : 'Wähle ein Datum'}
                            </h3>
                            
                            {selectedDayEvents.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedDayEvents.map(event => (
                                        <Card key={event.id} className="p-3 bg-slate-900 border-slate-700">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-white text-sm mb-1">
                                                        {event.title}
                                                    </h4>
                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                        <Badge className={cn("text-xs", eventTypeColors[event.event_type])}>
                                                            {event.event_type}
                                                        </Badge>
                                                        <Badge className={cn("text-xs", statusColors[event.status])}>
                                                            {event.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openModal(event)}
                                                        className="h-7 w-7"
                                                    >
                                                        <Edit className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(event.id)}
                                                        className="h-7 w-7 text-red-500"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            
                                            {event.start_time && (
                                                <p className="text-xs text-slate-600 mb-1">
                                                    🕐 {event.start_time} {event.end_time && `- ${event.end_time}`}
                                                </p>
                                            )}
                                            {event.expected_guests && (
                                                <p className="text-xs text-slate-600 mb-1">
                                                    <Users className="w-3 h-3 inline mr-1" />
                                                    {event.expected_guests} Gäste erwartet
                                                </p>
                                            )}
                                            {event.description && (
                                                <p className="text-xs text-slate-500 mt-2">
                                                    {event.description}
                                                </p>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            ) : selectedDate ? (
                                <div className="text-center py-8 text-slate-400">
                                    <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Keine Events</p>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => openModal(null, selectedDate)}
                                        className="mt-2"
                                    >
                                        Event hinzufügen
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 text-center py-8">
                                    Wähle ein Datum im Kalender
                                </p>
                            )}
                        </Card>

                        {/* Quick Stats */}
                        <Card className="p-4 bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-slate-700">
                            <h4 className="font-semibold text-white text-sm mb-3">Events diesen Monat</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-300">Geplant</span>
                                    <span className="font-semibold text-yellow-700">
                                        {events.filter(e => e.status === 'geplant' && isSameMonth(new Date(e.date), currentMonth)).length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-300">Bestätigt</span>
                                    <span className="font-semibold text-green-700">
                                        {events.filter(e => e.status === 'bestätigt' && isSameMonth(new Date(e.date), currentMonth)).length}
                                    </span>
                                </div>
                            </div>
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