import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query'
import { STALE } from '@/lib/queryUtils';;
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    BookOpen, Receipt, TrendingUp, TrendingDown, AlertTriangle,
    CheckCircle2, Clock, ChevronRight, ArrowRight, Download, FileText, Layers,
    BarChart2, Euro, CreditCard, Calendar, RefreshCw, Building2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isAfter, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const fmt = (n) => n?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00';

function KpiCard({ icon: Icon, label, value, sub, color = 'amber', onClick }) {
    const colorMap = {
        amber:  { grad: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',   icon: 'bg-amber-500/15',   text: 'text-amber-400'   },
        green:  { grad: 'from-green-500/10 to-green-600/5 border-green-500/20',   icon: 'bg-green-500/15',   text: 'text-green-400'   },
        red:    { grad: 'from-red-500/10 to-red-600/5 border-red-500/20',         icon: 'bg-red-500/15',     text: 'text-red-400'     },
        blue:   { grad: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',      icon: 'bg-blue-500/15',    text: 'text-blue-400'    },
        purple: { grad: 'from-purple-500/10 to-purple-600/5 border-purple-500/20', icon: 'bg-purple-500/15', text: 'text-purple-400'  },
    };
    const cl = colorMap[color] || colorMap.amber;
    return (
        <Card
            onClick={onClick}
            className={cn(
                'p-4 bg-gradient-to-br border transition-all',
                onClick && 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
                cl.grad
            )}
        >
            <div className="flex items-start justify-between mb-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', cl.icon)}>
                    <Icon className={cn("w-5 h-5", cl.text)} />
                </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </Card>
    );
}

function StatusRow({ label, ok, warn, children }) {
    const StatusIcon = ok ? CheckCircle2 : warn ? AlertTriangle : Clock;
    const statusColor = ok ? 'text-green-400' : warn ? 'text-amber-400' : 'text-muted-foreground';
    return (
        <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-center gap-2">
                <StatusIcon className={cn('w-4 h-4', statusColor)} />
                <span className="text-sm text-foreground">{label}</span>
            </div>
            <div>{children}</div>
        </div>
    );
}

export default function AccountingDashboard() {
    const permissions = usePermissions();
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthLabel = format(now, 'MMMM yyyy', { locale: de });

    const { data: cashbookEntries = [] } = useQuery({
        queryKey: ['cashbook-entries'],
        queryFn: () => {
            const from = format(subMonths(new Date(), 12), 'yyyy-MM-dd');
            return base44.entities.CashbookEntry.filter({ date_gte: from }, '-date', 500);
        },
        staleTime: STALE.MEDIUM
    });

    const { data: receipts = [] } = useQuery({
        queryKey: ['accounting-receipts'],
        queryFn: () => {
            const from = format(subMonths(new Date(), 12), 'yyyy-MM-dd');
            return base44.entities.AccountingReceipt.filter({ receipt_date_gte: from }, '-receipt_date', 500);
        },
        staleTime: STALE.MEDIUM
    });

    const { data: creditorInvoices = [] } = useQuery({
        queryKey: ['creditor-invoices'],
        queryFn: () => {
            const from = format(subMonths(new Date(), 12), 'yyyy-MM-dd');
            return base44.entities.CreditorInvoice.filter({ invoice_date_gte: from }, '-invoice_date', 300);
        },
        staleTime: STALE.MEDIUM
    });


    const { data: dailyRevenues = [] } = useQuery({
        queryKey: ['daily-revenues'],
        queryFn: () => {
            const from = format(subMonths(new Date(), 12), 'yyyy-MM-dd');
            return base44.entities.DailyRevenue.filter({ date_gte: from }, '-date', 365);
        },
        staleTime: STALE.MEDIUM
    });

    const { data: closings = [] } = useQuery({
        queryKey: ['monthly-closings'],
        queryFn: () => base44.entities.MonthlyClosing.list('-year'),
        staleTime: STALE.MEDIUM
    });

    const { data: recurringExpenses = [] } = useQuery({
        queryKey: ['recurring-expenses'],
        queryFn: () => base44.entities.RecurringExpense.list('title'),
        staleTime: STALE.MEDIUM
    });

    const { data: recurringOccurrences = [] } = useQuery({
        queryKey: ['recurring-expense-occurrences'],
        queryFn: () => base44.entities.RecurringExpenseOccurrence.list('-month'),
        staleTime: STALE.MEDIUM
    });

    const { data: liabilities = [] } = useQuery({
        queryKey: ['liabilities'],
        queryFn: () => base44.entities.Liability.list('-due_date'),
        staleTime: STALE.MEDIUM
    });

    const stats = useMemo(() => {
        const thisMonthRevenues = dailyRevenues.filter(r => {
            const d = new Date(r.date);
            return d >= monthStart && d <= monthEnd;
        });

        const totalRevenue = thisMonthRevenues.reduce((s, r) => s + (r.revenue || 0), 0);

        const thisMonthCashbook = cashbookEntries.filter(e => {
            const d = new Date(e.date);
            return d >= monthStart && d <= monthEnd;
        });

        const totalExpenses = thisMonthCashbook
            .filter(e => e.entry_type === 'Ausgabe')
            .reduce((s, e) => s + (e.amount || 0), 0);

        const openReceipts = receipts.filter(r => r.status === 'neu' || r.status === 'pruefung').length;
        const openCreditors = creditorInvoices.filter(i => i.payment_status === 'offen' || i.payment_status === 'überfällig').length;
        const overdueCreditors = creditorInvoices.filter(i => i.payment_status === 'überfällig').length;

        const openCreditorAmount = creditorInvoices
            .filter(i => i.payment_status !== 'bezahlt')
            .reduce((s, i) => s + ((i.amount_gross || 0) - (i.paid_amount || 0)), 0);


        const currentClosing = closings.find(c => c.year === now.getFullYear() && c.month === now.getMonth() + 1);

        const thisMonthKey = format(now, 'yyyy-MM');
        const activeExpenses = recurringExpenses.filter(e => e.active !== false);
        const thisMonthOccurrences = recurringOccurrences.filter(o => o.month === thisMonthKey);
        const totalFixedCosts = activeExpenses
            .filter(e => e.interval === 'monatlich')
            .reduce((s, e) => s + (e.amount_gross || 0), 0);
        const missingFixedCostReceipts = thisMonthOccurrences.filter(o =>
            o.status !== 'bezahlt' || (activeExpenses.find(e => e.id === o.recurring_expense_id)?.receipt_required && !o.receipt_id)
        ).length;

        const openLiabilities = liabilities.filter(l => l.status !== 'bezahlt');
        const overdueLiabilities = openLiabilities.filter(l => l.due_date && isAfter(now, new Date(l.due_date)));
        const totalLiabilities = openLiabilities.reduce((s, l) => s + ((l.original_amount || 0) - (l.paid_amount || 0)), 0);

        return {
            totalRevenue, totalExpenses, openReceipts, openCreditors,
            overdueCreditors, openCreditorAmount,
            currentClosing, thisMonthRevenues,
            totalFixedCosts, missingFixedCostReceipts, activeExpenses,
            openLiabilities: openLiabilities.length, overdueLiabilities: overdueLiabilities.length, totalLiabilities
        };
    }, [cashbookEntries, receipts, creditorInvoices, dailyRevenues, closings, recurringExpenses, recurringOccurrences, liabilities]);

    const recentReceipts = receipts.slice(0, 5);

    if (!permissions.canViewAccounting) return <PermissionDenied message="Kein Zugriff auf das Buchhaltungsmodul." />;

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-6">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 md:static md:bg-transparent md:border-0 md:px-6 md:py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-foreground md:text-2xl">Buchhaltung</h1>
                        <p className="text-xs text-muted-foreground">{monthLabel}</p>
                    </div>
                    <Link to="/AccountingExport">
                        <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-primary-foreground gap-1.5 shadow-sm shadow-amber-500/20">
                            <Download className="w-4 h-4" />
                            Export
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="px-4 md:px-6 space-y-5 max-w-4xl mx-auto">
                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <KpiCard
                        icon={TrendingUp} label="Einnahmen (Monat)" color="green"
                        value={`${fmt(stats.totalRevenue)} €`}
                        sub={`${stats.thisMonthRevenues.length} Tagesabschlüsse`}
                    />
                    <KpiCard
                        icon={TrendingDown} label="Ausgaben (Monat)" color="red"
                        value={`${fmt(stats.totalExpenses)} €`}
                    />
                    <KpiCard
                        icon={Receipt} label="Offene Belege" color={stats.openReceipts > 0 ? 'amber' : 'green'}
                        value={stats.openReceipts}
                        sub="Prüfung ausstehend"
                        onClick={() => window.location.href = '/AccountingReceipts'}
                    />
                    <KpiCard
                        icon={CreditCard} label="Offene Kreditoren" color={stats.overdueCreditors > 0 ? 'red' : 'blue'}
                        value={`${fmt(stats.openCreditorAmount)} €`}
                        sub={`${stats.openCreditors} Rechnungen`}
                        onClick={() => window.location.href = '/AccountingCreditors'}
                    />
                </div>

                {/* Monatsstatus */}
                <Card className="p-4 bg-card border-border">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-foreground flex items-center gap-2">
                            <Layers className="w-4 h-4 text-amber-400" />
                            Monatsstatus – {monthLabel}
                        </h2>
                        <Link to="/AccountingMonthlyClosing">
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-amber-400">
                                Details <ArrowRight className="w-3 h-3" />
                            </Button>
                        </Link>
                    </div>
                    <StatusRow
                        label="Tagesabschlüsse"
                        ok={stats.thisMonthRevenues.length >= 20}
                        warn={stats.thisMonthRevenues.length > 0}
                    >
                        <Badge variant="outline" className="text-xs">{stats.thisMonthRevenues.length} erfasst</Badge>
                    </StatusRow>
                    <StatusRow label="Belege" ok={stats.openReceipts === 0} warn={stats.openReceipts > 0}>
                        <Badge variant="outline" className={cn('text-xs', stats.openReceipts > 0 && 'border-amber-500/40 text-amber-400')}>
                            {stats.openReceipts} offen
                        </Badge>
                    </StatusRow>
                    <StatusRow label="Kreditoren" ok={stats.openCreditors === 0} warn={stats.overdueCreditors > 0}>
                        <Badge variant="outline" className={cn('text-xs', stats.overdueCreditors > 0 && 'border-red-500/40 text-red-400')}>
                            {stats.overdueCreditors} überfällig
                        </Badge>
                    </StatusRow>
                    <StatusRow
                        label="Verbindlichkeiten"
                        ok={stats.openLiabilities === 0}
                        warn={stats.overdueLiabilities > 0}
                    >
                        <Badge variant="outline" className={cn('text-xs', stats.overdueLiabilities > 0 && 'border-red-500/40 text-red-400')}>
                            {stats.openLiabilities > 0 ? `${fmt(stats.totalLiabilities)} € offen` : 'Keine offen'}
                        </Badge>
                    </StatusRow>
                    <StatusRow
                        label="Fixkosten"
                        ok={stats.missingFixedCostReceipts === 0 && stats.activeExpenses.length > 0}
                        warn={stats.missingFixedCostReceipts > 0}
                    >
                        <Badge variant="outline" className={cn('text-xs', stats.missingFixedCostReceipts > 0 && 'border-amber-500/40 text-amber-400')}>
                            {stats.missingFixedCostReceipts > 0 ? `${stats.missingFixedCostReceipts} offen` : `${fmt(stats.totalFixedCosts)} €/Mo.`}
                        </Badge>
                    </StatusRow>
                    <StatusRow label="Monatsabschluss" ok={stats.currentClosing?.status === 'abgeschlossen'} warn={false}>
                        <Badge variant="outline" className="text-xs">
                            {stats.currentClosing?.status || 'nicht gestartet'}
                        </Badge>
                    </StatusRow>
                </Card>

                {/* Schnellnavigation */}
                <div>
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">Schnellzugriff</h2>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Kassenbuch', icon: BookOpen, href: '/AccountingCashbook', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                            { label: 'Belege', icon: Receipt, href: '/AccountingReceipts', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                            { label: 'Kreditoren', icon: TrendingDown, href: '/AccountingCreditors', color: 'text-red-400', bg: 'bg-red-500/10' },
                            { label: 'Fixkosten', icon: RefreshCw, href: '/AccountingFixedCosts', color: 'text-orange-400', bg: 'bg-orange-500/10' },
                            { label: 'Verbindlichkeiten', icon: TrendingDown, href: '/AccountingLiabilities', color: 'text-rose-400', bg: 'bg-rose-500/10' },
                            { label: 'Bankkonten', icon: Building2, href: '/AccountingBank', color: 'text-sky-400', bg: 'bg-sky-500/10' },
                            { label: 'Export', icon: Download, href: '/AccountingExport', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                            { label: 'Monatsabschluss', icon: Calendar, href: '/AccountingMonthlyClosing', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                        ].map(item => (
                            <Link key={item.href} to={item.href}>
                                <Card className="p-3.5 bg-card border-border hover:border-primary/30 hover:bg-accent/30 active:scale-[0.98] transition-all cursor-pointer group">
                                    <div className="flex items-center justify-between mb-2.5">
                                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform', item.bg)}>
                                            <item.icon className={cn('w-4 h-4', item.color)} />
                                        </div>
                                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors" />
                                    </div>
                                    <p className="text-xs font-semibold text-foreground leading-snug">{item.label}</p>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Letzte Belege */}
                {recentReceipts.length > 0 && (
                    <Card className="p-4 bg-card border-border">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-semibold text-foreground text-sm">Letzte Belege</h2>
                            <Link to="/AccountingReceipts">
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                                    Alle <ArrowRight className="w-3 h-3" />
                                </Button>
                            </Link>
                        </div>
                        <div className="space-y-2">
                            {recentReceipts.map(r => (
                                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{r.supplier_name || 'Unbekannt'}</p>
                                            <p className="text-xs text-muted-foreground">{r.receipt_date}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <p className="text-sm font-semibold text-foreground">{fmt(r.amount_gross)} €</p>
                                        <Badge className={cn('text-[10px]',
                                            r.status === 'freigegeben' ? 'bg-green-500/15 text-green-400 border-green-500/20' :
                                                r.status === 'pruefung' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' :
                                                    'bg-secondary text-muted-foreground'
                                        )}>
                                            {r.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}