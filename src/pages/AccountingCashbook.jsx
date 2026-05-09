import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, TrendingUp, TrendingDown, BookOpen, Search, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const fmt = (n) => n?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00';

const ENTRY_TYPES = ['Einnahme', 'Ausgabe', 'Privatentnahme', 'Privateinlage', 'Trinkgeld', 'Kassensturz', 'Sonstiges'];
const PAYMENT_METHODS = ['Bar', 'EC', 'Kreditkarte', 'Überweisung', 'Sonstiges'];

const typeColors = {
    'Einnahme': 'bg-green-500/15 text-green-400 border-green-500/20',
    'Ausgabe': 'bg-red-500/15 text-red-400 border-red-500/20',
    'Privatentnahme': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    'Privateinlage': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'Trinkgeld': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    'Kassensturz': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    'Sonstiges': 'bg-secondary text-muted-foreground',
};

const isIncome = (type) => ['Einnahme', 'Privateinlage', 'Trinkgeld'].includes(type);

const EMPTY_FORM = {
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    entry_type: 'Ausgabe',
    amount: '',
    tax_rate: 19,
    category: '',
    description: '',
    payment_method: 'Bar',
    notes: '',
};

export default function AccountingCashbook() {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [formData, setFormData] = useState(EMPTY_FORM);

    const { data: entries = [], isLoading } = useQuery({
        queryKey: ['cashbook-entries'],
        queryFn: () => base44.entities.CashbookEntry.list('-date')
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.CashbookEntry.create(data),
        onSuccess: () => { queryClient.invalidateQueries(['cashbook-entries']); setModalOpen(false); setFormData(EMPTY_FORM); }
    });

    const filtered = useMemo(() => {
        return entries.filter(e => {
            const monthMatch = e.date?.startsWith(selectedMonth);
            const searchMatch = !search || e.description?.toLowerCase().includes(search.toLowerCase())
                || e.category?.toLowerCase().includes(search.toLowerCase());
            return monthMatch && searchMatch;
        });
    }, [entries, selectedMonth, search]);

    const totals = useMemo(() => {
        const income = filtered.filter(e => isIncome(e.entry_type)).reduce((s, e) => s + (e.amount || 0), 0);
        const expense = filtered.filter(e => !isIncome(e.entry_type)).reduce((s, e) => s + (e.amount || 0), 0);
        return { income, expense, balance: income - expense };
    }, [filtered]);

    const handleSubmit = (ev) => {
        ev.preventDefault();
        const gross = parseFloat(formData.amount) || 0;
        const taxRate = parseFloat(formData.tax_rate) || 0;
        const net = gross / (1 + taxRate / 100);
        const tax = gross - net;
        createMutation.mutate({ ...formData, amount: gross, amount_net: Math.round(net * 100) / 100, tax_amount: Math.round(tax * 100) / 100 });
    };

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-6">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 md:static md:bg-transparent md:border-0 md:px-6 md:py-6">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-amber-400" />
                        <h1 className="text-lg font-bold text-foreground">Kassenbuch</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="month"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="h-8 text-xs w-36"
                        />
                        <Button size="sm" onClick={() => setModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white h-8 gap-1">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="px-4 md:px-6 space-y-4 max-w-2xl mx-auto">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-2">
                    <Card className="p-3 bg-green-500/10 border-green-500/20">
                        <p className="text-xs text-green-400 font-medium">Einnahmen</p>
                        <p className="text-base font-bold text-green-400">{fmt(totals.income)} €</p>
                    </Card>
                    <Card className="p-3 bg-red-500/10 border-red-500/20">
                        <p className="text-xs text-red-400 font-medium">Ausgaben</p>
                        <p className="text-base font-bold text-red-400">{fmt(totals.expense)} €</p>
                    </Card>
                    <Card className={cn('p-3 border', totals.balance >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20')}>
                        <p className="text-xs text-muted-foreground font-medium">Saldo</p>
                        <p className={cn('text-base font-bold', totals.balance >= 0 ? 'text-blue-400' : 'text-red-400')}>{fmt(totals.balance)} €</p>
                    </Card>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>

                {/* Entries */}
                {isLoading ? (
                    <div className="text-center py-12 text-muted-foreground">Lade...</div>
                ) : filtered.length === 0 ? (
                    <Card className="p-12 text-center text-muted-foreground bg-card border-border">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Keine Buchungen für diesen Monat</p>
                        <Button onClick={() => setModalOpen(true)} className="mt-4 bg-amber-600 hover:bg-amber-700 text-white">
                            <Plus className="w-4 h-4 mr-2" />Erste Buchung
                        </Button>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(entry => (
                            <Card key={entry.id} className="p-4 bg-card border-border hover:border-border/80 transition-all">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                            isIncome(entry.entry_type) ? 'bg-green-500/15' : 'bg-red-500/15'
                                        )}>
                                            {isIncome(entry.entry_type)
                                                ? <TrendingUp className="w-4 h-4 text-green-400" />
                                                : <TrendingDown className="w-4 h-4 text-red-400" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {entry.description || entry.entry_type}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                <p className="text-xs text-muted-foreground">{entry.date} {entry.time}</p>
                                                <Badge className={cn('text-[10px] border', typeColors[entry.entry_type])}>
                                                    {entry.entry_type}
                                                </Badge>
                                                {entry.category && <Badge variant="outline" className="text-[10px]">{entry.category}</Badge>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={cn('text-base font-bold',
                                            isIncome(entry.entry_type) ? 'text-green-400' : 'text-red-400'
                                        )}>
                                            {isIncome(entry.entry_type) ? '+' : '-'}{fmt(entry.amount)} €
                                        </p>
                                        {entry.payment_method && (
                                            <p className="text-xs text-muted-foreground">{entry.payment_method}</p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* FAB */}
            <button
                onClick={() => setModalOpen(true)}
                className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-2xl flex items-center justify-center z-40 transition-all hover:scale-110"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Neue Buchung</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Buchungsart *</Label>
                                <Select value={formData.entry_type} onValueChange={v => setFormData({ ...formData, entry_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {ENTRY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Betrag (Brutto) *</Label>
                                <Input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0,00" required />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Datum</Label>
                                <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Uhrzeit</Label>
                                <Input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
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
                            <div className="space-y-1.5">
                                <Label>Zahlungsart</Label>
                                <Select value={formData.payment_method} onValueChange={v => setFormData({ ...formData, payment_method: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Kategorie</Label>
                            <Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="z.B. Getränkeeinkauf, Reinigung..." />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Beschreibung</Label>
                            <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Buchungstext..." />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Notizen</Label>
                            <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Abbrechen</Button>
                            <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" disabled={createMutation.isPending}>
                                {createMutation.isPending ? 'Speichern...' : 'Buchen'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}