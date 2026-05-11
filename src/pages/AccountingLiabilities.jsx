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
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
    Plus, AlertTriangle, CheckCircle2, Clock, TrendingDown,
    Calendar, Zap, Filter, ChevronDown, ChevronUp,
    Pencil, CreditCard, ListChecks, Euro, BarChart2
} from 'lucide-react';
import { format, isAfter, isBefore, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const fmt = (n) => n?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00';

const STATUS_CFG = {
    offen:        { label: 'Offen',          dot: 'bg-blue-400',          badge: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
    teilbezahlt:  { label: 'Teilbezahlt',    dot: 'bg-amber-400',         badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
    ratenzahlung: { label: 'Ratenzahlung',   dot: 'bg-purple-400',        badge: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
    ueberfaellig: { label: 'Überfällig',     dot: 'bg-red-500',           badge: 'bg-red-500/15 text-red-400 border-red-500/20' },
    bezahlt:      { label: 'Bezahlt',        dot: 'bg-green-400',         badge: 'bg-green-500/15 text-green-400 border-green-500/20' },
    gestundet:    { label: 'Gestundet',      dot: 'bg-slate-400',         badge: 'bg-secondary text-muted-foreground border-border' },
};

const PRIORITY_CFG = {
    niedrig:  { label: 'Niedrig',  color: 'text-muted-foreground' },
    mittel:   { label: 'Mittel',   color: 'text-amber-400' },
    hoch:     { label: 'Hoch',     color: 'text-orange-400' },
    kritisch: { label: 'Kritisch', color: 'text-red-400' },
};

const EMPTY_FORM = {
    title: '', creditor_name: '', category: '', original_amount: '', paid_amount: 0,
    due_date: '', start_date: format(new Date(), 'yyyy-MM-dd'), status: 'offen',
    priority: 'mittel', dunning_level: 0, payment_terms: '',
    payment_plan_enabled: false, installment_amount: '', installment_interval: 'monatlich',
    next_payment_date: '', final_payment_date: '', notes: '', active: true,
    customer_number: '', contract_type: 'Einmalrechnung', contract_number: '',
    contact_person: '', contact_phone: '', contact_email: '',
    creditor_iban: '', creditor_bic: '', creditor_bank_name: '',
    late_payment_fee: '', default_interest_rate: '', tax_treatment: 'Betriebsausgabe',
    reminder_date: ''
};

const EMPTY_PAYMENT = {
    payment_date: format(new Date(), 'yyyy-MM-dd'), amount: '',
    payment_method: 'Überweisung', reference: '', notes: '', status: 'durchgefuehrt'
};

function LiabilityCard({ liability, payments, onEdit, onPayment, onStatusChange }) {
    const [expanded, setExpanded] = useState(false);
    const cfg = STATUS_CFG[liability.status] || STATUS_CFG.offen;
    const priCfg = PRIORITY_CFG[liability.priority] || PRIORITY_CFG.mittel;
    const remaining = (liability.original_amount || 0) - (liability.paid_amount || 0);
    const progress = liability.original_amount > 0
        ? Math.round(((liability.paid_amount || 0) / liability.original_amount) * 100)
        : 0;
    const myPayments = payments.filter(p => p.liability_id === liability.id);
    const daysUntilDue = liability.due_date ? differenceInDays(new Date(liability.due_date), new Date()) : null;
    const isOverdue = daysUntilDue !== null && daysUntilDue < 0 && liability.status !== 'bezahlt';

    return (
        <Card className={cn('p-4 bg-card border-border', liability.status === 'bezahlt' && 'opacity-60')}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={cn('w-2.5 h-2.5 rounded-full shrink-0 mt-1.5', cfg.dot)} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">{liability.title}</p>
                            <Badge className={cn('text-[10px] border', cfg.badge)}>{cfg.label}</Badge>
                            {liability.dunning_level > 0 && (
                                <Badge className="text-[10px] border bg-red-500/15 text-red-400 border-red-500/20">
                                    Mahnung {liability.dunning_level}
                                </Badge>
                            )}
                        </div>
                        <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                            {liability.creditor_name && <span>{liability.creditor_name}</span>}
                            {liability.category && <span>· {liability.category}</span>}
                            {liability.due_date && (
                                <span className={cn(isOverdue && 'text-red-400 font-medium')}>
                                    · Fällig: {format(new Date(liability.due_date), 'dd.MM.yyyy')}
                                    {daysUntilDue !== null && liability.status !== 'bezahlt' && (
                                        <span className={cn('ml-1', isOverdue ? 'text-red-400' : daysUntilDue <= 7 ? 'text-amber-400' : '')}>
                                            ({isOverdue ? `${Math.abs(daysUntilDue)}d überfällig` : `in ${daysUntilDue}d`})
                                        </span>
                                    )}
                                </span>
                            )}
                            <span className={cn('font-medium', priCfg.color)}>· {priCfg.label}</span>
                        </div>

                        {/* Progress */}
                        {liability.original_amount > 0 && (
                            <div className="mt-2">
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>Bezahlt: {fmt(liability.paid_amount || 0)} €</span>
                                    <span>Offen: {fmt(remaining)} €</span>
                                </div>
                                <Progress value={progress} className="h-1.5" />
                            </div>
                        )}

                        {/* Installment info */}
                        {liability.payment_plan_enabled && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-purple-400">
                                <ListChecks className="w-3.5 h-3.5" />
                                <span>Rate: {fmt(liability.installment_amount)} € / {liability.installment_interval}</span>
                                {liability.next_payment_date && <span>· Nächste: {format(new Date(liability.next_payment_date), 'dd.MM.')}</span>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-start gap-2 shrink-0">
                    <div className="text-right">
                        <p className="text-base font-bold text-foreground">{fmt(liability.original_amount)} €</p>
                        {remaining > 0 && remaining < liability.original_amount && (
                            <p className="text-xs text-muted-foreground">Rest: {fmt(remaining)} €</p>
                        )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} className="h-8 w-8 p-0 text-muted-foreground">
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {expanded && (
                <div className="mt-3 pt-3 border-t border-border space-y-3">
                    {/* Payments history */}
                    {myPayments.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Zahlungshistorie</p>
                            <div className="space-y-1">
                                {myPayments.map(p => (
                                    <div key={p.id} className="flex justify-between text-xs py-1 border-b border-border last:border-0">
                                        <span className="text-muted-foreground">{format(new Date(p.payment_date), 'dd.MM.yyyy')} · {p.payment_method}</span>
                                        <span className="font-medium text-green-400">+{fmt(p.amount)} €</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bankdaten / Kundennummer */}
                    {(liability.customer_number || liability.creditor_iban) && (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                            {liability.customer_number && <p>Kundennr.: <span className="text-foreground font-medium">{liability.customer_number}</span></p>}
                            {liability.creditor_iban && <p>IBAN: <span className="text-foreground font-medium">{liability.creditor_iban}</span>{liability.creditor_bank_name && ` (${liability.creditor_bank_name})`}</p>}
                        </div>
                    )}

                    {liability.notes && (
                        <p className="text-xs text-muted-foreground italic">{liability.notes}</p>
                    )}

                    {/* Actions */}
                    {liability.status !== 'bezahlt' && (
                        <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => onPayment(liability)} className="gap-1.5 text-xs h-8 border-green-500/40 text-green-400 hover:bg-green-500/10">
                                <CreditCard className="w-3.5 h-3.5" /> Zahlung erfassen
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onEdit(liability)} className="gap-1.5 text-xs h-8">
                                <Pencil className="w-3.5 h-3.5" /> Bearbeiten
                            </Button>
                            {liability.status !== 'bezahlt' && (
                                <Button size="sm" variant="outline"
                                    onClick={() => onStatusChange(liability.id, 'bezahlt')}
                                    className="gap-1.5 text-xs h-8 border-green-500/40 text-green-400 hover:bg-green-500/10">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Als bezahlt markieren
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}

export default function AccountingLiabilities() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const now = new Date();

    const [modalOpen, setModalOpen] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [paymentTarget, setPaymentTarget] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
    const [statusFilter, setStatusFilter] = useState('alle');
    const [priorityFilter, setPriorityFilter] = useState('alle');
    const [view, setView] = useState('liste'); // 'liste' | 'woche' | 'monat'
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState(null);

    const { data: liabilities = [] } = useQuery({
        queryKey: ['liabilities'],
        queryFn: () => base44.entities.Liability.list('-due_date')
    });

    const { data: payments = [] } = useQuery({
        queryKey: ['liability-payments'],
        queryFn: () => base44.entities.LiabilityPayment.list('-payment_date')
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Liability.create(data),
        onSuccess: () => { queryClient.invalidateQueries(['liabilities']); closeModal(); }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Liability.update(id, data),
        onSuccess: () => queryClient.invalidateQueries(['liabilities'])
    });

    const createPaymentMutation = useMutation({
        mutationFn: async (data) => {
            const payment = await base44.entities.LiabilityPayment.create(data);
            // Update liability paid_amount + status
            const liability = liabilities.find(l => l.id === data.liability_id);
            if (liability) {
                const newPaid = (liability.paid_amount || 0) + parseFloat(data.amount);
                const newRemaining = (liability.original_amount || 0) - newPaid;
                const newStatus = newRemaining <= 0 ? 'bezahlt' : newPaid > 0 ? 'teilbezahlt' : liability.status;
                await base44.entities.Liability.update(liability.id, {
                    paid_amount: Math.round(newPaid * 100) / 100,
                    remaining_amount: Math.max(0, Math.round(newRemaining * 100) / 100),
                    status: newStatus
                });
            }
            return payment;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['liabilities']);
            queryClient.invalidateQueries(['liability-payments']);
            setPaymentModalOpen(false);
            setPaymentForm(EMPTY_PAYMENT);
        }
    });

    // Enrich with computed overdue status
    const enriched = useMemo(() => liabilities.map(l => {
        const isOverdue = l.due_date && isAfter(now, new Date(l.due_date)) && l.status !== 'bezahlt' && l.status !== 'gestundet';
        return { ...l, status: isOverdue && l.status === 'offen' ? 'ueberfaellig' : l.status };
    }), [liabilities]);

    const filtered = useMemo(() => {
        let res = enriched;
        if (statusFilter !== 'alle') res = res.filter(l => l.status === statusFilter);
        if (priorityFilter !== 'alle') res = res.filter(l => l.priority === priorityFilter);
        return res;
    }, [enriched, statusFilter, priorityFilter]);

    // Week view
    const weekStart = startOfWeek(now, { locale: de });
    const weekEnd = endOfWeek(now, { locale: de });
    const thisWeek = enriched.filter(l =>
        l.due_date && !isBefore(new Date(l.due_date), weekStart) && !isAfter(new Date(l.due_date), weekEnd) && l.status !== 'bezahlt'
    );

    // Month view
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const thisMonth = enriched.filter(l =>
        l.due_date && !isBefore(new Date(l.due_date), monthStart) && !isAfter(new Date(l.due_date), monthEnd)
    );

    const totals = useMemo(() => {
        const active = enriched.filter(l => l.status !== 'bezahlt');
        const total = active.reduce((s, l) => s + ((l.original_amount || 0) - (l.paid_amount || 0)), 0);
        const overdue = enriched.filter(l => l.status === 'ueberfaellig').reduce((s, l) => s + ((l.original_amount || 0) - (l.paid_amount || 0)), 0);
        const critical = enriched.filter(l => l.priority === 'kritisch' && l.status !== 'bezahlt').length;
        return { total, overdue, critical, count: active.length };
    }, [enriched]);

    function openAdd() { setForm(EMPTY_FORM); setEditItem(null); setModalOpen(true); }
    function openEdit(item) { setForm({ ...EMPTY_FORM, ...item }); setEditItem(item); setModalOpen(true); }
    function closeModal() { setModalOpen(false); setEditItem(null); setForm(EMPTY_FORM); }

    function openPayment(liability) {
        setPaymentTarget(liability);
        setPaymentForm({ ...EMPTY_PAYMENT, amount: (liability.installment_amount || liability.original_amount - (liability.paid_amount || 0)) || '' });
        setPaymentModalOpen(true);
    }

    function handleSave(e) {
        e.preventDefault();
        const data = {
            ...form,
            original_amount: parseFloat(form.original_amount) || 0,
            paid_amount: parseFloat(form.paid_amount) || 0,
            remaining_amount: (parseFloat(form.original_amount) || 0) - (parseFloat(form.paid_amount) || 0),
            dunning_level: parseInt(form.dunning_level) || 0,
            installment_amount: form.installment_amount ? parseFloat(form.installment_amount) : undefined,
        };
        if (editItem) updateMutation.mutate({ id: editItem.id, data });
        else createMutation.mutate(data);
    }

    function handlePayment(e) {
        e.preventDefault();
        createPaymentMutation.mutate({ ...paymentForm, liability_id: paymentTarget.id, amount: parseFloat(paymentForm.amount) || 0 });
    }

    async function getAiSuggestion() {
        setAiLoading(true);
        setAiSuggestion(null);
        const openItems = enriched.filter(l => l.status !== 'bezahlt').map(l => ({
            title: l.title, creditor: l.creditor_name, remaining: ((l.original_amount || 0) - (l.paid_amount || 0)).toFixed(2),
            due: l.due_date, priority: l.priority, dunning: l.dunning_level
        }));
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Du bist ein Buchhaltungsberater. Analysiere diese offenen Verbindlichkeiten und erstelle eine priorisierte "Heute zahlen"-Liste sowie eine Einschätzung der Liquiditätsbelastung:
${JSON.stringify(openItems, null, 2)}

Antworte auf Deutsch, kurz und strukturiert.`,
            response_json_schema: {
                type: 'object',
                properties: {
                    today_list: { type: 'array', items: { type: 'string' } },
                    critical_warning: { type: 'string' },
                    monthly_load: { type: 'string' },
                    recommendation: { type: 'string' }
                }
            }
        });
        setAiSuggestion(result);
        setAiLoading(false);
    }

    if (!permissions.canViewAccounting) return <PermissionDenied message="Kein Zugriff auf Verbindlichkeiten." />;

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-6">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-red-400" />
                        <h1 className="text-lg font-bold text-foreground">Verbindlichkeiten</h1>
                    </div>
                    <Button size="sm" onClick={openAdd} className="bg-red-600 hover:bg-red-700 text-white gap-1 h-8 shrink-0">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                {/* Tabs */}
                <div className="flex gap-1 mt-2">
                    {[{ k: 'liste', l: 'Alle' }, { k: 'woche', l: 'Diese Woche' }, { k: 'monat', l: 'Monat' }].map(t => (
                        <button key={t.k} onClick={() => setView(t.k)}
                            className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                                view === t.k ? 'bg-red-600 text-white' : 'bg-secondary text-muted-foreground')}>
                            {t.l}
                            {t.k === 'woche' && thisWeek.length > 0 && (
                                <span className="ml-1.5 bg-red-500 text-white rounded-full text-[10px] px-1.5 py-0.5">{thisWeek.length}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 md:px-6 space-y-4 max-w-2xl mx-auto pt-4">
                {/* KPI */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="p-3 bg-red-500/10 border-red-500/20">
                        <p className="text-xs text-red-400 font-medium">Offene Verbindlichkeiten</p>
                        <p className="text-xl font-bold text-red-400">{fmt(totals.total)} €</p>
                        <p className="text-xs text-muted-foreground">{totals.count} Positionen</p>
                    </Card>
                    <Card className="p-3 bg-amber-500/10 border-amber-500/20">
                        <p className="text-xs text-amber-400 font-medium">Überfällig</p>
                        <p className="text-xl font-bold text-amber-400">{fmt(totals.overdue)} €</p>
                        {totals.critical > 0 && <p className="text-xs text-red-400">{totals.critical} kritisch</p>}
                    </Card>
                </div>

                {/* AI Suggestion */}
                <Card className="p-3 bg-purple-500/10 border-purple-500/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-purple-400" />
                            <p className="text-sm font-medium text-foreground">KI-Zahlungsberatung</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={getAiSuggestion} disabled={aiLoading}
                            className="h-7 text-xs gap-1 border-purple-500/40 text-purple-400">
                            {aiLoading ? 'Analysiere...' : 'Analysieren'}
                        </Button>
                    </div>
                    {aiSuggestion && (
                        <div className="mt-3 space-y-2 text-xs">
                            {aiSuggestion.critical_warning && (
                                <div className="flex items-start gap-1.5 text-red-400">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <p>{aiSuggestion.critical_warning}</p>
                                </div>
                            )}
                            {aiSuggestion.today_list?.length > 0 && (
                                <div>
                                    <p className="font-medium text-foreground mb-1">Heute zahlen:</p>
                                    {aiSuggestion.today_list.map((item, i) => (
                                        <p key={i} className="text-muted-foreground">· {item}</p>
                                    ))}
                                </div>
                            )}
                            {aiSuggestion.monthly_load && <p className="text-muted-foreground">{aiSuggestion.monthly_load}</p>}
                            {aiSuggestion.recommendation && (
                                <p className="text-purple-300 italic">{aiSuggestion.recommendation}</p>
                            )}
                        </div>
                    )}
                </Card>

                {/* Filters (list view) */}
                {view === 'liste' && (
                    <>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {['alle', 'offen', 'ueberfaellig', 'teilbezahlt', 'ratenzahlung', 'gestundet', 'bezahlt'].map(s => {
                                const cfg = STATUS_CFG[s];
                                return (
                                    <button key={s} onClick={() => setStatusFilter(s)}
                                        className={cn('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                                            statusFilter === s ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground')}>
                                        {s === 'alle' ? 'Alle' : cfg?.label || s}
                                    </button>
                                );
                            })}
                        </div>

                        {filtered.length === 0 ? (
                            <Card className="p-12 text-center text-muted-foreground bg-card border-border">
                                <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">Keine Verbindlichkeiten</p>
                                <Button onClick={openAdd} className="mt-4 bg-red-600 hover:bg-red-700 text-white gap-2">
                                    <Plus className="w-4 h-4" /> Erfassen
                                </Button>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {filtered.map(l => (
                                    <LiabilityCard
                                        key={l.id} liability={l} payments={payments}
                                        onEdit={openEdit} onPayment={openPayment}
                                        onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status } })}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Week view */}
                {view === 'woche' && (
                    <div className="space-y-3">
                        <Card className="p-3 bg-card border-border">
                            <p className="text-sm font-medium text-foreground mb-1">
                                {format(weekStart, 'dd.MM.')} – {format(weekEnd, 'dd.MM.yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Fällig diese Woche: <span className="text-foreground font-semibold">
                                    {fmt(thisWeek.reduce((s, l) => s + ((l.original_amount || 0) - (l.paid_amount || 0)), 0))} €
                                </span>
                            </p>
                        </Card>
                        {thisWeek.length === 0 ? (
                            <Card className="p-8 text-center text-muted-foreground bg-card border-border">
                                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400 opacity-50" />
                                <p className="text-sm">Nichts fällig diese Woche</p>
                            </Card>
                        ) : (
                            thisWeek.map(l => (
                                <LiabilityCard key={l.id} liability={l} payments={payments}
                                    onEdit={openEdit} onPayment={openPayment}
                                    onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status } })} />
                            ))
                        )}
                    </div>
                )}

                {/* Month view */}
                {view === 'monat' && (
                    <div className="space-y-3">
                        <Card className="p-4 bg-card border-border">
                            <p className="text-sm font-medium text-foreground mb-2">
                                Liquiditätsbelastung {format(now, 'MMMM yyyy', { locale: de })}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">Fällig im Monat</p>
                                    <p className="text-lg font-bold text-red-400">
                                        {fmt(thisMonth.filter(l => l.status !== 'bezahlt').reduce((s, l) => s + ((l.original_amount || 0) - (l.paid_amount || 0)), 0))} €
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Anzahl</p>
                                    <p className="text-lg font-bold text-foreground">{thisMonth.length}</p>
                                </div>
                            </div>
                        </Card>
                        {thisMonth.map(l => (
                            <LiabilityCard key={l.id} liability={l} payments={payments}
                                onEdit={openEdit} onPayment={openPayment}
                                onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status } })} />
                        ))}
                        {thisMonth.length === 0 && (
                            <Card className="p-8 text-center text-muted-foreground bg-card border-border">
                                <p className="text-sm">Keine Verbindlichkeiten diesen Monat</p>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            {/* FAB */}
            <button onClick={openAdd}
                className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center z-40 transition-all hover:scale-110">
                <Plus className="w-6 h-6" />
            </button>

            {/* Add/Edit Modal */}
            <Dialog open={modalOpen} onOpenChange={closeModal}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editItem ? 'Verbindlichkeit bearbeiten' : 'Verbindlichkeit erfassen'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-3 mt-2">
                        <div className="space-y-1.5">
                            <Label>Bezeichnung *</Label>
                            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                <Label>Gläubiger/Kreditor</Label>
                                <Input value={form.creditor_name} onChange={e => setForm({ ...form, creditor_name: e.target.value })} />
                            </div>
                            <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                <Label>Kundennummer</Label>
                                <Input value={form.customer_number} onChange={e => setForm({ ...form, customer_number: e.target.value })} placeholder="Ihre Kundennummer beim Gläubiger" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Kategorie</Label>
                            <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="z.B. Lieferant, Finanzamt..." />
                        </div>

                        {/* Vertragsinfos */}
                        <div className="space-y-2 p-3 rounded-lg bg-secondary/50 border border-border">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vertrag</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Vertragsart</Label>
                                    <Select value={form.contract_type} onValueChange={v => setForm({ ...form, contract_type: v })}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['Einmalrechnung','Dauervertrag','Darlehen','Leasing','Sonstiges'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Vertragsnummer</Label>
                                    <Input value={form.contract_number} onChange={e => setForm({ ...form, contract_number: e.target.value })} placeholder="V-2024-001" />
                                </div>
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
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Mahngebühren (€)</Label>
                                    <Input type="number" step="0.01" value={form.late_payment_fee} onChange={e => setForm({ ...form, late_payment_fee: e.target.value })} placeholder="0,00" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Verzugszinsen (% p.a.)</Label>
                                    <Input type="number" step="0.01" value={form.default_interest_rate} onChange={e => setForm({ ...form, default_interest_rate: e.target.value })} placeholder="5,00" />
                                </div>
                            </div>
                        </div>

                        {/* Kontaktperson */}
                        <div className="space-y-2 p-3 rounded-lg bg-secondary/50 border border-border">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kontaktperson beim Gläubiger</p>
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

                        {/* Bankdaten des Gläubigers */}
                        <div className="space-y-2 p-3 rounded-lg bg-secondary/50 border border-border">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bankdaten des Gläubigers</p>
                            <div className="space-y-1.5">
                                <Label className="text-xs">IBAN</Label>
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
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Betrag (€) *</Label>
                                <Input type="number" step="0.01" value={form.original_amount}
                                    onChange={e => setForm({ ...form, original_amount: e.target.value })} required />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Bereits bezahlt (€)</Label>
                                <Input type="number" step="0.01" value={form.paid_amount}
                                    onChange={e => setForm({ ...form, paid_amount: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Fälligkeitsdatum</Label>
                                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Entstehungsdatum</Label>
                                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Status</Label>
                                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(STATUS_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Priorität</Label>
                                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(PRIORITY_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Mahnstufe</Label>
                            <Select value={String(form.dunning_level)} onValueChange={v => setForm({ ...form, dunning_level: Number(v) })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">Keine Mahnung</SelectItem>
                                    <SelectItem value="1">1. Mahnung</SelectItem>
                                    <SelectItem value="2">2. Mahnung</SelectItem>
                                    <SelectItem value="3">3. Mahnung / Inkasso</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Payment plan */}
                        <div className="flex items-center justify-between py-2">
                            <Label>Zahlungsplan aktivieren</Label>
                            <Switch checked={form.payment_plan_enabled} onCheckedChange={v => setForm({ ...form, payment_plan_enabled: v })} />
                        </div>
                        {form.payment_plan_enabled && (
                            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                <div className="space-y-1.5">
                                    <Label>Rate (€)</Label>
                                    <Input type="number" step="0.01" value={form.installment_amount}
                                        onChange={e => setForm({ ...form, installment_amount: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Intervall</Label>
                                    <Select value={form.installment_interval} onValueChange={v => setForm({ ...form, installment_interval: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="wöchentlich">Wöchentlich</SelectItem>
                                            <SelectItem value="zweiwöchentlich">14-tägig</SelectItem>
                                            <SelectItem value="monatlich">Monatlich</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Nächste Zahlung</Label>
                                    <Input type="date" value={form.next_payment_date}
                                        onChange={e => setForm({ ...form, next_payment_date: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Letzte Zahlung</Label>
                                    <Input type="date" value={form.final_payment_date}
                                        onChange={e => setForm({ ...form, final_payment_date: e.target.value })} />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label>Notizen</Label>
                            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={closeModal} className="flex-1">Abbrechen</Button>
                            <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                disabled={createMutation.isPending || updateMutation.isPending}>
                                {editItem ? 'Speichern' : 'Erfassen'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Payment Modal */}
            <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Zahlung erfassen</DialogTitle>
                    </DialogHeader>
                    {paymentTarget && (
                        <div className="mb-3 p-3 rounded-lg bg-secondary">
                            <p className="text-sm font-medium text-foreground">{paymentTarget.title}</p>
                            <p className="text-xs text-muted-foreground">
                                Offen: {fmt((paymentTarget.original_amount || 0) - (paymentTarget.paid_amount || 0))} €
                            </p>
                        </div>
                    )}
                    <form onSubmit={handlePayment} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Betrag (€) *</Label>
                                <Input type="number" step="0.01" value={paymentForm.amount}
                                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Datum *</Label>
                                <Input type="date" value={paymentForm.payment_date}
                                    onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} required />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Zahlungsart</Label>
                            <Select value={paymentForm.payment_method} onValueChange={v => setPaymentForm({ ...paymentForm, payment_method: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['Überweisung', 'Lastschrift', 'Bar', 'Kreditkarte', 'Sonstiges'].map(m =>
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Verwendungszweck</Label>
                            <Input value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Notizen</Label>
                            <Textarea value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} rows={2} />
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)} className="flex-1">Abbrechen</Button>
                            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                disabled={createPaymentMutation.isPending}>
                                Zahlung buchen
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}