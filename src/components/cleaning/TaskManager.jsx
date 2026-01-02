import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePermissions } from '@/components/auth/usePermissions';

export default function TaskManager({ task, areas }) {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: task.title,
        area: task.area,
        frequency: task.frequency
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.CleaningTask.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['cleaning']);
            setModalOpen(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.CleaningTask.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['cleaning']);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        updateMutation.mutate({ id: task.id, data: formData });
    };

    const handleDelete = () => {
        if (confirm('Aufgabe wirklich löschen?')) {
            deleteMutation.mutate(task.id);
        }
    };

    // Nur Manager/Admins können bearbeiten
    if (!permissions.canEditCleaning || !permissions.isManager) {
        return null;
    }

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-slate-600"
                onClick={() => setModalOpen(true)}
            >
                <Pencil className="w-4 h-4" />
            </Button>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Aufgabe bearbeiten</DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>Aufgabe</Label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Bereich</Label>
                                <Select value={formData.area} onValueChange={(v) => setFormData({ ...formData, area: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {areas.map(area => (
                                            <SelectItem key={area.id} value={area.name}>
                                                <div className="flex items-center gap-2">
                                                    <div 
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: area.color }}
                                                    />
                                                    {area.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Häufigkeit</Label>
                                <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="täglich">Täglich</SelectItem>
                                        <SelectItem value="am Wochenende">Am Wochenende (Fr+Sa)</SelectItem>
                                        <SelectItem value="wöchentlich">Wöchentlich</SelectItem>
                                        <SelectItem value="alle zwei Wochen">Alle zwei Wochen</SelectItem>
                                        <SelectItem value="monatlich">Monatlich</SelectItem>
                                        <SelectItem value="an Sonderöffnungstagen">An Sonderöffnungstagen</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button 
                                type="button" 
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={handleDelete}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Löschen
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">
                                Abbrechen
                            </Button>
                            <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700">
                                Speichern
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}