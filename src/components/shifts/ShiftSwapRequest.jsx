import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { RepeatIcon, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ShiftSwapRequest({ shift, onSuccess }) {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        target_employee_id: '',
        reason: ''
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const { data: existingRequests = [] } = useQuery({
        queryKey: ['shift-swap-requests', shift.id],
        queryFn: () => base44.entities.ShiftSwapRequest.filter({ 
            shift_id: shift.id,
            status: 'ausstehend' 
        })
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            // Benachrichtigung für Manager erstellen
            await base44.entities.ShiftSwapRequest.create(data);
            await base44.entities.Notification.create({
                type: 'shift_swap',
                title: 'Neue Schichttausch-Anfrage',
                message: `${data.requesting_employee_name} möchte die Schicht am ${format(new Date(data.shift_date), 'dd.MM.yyyy', { locale: de })} mit ${data.target_employee_name} tauschen.`,
                related_id: shift.id,
                target_roles: ['admin', 'Manager'],
                read_by: []
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['shift-swap-requests']);
            toast.success('Tauschanfrage wurde versendet');
            setModalOpen(false);
            setFormData({ target_employee_id: '', reason: '' });
            onSuccess?.();
        },
        onError: (error) => {
            toast.error('Fehler beim Erstellen der Anfrage: ' + error.message);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.target_employee_id || !formData.reason.trim()) {
            toast.error('Bitte alle Felder ausfüllen');
            return;
        }

        if (existingRequests.length > 0) {
            toast.error('Für diese Schicht existiert bereits eine ausstehende Tauschanfrage');
            return;
        }
        
        const targetEmployee = employees.find(e => e.id === formData.target_employee_id);
        
        if (!targetEmployee) {
            toast.error('Mitarbeiter nicht gefunden');
            return;
        }
        
        createMutation.mutate({
            shift_id: shift.id,
            requesting_employee_id: shift.employee_id,
            requesting_employee_name: shift.employee_name,
            target_employee_id: formData.target_employee_id,
            target_employee_name: targetEmployee.name,
            shift_date: shift.date,
            shift_time: `${shift.start_time} - ${shift.end_time}`,
            reason: formData.reason,
            status: 'ausstehend'
        });
    };

    // Filter out the current shift's employee
    const availableEmployees = employees.filter(e => e.id !== shift.employee_id);

    const hasPendingRequest = existingRequests.length > 0;

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setModalOpen(true)}
                disabled={hasPendingRequest}
                className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                title={hasPendingRequest ? 'Bereits eine ausstehende Anfrage' : 'Tauschanfrage erstellen'}
            >
                <RepeatIcon className="w-4 h-4 mr-1" />
                {hasPendingRequest ? 'Anfrage läuft' : 'Tausch anfragen'}
            </Button>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Schichttausch anfragen</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-sm font-medium text-slate-700">Deine Schicht:</p>
                            <p className="text-sm text-slate-600 mt-1">
                                {format(new Date(shift.date), 'EEEE, d. MMMM', { locale: de })}
                            </p>
                            <p className="text-sm text-slate-600">
                                {shift.start_time} - {shift.end_time} • {shift.shift_type}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Tauschen mit *</Label>
                                <Select 
                                    value={formData.target_employee_id} 
                                    onValueChange={(v) => setFormData({ ...formData, target_employee_id: v })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Mitarbeiter wählen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableEmployees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                {emp.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Grund *</Label>
                                <Textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Warum möchtest du diese Schicht tauschen?"
                                    required
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1"
                                >
                                    Abbrechen
                                </Button>
                                <Button 
                                    type="submit"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    disabled={createMutation.isPending}
                                >
                                    {createMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Wird gesendet...
                                        </>
                                    ) : (
                                        'Anfrage senden'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}