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
import { Upload, DollarSign, Users, Gift, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import PDFUploadModal from '@/components/dailyanalysis/PDFUploadModal';
import TipCalculator from '@/components/dailyanalysis/TipCalculator';
import DailyRevenueList from '@/components/dailyanalysis/DailyRevenueList';

export default function DailyAnalysis() {
    const permissions = usePermissions();
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [tipCalculatorOpen, setTipCalculatorOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: dailyRevenues = [] } = useQuery({
        queryKey: ['daily-revenues'],
        queryFn: () => base44.entities.DailyRevenue.list('-date'),
        staleTime: 2 * 60 * 1000,
    });

    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time-entries'],
        queryFn: () => base44.entities.TimeEntry.list('-date'),
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

    // Daten für aktuellen Tag
    const todayRevenue = dailyRevenues.find(dr => dr.date === selectedDate);
    const todayTimeEntries = timeEntries.filter(te => te.date === selectedDate && te.status === 'approved');
    const todayTipDistribution = tipDistributions.find(td => td.date === selectedDate);

    const totalLaborCost = todayTimeEntries.reduce((sum, te) => {
        return sum + (te.total_hours * (te.hourly_rate || 0));
    }, 0);

    const staffCount = new Set(todayTimeEntries.map(te => te.employee_id)).size;

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
                        {todayTimeEntries.length > 0 ? (
                            <>
                                <div className="text-2xl font-bold text-amber-400">
                                    {totalLaborCost.toFixed(2)} €
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    {staffCount} Mitarbeiter • {todayTimeEntries.reduce((sum, te) => sum + te.total_hours, 0).toFixed(1)}h
                                </p>
                            </>
                        ) : (
                            <div className="text-slate-500 text-sm">Keine Einträge</div>
                        )}
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
            {todayTimeEntries.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">Personalkosten Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {todayTimeEntries.map((te) => (
                                <div key={te.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                                    <div>
                                        <h4 className="font-semibold text-white">{te.employee_name}</h4>
                                        <p className="text-xs text-slate-400">{te.total_hours.toFixed(1)}h</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-amber-400">
                                            {(te.total_hours * (te.hourly_rate || 0)).toFixed(2)} €
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {(te.hourly_rate || 0).toFixed(2)} €/h
                                        </p>
                                    </div>
                                </div>
                            ))}
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
            <DailyRevenueList revenues={dailyRevenues} timeEntries={timeEntries} tipDistributions={tipDistributions} />

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
                timeEntries={todayTimeEntries}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tip-distributions'] })}
            />
        </div>
    );
}