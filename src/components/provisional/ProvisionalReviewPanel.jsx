import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Pencil, Clock, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
    ausstehend: { label: 'Ausstehend', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    bestätigt: { label: 'Bestätigt', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    abgelehnt: { label: 'Abgelehnt', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function ProvisionalReviewPanel() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('ausstehend');
    const [editModal, setEditModal] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [managerNote, setManagerNote] = useState('');

    const { data: requests = [] } = useQuery({
        queryKey: ['all-provisional-requests'],
        queryFn: () => base44.entities.ProvisionalShiftRequest.list('-date', 200)
    });

    const reviewMutation = useMutation({
        mutationFn: async ({ req, action, note, overrides }) => {
            if (action === 'bestätigt') {
                // Create a real shift
                await base44.entities.Shift.create({
                    employee_id: req.employee_id,
                    employee_name: req.employee_name,
                    date: overrides?.date || req.date,
                    start_time: overrides?.start_time || req.start_time,
                    end_time: overrides?.end_time || req.end_time,
                    shift_type: overrides?.shift_type || req.shift_type,
                    notes: note ? `Selbsteinplanung: ${note}` : 'Vorläufige Selbsteinplanung bestätigt',
                });
            }
            return base44.entities.ProvisionalShiftRequest.update(req.id, {
                status: action,
                manager_note: note || '',
                reviewed_by: 'Manager'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['all-provisional-requests']);
            queryClient.invalidateQueries(['shifts']);
            setEditModal(null);
        }
    });

    const filtered = [...requests]
        .filter(r => statusFilter === 'alle' || r.status === statusFilter)
        .sort((a, b) => a.date.localeCompare(b.date));

    const pendingCount = requests.filter(r => r.status === 'ausstehend').length;

    const openEdit = (req) => {
        setEditModal(req);
        setEditForm({ date: req.date, start_time: req.start_time, end_time: req.end_time, shift_type: req.shift_type || '' });
        setManagerNote('');
    };

    const handleConfirm = (req) => {
        const isEdited = editModal && (editForm.date !== req.date || editForm.start_time !== req.start_time || editForm.end_time !== req.end_time);
        reviewMutation.mutate({ req, action: 'bestätigt', note: managerNote, overrides: isEdited ? editForm : null });
    };

    const handleReject = (req) => {
        reviewMutation.mutate({ req, action: 'abgelehnt', note: managerNote });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-foreground">Vorläufige Wunschschichten</h3>
                    {pendingCount > 0 && (
                        <p className="text-sm text-amber-400">{pendingCount} ausstehende Anfrage{pendingCount !== 1 ? 'n' : ''}</p>
                    )}
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {['ausstehend', 'bestätigt', 'abgelehnt', 'alle'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={cn('px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0',
                            statusFilter === s ? 'bg-amber-600 text-white' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
                        {s === 'alle' ? 'Alle' : STATUS_CONFIG[s]?.label}
                        {s === 'ausstehend' && pendingCount > 0 && <span className="ml-2 bg-amber-400 text-slate-900 rounded-full px-1.5 text-xs font-bold">{pendingCount}</span>}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <Card className="p-8 text-center">
                    <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground">Keine Einträge</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map(req => {
                        const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.ausstehend;
                        return (
                            <Card key={req.id} className={cn('p-4', req.status === 'bestätigt' && 'border-green-500/30', req.status === 'abgelehnt' && 'border-red-500/30 opacity-70')}>
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center font-bold text-amber-400 shrink-0 text-sm">
                                        {req.employee_name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-foreground">{req.employee_name}</span>
                                            <Badge className={cn('text-xs border', sc.color)}>{sc.label}</Badge>
                                        </div>
                                        <div className="text-sm font-medium text-foreground mt-0.5">
                                            {format(parseISO(req.date), 'EEEE, dd.MM.yyyy', { locale: de })}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{req.start_time} – {req.end_time}</span>
                                            {req.shift_type && <span>• {req.shift_type}</span>}
                                        </div>
                                        {req.comment && <p className="text-xs text-muted-foreground mt-1 italic">"{req.comment}"</p>}
                                        {req.manager_note && <p className="text-xs text-amber-400/80 mt-1">Manager: {req.manager_note}</p>}
                                    </div>
                                </div>

                                {req.status === 'ausstehend' && (
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                                        <Button size="sm" onClick={() => openEdit(req)}
                                            variant="outline" className="flex-1 gap-1.5 h-10">
                                            <Pencil className="w-3.5 h-3.5" /> Bearbeiten & Bestätigen
                                        </Button>
                                        <Button size="sm" onClick={() => { setEditModal(req); setManagerNote(''); setTimeout(() => handleReject(req), 0); }}
                                            variant="outline" className="h-10 px-3 border-red-500/30 text-red-400 hover:bg-red-500/10">
                                            <XCircle className="w-4 h-4" />
                                        </Button>
                                        <Button size="sm" onClick={() => reviewMutation.mutate({ req, action: 'bestätigt', note: '' })}
                                            className="h-10 px-3 bg-green-600 hover:bg-green-700">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Edit & Confirm Modal */}
            <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Wunschschicht prüfen</DialogTitle>
                    </DialogHeader>
                    {editModal && (
                        <div className="space-y-4 mt-2">
                            <div className="p-3 rounded-xl bg-secondary/50 text-sm">
                                <p className="font-semibold text-foreground">{editModal.employee_name}</p>
                                <p className="text-muted-foreground">{format(parseISO(editModal.date), 'EEEE, dd.MM.yyyy', { locale: de })}</p>
                                {editModal.comment && <p className="text-xs italic text-muted-foreground mt-1">"{editModal.comment}"</p>}
                            </div>
                            <p className="text-xs text-muted-foreground">Du kannst Datum/Uhrzeit vor dem Bestätigen anpassen:</p>
                            <div className="space-y-1.5">
                                <Label>Datum</Label>
                                <Input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} className="h-12 text-base" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Von</Label>
                                    <Input type="time" value={editForm.start_time} onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))} className="h-12 text-base" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Bis</Label>
                                    <Input type="time" value={editForm.end_time} onChange={e => setEditForm(f => ({ ...f, end_time: e.target.value }))} className="h-12 text-base" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Manager-Notiz (optional)</Label>
                                <Textarea value={managerNote} onChange={e => setManagerNote(e.target.value)} placeholder="Hinweis an den Mitarbeiter..." rows={2} className="text-sm" />
                            </div>
                            <div className="flex gap-2 pt-1">
                                <Button variant="outline" onClick={() => { setManagerNote(''); handleReject(editModal); }}
                                    className="flex-1 h-12 border-red-500/30 text-red-400 hover:bg-red-500/10">
                                    <XCircle className="w-4 h-4 mr-2" /> Ablehnen
                                </Button>
                                <Button onClick={() => handleConfirm(editModal)}
                                    className="flex-1 h-12 bg-green-600 hover:bg-green-700">
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Bestätigen
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}