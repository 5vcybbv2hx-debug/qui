import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, X, Edit3, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function calcDuration(start, end) {
    if (!start || !end) return '–';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let minutes = (eh * 60 + em) - (sh * 60 + sm);
    if (minutes < 0) minutes += 24 * 60;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function EditDialog({ entry, open, onClose, onSave }) {
    const [form, setForm] = useState({
        start_time: entry?.start_time || '',
        end_time: entry?.end_time || '',
        break_minutes: entry?.break_minutes || 0,
        notes: entry?.notes || ''
    });

    if (!entry) return null;

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Zeiterfassung bearbeiten</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div>
                        <p className="text-sm font-medium text-foreground">{entry.employee_name}</p>
                        <p className="text-xs text-muted-foreground">
                            {entry.date ? format(parseISO(entry.date), 'EEEE, dd.MM.yyyy', { locale: de }) : ''}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Beginn</Label>
                            <Input type="time" value={form.start_time}
                                onChange={e => setForm({ ...form, start_time: e.target.value })}
                                className="mt-1 h-11" />
                        </div>
                        <div>
                            <Label className="text-xs">Ende</Label>
                            <Input type="time" value={form.end_time}
                                onChange={e => setForm({ ...form, end_time: e.target.value })}
                                className="mt-1 h-11" />
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">Pause (Minuten)</Label>
                        <Input type="number" min="0" value={form.break_minutes}
                            onChange={e => setForm({ ...form, break_minutes: Number(e.target.value) })}
                            className="mt-1 h-11" />
                    </div>
                    <div>
                        <Label className="text-xs">Notiz</Label>
                        <Input value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            placeholder="Optional..."
                            className="mt-1 h-11" />
                    </div>
                    <div className="flex gap-2 pt-1">
                        <Button variant="outline" onClick={onClose} className="flex-1 h-11">Abbrechen</Button>
                        <Button onClick={() => onSave(form)} className="flex-1 h-11 bg-primary text-primary-foreground">Speichern</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function TimeEntryReview({ entries }) {
    const queryClient = useQueryClient();
    const [editEntry, setEditEntry] = useState(null);

    const approveMutation = useMutation({
        mutationFn: (id) => base44.entities.TimeEntry.update(id, {
            status: 'genehmigt',
            manager_approved_at: new Date().toISOString()
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-time-entries'] });
            toast.success('Zeiterfassung genehmigt');
        }
    });

    const rejectMutation = useMutation({
        mutationFn: (id) => base44.entities.TimeEntry.update(id, {
            status: 'entwurf',
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-time-entries'] });
            toast.success('Zeiterfassung zurückgewiesen');
        }
    });

    const editMutation = useMutation({
        mutationFn: ({ id, data }) => {
            const [sh, sm] = data.start_time.split(':').map(Number);
            const [eh, em] = data.end_time.split(':').map(Number);
            let minutes = (eh * 60 + em) - (sh * 60 + sm);
            if (minutes < 0) minutes += 24 * 60;
            const total_hours = Math.max(0, (minutes - (data.break_minutes || 0)) / 60);
            return base44.entities.TimeEntry.update(id, {
                ...data,
                total_hours: Math.round(total_hours * 100) / 100,
                status: 'genehmigt',
                manager_approved_at: new Date().toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-time-entries'] });
            setEditEntry(null);
            toast.success('Zeiterfassung gespeichert & genehmigt');
        }
    });

    if (entries.length === 0) return null;

    return (
        <>
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                        Offene Zeiterfassungen
                    </h3>
                    <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs ml-auto">
                        {entries.length} offen
                    </Badge>
                </div>

                <div className="space-y-2">
                    {entries.map(entry => {
                        const duration = calcDuration(entry.start_time, entry.end_time);
                        const dateLabel = entry.date
                            ? format(parseISO(entry.date), 'EEE, dd.MM.', { locale: de })
                            : '–';

                        return (
                            <Card key={entry.id} className="border-orange-500/30 bg-orange-500/5">
                                <CardContent className="p-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                                            <Clock className="w-4 h-4 text-orange-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-foreground">{entry.employee_name}</p>
                                                <Badge className="text-[10px] bg-orange-500/20 text-orange-300 border-orange-500/30 py-0">Bestätigung</Badge>
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                                <span>{dateLabel}</span>
                                                <span>{entry.start_time} – {entry.end_time}</span>
                                                <span className="font-medium text-foreground">{duration}</span>
                                                {entry.break_minutes > 0 && <span>Pause: {entry.break_minutes}min</span>}
                                            </div>
                                            {entry.notes && (
                                                <p className="text-xs text-muted-foreground mt-1 italic truncate">{entry.notes}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-2 mt-3 pt-2 border-t border-orange-500/20">
                                        <Button size="sm"
                                            onClick={() => approveMutation.mutate(entry.id)}
                                            disabled={approveMutation.isPending}
                                            className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white text-xs gap-1">
                                            <Check className="w-3.5 h-3.5" />Genehmigen
                                        </Button>
                                        <Button size="sm"
                                            onClick={() => setEditEntry(entry)}
                                            variant="outline"
                                            className="h-10 px-3 text-xs gap-1 border-border">
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button size="sm"
                                            onClick={() => rejectMutation.mutate(entry.id)}
                                            disabled={rejectMutation.isPending}
                                            className="flex-1 h-10 bg-red-600/80 hover:bg-red-700 text-white text-xs gap-1">
                                            <X className="w-3.5 h-3.5" />Ablehnen
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>

            <EditDialog
                entry={editEntry}
                open={!!editEntry}
                onClose={() => setEditEntry(null)}
                onSave={(form) => editMutation.mutate({ id: editEntry.id, data: form })}
            />
        </>
    );
}