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
import { Plus, Pencil, Trash2, UserCheck, Calendar, X } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function getWindowStatus(access) {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (!access.is_active) return { label: 'Deaktiviert', color: 'bg-slate-500/20 text-slate-400' };
    if (access.end_date < today) return { label: 'Abgelaufen', color: 'bg-slate-500/20 text-slate-400' };
    if (access.start_date > today) return { label: 'Noch nicht aktiv', color: 'bg-blue-500/20 text-blue-400' };
    return { label: 'Aktiv', color: 'bg-green-500/20 text-green-400' };
}

export default function ProvisionalAccessManager({ employees }) {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ employee_id: '', start_date: '', end_date: '', note: '' });

    const { data: accesses = [] } = useQuery({
        queryKey: ['provisional-accesses'],
        queryFn: () => base44.entities.ProvisionalShiftAccess.list('-created_date')
    });

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const emp = employees.find(e => e.id === data.employee_id);
            const payload = { ...data, employee_name: emp?.name || '', is_active: true };
            if (editing) return base44.entities.ProvisionalShiftAccess.update(editing.id, payload);
            return base44.entities.ProvisionalShiftAccess.create(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['provisional-accesses']);
            setModalOpen(false);
            setEditing(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.ProvisionalShiftAccess.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['provisional-accesses'])
    });

    const toggleMutation = useMutation({
        mutationFn: ({ id, is_active }) => base44.entities.ProvisionalShiftAccess.update(id, { is_active }),
        onSuccess: () => queryClient.invalidateQueries(['provisional-accesses'])
    });

    const openNew = () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        setEditing(null);
        setForm({ employee_id: employees[0]?.id || '', start_date: today, end_date: today, note: '' });
        setModalOpen(true);
    };

    const openEdit = (access) => {
        setEditing(access);
        setForm({ employee_id: access.employee_id, start_date: access.start_date, end_date: access.end_date, note: access.note || '' });
        setModalOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-foreground">Vorläufige Selbsteinplanung</h3>
                    <p className="text-sm text-muted-foreground">Mitarbeiter-Zugänge verwalten</p>
                </div>
                <Button onClick={openNew} className="bg-amber-600 hover:bg-amber-700 gap-2">
                    <Plus className="w-4 h-4" /> Zugang erteilen
                </Button>
            </div>

            {accesses.length === 0 ? (
                <Card className="p-8 text-center">
                    <UserCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground">Noch kein Zugang vergeben</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {accesses.map(access => {
                        const status = getWindowStatus(access);
                        return (
                            <Card key={access.id} className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 font-bold text-amber-400">
                                        {access.employee_name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-foreground">{access.employee_name}</span>
                                            <Badge className={cn('text-xs', status.color)}>{status.label}</Badge>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{format(parseISO(access.start_date), 'dd.MM.yyyy')} – {format(parseISO(access.end_date), 'dd.MM.yyyy')}</span>
                                        </div>
                                        {access.note && <p className="text-xs text-muted-foreground mt-1 italic">"{access.note}"</p>}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => toggleMutation.mutate({ id: access.id, is_active: !access.is_active })}
                                            className={cn("p-2 rounded-lg text-xs font-medium transition-all", access.is_active ? "bg-green-500/10 text-green-400 hover:bg-red-500/10 hover:text-red-400" : "bg-slate-500/10 text-slate-400 hover:bg-green-500/10 hover:text-green-400")}>
                                            {access.is_active ? '✓' : '○'}
                                        </button>
                                        <button onClick={() => openEdit(access)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => { if (confirm('Zugang wirklich löschen?')) deleteMutation.mutate(access.id); }}
                                            className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Zugang bearbeiten' : 'Zugang erteilen'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <div className="space-y-1.5">
                            <Label>Mitarbeiter</Label>
                            <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                                className="w-full h-12 rounded-xl border border-input bg-background px-3 text-base text-foreground">
                                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Von</Label>
                                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="h-12 text-base" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Bis</Label>
                                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="h-12 text-base" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Hinweis für den Mitarbeiter (optional)</Label>
                            <Textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                                placeholder="z.B. 'Nur Wochenenden eintragen'" rows={3} className="text-sm" />
                        </div>
                        <div className="flex gap-2 pt-1">
                            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1 h-12">Abbrechen</Button>
                            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.employee_id || !form.start_date || !form.end_date}
                                className="flex-1 h-12 bg-amber-600 hover:bg-amber-700">
                                {editing ? 'Speichern' : 'Zugang erteilen'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}