import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { FileText, Download, Calendar, TrendingUp, Users, Clock, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

export default function Reports() {
    const permissions = usePermissions();
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);

    // ── Data fetching ────────────────────────────────────────────────────────
    // Consistent query keys with the rest of the app (TimeTracking uses 'time-entries')
    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time-entries'],
        queryFn: () => base44.entities.TimeEntry.list('-date')
    });

    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => base44.entities.Shift.list('-date')
    });

    // Only active employees — avoids wrong stats from archived staff
    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true }, 'name')
    });

    // ── Month boundaries ─────────────────────────────────────────────────────
    const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
    const monthEnd   = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

    // Working days in selected month (Mon–Sat for a bar context)
    const daysInMonth = getDaysInMonth(selectedMonth);

    // ── Filtered data ────────────────────────────────────────────────────────
    let monthTimeEntries = timeEntries.filter(e => e.date >= monthStart && e.date <= monthEnd);
    let monthShifts      = shifts.filter(s => s.date >= monthStart && s.date <= monthEnd);

    if (selectedDay) {
        monthTimeEntries = monthTimeEntries.filter(e => e.date === selectedDay);
        monthShifts      = monthShifts.filter(s => s.date === selectedDay);
    }

    // Days that have at least one time entry or shift
    const daysWithEntries = Array.from(new Set([
        ...timeEntries.filter(e => e.date >= monthStart && e.date <= monthEnd).map(e => e.date),
        ...shifts.filter(s => s.date >= monthStart && s.date <= monthEnd).map(s => s.date)
    ])).sort();

    // ── Hours by employee ────────────────────────────────────────────────────
    const hoursByEmployee = useMemo(() => employees.map(emp => {
        const empEntries    = monthTimeEntries.filter(e => e.employee_id === emp.id);
        const totalHours    = empEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
        const approvedHours = empEntries.filter(e => e.status === 'genehmigt').reduce((sum, e) => sum + (e.total_hours || 0), 0);
        const pendingHours  = empEntries.filter(e => e.status !== 'genehmigt').reduce((sum, e) => sum + (e.total_hours || 0), 0);
        const hourlyRate    = emp.hourly_rate || 0;
        // Salary only on approved hours
        const estimatedSalary = approvedHours * hourlyRate;
        const isMinijobWarn   = emp.contract_type === 'Minijob' && approvedHours >= 43;

        return {
            id: emp.id,
            employee: emp.name,
            contractType: emp.contract_type || '-',
            hourlyRate,
            totalHours,
            approvedHours,
            pendingHours,
            estimatedSalary,
            isMinijobWarn,
            entryCount: empEntries.length
        };
    }).filter(e => e.entryCount > 0), [employees, monthTimeEntries]);

    // ── Shifts by employee — dynamic shift types ─────────────────────────────
    const allShiftTypes = useMemo(() =>
        [...new Set(monthShifts.map(s => s.shift_type).filter(Boolean))].sort()
    , [monthShifts]);

    const shiftsByEmployee = useMemo(() => employees.map(emp => {
        const empShifts  = monthShifts.filter(s => s.employee_id === emp.id);
        const byType     = allShiftTypes.reduce((acc, t) => {
            acc[t] = empShifts.filter(s => s.shift_type === t).length;
            return acc;
        }, {});
        return { id: emp.id, employee: emp.name, totalShifts: empShifts.length, byType };
    }).filter(e => e.totalShifts > 0), [employees, monthShifts, allShiftTypes]);

    // ── Overtime — uses weekly_hours from Employee if set ────────────────────
    const overtimeData = useMemo(() => employees.map(emp => {
        const empEntries = monthTimeEntries.filter(e => e.employee_id === emp.id);
        const totalHours = empEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

        // Derive expected hours: use weekly_hours * ~4.33 weeks, fallback to contract defaults
        let expectedHours;
        if (emp.weekly_hours) {
            expectedHours = Math.round(emp.weekly_hours * (daysInMonth / 7));
        } else if (emp.contract_type === 'Minijob') {
            expectedHours = 43;
        } else if (emp.contract_type === 'Teilzeit') {
            expectedHours = 80;
        } else {
            expectedHours = 160; // Vollzeit default
        }

        return {
            id: emp.id,
            employee: emp.name,
            contractType: emp.contract_type || '-',
            weeklyHours: emp.weekly_hours || null,
            totalHours,
            expectedHours,
            overtime: totalHours - expectedHours
        };
    }).filter(e => e.totalHours > 0), [employees, monthTimeEntries, daysInMonth]);

    // ── Summary KPIs ─────────────────────────────────────────────────────────
    const totalHoursAll    = hoursByEmployee.reduce((s, e) => s + e.totalHours, 0);
    const totalApproved    = hoursByEmployee.reduce((s, e) => s + e.approvedHours, 0);
    const totalSalary      = hoursByEmployee.reduce((s, e) => s + e.estimatedSalary, 0);

    if (!permissions.canViewAnalytics) {
        return <PermissionDenied message="Nur Manager haben Zugriff auf Berichte." />;
    }

    // ── CSV Export ───────────────────────────────────────────────────────────
    const exportCSV = (rows, filename) => {
        if (!rows.length) { alert('Keine Daten zum Exportieren'); return; }
        const headers = Object.keys(rows[0]).filter(k => k !== 'id');
        const csv = [
            headers.join(','),
            ...rows.map(row => headers.map(h => {
                const v = row[h]?.toString() ?? '';
                return v.includes(',') ? `"${v}"` : v;
            }).join(','))
        ].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${filename}_${format(selectedMonth, 'yyyy-MM')}.csv`;
        a.click();
    };

    const prevMonth = () => {
        setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
        setSelectedDay(null);
    };
    const nextMonth = () => {
        setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        setSelectedDay(null);
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">

                {/* Header */}
                <div className="mb-4 sm:mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">Berichte</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1">Auswertungen für {format(selectedMonth, 'MMMM yyyy', { locale: de })}</p>
                </div>

                {/* Month Selector */}
                <Card className="p-3 sm:p-4 bg-card border-border mb-4 sm:mb-6">
                    <div className="flex items-center justify-between gap-2">
                        <Button variant="outline" size="sm" onClick={prevMonth} className="h-10 px-3 min-w-[44px]">
                            <ChevronLeft className="w-4 h-4" />
                            <span className="hidden sm:inline ml-1">Vorheriger</span>
                        </Button>
                        <div className="flex items-center gap-2 text-foreground">
                            <Calendar className="w-4 h-4 text-amber-500" />
                            <span className="font-semibold text-sm sm:text-base">{format(selectedMonth, 'MMMM yyyy', { locale: de })}</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={nextMonth} className="h-10 px-3 min-w-[44px]">
                            <span className="hidden sm:inline mr-1">Nächster</span>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Day Filter */}
                    {daysWithEntries.length > 0 && (
                        <div className="border-t border-border mt-3 pt-3">
                            <p className="text-xs text-muted-foreground mb-2">Nach Tag filtern:</p>
                            <div className="flex flex-wrap gap-1.5">
                                <Button
                                    variant={selectedDay ? 'outline' : 'default'}
                                    onClick={() => setSelectedDay(null)}
                                    size="sm"
                                    className={cn('h-8 text-xs', !selectedDay && 'bg-amber-600 hover:bg-amber-700 text-white border-0')}
                                >
                                    Alle
                                </Button>
                                {daysWithEntries.map(day => (
                                    <Button
                                        key={day}
                                        variant={selectedDay === day ? 'default' : 'outline'}
                                        onClick={() => setSelectedDay(day)}
                                        size="sm"
                                        className={cn('h-8 text-xs', selectedDay === day && 'bg-amber-600 hover:bg-amber-700 text-white border-0')}
                                    >
                                        {format(new Date(day + 'T00:00'), 'd. MMM', { locale: de })}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                {/* KPI Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                    {[
                        { label: 'Gesamtstunden', value: `${totalHoursAll.toFixed(1)}h`, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                        { label: 'Genehmigt', value: `${totalApproved.toFixed(1)}h`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
                        { label: 'Mitarbeiter', value: hoursByEmployee.length, icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                        { label: 'Gehaltssumme', value: `${totalSalary.toFixed(0)}€`, icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                    ].map(({ label, value, icon: Icon, color, bg }) => (
                        <Card key={label} className="p-3 sm:p-4 bg-card border-border">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', bg)}>
                                    <Icon className={cn('w-4 h-4', color)} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{label}</p>
                                    <p className="text-lg sm:text-2xl font-bold text-foreground leading-tight">{value}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Tabs */}
                <Tabs defaultValue="hours" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3 bg-card border border-border h-auto p-1">
                        <TabsTrigger value="hours" className="data-[state=active]:bg-amber-600 py-2.5 text-xs sm:text-sm">Stunden</TabsTrigger>
                        <TabsTrigger value="shifts" className="data-[state=active]:bg-amber-600 py-2.5 text-xs sm:text-sm">Schichten</TabsTrigger>
                        <TabsTrigger value="overtime" className="data-[state=active]:bg-amber-600 py-2.5 text-xs sm:text-sm">Abweichungen</TabsTrigger>
                    </TabsList>

                    {/* ── Hours Tab ─────────────────────────────────────────────────────── */}
                    <TabsContent value="hours">
                        <Card className="bg-card border-border">
                            <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                                    <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">Stundenauswertung</h3>
                                </div>
                                <Button
                                    onClick={() => exportCSV(hoursByEmployee.map(r => ({
                                        Mitarbeiter: r.employee,
                                        Vertragsart: r.contractType,
                                        'Stundenlohn €': r.hourlyRate.toFixed(2),
                                        'Gesamt h': r.totalHours.toFixed(2),
                                        'Genehmigt h': r.approvedHours.toFixed(2),
                                        'Ausstehend h': r.pendingHours.toFixed(2),
                                        'Gehalt €': r.estimatedSalary.toFixed(2)
                                    })), 'stundenauswertung')}
                                    variant="outline" size="sm" className="shrink-0 h-8 text-xs gap-1"
                                >
                                    <Download className="w-3 h-3" />
                                    CSV
                                </Button>
                            </div>

                            {hoursByEmployee.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                    <p className="text-sm">Keine Zeiterfassungen für diesen Monat</p>
                                </div>
                            ) : (
                                <>
                                    {/* Mobile Cards */}
                                    <div className="sm:hidden divide-y divide-border">
                                        {hoursByEmployee.map(row => (
                                            <div key={row.id} className="p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-foreground text-sm">{row.employee}</span>
                                                    <div className="flex gap-1.5">
                                                        <Badge className="bg-secondary text-secondary-foreground text-[10px]">{row.contractType}</Badge>
                                                        {row.isMinijobWarn && (
                                                            <Badge className="bg-red-500/20 text-red-400 text-[10px]">
                                                                <AlertTriangle className="w-3 h-3 mr-0.5" />Limit
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="bg-secondary/40 rounded-lg p-2">
                                                        <p className="text-[10px] text-muted-foreground">Gesamt</p>
                                                        <p className="text-sm font-bold text-foreground">{row.totalHours.toFixed(1)}h</p>
                                                    </div>
                                                    <div className="bg-green-500/10 rounded-lg p-2">
                                                        <p className="text-[10px] text-muted-foreground">Genehmigt</p>
                                                        <p className="text-sm font-bold text-green-400">{row.approvedHours.toFixed(1)}h</p>
                                                    </div>
                                                    <div className="bg-amber-500/10 rounded-lg p-2">
                                                        <p className="text-[10px] text-muted-foreground">Gehalt</p>
                                                        <p className="text-sm font-bold text-amber-400">{row.estimatedSalary.toFixed(0)}€</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="p-3 bg-secondary/20 flex items-center justify-between">
                                            <span className="text-sm font-semibold text-foreground">Gesamt</span>
                                            <span className="text-sm font-bold text-amber-400">{totalSalary.toFixed(2)}€</span>
                                        </div>
                                    </div>

                                    {/* Desktop Table */}
                                    <div className="hidden sm:block overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-secondary/20">
                                                <tr>
                                                    {['Mitarbeiter','Vertrag','€/h','Gesamt','Genehmigt','Ausstehend','Gehalt'].map(h => (
                                                        <th key={h} className={cn('px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider', h === 'Mitarbeiter' ? 'text-left' : 'text-right')}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {hoursByEmployee.map(row => (
                                                    <tr key={row.id} className="hover:bg-secondary/20 transition-colors">
                                                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                                                            {row.employee}
                                                            {row.isMinijobWarn && (
                                                                <Badge className="ml-2 bg-red-500/20 text-red-400 text-[10px]">
                                                                    <AlertTriangle className="w-3 h-3 mr-0.5" />Minijob-Limit
                                                                </Badge>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <Badge className={cn('text-xs', row.isMinijobWarn ? 'bg-red-500/20 text-red-400' : 'bg-secondary text-secondary-foreground')}>{row.contractType}</Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-right text-muted-foreground">{row.hourlyRate.toFixed(2)}€</td>
                                                        <td className="px-4 py-3 text-sm text-right text-foreground">{row.totalHours.toFixed(2)}h</td>
                                                        <td className="px-4 py-3 text-sm text-right">
                                                            <Badge className="bg-green-500/20 text-green-400">{row.approvedHours.toFixed(2)}h</Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-right">
                                                            <Badge className="bg-blue-500/20 text-blue-400">{row.pendingHours.toFixed(2)}h</Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-right font-semibold text-amber-400">{row.estimatedSalary.toFixed(2)}€</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-secondary/20 font-semibold">
                                                    <td colSpan={6} className="px-4 py-3 text-sm text-right text-foreground">Gesamtsumme (genehmigt):</td>
                                                    <td className="px-4 py-3 text-sm text-right text-amber-400 font-bold">{totalSalary.toFixed(2)}€</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </Card>
                    </TabsContent>

                    {/* ── Shifts Tab ────────────────────────────────────────────────────── */}
                    <TabsContent value="shifts">
                        <Card className="bg-card border-border">
                            <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                                    <h3 className="font-semibold text-foreground text-sm sm:text-base">Schichtenübersicht</h3>
                                </div>
                                <Button
                                    onClick={() => exportCSV(shiftsByEmployee.map(r => ({
                                        Mitarbeiter: r.employee,
                                        'Schichten gesamt': r.totalShifts,
                                        ...r.byType
                                    })), 'schichten')}
                                    variant="outline" size="sm" className="shrink-0 h-8 text-xs gap-1"
                                >
                                    <Download className="w-3 h-3" />
                                    CSV
                                </Button>
                            </div>

                            {shiftsByEmployee.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                    <p className="text-sm">Keine Schichten für diesen Monat</p>
                                </div>
                            ) : (
                                <>
                                    {/* Mobile Cards */}
                                    <div className="sm:hidden divide-y divide-border">
                                        {shiftsByEmployee.map(row => (
                                            <div key={row.id} className="p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-foreground text-sm">{row.employee}</span>
                                                    <Badge className="bg-amber-500/20 text-amber-400">{row.totalShifts} Schichten</Badge>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {Object.entries(row.byType).filter(([,v]) => v > 0).map(([type, count]) => (
                                                        <span key={type} className="text-xs bg-secondary/50 text-foreground px-2 py-0.5 rounded-full">
                                                            {type}: {count}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Desktop Table — dynamic shift types */}
                                    <div className="hidden sm:block overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-secondary/20">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Mitarbeiter</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Gesamt</th>
                                                    {allShiftTypes.map(t => (
                                                        <th key={t} className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">{t}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {shiftsByEmployee.map(row => (
                                                    <tr key={row.id} className="hover:bg-secondary/20 transition-colors">
                                                        <td className="px-4 py-3 text-sm font-medium text-foreground">{row.employee}</td>
                                                        <td className="px-4 py-3 text-sm text-right font-semibold text-foreground">{row.totalShifts}</td>
                                                        {allShiftTypes.map(t => (
                                                            <td key={t} className="px-4 py-3 text-sm text-right text-muted-foreground">{row.byType[t] || 0}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </Card>
                    </TabsContent>

                    {/* ── Overtime Tab ──────────────────────────────────────────────────── */}
                    <TabsContent value="overtime">
                        <Card className="bg-card border-border">
                            <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-amber-500 shrink-0" />
                                    <h3 className="font-semibold text-foreground text-sm sm:text-base">Soll/Ist-Abgleich</h3>
                                </div>
                                <Button
                                    onClick={() => exportCSV(overtimeData.map(r => ({
                                        Mitarbeiter: r.employee,
                                        Vertragsart: r.contractType,
                                        'Wochenstunden': r.weeklyHours ?? '-',
                                        'Gearbeitet h': r.totalHours.toFixed(2),
                                        'Soll h': r.expectedHours.toFixed(2),
                                        'Differenz h': r.overtime.toFixed(2)
                                    })), 'abweichungen')}
                                    variant="outline" size="sm" className="shrink-0 h-8 text-xs gap-1"
                                >
                                    <Download className="w-3 h-3" />
                                    CSV
                                </Button>
                            </div>

                            <div className="mx-3 sm:mx-4 my-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-300">
                                ℹ️ Soll-Stunden werden aus dem Feld „Wochenstunden" im Mitarbeiterprofil berechnet. Fallback: Minijob = 43h, Teilzeit = 80h, Vollzeit = 160h
                            </div>

                            {overtimeData.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                    <p className="text-sm">Keine Daten für diesen Monat</p>
                                </div>
                            ) : (
                                <>
                                    {/* Mobile Cards */}
                                    <div className="sm:hidden divide-y divide-border">
                                        {overtimeData.map(row => {
                                            const ot = row.overtime;
                                            return (
                                                <div key={row.id} className="p-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold text-foreground text-sm">{row.employee}</span>
                                                        <Badge className={cn('text-xs', ot > 0 ? 'bg-green-500/20 text-green-400' : ot < 0 ? 'bg-red-500/20 text-red-400' : 'bg-secondary text-secondary-foreground')}>
                                                            {ot > 0 ? '+' : ''}{ot.toFixed(1)}h
                                                        </Badge>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-center">
                                                        <div className="bg-secondary/40 rounded-lg p-2">
                                                            <p className="text-[10px] text-muted-foreground">Gearbeitet</p>
                                                            <p className="text-sm font-bold text-foreground">{row.totalHours.toFixed(1)}h</p>
                                                        </div>
                                                        <div className="bg-secondary/40 rounded-lg p-2">
                                                            <p className="text-[10px] text-muted-foreground">Soll</p>
                                                            <p className="text-sm font-bold text-foreground">{row.expectedHours.toFixed(0)}h</p>
                                                        </div>
                                                        <div className="bg-secondary/40 rounded-lg p-2">
                                                            <p className="text-[10px] text-muted-foreground">Vertrag</p>
                                                            <p className="text-xs font-medium text-muted-foreground">{row.contractType}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Desktop Table */}
                                    <div className="hidden sm:block overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-secondary/20">
                                                <tr>
                                                    {['Mitarbeiter','Vertrag','Wochenstunden','Gearbeitet','Soll','Differenz'].map(h => (
                                                        <th key={h} className={cn('px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider', h === 'Mitarbeiter' ? 'text-left' : 'text-right')}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {overtimeData.map(row => {
                                                    const ot = row.overtime;
                                                    return (
                                                        <tr key={row.id} className="hover:bg-secondary/20 transition-colors">
                                                            <td className="px-4 py-3 text-sm font-medium text-foreground">{row.employee}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <Badge className="bg-secondary text-secondary-foreground text-xs">{row.contractType}</Badge>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                                                                {row.weeklyHours ? `${row.weeklyHours}h/Wo` : '—'}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-right text-foreground">{row.totalHours.toFixed(2)}h</td>
                                                            <td className="px-4 py-3 text-sm text-right text-muted-foreground">{row.expectedHours.toFixed(0)}h</td>
                                                            <td className="px-4 py-3 text-sm text-right">
                                                                <Badge className={cn(ot > 0 ? 'bg-green-500/20 text-green-400' : ot < 0 ? 'bg-red-500/20 text-red-400' : 'bg-secondary text-secondary-foreground')}>
                                                                    {ot > 0 ? '+' : ''}{ot.toFixed(2)}h
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}