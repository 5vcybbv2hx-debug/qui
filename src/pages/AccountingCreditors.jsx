import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, TrendingDown, Search, AlertTriangle, CheckCircle2, Clock, Building, Receipt, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isAfter } from 'date-fns';
import MonthNavigator from '@/components/accounting/MonthNavigator';

const fmt = (n) => n?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00';

const statusConfig = {
    'offen': { label: 'Offen', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', icon: Clock },
    'teilbezahlt': { label: 'Teilbezahlt', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: AlertTriangle },
    'bezahlt': { label: 'Bezahlt', color: 'bg-green-500/15 text-green-400 border-green-500/20', icon: CheckCircle2 },
    'überfällig': { label: 'Überfällig', color: 'bg-red-500/15 text-red-400 border-red-500/20', icon: AlertTriangle },
};

const EMPTY_FORM = {
    invoice_number: '', invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '', supplier_name: '', amount_net: '', amount_gross: '',
    tax_rate: 19, category: '', payment_status: 'offen', notes: ''
};

export default function AccountingCreditors() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('alle');
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [formData, setFormData] = useState(EMPTY_FORM);

    const { data: invoices = [] } = useQuery({
        queryKey: ['creditor-invoices'],
        queryFn: () => base44.entities.CreditorInvoice.list('-invoice_date')
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => base44.entities.Supplier.list('name')
    });

    const { data: receipts = [] } = useQuery({
        queryKey: ['accounting-receipts'],
        queryFn: () => base44.entities.AccountingReceipt.list('-receipt_date')
    });

    // Belege die als Kreditor oder Beides markiert sind
    const creditorReceipts = useMemo(() =>
        receipts.filter(r => r.assignment === 'kreditor' || r.assignment === 'both'),
        [receipts]
    );

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.CreditorInvoice.create(data),
        onSuccess: () => { queryClient.invalidateQueries(['creditor-invoices']); setModalOpen(false); setFormData(EMPTY_FORM); }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.CreditorInvoice.update(id, data),
        onSuccess: () => queryClient.invalidateQueries(['creditor-invoices'])
    });

    const enriched = useMemo(() => {
        return invoices.map(inv => {
            const isOverdue = inv.payment_status === 'offen' && inv.due_date && isAfter(new Date(), new Date(inv.due_date));
            return { ...inv, payment_status: isOverdue ? 'überfällig' : inv.payment_status };
        });
    }, [invoices]);

    const filtered = enriched.filter(inv => {
        const matchMonth = inv.invoice_date?.startsWith(selectedMonth);
        const matchSearch = !search || inv.supplier_name?.toLowerCase().includes(search.toLowerCase()) || inv.invoice_number?.includes(search);
        const matchStatus = statusFilter === 'alle' || inv.payment_status === statusFilter;
        return matchMonth && matchSearch && matchStatus;
    });

    const totals = useMemo(() => {
        const open = enriched.filter(i => i.payment_status !== 'bezahlt').reduce((s, i) => s + ((i.amount_gross || 0) - (i.paid_amount || 0)), 0);
        const overdue = enriched.filter(i => i.payment_status === 'überfällig').reduce((s, i) => s + (i.amount_gross || 0), 0);
        return { open, overdue };
    }, [enriched]);

    if (!permissions.canViewAccountingCreditors) return <PermissionDenied message="Kein Zugriff auf Kreditoren." />;

    const handleSubmit = (e) => {
        e.preventDefault();
        const gross = parseFloat(formData.amount_gross) || 0;
        const rate = parseFloat(formData.tax_rate) || 0;
        const net = gross / (1 + rate / 100);
        createMutation.mutate({ ...formData, amount_gross: gross, amount_net: Math.round(net * 100) / 100, tax_amount: Math.round((gross - net) * 100) / 100 });
    };

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-6">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-red-400" />
                        <h1 className="text-lg font-bold text-foreground">Kreditoren</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <MonthNavigator value={selectedMonth} onChange={setSelectedMonth} />
                        <Button size="sm" onClick={() => setModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white gap-1 h-8">
                            <Plus className="w-4 h-4" /> Rechnung
                        </Button>
                    </div>
                </div>
            </div>

            <div className="px-4 md:px-6 space-y-4 max-w-2xl mx-auto pt-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="p-3 bg-blue-500/10 border-blue-500/20">
                        <p className="text-xs text-blue-400 font-medium">Offene Posten</p>
                        <p className="text-lg font-bold text-blue-400">{fmt(totals.open)} €</p>
                    </Card>
                    <Card className="p-3 bg-red-500/10 border-red-500/20">
                        <p className="text-xs text-red-400 font-medium">Überfällig</p>
                        <p className="text-lg font-bold text-red-400">{fmt(totals.overdue)} €</p>
                    </Card>
                </div>

                {/* Filter */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {['alle', 'offen', 'teilbezahlt', 'überfällig', 'bezahlt'].map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={cn('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                                statusFilter === s ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
                            )}>
                            {s === 'alle' ? 'Alle' : statusConfig[s]?.label || s}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Lieferant, Rechnungsnr..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>

                {filtered.length === 0 ? (
                    <Card className="p-12 text-center text-muted-foreground bg-card border-border">
                        <Building className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Keine Eingangsrechnungen</p>
                        <Button onClick={() => setModalOpen(true)} className="mt-4 bg-red-600 hover:bg-red-700 text-white">
                            <Plus className="w-4 h-4 mr-2" />Rechnung erfassen
                        </Button>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(inv => {
                            const sc = statusConfig[inv.payment_status] || statusConfig['offen'];
                            const Icon = sc.icon;
                            return (
                                <Card key={inv.id} className="p-4 bg-card border-border">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-foreground">{inv.supplier_name}</p>
                                                <Badge className={cn('text-[10px] border gap-1', sc.color)}>
                                                    <Icon className="w-3 h-3" />{sc.label}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                                                {inv.invoice_number && <span>Nr. {inv.invoice_number}</span>}
                                                <span>{inv.invoice_date}</span>
                                                {inv.due_date && <span>· Fällig: {inv.due_date}</span>}
                                                {inv.category && <span>· {inv.category}</span>}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-base font-bold text-foreground">{fmt(inv.amount_gross)} €</p>
                                            {inv.payment_status !== 'bezahlt' && (
                                                <Button size="sm" variant="outline"
                                                    onClick={() => updateMutation.mutate({ id: inv.id, data: { payment_status: 'bezahlt', paid_date: format(new Date(), 'yyyy-MM-dd') } })}
                                                    className="h-7 text-xs mt-1 border-green-500/40 text-green-400 hover:bg-green-500/10">
                                                    Bezahlt
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Verknüpfte Belege */}
                {creditorReceipts.filter(r => r.receipt_date?.startsWith(selectedMonth)).length > 0 && (
                    <div className="mt-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5" /> Verknüpfte Belege
                        </p>
                        <div className="space-y-2">
                            {creditorReceipts.filter(r => r.receipt_date?.startsWith(selectedMonth)).map(r => (
                                <Card key={r.id} className="p-3 bg-card border-border flex items-center gap-3">
                                    {r.file_url ? (
                                        <img src={r.file_url} alt="Beleg" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                                            <FileText className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-foreground truncate">{r.supplier_name || 'Unbekannt'}</p>
                                        <p className="text-xs text-muted-foreground">{r.receipt_date} · {r.receipt_type}</p>
                                        {r.assignment === 'both' && <Badge variant="outline" className="text-[10px] mt-0.5">Auch Debitor</Badge>}
                                    </div>
                                    <p className="text-sm font-bold text-foreground shrink-0">{r.amount_gross?.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</p>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={() => setModalOpen(true)}
                className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center z-40 transition-all hover:scale-110"
            >
                <Plus className="w-6 h-6" />
            </button>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Eingangsrechnung erfassen</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-3 mt-2">
                        <div className="space-y-1.5">
                            <Label>Lieferant *</Label>
                            <Input value={formData.supplier_name} onChange={e => setFormData({ ...formData, supplier_name: e.target.value })}
                                placeholder="Lieferantenname" required list="suppliers-list" />
                            <datalist id="suppliers-list">
                                {suppliers.map(s => <option key={s.id} value={s.name} />)}
                            </datalist>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Rechnungsdatum *</Label>
                                <Input type="date" value={formData.invoice_date} onChange={e => setFormData({ ...formData, invoice_date: e.target.value })} required />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Fälligkeitsdatum</Label>
                                <Input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Bruttobetrag (€) *</Label>
                                <Input type="number" step="0.01" value={formData.amount_gross} onChange={e => setFormData({ ...formData, amount_gross: e.target.value })} required />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Steuersatz (%)</Label>
                                <Select value={String(formData.tax_rate)} onValueChange={v => setFormData({ ...formData, tax_rate: Number(v) })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">0%</SelectItem>
                                        <SelectItem value="7">7%</SelectItem>
                                        <SelectItem value="19">19%</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Rechnungsnummer</Label>
                            <Input value={formData.invoice_number} onChange={e => setFormData({ ...formData, invoice_number: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Kategorie</Label>
                            <Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="z.B. Getränke, Reinigung..." />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Notizen</Label>
                            <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Abbrechen</Button>
                            <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white" disabled={createMutation.isPending}>
                                {createMutation.isPending ? 'Speichern...' : 'Erfassen'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}