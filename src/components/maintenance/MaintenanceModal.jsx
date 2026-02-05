import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function MaintenanceModal({ task, open, onClose }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        equipment_name: "",
        task_description: "",
        frequency: "monatlich",
        last_maintenance: "",
        next_maintenance: "",
        responsible: "",
        notes: "",
        enable_reminders: true,
        reminder_days_before: 7,
        sync_to_calendar: true,
        is_active: true
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    useEffect(() => {
        if (task) {
            setFormData(task);
        }
    }, [task]);

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (task) {
                return base44.entities.MaintenanceTask.update(task.id, data);
            }
            return base44.entities.MaintenanceTask.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['maintenance-tasks']);
            onClose();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: () => base44.entities.MaintenanceTask.delete(task.id),
        onSuccess: () => {
            queryClient.invalidateQueries(['maintenance-tasks']);
            onClose();
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{task ? 'Wartung bearbeiten' : 'Neue Wartung'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Gerät/Bereich *</Label>
                        <Input
                            value={formData.equipment_name}
                            onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                            placeholder="z.B. Kaffeemaschine, Bierleitungen"
                            required
                        />
                    </div>

                    <div>
                        <Label>Wartungsaufgabe *</Label>
                        <Textarea
                            value={formData.task_description}
                            onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                            placeholder="Was muss gewartet werden?"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Häufigkeit *</Label>
                            <Select
                                value={formData.frequency}
                                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="täglich">Täglich</SelectItem>
                                    <SelectItem value="wöchentlich">Wöchentlich</SelectItem>
                                    <SelectItem value="monatlich">Monatlich</SelectItem>
                                    <SelectItem value="quartalsweise">Quartalsweise</SelectItem>
                                    <SelectItem value="halbjährlich">Halbjährlich</SelectItem>
                                    <SelectItem value="jährlich">Jährlich</SelectItem>
                                    <SelectItem value="alle zwei Jahre">Alle zwei Jahre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Verantwortlich</Label>
                            <Select
                                value={formData.responsible}
                                onValueChange={(value) => setFormData({ ...formData, responsible: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Auswählen" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Letzte Wartung</Label>
                            <Input
                                type="date"
                                value={formData.last_maintenance}
                                onChange={(e) => setFormData({ ...formData, last_maintenance: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label>Nächste Wartung</Label>
                            <Input
                                type="date"
                                value={formData.next_maintenance}
                                onChange={(e) => setFormData({ ...formData, next_maintenance: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Notizen</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Zusätzliche Informationen"
                        />
                    </div>

                    <div className="space-y-3 border-t pt-4">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.sync_to_calendar}
                                onCheckedChange={(checked) => setFormData({ ...formData, sync_to_calendar: checked })}
                            />
                            <Label>Mit Kalender synchronisieren</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.enable_reminders}
                                onCheckedChange={(checked) => setFormData({ ...formData, enable_reminders: checked })}
                            />
                            <Label>Erinnerungen aktivieren</Label>
                        </div>
                        {formData.enable_reminders && (
                            <div className="ml-6">
                                <Label>Erinnerung (Tage vor Termin)</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={formData.reminder_days_before}
                                    onChange={(e) => setFormData({ ...formData, reminder_days_before: parseInt(e.target.value) })}
                                />
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                            <Label>Aktiv</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        {task && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => deleteMutation.mutate()}
                            >
                                Löschen
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={onClose}>
                            Abbrechen
                        </Button>
                        <Button type="submit">
                            Speichern
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}