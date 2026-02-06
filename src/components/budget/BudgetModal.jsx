import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { haptics } from "@/components/utils/haptics";

export default function BudgetModal({ open, onClose, selectedMonth }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        category: 'Einkauf',
        planned_amount: '',
        notes: ''
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Budget.create(data),
        onSuccess: () => {
            haptics.light();
            queryClient.invalidateQueries(['budgets']);
            onClose();
            setFormData({ category: 'Einkauf', planned_amount: '', notes: '' });
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        createMutation.mutate({
            ...formData,
            month: format(selectedMonth, 'yyyy-MM-dd'),
            planned_amount: parseFloat(formData.planned_amount)
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Budget erstellen</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Kategorie</Label>
                        <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Einkauf">Einkauf</SelectItem>
                                <SelectItem value="Personal">Personal</SelectItem>
                                <SelectItem value="Marketing">Marketing</SelectItem>
                                <SelectItem value="Wartung">Wartung</SelectItem>
                                <SelectItem value="Events">Events</SelectItem>
                                <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Geplantes Budget (€)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={formData.planned_amount}
                            onChange={(e) => setFormData({ ...formData, planned_amount: e.target.value })}
                            placeholder="z.B. 5000"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Notizen</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Optional..."
                            rows={2}
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                            Abbrechen
                        </Button>
                        <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700">
                            Erstellen
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}