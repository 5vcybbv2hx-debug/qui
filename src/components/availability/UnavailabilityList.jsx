import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const statusConfig = {
    ausstehend: { label: 'Ausstehend – wird an der Teamsitzung besprochen', color: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30', icon: Clock },
    genehmigt: { label: 'Genehmigt', color: 'bg-green-600/20 text-green-400 border-green-600/30', icon: CheckCircle2 },
    abgelehnt: { label: 'Abgelehnt', color: 'bg-red-600/20 text-red-400 border-red-600/30', icon: XCircle },
};

export default function UnavailabilityList() {
    const queryClient = useQueryClient();
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ date: '', end_date: '', reason: '' });

    useEffect(() => {
        base44.auth.me().then(async (user) => {
            const emps = await base44.entities.Employee.filter({ email: user.email, is_active: true });
            if (emps[0]) setCurrentEmployee(emps[0]);
        });
    }, []);

    const { data: requests = [] } = useQuery({
        queryKey: ['unavailability-requests', currentEmployee?.id],
        queryFn: () => base44.entities.UnavailabilityRequest.filter({ employee_id: currentEmployee.id }, '-date'),
        enabled: !!currentEmployee?.id
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.UnavailabilityRequest.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['unavailability-requests']);
            setModalOpen(false);
            setFormData({ date: '', end_date: '', reason: '' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.UnavailabilityRequest.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['unavailability-requests'])
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!currentEmployee) return;
        createMutation.mutate({
            employee_id: currentEmployee.id,
            employee_name: currentEmployee.name,
            date: formData.date,
            end_date: formData.end_date || formData.date,
            reason: formData.reason,
            status: 'ausstehend'
        });
    };

    const sorted = [...requests].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-sm text-slate-400">
                    Melde Termine, an denen du nicht kannst. Der Manager genehmigt oder lehnt sie an der nächsten Teamsitzung ab.
                </p>
                <Button onClick={() => setModalOpen(true)} size="sm" className="bg-amber-600 hover:bg-amber-700 gap-2 shrink-0">
                    <Plus className="w-4 h-4" /> Termin melden
                </Button>
            </div>

            {sorted.length === 0 ? (
                <Card className="p-8 text-center bg-slate-900 border-slate-800">
                    <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Noch keine Termine gemeldet</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {sorted.map(req => {
                        const config = statusConfig[req.status] || statusConfig.ausstehend;
                        const StatusIcon = config.icon;
                        return (
                            <Card key={req.id} className="p-4 bg-slate-900 border-slate-800">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <p className="font-semibold text-white text-sm">
                                                {format(parseISO(req.date), 'EEE, dd. MMM yyyy', { locale: de })}
                                                {req.end_date && req.end_date !== req.date && (
                                                    <span className="text-slate-400"> – {format(parseISO(req.end_date), 'dd. MMM yyyy', { locale: de })}</span>
                                                )}
                                            </p>
                                        </div>
                                        <p className="text-sm text-slate-300 mb-2">{req.reason}</p>
                                        <Badge className={`text-xs border flex items-center gap-1 w-fit ${config.color}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {config.label}
                                        </Badge>
                                        {req.response_note && (
                                            <p className="text-xs text-slate-400 mt-1 italic">Notiz: {req.response_note}</p>
                                        )}
                                    </div>
                                    {req.status === 'ausstehend' && (
                                        <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10 shrink-0"
                                            onClick={() => deleteMutation.mutate(req.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Termin melden</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Von *</Label>
                                <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Bis (optional)</Label>
                                <Input type="date" value={formData.end_date} min={formData.date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Grund *</Label>
                            <Textarea
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="z.B. Arzttermin, Urlaub geplant, Prüfung, Geburtstag..."
                                required rows={3}
                            />
                        </div>
                        <div className="flex gap-2 pt-1">
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Abbrechen</Button>
                            <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700" disabled={createMutation.isPending}>
                                Melden
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}