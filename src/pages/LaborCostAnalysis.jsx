import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, DollarSign, Clock, Calendar } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function LaborCostAnalysis() {
    const permissions = usePermissions();
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time-entries'],
        queryFn: () => base44.entities.TimeEntry.list('-date'),
        staleTime: 2 * 60 * 1000,
    });

    const { data: salesReports = [] } = useQuery({
        queryKey: ['sales-reports'],
        queryFn: () => base44.entities.SalesReport.list('-report_date'),
        staleTime: 5 * 60 * 1000,
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.list('name'),
        staleTime: 5 * 60 * 1000,
    });

    const analysis = useMemo(() => {
        const monthStart = startOfMonth(new Date(selectedMonth));
        const monthEnd = endOfMonth(new Date(selectedMonth));

        // Filter Daten für gewählten Monat
        const monthTimeEntries = timeEntries.filter(te => {
            const date = parseISO(te.date);
            return date >= monthStart && date <= monthEnd && te.status === 'approved';
        });

        const monthSalesReports = salesReports.filter(sr => {
            const date = parseISO(sr.report_date);
            return date >= monthStart && date <= monthEnd && sr.processing_status === 'completed';
        });

        // Gesamtumsatz
        const totalRevenue = monthSalesReports.reduce((sum, sr) => sum + (sr.total_revenue || 0), 0);

        // Personalkosten
        const totalLaborCost = monthTimeEntries.reduce((sum, te) => {
            return sum + (te.hours_worked * te.hourly_rate);
        }, 0);

        // Personalkosten-Quote
        const laborCostRatio = totalRevenue > 0 ? (totalLaborCost / totalRevenue * 100) : 0;

        // Tägliche Analyse
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const dailyData = days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            
            const dayEntries = monthTimeEntries.filter(te => te.date === dateStr);
            const dayRevenue = monthSalesReports
                .filter(sr => sr.report_date === dateStr)
                .reduce((sum, sr) => sum + (sr.total_revenue || 0), 0);
            
            const dayLaborCost = dayEntries.reduce((sum, te) => 
                sum + (te.hours_worked * te.hourly_rate), 0
            );
            
            const dayHours = dayEntries.reduce((sum, te) => sum + te.hours_worked, 0);
            const dayStaff = new Set(dayEntries.map(te => te.employee_id)).size;

            return {
                date: format(day, 'dd.MM', { locale: de }),
                fullDate: dateStr,
                revenue: dayRevenue,
                laborCost: dayLaborCost,
                hours: dayHours,
                staff: dayStaff,
                ratio: dayRevenue > 0 ? (dayLaborCost / dayRevenue * 100) : 0,
                revenuePerHour: dayHours > 0 ? dayRevenue / dayHours : 0,
            };
        });

        // Mitarbeiter-Produktivität
        const employeeStats = {};
        monthTimeEntries.forEach(te => {
            if (!employeeStats[te.employee_id]) {
                employeeStats[te.employee_id] = {
                    name: te.employee_name,
                    hours: 0,
                    cost: 0,
                    days: 0
                };
            }
            employeeStats[te.employee_id].hours += te.hours_worked;
            employeeStats[te.employee_id].cost += te.hours_worked * te.hourly_rate;
            employeeStats[te.employee_id].days += 1;
        });

        const employeeList = Object.values(employeeStats)
            .sort((a, b) => b.hours - a.hours)
            .slice(0, 10);

        // Wochentags-Analyse
        const weekdayStats = {};
        dailyData.forEach(day => {
            const date = parseISO(day.fullDate);
            const weekday = format(date, 'EEEE', { locale: de });
            
            if (!weekdayStats[weekday]) {
                weekdayStats[weekday] = {
                    weekday,
                    count: 0,
                    totalRevenue: 0,
                    totalCost: 0,
                    totalHours: 0,
                    totalStaff: 0
                };
            }
            
            weekdayStats[weekday].count += 1;
            weekdayStats[weekday].totalRevenue += day.revenue;
            weekdayStats[weekday].totalCost += day.laborCost;
            weekdayStats[weekday].totalHours += day.hours;
            weekdayStats[weekday].totalStaff += day.staff;
        });

        const weekdayList = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
            .map(wd => {
                const stats = weekdayStats[wd];
                if (!stats) return null;
                return {
                    weekday: wd,
                    avgRevenue: stats.totalRevenue / stats.count,
                    avgCost: stats.totalCost / stats.count,
                    avgHours: stats.totalHours / stats.count,
                    avgStaff: stats.totalStaff / stats.count,
                    avgRatio: stats.totalRevenue > 0 ? (stats.totalCost / stats.totalRevenue * 100) : 0
                };
            })
            .filter(Boolean);

        return {
            totalRevenue,
            totalLaborCost,
            laborCostRatio,
            totalHours: monthTimeEntries.reduce((sum, te) => sum + te.hours_worked, 0),
            avgRevenuePerHour: monthTimeEntries.length > 0 ? 
                totalRevenue / monthTimeEntries.reduce((sum, te) => sum + te.hours_worked, 0) : 0,
            dailyData: dailyData.filter(d => d.revenue > 0 || d.laborCost > 0),
            employeeList,
            weekdayList
        };
    }, [timeEntries, salesReports, selectedMonth]);

    if (!permissions.canViewAnalytics) {
        return <PermissionDenied />;
    }

    const isGoodRatio = analysis.laborCostRatio <= 30;
    const isOkRatio = analysis.laborCostRatio > 30 && analysis.laborCostRatio <= 40;

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3">
                <h1 className="text-2xl font-bold text-white">Personalkosten-Analyse</h1>
                <p className="text-slate-400">Verknüpfung von Arbeitszeiten und Umsatz für optimale Personalplanung</p>
                
                <div className="flex gap-2">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    />
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Gesamtumsatz
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {analysis.totalRevenue.toFixed(2)} €
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Personalkosten
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {analysis.totalLaborCost.toFixed(2)} €
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {analysis.totalHours.toFixed(1)} Stunden
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Personalkosten-Quote
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <div className={`text-2xl font-bold ${
                                isGoodRatio ? 'text-green-400' : 
                                isOkRatio ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                                {analysis.laborCostRatio.toFixed(1)}%
                            </div>
                            {isGoodRatio ? (
                                <Badge className="bg-green-600">Optimal</Badge>
                            ) : isOkRatio ? (
                                <Badge className="bg-yellow-600">OK</Badge>
                            ) : (
                                <Badge className="bg-red-600">Zu hoch</Badge>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Ziel: 25-30%
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Umsatz pro Stunde
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {analysis.avgRevenuePerHour.toFixed(2)} €
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Täglicher Verlauf */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">Täglicher Verlauf</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analysis.dailyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="revenue" 
                                name="Umsatz (€)" 
                                stroke="#22c55e" 
                                strokeWidth={2}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="laborCost" 
                                name="Personalkosten (€)" 
                                stroke="#f59e0b" 
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Wochentags-Analyse */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">Durchschnitt nach Wochentag</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analysis.weekdayList}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="weekday" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Bar dataKey="avgRevenue" name="Ø Umsatz" fill="#22c55e" />
                            <Bar dataKey="avgCost" name="Ø Personalkosten" fill="#f59e0b" />
                        </BarChart>
                    </ResponsiveContainer>
                    
                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {analysis.weekdayList.map(wd => (
                            <div key={wd.weekday} className="p-3 bg-slate-900 rounded-lg">
                                <h4 className="font-semibold text-white mb-2">{wd.weekday}</h4>
                                <div className="text-xs text-slate-400 space-y-1">
                                    <p>Ø Stunden: {wd.avgHours.toFixed(1)}</p>
                                    <p>Ø Personal: {wd.avgStaff.toFixed(1)}</p>
                                    <p className={`font-semibold ${
                                        wd.avgRatio <= 30 ? 'text-green-400' : 
                                        wd.avgRatio <= 40 ? 'text-yellow-400' : 'text-red-400'
                                    }`}>
                                        Quote: {wd.avgRatio.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Top Mitarbeiter nach Stunden */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">Mitarbeiter-Übersicht</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {analysis.employeeList.map((emp, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                                <div>
                                    <h4 className="font-semibold text-white">{emp.name}</h4>
                                    <p className="text-xs text-slate-400">
                                        {emp.hours.toFixed(1)} Std. • {emp.days} Tage
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-amber-400">
                                        {emp.cost.toFixed(2)} €
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Ø {(emp.cost / emp.days).toFixed(2)} € / Tag
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Empfehlungen */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">Optimierungsempfehlungen</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {analysis.laborCostRatio > 40 && (
                            <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
                                <p className="text-red-400 font-semibold mb-1">⚠️ Personalkosten zu hoch</p>
                                <p className="text-sm text-slate-300">
                                    Die Personalkosten-Quote liegt bei {analysis.laborCostRatio.toFixed(1)}%. 
                                    Ziel sollten 25-30% sein. Prüfe die Personalbesetzung an umsatzschwachen Tagen.
                                </p>
                            </div>
                        )}
                        
                        {analysis.laborCostRatio <= 30 && (
                            <div className="p-3 bg-green-900/20 border border-green-800 rounded-lg">
                                <p className="text-green-400 font-semibold mb-1">✓ Optimale Personalkosten</p>
                                <p className="text-sm text-slate-300">
                                    Die Personalkosten-Quote von {analysis.laborCostRatio.toFixed(1)}% liegt im optimalen Bereich.
                                </p>
                            </div>
                        )}

                        {analysis.weekdayList.some(wd => wd.avgRatio > 50) && (
                            <div className="p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                                <p className="text-yellow-400 font-semibold mb-1">💡 Schichtplanung optimieren</p>
                                <p className="text-sm text-slate-300">
                                    An folgenden Tagen ist die Personalkosten-Quote erhöht: {' '}
                                    {analysis.weekdayList
                                        .filter(wd => wd.avgRatio > 50)
                                        .map(wd => wd.weekday)
                                        .join(', ')
                                    }. Reduziere ggf. die Personalbesetzung.
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}