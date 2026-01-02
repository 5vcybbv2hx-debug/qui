import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { RepeatIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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

    const { data: currentUser } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.ShiftSwapRequest.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['shift-swap-requests']);
            setModalOpen(false);
            setFormData({ target_employee_id: '', reason: '' });
            onSuccess?.();
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const targetEmployee = employees.find(e => e.id === formData.target_employee_id);
        
        createMutation.mutate({
            shift_id: shift.id,
            requesting_employee_id: shift.employee_id,
            requesting_employee_name: shift.employee_name,
            target_employee_id: formData.target_employee_id,
            target_employee_name: targetEmployee?.name,
            shift_date: shift.date,
            shift_time: `${shift.start_time} - ${shift.end_time}`,
            reason: formData.reason,
            status: 'ausstehend'
        });
    };

    // Filter out the current shift's employee
    const availableEmployees = employees.filter(e => e.id !== shift.employee_id);

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setModalOpen(true)}
                className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
            >
                <RepeatIcon className="w-4 h-4 mr-1" />
                Tausch anfragen
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
                                    Anfrage senden
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}