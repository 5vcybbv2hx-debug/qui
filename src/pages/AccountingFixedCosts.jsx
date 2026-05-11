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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
    Plus, RefreshCw, AlertTriangle, CheckCircle2, Clock, Filter,
    Euro, Calendar, ChevronRight, Pencil, Trash2, Building
} from 'lucide-react';
import { format, addMonths, startOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const fmt = (n) => n?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00';

const CATEGORIES = [
    'Pacht/Miete', 'Strom', 'Gas', 'Wasser', 'Internet/Telefon',
    'Versicherungen', 'GEMA', 'Software-Abos', 'Leasing',
    'Reinigung', 'Steuerberater', 'Müllentsorgung', 'Wartungsvertrag', 'Sonstiges'
];

const INTERVALS = ['monatlich', 'quartalsweise', 'halbjährlich', 'jährlich'];
const PAYMENT_METHODS = ['Überweisung', 'Lastschrift', 'Bar', 'Kreditkarte', 'Sonstiges'];

const EMPTY_FORM = {
    title: '', supplier_name: '', category: 'Sonstiges',
    amount_gross: '', vat_rate: 19, interval: 'monatlich',
    due_day: 1, payment_method: 'Überweisung',
    receipt_required: true, accounting_mapping: '', active: true, notes: '',
    customer_number: '', contract_number: '',
    contract_start_date: '', contract_end_date: '', notice_period_days: '',
    auto_renewal: false, auto_renewal_period_months: '',
    price_adjustment_clause: '',
    contact_person: '', contact_phone: '', contact_email: '',
    creditor_iban: '', creditor_bic: '', creditor_bank_name: '', mandate_reference: '',
    reminder_date: '', document_url: '', tax_treatment: 'Betriebsausgabe'
};

function statusConfig(status) {
    return {
        bezahlt: { label: 'Bezahlt', color: 'bg-green-500/15 text-green-400 border-green-500/20', dot: 'bg-green-400' },
        beleg_fehlt: { label: 'Beleg fehlt', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
        überfallig: { label: 'Überfällig', color: 'bg-red-500/15 text-red-400 border-red-500/20', dot: 'bg-red-500' },
        erwartet: { label: 'Erwartet', color: 'bg-secondary text-muted-foreground border-border', dot: 'bg-muted-foreground' },
    }[status] || { label: status, color: 'bg-secondary text-muted-foreground border-border', dot: 'bg-muted-foreground' };
}

function generateOccurrencesForMonth(expenses, month) {
    const monthStr = month; // 'YYYY-MM'
    return expenses
        .filter(e => e.active !== false)
        .filter(e => {
            if (e.interval === 'monatlich') return true;
            const [y, m] = monthStr.split('-').map(Number);
            if (e.interval === 'quartalsweise') return [1, 4, 7, 10].includes(m);
            if (e.interval === 'halbjährlich') return [1, 7].includes(m);
            if (e.interval === 'jährlich') return m === 1;
            return true;
        })
        .map(e => ({
            recurring_expense_id: e.id,
            _expense: e,
            month: monthStr,
            due_date: `${monthStr}-${String(e.due_day || 1).padStart(2, '0')}`,
            expected_amount: e.amount_gross || 0,
        }));
}

export default function AccountingFixedCosts() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(format(now, 'yyyy-MM'));
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [catFilter, setCatFilter] = useState('alle');
    const [view, setView] = useState('monat'); // 'monat' | 'verwaltung'

    const { data: expenses = [] } = useQuery({
        queryKey: ['recurring-expenses'],
        queryFn: () => base44.entities.RecurringExpense.list('title')
    });

    const { data: occurrences = [] } = useQuery({
        queryKey: ['recurring-expense-occurrences'],
        queryFn: () => base44.entities.RecurringExpenseOccurrence.list('-month')
    });

    const createExpenseMutation = useMutation({
        mutationFn: (data) => base44.entities.RecurringExpense.create(data),
        onSuccess: () => { queryClient.invalidateQueries(['recurring-expenses']); closeModal(); }
    });

    const updateExpenseMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.RecurringExpense.update(id, data),
        onSuccess: () => { queryClient.invalidateQueries(['recurring-expenses']); closeModal(); }
    });

    const deleteExpenseMutation = useMutation({
        mutationFn: (id) => base44.entities.RecurringExpense.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['recurring-expenses'])
    });

    const createOccurrenceMutation = useMutation({
        mutationFn: (data) => base44.entities.RecurringExpenseOccurrence.create(data),
        onSuccess: () => queryClient.invalidateQueries(['recurring-expense-occurrences'])
    });

    const updateOccurrenceMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.RecurringExpenseOccurrence.update(id, data),
        onSuccess: () => queryClient.invalidateQueries(['recurring-expense-occurrences'])
    });

    // Merge generated + real occurrences for the selected month
    const monthOccurrences = useMemo(() => {
        const generated = generateOccurrencesForMonth(expenses, selectedMonth);
        return generated.map(gen => {
            const real = occurrences.find(o => o.recurring_expense_id === gen.recurring_expense_id && o.month === selectedMonth);
            return real ? { ...gen, ...real, _expense: gen._expense } : { ...gen, status: 'erwartet', id: null };
        });
    }, [expenses, occurrences, selectedMonth]);

    const filtered = useMemo(() => {
        if (catFilter === 'alle') return monthOccurrences;
        return monthOccurrences.filter(o => o._expense?.category === catFilter);
    }, [monthOccurrences, catFilter]);

    const totals = useMemo(() => {
        const total = monthOccurrences.reduce((s, o) => s + (o.expected_amount || 0), 0);
        const paid = monthOccurrences.filter(o => o.status === 'bezahlt').reduce((s, o) => s + (o.actual_amount || o.expected_amount || 0), 0);
        const missing = monthOccurrences.filter(o => o.status !== 'bezahlt').length;
        const overdue = monthOccurrences.filter(o => o.status === 'überfallig').length;
        return { total, paid, missing, overdue };
    }, [monthOccurrences]);

    function openAdd() {
        setForm(EMPTY_FORM);
        setEditItem(null);
        setModalOpen(true);
    }

    function openEdit(expense) {
        setForm({ ...EMPTY_FORM, ...expense });
        setEditItem(expense);
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditItem(null);
        setForm(EMPTY_FORM);
    }

    function handleSave(e) {
        e.preventDefault();
        const gross = parseFloat(form.amount_gross) || 0;
        const rate = parseFloat(form.vat_rate) || 0;
        const net = gross / (1 + rate / 100);
        const data = {
            ...form,
            amount_gross: gross,
            amount_net: Math.round(net * 100) / 100,
            due_day: parseInt(form.due_day) || 1,
        };
        if (editItem) {
            updateExpenseMutation.mutate({ id: editItem.id, data });
        } else {
            createExpenseMutation.mutate(data);
        }
    }

    function toggleStatus(occ) {
        const newStatus = occ.status === 'bezahlt' ? 'beleg_fehlt' : 'bezahlt';
        if (occ.id) {
            updateOccurrenceMutation.mutate({ id: occ.id, data: { status: newStatus } });
        } else {
            createOccurrenceMutation.mutate({
                recurring_expense_id: occ.recurring_expense_id,
                month: occ.month,
                due_date: occ.due_date,
                expected_amount: occ.expected_amount,
                status: newStatus,
            });
        }
    }

    function generateForMonth() {
        monthOccurrences.forEach(occ => {
            if (!occ.id) {
                createOccurrenceMutation.mutate({
                    recurring_expense_id: occ.recurring_expense_id,
                    month: occ.month,
                    due_date: occ.due_date,
                    expected_amount: occ.expected_amount,
                    status: 'erwartet',
                });
            }
        });
    }

    if (!permissions.canViewAccounting) return <PermissionDenied message="Kein Zugriff auf Fixkosten." />;

    const monthLabel = format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: de });
    const usedCategories = [...new Set(expenses.map(e => e.category).filter(Boolean))];

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-6">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-orange-400" />
                        <h1 className="text-lg font-bold text-foreground">Fixkosten</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-8 text-xs w-36" />
                        <Button size="sm" onClick={openAdd} className="bg-orange-600 hover:bg-orange-700 text-white gap-1 h-8 shrink-0">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
                {/* Tab switcher */}
                <div className="flex gap-1 mt-2">
                    {[{ k: 'monat', l: 'Monatsansicht' }, { k: 'verwaltung', l: 'Verwaltung' }].map(t => (
                        <button key={t.k} onClick={() => setView(t.k)}
                            className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                                view === t.k ? 'bg-orange-600 text-white' : 'bg-secondary text-muted-foreground'
                            )}>
                            {t.l}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 md:px-6 space-y-4 max-w-2xl mx-auto pt-4">

                {/* KPI Row */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="p-3 bg-orange-500/10 border-orange-500/20">
                        <p className="text-xs text-orange-400 font-medium">Fixkosten {monthLabel}</p>
                        <p className="text-xl font-bold text-orange-400">{fmt(totals.total)} €</p>
                        <p className="text-xs text-muted-foreground">{monthOccurrences.length} Positionen</p>
                    </Card>
                    <Card className="p-3 bg-green-500/10 border-green-500/20">
                        <p className="text-xs text-green-400 font-medium">Bezahlt</p>
                        <p className="text-xl font-bold text-green-400">{fmt(totals.paid)} €</p>
                        <p className="text-xs text-muted-foreground">{monthOccurrences.filter(o => o.status === 'bezahlt').length} erledigt</p>
                    </Card>
                    {totals.overdue > 0 && (
                        <Card className="p-3 bg-red-500/10 border-red-500/20 col-span-2">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <p className="text-sm font-medium text-red-400">{totals.overdue} überfällige Positionen</p>
                            </div>
                        </Card>
                    )}
                    {totals.missing > 0 && (
                        <Card className="p-3 bg-amber-500/10 border-amber-500/20 col-span-2">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-400" />
                                <p className="text-sm font-medium text-amber-400">{totals.missing} Positionen noch offen</p>
                            </div>
                        </Card>
                    )}
                </div>

                {view === 'monat' && (
                    <>
                        {/* Category Filter */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            <button onClick={() => setCatFilter('alle')}
                                className={cn('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                                    catFilter === 'alle' ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground')}>
                                Alle
                            </button>
                            {usedCategories.map(cat => (
                                <button key={cat} onClick={() => setCatFilter(cat)}
                                    className={cn('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                                        catFilter === cat ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground')}>
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Generate Button */}
                        {monthOccurrences.some(o => !o.id) && (
                            <Button variant="outline" size="sm" onClick={generateForMonth} className="w-full gap-2 text-xs">
                                <RefreshCw className="w-3.5 h-3.5" />
                                Positionen für {monthLabel} anlegen
                            </Button>
                        )}

                        {/* Occurrences List */}
                        {filtered.length === 0 ? (
                            <Card className="p-12 text-center text-muted-foreground bg-card border-border">
                                <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">Keine Fixkosten für {monthLabel}</p>
                                <Button onClick={openAdd} className="mt-4 bg-orange-600 hover:bg-orange-700 text-white gap-2">
                                    <Plus className="w-4 h-4" /> Fixkosten anlegen
                                </Button>
                            </Card>
                        ) : (
                            <div className="space-y-2">
                                {filtered.map((occ, idx) => {
                                    const cfg = statusConfig(occ.status);
                                    const exp = occ._expense || {};
                                    return (
                                        <Card key={occ.id || `gen-${idx}`} className="p-4 bg-card border-border">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    {/* Ampel dot */}
                                                    <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', cfg.dot)} />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-foreground truncate">{exp.title}</p>
                                                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                                                            <span className="text-xs text-muted-foreground">{exp.category}</span>
                                                            {occ.due_date && <span className="text-xs text-muted-foreground">· Fällig: {occ.due_date?.slice(8)}.{occ.due_date?.slice(5, 7)}.</span>}
                                                            {exp.payment_method && <span className="text-xs text-muted-foreground">· {exp.payment_method}</span>}
                                                            {exp.contract_end_date && (
                                                                <span className={cn('text-xs', new Date(exp.contract_end_date) < new Date(Date.now() + 60*24*60*60*1000) ? 'text-amber-400 font-medium' : 'text-muted-foreground')}>
                                                                    · Vertragsende: {exp.contract_end_date}
                                                                    {exp.auto_renewal && ' (Auto-Verlängerung)'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-foreground">{fmt(occ.expected_amount)} €</p>
                                                        <Badge className={cn('text-[10px] border mt-0.5', cfg.color)}>{cfg.label}</Badge>
                                                    </div>
                                                    <Button
                                                        size="sm" variant="outline"
                                                        onClick={() => toggleStatus(occ)}
                                                        className={cn('h-8 w-8 p-0',
                                                            occ.status === 'bezahlt'
                                                                ? 'border-green-500/40 text-green-400 hover:bg-green-500/10'
                                                                : 'border-border text-muted-foreground hover:bg-accent'
                                                        )}
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            {exp.receipt_required && occ.status === 'bezahlt' && !occ.receipt_id && (
                                                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                                    <p className="text-xs text-amber-400">Beleg erforderlich – noch nicht verknüpft</p>
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {view === 'verwaltung' && (
                    <div className="space-y-2">
                        {expenses.length === 0 ? (
                            <Card className="p-12 text-center text-muted-foreground bg-card border-border">
                                <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">Noch keine Fixkosten angelegt</p>
                                <Button onClick={openAdd} className="mt-4 bg-orange-600 hover:bg-orange-700 text-white gap-2">
                                    <Plus className="w-4 h-4" /> Fixkosten anlegen
                                </Button>
                            </Card>
                        ) : (
                            expenses.map(exp => (
                                <Card key={exp.id} className={cn('p-4 bg-card border-border', !exp.active && 'opacity-50')}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-foreground">{exp.title}</p>
                                                <Badge variant="outline" className="text-[10px]">{exp.interval}</Badge>
                                                {!exp.active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inaktiv</Badge>}
                                            </div>
                                            <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                                <span>{exp.category}</span>
                                                <span>· {exp.payment_method}</span>
                                                {exp.due_day && <span>· Fällig: {exp.due_day}. d.M.</span>}
                                                {exp.customer_number && <span>· Kd-Nr: {exp.customer_number}</span>}
                                                {exp.contract_end_date && (
                                                    <span className={cn(new Date(exp.contract_end_date) < new Date(Date.now() + 60*24*60*60*1000) ? 'text-amber-400 font-medium' : '')}>
                                                        · Ende: {exp.contract_end_date}{exp.auto_renewal ? ' ↺' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <p className="text-sm font-bold text-foreground">{fmt(exp.amount_gross)} €</p>
                                            <Button size="sm" variant="ghost" onClick={() => openEdit(exp)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => deleteExpenseMutation.mutate(exp.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* FAB */}
            <button
                onClick={openAdd}
                className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-2xl flex items-center justify-center z-40 transition-all hover:scale-110"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Modal */}
            <Dialog open={modalOpen} onOpenChange={closeModal}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editItem ? 'Fixkosten bearbeiten' : 'Fixkosten anlegen'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-3 mt-2">
                        <div className="space-y-1.5">
                            <Label>Bezeichnung *</Label>
                            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="z.B. Strom Stadtwerke" required />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Kategorie *</Label>
                            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                <Label>Lieferant / Anbieter</Label>
                                <Input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} placeholder="Lieferantenname" />
                            </div>
                            <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                <Label>Kundennummer</Label>
                                <Input value={form.customer_number} onChange={e => setForm({ ...form, customer_number: e.target.value })} placeholder="Ihre Kundennummer" />
                            </div>
                        </div>

                        {/* Vertrag */}
                        <div className="space-y-2 p-3 rounded-lg bg-secondary/50 border border-border">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vertrag</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Vertragsnummer</Label>
                                    <Input value={form.contract_number} onChange={e => setForm({ ...form, contract_number: e.target.value })} placeholder="V-2024-001" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Kündigungsfrist (Tage)</Label>
                                    <Input type="number" value={form.notice_period_days} onChange={e => setForm({ ...form, notice_period_days: e.target.value })} placeholder="30" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Vertragsbeginn</Label>
                                    <Input type="date" value={form.contract_start_date} onChange={e => setForm({ ...form, contract_start_date: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Vertragsende</Label>
                                    <Input type="date" value={form.contract_end_date} onChange={e => setForm({ ...form, contract_end_date: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <Label className="text-xs cursor-pointer">Automatische Verlängerung</Label>
                                <Switch checked={form.auto_renewal} onCheckedChange={v => setForm({ ...form, auto_renewal: v })} />
                            </div>
                            {form.auto_renewal && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Verlängerung um (Monate)</Label>
                                    <Input type="number" value={form.auto_renewal_period_months} onChange={e => setForm({ ...form, auto_renewal_period_months: e.target.value })} placeholder="12" />
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <Label className="text-xs">Preisanpassungsklausel</Label>
                                <Input value={form.price_adjustment_clause} onChange={e => setForm({ ...form, price_adjustment_clause: e.target.value })} placeholder="z.B. VPI-gebunden, jährlich +3%" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Steuerl. Behandlung</Label>
                                    <Select value={form.tax_treatment} onValueChange={v => setForm({ ...form, tax_treatment: v })}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['Betriebsausgabe','Nicht abzugsfähig','Gemischt','Privatanteil'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Erinnerungsdatum</Label>
                                    <Input type="date" value={form.reminder_date} onChange={e => setForm({ ...form, reminder_date: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Vertragsdokument (URL)</Label>
                                <Input value={form.document_url} onChange={e => setForm({ ...form, document_url: e.target.value })} placeholder="https://..." />
                            </div>
                        </div>

                        {/* Kontaktperson */}
                        <div className="space-y-2 p-3 rounded-lg bg-secondary/50 border border-border">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kontaktperson / Kundendienst</p>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Name</Label>
                                <Input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} placeholder="Max Mustermann" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Telefon</Label>
                                    <Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="+49 ..." />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">E-Mail</Label>
                                    <Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="kontakt@..." />
                                </div>
                            </div>
                        </div>

                        {/* Bankdaten / SEPA */}
                        <div className="space-y-2 p-3 rounded-lg bg-secondary/50 border border-border">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bankdaten / SEPA</p>
                            <div className="space-y-1.5">
                                <Label className="text-xs">IBAN des Empfängers</Label>
                                <Input value={form.creditor_iban} onChange={e => setForm({ ...form, creditor_iban: e.target.value })} placeholder="DE12 3456 7890 1234 5678 90" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">BIC</Label>
                                    <Input value={form.creditor_bic} onChange={e => setForm({ ...form, creditor_bic: e.target.value })} placeholder="XXXXDEXX" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Kreditinstitut</Label>
                                    <Input value={form.creditor_bank_name} onChange={e => setForm({ ...form, creditor_bank_name: e.target.value })} placeholder="z.B. Sparkasse" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">SEPA-Mandatsreferenz (bei Lastschrift)</Label>
                                <Input value={form.mandate_reference} onChange={e => setForm({ ...form, mandate_reference: e.target.value })} placeholder="Mandatsreferenz" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Bruttobetrag (€) *</Label>
                                <Input type="number" step="0.01" value={form.amount_gross}
                                    onChange={e => setForm({ ...form, amount_gross: e.target.value })} required />
                            </div>
                            <div className="space-y-1.5">
                                <Label>USt-Satz (%)</Label>
                                <Select value={String(form.vat_rate)} onValueChange={v => setForm({ ...form, vat_rate: Number(v) })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">0%</SelectItem>
                                        <SelectItem value="7">7%</SelectItem>
                                        <SelectItem value="19">19%</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Intervall</Label>
                                <Select value={form.interval} onValueChange={v => setForm({ ...form, interval: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {INTERVALS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Fällig am (Tag)</Label>
                                <Input type="number" min="1" max="31" value={form.due_day}
                                    onChange={e => setForm({ ...form, due_day: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Zahlungsart</Label>
                            <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>DATEV-Konto</Label>
                            <Input value={form.accounting_mapping} onChange={e => setForm({ ...form, accounting_mapping: e.target.value })} placeholder="z.B. 4240" />
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <Label className="cursor-pointer">Beleg erforderlich</Label>
                            <Switch checked={form.receipt_required} onCheckedChange={v => setForm({ ...form, receipt_required: v })} />
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <Label className="cursor-pointer">Aktiv</Label>
                            <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Notizen</Label>
                            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={closeModal} className="flex-1">Abbrechen</Button>
                            <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                                disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}>
                                {editItem ? 'Speichern' : 'Anlegen'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}