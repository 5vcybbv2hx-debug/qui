import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, Pencil, Trash2, Calendar, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export default function OpeningHoursManager() {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingHour, setEditingHour] = useState(null);
    const [activeTab, setActiveTab] = useState('regular');
    const [formData, setFormData] = useState({
        day_of_week: 'Montag',
        open_time: '18:00',
        close_time: '02:00',
        is_closed: false,
        is_special_day: false,
        special_date: '',
        special_name: '',
        notes: ''
    });

    const { data: openingHours = [] } = useQuery({
        queryKey: ['opening-hours'],
        queryFn: () => base44.entities.OpeningHours.list()
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.OpeningHours.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['opening-hours']);
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.OpeningHours.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['opening-hours']);
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.OpeningHours.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['opening-hours']);
        }
    });

    const regularHours = openingHours.filter(h => !h.is_special_day);
    const specialDays = openingHours.filter(h => h.is_special_day).sort((a, b) => 
        (a.special_date || '').localeCompare(b.special_date || '')
    );

    const openModal = (hour = null, isSpecial = false) => {
        if (hour) {
            setEditingHour(hour);
            setFormData({
                day_of_week: hour.day_of_week || 'Montag',
                open_time: hour.open_time || '18:00',
                close_time: hour.close_time || '02:00',
                is_closed: hour.is_closed || false,
                is_special_day: hour.is_special_day || false,
                special_date: hour.special_date || '',
                special_name: hour.special_name || '',
                notes: hour.notes || ''
            });
        } else {
            setFormData({
                day_of_week: 'Montag',
                open_time: '18:00',
                close_time: '02:00',
                is_closed: false,
                is_special_day: isSpecial,
                special_date: '',
                special_name: '',
                notes: ''
            });
            setEditingHour('new');
        }
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingHour(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingHour && editingHour !== 'new') {
            updateMutation.mutate({ id: editingHour.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id) => {
        if (confirm('Eintrag wirklich löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <>
            <Button 
                variant="outline" 
                onClick={() => setModalOpen(true)}
                className="border-slate-600 hover:bg-slate-700 text-slate-300"
            >
                <Clock className="w-4 h-4 mr-2" />
                Öffnungszeiten
            </Button>

            <Dialog open={modalOpen} onOpenChange={(open) => {
                setModalOpen(open);
                if (!open) {
                    setEditingHour(null);
                }
            }}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Öffnungszeiten verwalten</DialogTitle>
                    </DialogHeader>

                    {editingHour ? (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="regular">Regulär</TabsTrigger>
                                <TabsTrigger value="special">Sondertage</TabsTrigger>
                            </TabsList>

                            <TabsContent value="regular" className="space-y-3 mt-4">
                                {WEEKDAYS.map(day => {
                                    const dayHour = regularHours.find(h => h.day_of_week === day);
                                    return (
                                        <Card key={day} className="p-4 bg-slate-50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="font-medium text-slate-800">{day}</p>
                                                    {dayHour ? (
                                                        dayHour.is_closed ? (
                                                            <p className="text-sm text-slate-500">Geschlossen</p>
                                                        ) : (
                                                            <p className="text-sm text-slate-600">
                                                                {dayHour.open_time} - {dayHour.close_time}
                                                            </p>
                                                        )
                                                    ) : (
                                                        <p className="text-sm text-slate-400">Nicht festgelegt</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    {dayHour ? (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openModal(dayHour)}
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-500 hover:text-red-600"
                                                                onClick={() => handleDelete(dayHour.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setFormData({ ...formData, day_of_week: day, is_special_day: false });
                                                                openModal(null, false);
                                                            }}
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </TabsContent>

                            <TabsContent value="special" className="space-y-3 mt-4">
                                {specialDays.length > 0 ? (
                                    specialDays.map(special => (
                                        <Card key={special.id} className="p-4 bg-amber-50 border-amber-200">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Calendar className="w-4 h-4 text-amber-600" />
                                                        <p className="font-medium text-slate-800">
                                                            {special.special_name || 'Sonderöffnungstag'}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm text-slate-600">
                                                        {new Date(special.special_date).toLocaleDateString('de-DE', { 
                                                            weekday: 'long', 
                                                            year: 'numeric', 
                                                            month: 'long', 
                                                            day: 'numeric' 
                                                        })}
                                                    </p>
                                                    {special.is_closed ? (
                                                        <p className="text-sm text-slate-500 mt-1">Geschlossen</p>
                                                    ) : (
                                                        <p className="text-sm text-slate-600 mt-1">
                                                            {special.open_time} - {special.close_time}
                                                        </p>
                                                    )}
                                                    {special.notes && (
                                                        <p className="text-xs text-slate-500 mt-1 italic">{special.notes}</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openModal(special)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-600"
                                                        onClick={() => handleDelete(special.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-500">
                                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>Keine Sonderöffnungstage</p>
                                    </div>
                                )}
                                <Button 
                                    onClick={() => openModal(null, true)}
                                    className="w-full bg-amber-600 hover:bg-amber-700"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Sonderöffnungstag hinzufügen
                                </Button>
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            {formData.is_special_day ? (
                                <>
                                    <div className="space-y-2">
                                        <Label>Bezeichnung</Label>
                                        <Input
                                            value={formData.special_name}
                                            onChange={(e) => setFormData({ ...formData, special_name: e.target.value })}
                                            placeholder="z.B. Silvester, Feiertag"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Datum *</Label>
                                        <Input
                                            type="date"
                                            value={formData.special_date}
                                            onChange={(e) => setFormData({ ...formData, special_date: e.target.value })}
                                            required
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <Label>Wochentag</Label>
                                    <Select value={formData.day_of_week} onValueChange={(v) => setFormData({ ...formData, day_of_week: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {WEEKDAYS.map(day => (
                                                <SelectItem key={day} value={day}>{day}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="flex items-center justify-between py-2">
                                <Label>Geschlossen</Label>
                                <Switch
                                    checked={formData.is_closed}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_closed: checked })}
                                />
                            </div>

                            {!formData.is_closed && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Öffnung</Label>
                                        <Input
                                            type="time"
                                            value={formData.open_time}
                                            onChange={(e) => setFormData({ ...formData, open_time: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Schließung</Label>
                                        <Input
                                            type="time"
                                            value={formData.close_time}
                                            onChange={(e) => setFormData({ ...formData, close_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Notizen</Label>
                                <Input
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Besondere Hinweise..."
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={closeModal}
                                    className="flex-1"
                                >
                                    Abbrechen
                                </Button>
                                <Button 
                                    type="submit"
                                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                                >
                                    Speichern
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}