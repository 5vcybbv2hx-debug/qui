import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Users, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const SHIFT_TYPES = ['Aufmachen', 'Frühschicht', 'Spätschicht', 'Sonderschicht'];

export default function ShiftRequirementsManager() {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingReq, setEditingReq] = useState(null);
    const [formData, setFormData] = useState({
        day_of_week: 'Montag',
        shift_type: '',
        required_employees: 2,
        notes: ''
    });

    const { data: requirements = [] } = useQuery({
        queryKey: ['shift-requirements'],
        queryFn: () => base44.entities.ShiftRequirement.list()
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.ShiftRequirement.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['shift-requirements']);
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ShiftRequirement.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['shift-requirements']);
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.ShiftRequirement.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['shift-requirements']);
        }
    });

    const openModal = (req = null) => {
        if (req) {
            setEditingReq(req);
            setFormData({
                day_of_week: req.day_of_week,
                shift_type: req.shift_type || '',
                required_employees: req.required_employees,
                notes: req.notes || ''
            });
        } else {
            setEditingReq(null);
            setFormData({
                day_of_week: 'Montag',
                shift_type: '',
                required_employees: 2,
                notes: ''
            });
        }
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingReq(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingReq) {
            updateMutation.mutate({ id: editingReq.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id) => {
        if (confirm('Anforderung wirklich löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    const groupedRequirements = WEEKDAYS.map(day => ({
        day,
        requirements: requirements.filter(r => r.day_of_week === day)
    }));

    return (
        <>
            <Button 
                variant="outline" 
                onClick={() => setModalOpen(true)}
                className="border-slate-600 hover:bg-slate-700 text-slate-300"
            >
                <Users className="w-4 h-4 mr-2" />
                Soll-Besetzung
            </Button>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Soll-Besetzung pro Schicht</DialogTitle>
                    </DialogHeader>

                    {!editingReq ? (
                        <div className="space-y-4 mt-4">
                            {groupedRequirements.map(({ day, requirements: dayReqs }) => (
                                <Card key={day} className="p-4 bg-slate-50">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-slate-800">{day}</h4>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setFormData({ ...formData, day_of_week: day });
                                                openModal(null);
                                            }}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    {dayReqs.length > 0 ? (
                                        <div className="space-y-2">
                                            {dayReqs.map(req => (
                                                <div key={req.id} className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                                                    <div className="flex items-center gap-3">
                                                        <Users className="w-4 h-4 text-blue-500" />
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-800">
                                                                {req.shift_type || 'Allgemein'}: {req.required_employees} MA
                                                            </p>
                                                            {req.notes && (
                                                                <p className="text-xs text-slate-500">{req.notes}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openModal(req)}
                                                        >
                                                            <Pencil className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-500"
                                                            onClick={() => handleDelete(req.id)}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">Keine Anforderungen</p>
                                    )}
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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

                            <div className="space-y-2">
                                <Label>Schichttyp (optional)</Label>
                                <Select value={formData.shift_type} onValueChange={(v) => setFormData({ ...formData, shift_type: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Alle Schichten" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={null}>Alle Schichten</SelectItem>
                                        {SHIFT_TYPES.map(type => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Benötigte Mitarbeiter *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.required_employees}
                                    onChange={(e) => setFormData({ ...formData, required_employees: parseInt(e.target.value) })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Notizen</Label>
                                <Input
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="z.B. Stoßzeiten, Events..."
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