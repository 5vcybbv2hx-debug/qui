import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ExpenseModal({ open, onClose, expense }) {
    const queryClient = useQueryClient();
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        category: 'Einkauf',
        title: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        receipt_url: '',
        notes: ''
    });

    useEffect(() => {
        if (expense) {
            setFormData(expense);
        } else {
            setFormData({
                category: 'Einkauf',
                title: '',
                amount: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                receipt_url: '',
                notes: ''
            });
        }
    }, [expense, open]);

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Expense.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['expenses']);
            onClose();
        }
    });

    const handleReceiptUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setFormData({ ...formData, receipt_url: file_url });
        } catch (error) {
            alert('Fehler beim Hochladen: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        createMutation.mutate({
            ...formData,
            amount: parseFloat(formData.amount)
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{expense ? 'Ausgabe bearbeiten' : 'Ausgabe erfassen'}</DialogTitle>
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
                        <Label>Bezeichnung</Label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="z.B. Getränkelieferung"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Betrag (€)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Datum</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Beleg hochladen</Label>
                        {formData.receipt_url ? (
                            <div className="flex items-center gap-2">
                                <a 
                                    href={formData.receipt_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-400 hover:underline flex-1"
                                >
                                    Beleg anzeigen
                                </a>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFormData({ ...formData, receipt_url: '' })}
                                >
                                    Entfernen
                                </Button>
                            </div>
                        ) : (
                            <div>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={handleReceiptUpload}
                                    className="hidden"
                                    id="receipt-upload"
                                    disabled={uploading}
                                />
                                <label htmlFor="receipt-upload">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        disabled={uploading}
                                        asChild
                                    >
                                        <span>
                                            <Upload className="w-4 h-4 mr-2" />
                                            {uploading ? 'Lädt hoch...' : 'Datei auswählen'}
                                        </span>
                                    </Button>
                                </label>
                            </div>
                        )}
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
                            {expense ? 'Speichern' : 'Erfassen'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}