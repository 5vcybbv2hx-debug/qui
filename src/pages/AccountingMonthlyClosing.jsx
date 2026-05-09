import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
    CheckCircle2, AlertTriangle, Clock, Lock, Calendar,
    TrendingUp, TrendingDown, Receipt, Building, FileText, Download, ArrowRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const fmt = (n) => n?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00';

function CheckItem({ label, status, detail, action }) {
    const config = {
        ok: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
        warn: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        error: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
        pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-secondary' },
    }[status] || { icon: Clock, color: 'text-muted-foreground', bg: 'bg-secondary' };
    const Icon = config.icon;
    return (
        <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-center gap-3 min-w-0">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', config.bg)}>
                    <Icon className={cn('w-4 h-4', config.color)} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
                </div>
            </div>
            {action}
        </div>
    );
}

export default function AccountingMonthlyClosing() {
    const queryClient = useQueryClient();
    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [notes, setNotes] = useState('');

    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth - 1));
    const monthEnd = endOfMonth(monthStart);
    const daysInMonth = getDaysInMonth(monthStart);
    const monthLabel = format(monthStart, 'MMMM yyyy', { locale: de });

    const { data: cashbookEntries = [] } = useQuery({ queryKey: ['cashbook-entries'], queryFn: () => base44.entities.CashbookEntry.list('-date') });
    const { data: receipts = [] } = useQuery({ queryKey: ['accounting-receipts'], queryFn: () => base44.entities.AccountingReceipt.list('-receipt_date') });
    const { data: creditorInvoices = [] } = useQuery({ queryKey: ['creditor-invoices'], queryFn: () => base44.entities.CreditorInvoice.list('-invoice_date') });
    const { data: dailyRevenues = [] } = useQuery({ queryKey: ['daily-revenues'], queryFn: () => base44.entities.DailyRevenue.list('-date') });
    const { data: closings = [] } = useQuery({ queryKey: ['monthly-closings'], queryFn: () => base44.entities.MonthlyClosing.list('-year') });

    const createClosingMutation = useMutation({
        mutationFn: (data) => base44.entities.MonthlyClosing.create(data),
        onSuccess: () => { queryClient.invalidateQueries(['monthly-closings']); setConfirmOpen(false); }
    });

    const updateClosingMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.MonthlyClosing.update(id, data),
        onSuccess: () => queryClient.invalidateQueries(['monthly-closings'])
    });

    const currentClosing = closings.find(c => c.year === selectedYear && c.month === selectedMonth);
    const isLocked = currentClosing?.status === 'gesperrt' || currentClosing?.status === 'abgeschlossen';

    const checks = useMemo(() => {
        const monthRevenues = dailyRevenues.filter(r => r.date >= format(monthStart, 'yyyy-MM-dd') && r.date <= format(monthEnd, 'yyyy-MM-dd'));
        const monthReceipts = receipts.filter(r => r.receipt_date >= format(monthStart, 'yyyy-MM-dd') && r.receipt_date <= format(monthEnd, 'yyyy-MM-dd'));
        const monthCreditorsOpen = creditorInvoices.filter(i => i.invoice_date >= format(monthStart, 'yyyy-MM-dd') && i.invoice_date <= format(monthEnd, 'yyyy-MM-dd') && i.payment_status !== 'bezahlt');
        const openReceipts = monthReceipts.filter(r => r.status === 'neu' || r.status === 'pruefung');
        const totalRevenue = monthRevenues.reduce((s, r) => s + (r.revenue || 0), 0);
        const totalExpenses = cashbookEntries.filter(e => e.date >= format(monthStart, 'yyyy-MM-dd') && e.date <= format(monthEnd, 'yyyy-MM-dd') && e.entry_type === 'Ausgabe').reduce((s, e) => s + (e.amount || 0), 0);

        return {
            monthRevenues,
            monthReceipts,
            openReceipts,
            monthCreditorsOpen,
            totalRevenue,
            totalExpenses,
            revenueCheck: monthRevenues.length >= Math.floor(daysInMonth * 0.6),
            receiptsCheck: openReceipts.length === 0,
            creditorsCheck: monthCreditorsOpen.length === 0,
        };
    }, [cashbookEntries, receipts, creditorInvoices, dailyRevenues, selectedYear, selectedMonth]);

    const checksPassed = [checks.revenueCheck, checks.receiptsCheck, checks.creditorsCheck].filter(Boolean).length;
    const progress = Math.round((checksPassed / 3) * 100);

    const handleClose = () => {
        const data = {
            year: selectedYear, month: selectedMonth, status: 'abgeschlossen',
            total_revenue: checks.totalRevenue, total_expenses: checks.totalExpenses,
            total_receipts: checks.monthReceipts.length, missing_receipts: checks.openReceipts.length,
            open_invoices: checks.monthCreditorsOpen.length, closed_by: 'Manager', closed_at: new Date().toISOString(),
            notes, checklist: { revenue: checks.revenueCheck, receipts: checks.receiptsCheck, creditors: checks.creditorsCheck }
        };
        if (currentClosing) {
            updateClosingMutation.mutate({ id: currentClosing.id, data: { ...data, status: 'gesperrt' } });
        } else {
            createClosingMutation.mutate(data);
        }
    };

    const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(2024, i), 'MMMM', { locale: de }) }));

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-6">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-cyan-400" />
                        <h1 className="text-lg font-bold text-foreground">Monatsabschluss</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
                            className="text-xs bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground">
                            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                            className="text-xs bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground">
                            {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="px-4 md:px-6 space-y-5 max-w-2xl mx-auto pt-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground">{monthLabel}</h2>
                    <Badge className={cn('text-xs border',
                        currentClosing?.status === 'abgeschlossen' || currentClosing?.status === 'gesperrt'
                            ? 'bg-green-500/15 text-green-400 border-green-500/20'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                    )}>
                        {currentClosing?.status || 'Offen'}
                    </Badge>
                </div>

                {/* Progress */}
                <Card className="p-4 bg-card border-border">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">Fortschritt</p>
                        <p className="text-sm font-bold text-foreground">{checksPassed}/3 Checks</p>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                        {progress === 100 ? '✅ Alle Prüfungen bestanden – Abschluss möglich' : 'Bitte alle offenen Punkte beheben'}
                    </p>
                </Card>

                {/* KPIs */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="p-3 bg-green-500/10 border-green-500/20">
                        <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                            <p className="text-xs text-green-400 font-medium">Einnahmen</p>
                        </div>
                        <p className="text-lg font-bold text-green-400">{fmt(checks.totalRevenue)} €</p>
                        <p className="text-xs text-muted-foreground">{checks.monthRevenues.length} Tage</p>
                    </Card>
                    <Card className="p-3 bg-red-500/10 border-red-500/20">
                        <div className="flex items-center gap-1.5 mb-1">
                            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                            <p className="text-xs text-red-400 font-medium">Ausgaben</p>
                        </div>
                        <p className="text-lg font-bold text-red-400">{fmt(checks.totalExpenses)} €</p>
                    </Card>
                </div>

                {/* Checkliste */}
                <Card className="p-4 bg-card border-border">
                    <h3 className="font-semibold text-foreground mb-1 text-sm">Prüfliste</h3>
                    <CheckItem
                        label="Tagesabschlüsse vollständig"
                        status={checks.revenueCheck ? 'ok' : 'warn'}
                        detail={`${checks.monthRevenues.length} von ca. ${Math.floor(daysInMonth * 0.8)} Tagen erfasst`}
                        action={!checks.revenueCheck && (
                            <Link to="/DailyAnalysis">
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                    Öffnen <ArrowRight className="w-3 h-3" />
                                </Button>
                            </Link>
                        )}
                    />
                    <CheckItem
                        label="Belege vollständig geprüft"
                        status={checks.receiptsCheck ? 'ok' : 'warn'}
                        detail={checks.openReceipts.length > 0 ? `${checks.openReceipts.length} Belege ausstehend` : 'Alle Belege freigegeben'}
                        action={!checks.receiptsCheck && (
                            <Link to="/AccountingReceipts">
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                    Öffnen <ArrowRight className="w-3 h-3" />
                                </Button>
                            </Link>
                        )}
                    />
                    <CheckItem
                        label="Offene Kreditoren geprüft"
                        status={checks.creditorsCheck ? 'ok' : 'warn'}
                        detail={checks.monthCreditorsOpen.length > 0 ? `${checks.monthCreditorsOpen.length} offene Rechnungen` : 'Alle Rechnungen bezahlt'}
                        action={!checks.creditorsCheck && (
                            <Link to="/AccountingCreditors">
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                    Öffnen <ArrowRight className="w-3 h-3" />
                                </Button>
                            </Link>
                        )}
                    />
                </Card>

                {/* Actions */}
                {!isLocked && (
                    <div className="space-y-2">
                        <Link to="/AccountingExport">
                            <Button variant="outline" className="w-full gap-2">
                                <Download className="w-4 h-4" />Export erstellen
                            </Button>
                        </Link>
                        <Button
                            onClick={() => setConfirmOpen(true)}
                            disabled={progress < 100}
                            className={cn('w-full gap-2', progress === 100 ? 'bg-green-600 hover:bg-green-700 text-white' : 'opacity-50 cursor-not-allowed')}
                        >
                            <Lock className="w-4 h-4" />Monat abschließen & sperren
                        </Button>
                        {progress < 100 && <p className="text-xs text-center text-muted-foreground">Alle Prüfpunkte müssen bestanden sein</p>}
                    </div>
                )}

                {isLocked && (
                    <Card className="p-4 bg-green-500/10 border-green-500/20 text-center">
                        <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="font-semibold text-green-400">Monat abgeschlossen</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {currentClosing?.closed_at ? format(new Date(currentClosing.closed_at), 'dd.MM.yyyy HH:mm') : ''}
                        </p>
                    </Card>
                )}

                {/* Previous closings */}
                {closings.length > 0 && (
                    <Card className="p-4 bg-card border-border">
                        <h3 className="font-semibold text-foreground text-sm mb-3">Frühere Abschlüsse</h3>
                        <div className="space-y-2">
                            {closings.slice(0, 5).map(c => (
                                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                                    <p className="text-sm text-foreground">
                                        {format(new Date(c.year, c.month - 1), 'MMMM yyyy', { locale: de })}
                                    </p>
                                    <Badge className={cn('text-xs border',
                                        c.status === 'abgeschlossen' || c.status === 'gesperrt'
                                            ? 'bg-green-500/15 text-green-400 border-green-500/20'
                                            : 'bg-secondary text-muted-foreground'
                                    )}>
                                        {c.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {/* Confirm Dialog */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-amber-400" />
                            Monat {monthLabel} abschließen?
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-2">
                        <p className="text-sm text-muted-foreground">
                            Der Monat wird nach Abschluss gesperrt. Änderungen sind danach nicht mehr möglich.
                        </p>
                        <Textarea placeholder="Abschlussnotizen (optional)..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="flex-1">Abbrechen</Button>
                            <Button onClick={handleClose} className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={createClosingMutation.isPending || updateClosingMutation.isPending}>
                                Abschließen
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}