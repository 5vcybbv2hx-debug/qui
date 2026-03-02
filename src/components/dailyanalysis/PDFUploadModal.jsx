import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Upload, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PDFUploadModal({ open, onOpenChange, selectedDate, onSuccess }) {
    const [file, setFile] = useState(null);
    const [revenue, setRevenue] = useState('');
    const [notes, setNotes] = useState('');

    const mutation = useMutation({
        mutationFn: async () => {
            let pdfUrl = null;
            
            if (file) {
                const uploadResponse = await base44.integrations.Core.UploadFile({ file });
                pdfUrl = uploadResponse.file_url;
            }

            await base44.entities.DailyRevenue.create({
                date: selectedDate,
                revenue: parseFloat(revenue),
                pdf_url: pdfUrl,
                notes: notes || undefined
            });
        },
        onSuccess: () => {
            setFile(null);
            setRevenue('');
            setNotes('');
            onOpenChange(false);
            onSuccess?.();
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!revenue || parseFloat(revenue) <= 0) {
            alert('Bitte geben Sie einen gültigen Umsatz ein.');
            return;
        }
        mutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-white">Z-Abschlag hochladen</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="date" className="text-slate-300">Datum</Label>
                        <Input 
                            id="date"
                            type="date" 
                            value={selectedDate}
                            disabled
                            className="bg-slate-700 border-slate-600 text-white mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="revenue" className="text-slate-300">Tagesumsatz (€)</Label>
                        <Input 
                            id="revenue"
                            type="number" 
                            step="0.01"
                            placeholder="z.B. 1500,50"
                            value={revenue}
                            onChange={(e) => setRevenue(e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white mt-1"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="pdf" className="text-slate-300">PDF hochladen (optional)</Label>
                        <div className="mt-1 border-2 border-dashed border-slate-600 rounded-lg p-4">
                            <input 
                                id="pdf"
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="text-sm text-slate-400"
                            />
                            {file && (
                                <p className="text-sm text-green-400 mt-2">✓ {file.name}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="notes" className="text-slate-300">Notizen (optional)</Label>
                        <Input 
                            id="notes"
                            type="text" 
                            placeholder="z.B. Besonderheiten des Tages"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white mt-1"
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                        >
                            Abbrechen
                        </Button>
                        <Button 
                            type="submit"
                            disabled={mutation.isPending}
                            className="flex-1 bg-amber-600 hover:bg-amber-700"
                        >
                            {mutation.isPending ? 'Wird gespeichert...' : 'Speichern'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}