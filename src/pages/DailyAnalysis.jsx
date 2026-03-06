import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Upload, DollarSign, Users, Gift, AlertCircle, Loader2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { format, parseISO, addDays, subDays, isToday, parse } from 'date-fns';
import { de } from 'date-fns/locale';
import PDFUploadModal from '@/components/dailyanalysis/PDFUploadModal.jsx';
import TipCalculator from '@/components/dailyanalysis/TipCalculator.jsx';
import DailyRevenueList from '@/components/dailyanalysis/DailyRevenueList.jsx';

export default function DailyAnalysis() {
    const permissions = usePermissions();
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [tipCalculatorOpen, setTipCalculatorOpen] = useState(false);
    const [laborCostLoading, setLaborCostLoading] = useState(false);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
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

    // Bestimme den "Betriebstag" einer Schicht (Schichten vor 09:00 Uhr gehören zum Vortag)
    const getOperatingDate = (timeEntry) => {
        const startHour = parseInt(timeEntry.start_time.split(':')[0]);
        if (startHour < 9) {
            // Schicht beginnt vor 09:00 Uhr, gehört zum Vortag
            const prevDate = new Date(timeEntry.date);
            prevDate.setDate(prevDate.getDate() - 1);
            return prevDate.toISOString().split('T')[0];
        }
        return timeEntry.date;
    };

    // Daten für aktuellen Tag
    const todayRevenue = dailyRevenues.find(dr => dr.date === selectedDate);
    const todayTimeEntries = timeEntries.filter(te => getOperatingDate(te) === selectedDate && te.status === 'genehmigt');
    const todayTipDistribution = tipDistributions.find(td => td.date === selectedDate);
    
    // Verkaufsbericht für aktuellen Tag
    const todaySalesReport = salesReports.find(sr => sr.report_date === selectedDate && sr.processing_status === 'completed');

    // Employee-Map für schnelle Lookups
    const employeeMap = new Map(employees.map(emp => [emp.id, emp]));

    // Personalkosten: Nutze SalesReport wenn verfügbar, sonst TimeEntry Daten
    let todayTimeEntriesWithRates = [];
    let totalLaborCost = 0;
    let staffCount = 0;

    if (todaySalesReport?.labor_costs_details && Array.isArray(todaySalesReport.labor_costs_details)) {
        // Aus Verkaufsbericht
        todayTimeEntriesWithRates = todaySalesReport.labor_costs_details.map((detail, idx) => ({
            id: `report-${idx}`,
            employee_id: detail.employee_id || '',
            employee_name: detail.employee_name || 'Unbekannt',
            total_hours: detail.hours || 0,
            hourly_rate: detail.hourly_rate || 0,
            cost: detail.cost || 0,
            date: selectedDate,
            start_time: '',
            end_time: ''
        }));
        totalLaborCost = todayTimeEntriesWithRates.reduce((sum, te) => sum + te.cost, 0);
        staffCount = todayTimeEntriesWithRates.length;
    } else {
        // Aus TimeEntry fallback
        todayTimeEntriesWithRates = todayTimeEntries.map(te => {
            const employee = employeeMap.get(te.employee_id);
            const hourlyRate = employee?.hourly_rate || 0;
            return {
                ...te,
                hourly_rate: hourlyRate,
                cost: te.total_hours * hourlyRate
            };
        });
        totalLaborCost = todayTimeEntriesWithRates.reduce((sum, te) => sum + te.cost, 0);
        staffCount = new Set(todayTimeEntriesWithRates.map(te => te.employee_id)).size;
    }

    // Filtere nach ausgewählten Mitarbeitern
    const filteredTimeEntries = selectedEmployees.length > 0 
        ? todayTimeEntriesWithRates.filter(te => selectedEmployees.includes(te.employee_id))
        : todayTimeEntriesWithRates;

    const filteredLaborCost = filteredTimeEntries.reduce((sum, te) => sum + te.cost, 0);
    const filteredStaffCount = new Set(filteredTimeEntries.map(te => te.employee_id)).size;

    const handleFetchLaborCosts = async () => {
        setLaborCostLoading(true);
        try {
            // Invalidiere TimeEntries Daten um sie neu zu laden
            await queryClient.invalidateQueries({ queryKey: ['time-entries'] });
        } finally {
            setLaborCostLoading(false);
        }
    };

    if (!permissions.canViewAnalytics && !permissions.isManager) {
        return <PermissionDenied />;
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="space-y-3">
                <h1 className="text-2xl font-bold text-white">Tagesanalyse</h1>
                <p className="text-slate-400">Z-Abschlag, Personalkosten und Trinkgeldverteilung</p>
                
                <div className="flex gap-2">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    />
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Tagesumsatz
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {todayRevenue ? (
                            <div className="text-2xl font-bold text-green-400">
                                {todayRevenue.revenue.toFixed(2)} €
                            </div>
                        ) : (
                            <div className="text-slate-500 text-sm">Nicht erfasst</div>
                        )}
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2 w-full"
                            onClick={() => setUploadModalOpen(true)}
                        >
                            <Upload className="w-3 h-3 mr-1" />
                            Z-Abschlag hochladen
                        </Button>
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
                        {todayTimeEntriesWithRates.length > 0 ? (
                            <>
                                <div className="text-2xl font-bold text-amber-400">
                                    {filteredLaborCost.toFixed(2)} €
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    {filteredStaffCount} Mitarbeiter • {filteredTimeEntries.reduce((sum, te) => sum + te.total_hours, 0).toFixed(1)}h
                                </p>
                                {todaySalesReport && (
                                    <p className="text-xs text-blue-400 mt-2">✓ Aus Verkaufsbericht</p>
                                )}
                            </>
                        ) : (
                            <div className="text-slate-500 text-sm">
                                {todaySalesReport ? 'Bericht verarbeitet aber keine Details vorhanden' : 'Noch kein Bericht vorhanden'}
                            </div>
                        )}
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2 w-full"
                            onClick={handleFetchLaborCosts}
                            disabled={laborCostLoading}
                        >
                            {laborCostLoading ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                                <Users className="w-3 h-3 mr-1" />
                            )}
                            {laborCostLoading ? 'Wird geladen...' : 'Abrufen'}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <Gift className="w-4 h-4" />
                            Trinkgeld
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {todayTipDistribution ? (
                            <>
                                <div className="text-2xl font-bold text-purple-400">
                                    {todayTipDistribution.total_tips.toFixed(2)} €
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    {todayTipDistribution.tip_per_person.toFixed(2)} € pro Person
                                </p>
                            </>
                        ) : (
                            <div className="text-slate-500 text-sm">Nicht berechnet</div>
                        )}
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2 w-full"
                            onClick={() => setTipCalculatorOpen(true)}
                            disabled={!todayRevenue || todayTimeEntries.length === 0}
                        >
                            <Gift className="w-3 h-3 mr-1" />
                            Berechnen
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Personalkosten Details */}
            {todayTimeEntriesWithRates.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">Personalkosten Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Filter */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pb-4 border-b border-slate-700">
                            {todayTimeEntriesWithRates.map((te) => (
                                <label key={te.employee_id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-700 p-2 rounded">
                                    <input
                                        type="checkbox"
                                        checked={selectedEmployees.includes(te.employee_id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedEmployees([...selectedEmployees, te.employee_id]);
                                            } else {
                                                setSelectedEmployees(selectedEmployees.filter(id => id !== te.employee_id));
                                            }
                                        }}
                                        className="rounded"
                                    />
                                    <span className="text-sm text-slate-300">{te.employee_name}</span>
                                </label>
                            ))}
                        </div>

                        {/* Gefilterte Liste */}
                        <div className="space-y-2">
                            {filteredTimeEntries.map((te) => (
                                <div key={te.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                                    <div>
                                        <h4 className="font-semibold text-white">{te.employee_name}</h4>
                                        <p className="text-xs text-slate-400">{te.total_hours.toFixed(1)}h</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-amber-400">
                                            {te.cost.toFixed(2)} €
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {te.hourly_rate.toFixed(2)} €/h
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {filteredTimeEntries.length === 0 && selectedEmployees.length > 0 && (
                                <p className="text-center text-slate-400 py-4">Keine Daten für ausgewählte Mitarbeiter</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Trinkgeldverteilung */}
            {todayTipDistribution && (
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">Trinkgeldverteilung</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert className="mb-4 bg-purple-900/20 border-purple-800">
                            <Gift className="h-4 w-4 text-purple-400" />
                            <AlertDescription className="text-purple-300">
                                {todayTipDistribution.tip_percentage}% von {todayTipDistribution.total_revenue.toFixed(2)} € 
                                = {todayTipDistribution.total_tips.toFixed(2)} € für {todayTipDistribution.employee_count} Personen
                            </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                            {todayTipDistribution.distribution_details?.map((detail, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                                    <div className="font-semibold text-white">{detail.employee_name}</div>
                                    <div className="text-purple-400 font-semibold">
                                        {detail.tip_amount.toFixed(2)} €
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Verlauf */}
            <DailyRevenueList revenues={dailyRevenues} timeEntries={timeEntries} tipDistributions={tipDistributions} employees={employees} onSelectDate={setSelectedDate} selectedDate={selectedDate} />

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