import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Input } from '@/components/ui/input';
import { Upload, DollarSign, Users, Gift, Loader2, ChevronLeft, ChevronRight, CalendarDays, RefreshCw, CheckCircle2, TrendingDown, Info, Pencil, Check, X } from 'lucide-react';
import { format, parseISO, addDays, subDays, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import PDFUploadModal from '@/components/dailyanalysis/PDFUploadModal.jsx';
import TipCalculator from '@/components/dailyanalysis/TipCalculator.jsx';
import DailyRevenueList from '@/components/dailyanalysis/DailyRevenueList.jsx';
import InsightsPanel from '@/components/dailyanalysis/InsightsPanel.jsx';
import { cn } from '@/lib/utils';

// An employee is "daily-paid" (Aushilfe) if their role is Aushilfe OR they have an hourly_rate but no monthly contract
const isDailyPaid = (employee) => {
    if (!employee) return false;
    return employee.role === 'Aushilfe' || (employee.hourly_rate > 0 && employee.contract_type === 'Minijob');
};

function KpiCard({ icon: Icon, label, value, sub, color = 'text-foreground', highlight = false, children }) {
    return (
        <Card className={cn('bg-card border-border', highlight && 'border-amber-500/50 bg-amber-500/5')}>
            <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {label}
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
                <div className={cn('text-2xl font-bold', color)}>{value}</div>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
                {children}
            </CardContent>
        </Card>
    );
}

export default function DailyAnalysis() {
    const permissions = usePermissions();
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [tipCalculatorOpen, setTipCalculatorOpen] = useState(false);
    const [reanalyzingAll, setReanalyzingAll] = useState(false);
    const [reanalyzeProgress, setReanalyzeProgress] = useState({ done: 0, total: 0, errors: [] });
    const [reanalyzeOpen, setReanalyzeOpen] = useState(false);
    const [editingManual, setEditingManual] = useState(null); // 'daily' | 'fulltime' | null
    const [manualInput, setManualInput] = useState('');
    const [savingManual, setSavingManual] = useState(false);
    const queryClient = useQueryClient();

    const { data: dailyRevenues = [] } = useQuery({
        queryKey: ['daily-revenues'],
        queryFn: () => base44.entities.DailyRevenue.list('-date'),
        staleTime: 2 * 60 * 1000,
    });

    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time-entries'],
        queryFn: () => base44.entities.TimeEntry.list('-date', 500),
        staleTime: 2 * 60 * 1000,
    });

    const { data: tipDistributions = [] } = useQuery({
        queryKey: ['tip-distributions'],
        queryFn: () => base44.entities.TipDistribution.list('-date'),
        staleTime: 2 * 60 * 1000,
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.list('name'),
        staleTime: 5 * 60 * 1000,
    });

    const { data: salesReports = [] } = useQuery({
        queryKey: ['sales-reports'],
        queryFn: () => base44.entities.SalesReport.list('-report_date'),
        staleTime: 2 * 60 * 1000,
    });

    const getOperatingDate = (timeEntry) => {
        const startHour = parseInt(timeEntry.start_time.split(':')[0]);
        if (startHour < 9) {
            const prevDate = new Date(timeEntry.date);
            prevDate.setDate(prevDate.getDate() - 1);
            return prevDate.toISOString().split('T')[0];
        }
        return timeEntry.date;
    };

    const todayRevenue = dailyRevenues.find(dr => dr.date === selectedDate);
    const todayTipDistribution = tipDistributions.find(td => td.date === selectedDate);
    const todaySalesReport = salesReports.find(sr => sr.report_date === selectedDate && sr.processing_status === 'completed');
    const employeeMap = useMemo(() => new Map(employees.map(emp => [emp.id, emp])), [employees]);

    // Build enriched time entries for the day
    const todayTimeEntriesWithRates = useMemo(() => {
        const dayEntries = timeEntries.filter(te => getOperatingDate(te) === selectedDate && te.status === 'genehmigt');

        if (todaySalesReport?.labor_costs_details && Array.isArray(todaySalesReport.labor_costs_details)) {
            return todaySalesReport.labor_costs_details.map((detail, idx) => {
                const emp = employees.find(e => e.id === detail.employee_id) || null;
                return {
                    id: `report-${idx}`,
                    employee_id: detail.employee_id || `unknown-${idx}`,
                    employee_name: detail.employee_name || 'Unbekannt',
                    total_hours: detail.hours || 0,
                    hourly_rate: detail.hourly_rate || 0,
                    cost: detail.cost || 0,
                    date: selectedDate,
                    start_time: '',
                    end_time: '',
                    _isDaily: emp ? isDailyPaid(emp) : (detail.hourly_rate > 0),
                    _contractType: emp?.contract_type || '',
                    _role: emp?.role || '',
                };
            });
        }

        return dayEntries.map(te => {
            const emp = employeeMap.get(te.employee_id);
            const hourlyRate = emp?.hourly_rate || 0;
            return {
                ...te,
                hourly_rate: hourlyRate,
                cost: te.total_hours * hourlyRate,
                _isDaily: emp ? isDailyPaid(emp) : false,
                _contractType: emp?.contract_type || '',
                _role: emp?.role || '',
            };
        });
    }, [timeEntries, selectedDate, todaySalesReport, employees, employeeMap]);

    // Split into daily-paid vs full-time
    const dailyPaidEntries = todayTimeEntriesWithRates.filter(e => e._isDaily);
    const fullTimeEntries = todayTimeEntriesWithRates.filter(e => !e._isDaily);

    const calculatedDailyLaborCost = dailyPaidEntries.reduce((s, e) => s + e.cost, 0);
    const calculatedFullTimeLaborCost = fullTimeEntries.reduce((s, e) => s + e.cost, 0);

    // Use manual values if set, otherwise use calculated
    const dailyLaborCost = todayRevenue?.manual_labor_cost_daily ?? calculatedDailyLaborCost;
    const fullTimeLaborCost = todayRevenue?.manual_labor_cost_fulltime ?? calculatedFullTimeLaborCost;
    const totalLaborCost = dailyLaborCost + fullTimeLaborCost;

    const hasManualdaily = todayRevenue?.manual_labor_cost_daily != null;
    const hasManualFulltime = todayRevenue?.manual_labor_cost_fulltime != null;

    const saveManualCost = async (type) => {
        const val = parseFloat(manualInput.replace(',', '.'));
        if (isNaN(val) || val < 0) return;
        setSavingManual(true);
        const field = type === 'daily' ? 'manual_labor_cost_daily' : 'manual_labor_cost_fulltime';
        if (todayRevenue?.id) {
            await base44.entities.DailyRevenue.update(todayRevenue.id, { [field]: val });
        } else {
            await base44.entities.DailyRevenue.create({ date: selectedDate, revenue: 0, [field]: val });
        }
        queryClient.invalidateQueries({ queryKey: ['daily-revenues'] });
        setSavingManual(false);
        setEditingManual(null);
    };

    const clearManualCost = async (type) => {
        const field = type === 'daily' ? 'manual_labor_cost_daily' : 'manual_labor_cost_fulltime';
        if (todayRevenue?.id) {
            await base44.entities.DailyRevenue.update(todayRevenue.id, { [field]: null });
            queryClient.invalidateQueries({ queryKey: ['daily-revenues'] });
        }
    };

    const revenue = todayRevenue?.revenue || 0;
    const barMinusPersonnel = revenue > 0 ? revenue - dailyLaborCost : null;
    const totalRatio = revenue > 0 ? (totalLaborCost / revenue) * 100 : null;
    const dailyRatio = revenue > 0 ? (dailyLaborCost / revenue) * 100 : null;

    const staffCount = new Set(todayTimeEntriesWithRates.map(te => te.employee_id)).size;

    const handleReanalyzeAll = async () => {
        const withPDF = dailyRevenues.filter(r => r.pdf_url);
        if (withPDF.length === 0) { alert('Keine Einträge mit PDF vorhanden.'); return; }
        setReanalyzingAll(true);
        setReanalyzeProgress({ done: 0, total: withPDF.length, errors: [] });
        setReanalyzeOpen(true);
        const errors = [];
        for (let i = 0; i < withPDF.length; i++) {
            const record = withPDF[i];
            try {
                const result = await base44.integrations.Core.InvokeLLM({
                    prompt: `Analysiere diese Z-Abschlag PDF. Extrahiere: Gesamtumsatz, Bar-Umsatz, EC-Umsatz, MwSt, Eigenbedarf. Gib JSON zurück.`,
                    file_urls: [record.pdf_url],
                    response_json_schema: {
                        type: 'object',
                        properties: {
                            revenue: { type: 'number' }, revenue_cash: { type: 'number' },
                            revenue_ec: { type: 'number' }, vat: { type: 'number' },
                            own_consumption: { type: 'number' },
                        },
                        required: ['revenue']
                    }
                });
                if (result.revenue) {
                    await base44.entities.DailyRevenue.update(record.id, {
                        revenue: result.revenue,
                        revenue_cash: result.revenue_cash ?? record.revenue_cash,
                        revenue_ec: result.revenue_ec ?? record.revenue_ec,
                        vat: result.vat ?? record.vat,
                        own_consumption: result.own_consumption ?? record.own_consumption,
                    });
                } else {
                    errors.push(`${record.date}: Kein Umsatz erkannt`);
                }
            } catch (e) {
                errors.push(`${record.date}: ${e.message}`);
            }
            setReanalyzeProgress({ done: i + 1, total: withPDF.length, errors: [...errors] });
        }
        setReanalyzingAll(false);
        queryClient.invalidateQueries({ queryKey: ['daily-revenues'] });
    };

    if (!permissions.canViewAnalytics && !permissions.isManager) return <PermissionDenied />;

    return (
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 pb-24 md:pb-8">

            {/* Header */}
            <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tagesanalyse</h1>
                        <p className="text-sm text-muted-foreground">Z-Abschlag · Personal · Trinkgeld</p>
                    </div>
                    <Button size="sm" variant="outline"
                        onClick={handleReanalyzeAll}
                        disabled={reanalyzingAll || dailyRevenues.filter(r => r.pdf_url).length === 0}
                        className="shrink-0 text-xs"
                    >
                        {reanalyzingAll ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                        PDFs ({dailyRevenues.filter(r => r.pdf_url).length})
                    </Button>
                </div>

                {/* Progress */}
                {reanalyzeOpen && (
                    <div className="bg-card border border-border rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground">
                                {reanalyzingAll ? `Analysiere... ${reanalyzeProgress.done}/${reanalyzeProgress.total}` : `Fertig ${reanalyzeProgress.done}/${reanalyzeProgress.total}`}
                            </p>
                            {!reanalyzingAll && (
                                <button onClick={() => setReanalyzeOpen(false)} className="text-muted-foreground text-xs">✕</button>
                            )}
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                            <div className="bg-amber-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${reanalyzeProgress.total ? (reanalyzeProgress.done / reanalyzeProgress.total) * 100 : 0}%` }} />
                        </div>
                        {!reanalyzingAll && reanalyzeProgress.errors.length === 0 && (
                            <p className="text-xs text-green-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Alle PDFs erfolgreich analysiert.
                            </p>
                        )}
                        {reanalyzeProgress.errors.map((e, i) => <p key={i} className="text-xs text-red-400">⚠️ {e}</p>)}
                    </div>
                )}

                {/* Date picker */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <label className="relative flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card border border-border text-foreground cursor-pointer">
                        <CalendarDays className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-medium text-sm flex-1 text-center">
                            {isToday(parseISO(selectedDate))
                                ? 'Heute'
                                : format(parseISO(selectedDate), 'EEE, dd. MMM yyyy', { locale: de })}
                        </span>
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                    </label>

                    <button
                        onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
                        disabled={isToday(parseISO(selectedDate))}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>

                    {!isToday(parseISO(selectedDate)) && (
                        <button onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                            className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 text-sm whitespace-nowrap">
                            Heute
                        </button>
                    )}
                </div>
            </div>

            {/* Insights Panel — Top issues & status */}
            <InsightsPanel
                revenue={revenue}
                dailyLaborCost={dailyLaborCost}
                fullTimeLaborCost={fullTimeLaborCost}
                dailyPaidCount={dailyPaidEntries.length}
                fullTimeCount={fullTimeEntries.length}
                totalRatio={totalRatio}
                barMinusPersonnel={barMinusPersonnel}
                staffCount={staffCount}
                dailyTimeEntriesCount={todayTimeEntriesWithRates.length}
                hasRevenue={!!todayRevenue}
            />

            {/* KPI Grid: 2 cols on mobile */}
            <div className="grid grid-cols-2 gap-3">
                {/* Revenue */}
                <KpiCard icon={DollarSign} label="Tagesumsatz" value={revenue > 0 ? `${revenue.toFixed(2)} €` : '–'} color="text-green-400"
                    sub={todayRevenue?.revenue_cash ? `Bar: ${todayRevenue.revenue_cash.toFixed(2)} €` : undefined}>
                    <Button size="sm" variant="outline" className="mt-2 w-full h-8 text-xs" onClick={() => setUploadModalOpen(true)}>
                        <Upload className="w-3 h-3 mr-1" /> Z-Abschlag
                    </Button>
                </KpiCard>

                {/* Tip */}
                <KpiCard icon={Gift} label="Trinkgeld" value={todayTipDistribution ? `${todayTipDistribution.total_tips.toFixed(2)} €` : '–'} color="text-purple-400"
                    sub={todayTipDistribution ? `${todayTipDistribution.tip_per_person.toFixed(2)} € / Person` : undefined}>
                    <Button size="sm" variant="outline" className="mt-2 w-full h-8 text-xs"
                        onClick={() => setTipCalculatorOpen(true)}
                        disabled={!todayRevenue || todayTimeEntriesWithRates.length === 0}>
                        <Gift className="w-3 h-3 mr-1" /> Berechnen
                    </Button>
                </KpiCard>

                {/* Daily paid labor */}
                <KpiCard icon={Users} label="Aushilfen Personal"
                    value={`${dailyLaborCost.toFixed(2)} €`}
                    color="text-amber-400"
                    sub={hasManualdaily ? '✎ Manuell eingetragen' : (dailyPaidEntries.length > 0
                        ? `${new Set(dailyPaidEntries.map(e => e.employee_id)).size} Pers. · ${dailyPaidEntries.reduce((s, e) => s + e.total_hours, 0).toFixed(1)}h${dailyRatio !== null ? ` · ${dailyRatio.toFixed(1)}%` : ''}`
                        : 'Keine Zeiteinträge')}>
                    {editingManual === 'daily' ? (
                        <div className="mt-2 flex gap-1">
                            <Input type="number" min={0} step={0.01} autoFocus
                                className="h-8 text-sm flex-1" placeholder="0.00"
                                value={manualInput} onChange={e => setManualInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveManualCost('daily'); if (e.key === 'Escape') setEditingManual(null); }} />
                            <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700" onClick={() => saveManualCost('daily')} disabled={savingManual}>
                                <Check className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setEditingManual(null)}>
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-2 flex gap-1">
                            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs"
                                onClick={() => { setEditingManual('daily'); setManualInput(dailyLaborCost > 0 ? dailyLaborCost.toFixed(2) : ''); }}>
                                <Pencil className="w-3 h-3 mr-1" />Manuell
                            </Button>
                            {hasManualdaily && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => clearManualCost('daily')} title="Manuellen Wert löschen">
                                    <X className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                    )}
                </KpiCard>

                {/* Full-time labor */}
                <KpiCard icon={Users} label="Festangestellte"
                    value={`${fullTimeLaborCost.toFixed(2)} €`}
                    color="text-blue-400"
                    sub={hasManualFulltime ? '✎ Manuell eingetragen' : (fullTimeEntries.length > 0
                        ? `${new Set(fullTimeEntries.map(e => e.employee_id)).size} Pers. · nur Info`
                        : 'Keine Zeiteinträge')}>
                    {editingManual === 'fulltime' ? (
                        <div className="mt-2 flex gap-1">
                            <Input type="number" min={0} step={0.01} autoFocus
                                className="h-8 text-sm flex-1" placeholder="0.00"
                                value={manualInput} onChange={e => setManualInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveManualCost('fulltime'); if (e.key === 'Escape') setEditingManual(null); }} />
                            <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700" onClick={() => saveManualCost('fulltime')} disabled={savingManual}>
                                <Check className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setEditingManual(null)}>
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-2 flex gap-1">
                            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs"
                                onClick={() => { setEditingManual('fulltime'); setManualInput(fullTimeLaborCost > 0 ? fullTimeLaborCost.toFixed(2) : ''); }}>
                                <Pencil className="w-3 h-3 mr-1" />Manuell
                            </Button>
                            {hasManualFulltime && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => clearManualCost('fulltime')} title="Manuellen Wert löschen">
                                    <X className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                    )}
                </KpiCard>
            </div>

            {/* Bar minus Personnel — prominent */}
            {revenue > 0 && (
                <Card className={cn(
                    'border-2',
                    barMinusPersonnel !== null && barMinusPersonnel >= 0
                        ? 'border-green-500/40 bg-green-500/5'
                        : 'border-red-500/40 bg-red-500/5'
                )}>
                    <CardContent className="px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                                    <TrendingDown className="w-3.5 h-3.5" />
                                    Bar minus Aushilfen-Personal
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Umsatz − tägliche Personalkosten (ohne Festangestellte)
                                </p>
                            </div>
                            <div className={cn('text-2xl font-bold shrink-0',
                                barMinusPersonnel !== null && barMinusPersonnel >= 0 ? 'text-green-400' : 'text-red-400'
                            )}>
                                {barMinusPersonnel !== null ? `${barMinusPersonnel.toFixed(2)} €` : '–'}
                            </div>
                        </div>
                        {totalRatio !== null && (
                            <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground text-xs">Gesamtpersonalquote</span>
                                    <p className={cn('font-bold', totalRatio > 35 ? 'text-red-400' : totalRatio > 25 ? 'text-amber-400' : 'text-green-400')}>
                                        {totalRatio.toFixed(1)} %
                                    </p>
                                </div>
                                {dailyRatio !== null && dailyRatio !== totalRatio && (
                                    <div>
                                        <span className="text-muted-foreground text-xs">Quote Aushilfen</span>
                                        <p className={cn('font-bold', dailyRatio > 25 ? 'text-amber-400' : 'text-green-400')}>
                                            {dailyRatio.toFixed(1)} %
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                        {fullTimeEntries.length > 0 && (
                            <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1">
                                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                Festangestellte ({fullTimeLaborCost.toFixed(2)} €) werden nicht abgezogen, da ihre Kosten im Monatsgehalt fixiert sind.
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Revenue breakdown */}
            {todayRevenue && (todayRevenue.revenue_cash || todayRevenue.revenue_ec || todayRevenue.vat || todayRevenue.own_consumption) && (
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Umsatz Aufschlüsselung</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 grid grid-cols-2 gap-2">
                        {todayRevenue.revenue_cash > 0 && (
                            <div className="bg-secondary/50 rounded-lg p-2.5">
                                <p className="text-xs text-muted-foreground">Bar</p>
                                <p className="font-bold text-foreground">{todayRevenue.revenue_cash.toFixed(2)} €</p>
                            </div>
                        )}
                        {todayRevenue.revenue_ec > 0 && (
                            <div className="bg-secondary/50 rounded-lg p-2.5">
                                <p className="text-xs text-muted-foreground">EC / Karte</p>
                                <p className="font-bold text-foreground">{todayRevenue.revenue_ec.toFixed(2)} €</p>
                            </div>
                        )}
                        {todayRevenue.vat > 0 && (
                            <div className="bg-secondary/50 rounded-lg p-2.5">
                                <p className="text-xs text-muted-foreground">MwSt.</p>
                                <p className="font-bold text-foreground">{todayRevenue.vat.toFixed(2)} €</p>
                            </div>
                        )}
                        {todayRevenue.own_consumption > 0 && (
                            <div className="bg-secondary/50 rounded-lg p-2.5">
                                <p className="text-xs text-muted-foreground">Eigenbedarf</p>
                                <p className="font-bold text-foreground">{todayRevenue.own_consumption.toFixed(2)} €</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Personnel details */}
            {todayTimeEntriesWithRates.length > 0 && (
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personalkosten Details</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                        {dailyPaidEntries.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-amber-400 mb-1.5">Aushilfen (fließen in Kalkulation ein)</p>
                                {dailyPaidEntries.map(te => (
                                    <div key={te.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{te.employee_name}</p>
                                            <p className="text-xs text-muted-foreground">{te.total_hours.toFixed(1)}h × {te.hourly_rate.toFixed(2)} €</p>
                                        </div>
                                        <span className="font-bold text-amber-400">{te.cost.toFixed(2)} €</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {fullTimeEntries.length > 0 && (
                            <div className={dailyPaidEntries.length > 0 ? 'pt-2' : ''}>
                                <p className="text-xs font-semibold text-blue-400 mb-1.5">Festangestellte (nur Info, nicht in Tageskalkulation)</p>
                                {fullTimeEntries.map(te => (
                                    <div key={te.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0 opacity-70">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{te.employee_name}</p>
                                            <p className="text-xs text-muted-foreground">{te.total_hours.toFixed(1)}h · {te._role || te._contractType}</p>
                                        </div>
                                        <span className="font-bold text-blue-400">{te.cost.toFixed(2)} €</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {todaySalesReport && (
                            <p className="text-xs text-muted-foreground pt-1">✓ Daten aus Verkaufsbericht</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tip distribution */}
            {todayTipDistribution && (
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <Gift className="w-3.5 h-3.5" /> Trinkgeldverteilung
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                        <Alert className="bg-purple-900/20 border-purple-800 py-2">
                            <AlertDescription className="text-purple-300 text-xs">
                                {todayTipDistribution.tip_percentage}% von {todayTipDistribution.total_revenue.toFixed(2)} €
                                = {todayTipDistribution.total_tips.toFixed(2)} € für {todayTipDistribution.employee_count} Personen
                            </AlertDescription>
                        </Alert>
                        {todayTipDistribution.distribution_details?.map((detail, idx) => (
                            <div key={idx} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                                <span className="text-sm font-medium text-foreground">{detail.employee_name}</span>
                                <span className="font-bold text-purple-400">{detail.tip_amount.toFixed(2)} €</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* History */}
            <DailyRevenueList
                revenues={dailyRevenues}
                timeEntries={timeEntries}
                tipDistributions={tipDistributions}
                employees={employees}
                onSelectDate={setSelectedDate}
                selectedDate={selectedDate}
            />

            {/* Modals */}
            <PDFUploadModal
                open={uploadModalOpen}
                onOpenChange={setUploadModalOpen}
                selectedDate={selectedDate}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['daily-revenues'] })}
            />
            <TipCalculator
                open={tipCalculatorOpen}
                onOpenChange={setTipCalculatorOpen}
                date={selectedDate}
                revenue={todayRevenue?.revenue || 0}
                staffCount={staffCount}
                timeEntries={todayTimeEntriesWithRates}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tip-distributions'] })}
            />
        </div>
    );
}