import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Send, AlertCircle, CheckCircle2, Loader, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import PayrollReportHistory from './PayrollReportHistory';

export default function PayrollReportSender() {
    const [showDialog, setShowDialog] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);
    const [reportType, setReportType] = useState('month'); // 'month' oder 'day'
    const queryClient = useQueryClient();

    const { data: company } = useQuery({
        queryKey: ['company-info'],
        queryFn: async () => {
            const res = await base44.entities.CompanyInfo.list('last_updated', 1);
            return res?.[0] || null;
        },
    });

    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time-entries-for-report'],
        queryFn: () => base44.entities.TimeEntry.list('-date', 2000)
    });

    // Verfügbare Tage extrahieren
    const availableDays = [...new Set(timeEntries.map(e => e.date))].sort().reverse();

    const sendMutation = useMutation({
        mutationFn: async () => {
            const res = await base44.functions.invoke('sendPayrollReport', {
                year: selectedMonth.getFullYear(),
                month: selectedMonth.getMonth() + 1,
                day: reportType === 'day' ? selectedDay : null,
            });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(`✉️ Report versendet an ${data.recipient}`);
            setShowDialog(false);
            queryClient.invalidateQueries({ queryKey: ['payroll-report-logs'] });
        },
        onError: (err) => {
            toast.error('Fehler: ' + (err.response?.data?.error || err.message));
        },
    });

    if (!company?.payroll_email) {
        return (
            <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="pt-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-600">Lohnbüro-Email nicht konfiguriert</p>
                        <p className="text-xs text-amber-600/80 mt-1">
                            Bitte trage die Email-Adresse des Lohnbüros in den Betriebsdaten ein (Einstellungen → Betriebsdaten).
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
            <AlertDialogTrigger asChild>
                <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
                    <Mail className="w-4 h-4" />
                    Zum Lohnbüro versenden
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-amber-500" />
                        Report zum Lohnbüro
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Wähle, welcher Report versendet werden soll
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4 py-4">
                    {/* Reporttyp Auswahl */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Reporttyp</label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant={reportType === 'month' ? 'default' : 'outline'}
                                onClick={() => setReportType('month')}
                                className={cn(reportType === 'month' && 'bg-amber-600 hover:bg-amber-700')}
                            >
                                Monatlich
                            </Button>
                            <Button
                                variant={reportType === 'day' ? 'default' : 'outline'}
                                onClick={() => setReportType('day')}
                                disabled={availableDays.length === 0}
                                className={cn(reportType === 'day' && 'bg-amber-600 hover:bg-amber-700')}
                            >
                                Täglich
                            </Button>
                        </div>
                    </div>

                    {/* Monat Auswahl */}
                    {reportType === 'month' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Monat</label>
                            <div className="flex items-center justify-between gap-2 p-2 bg-secondary/30 rounded-lg">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}
                                    className="h-8 w-8"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="font-medium text-sm">{format(selectedMonth, 'MMMM yyyy', { locale: de })}</span>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}
                                    className="h-8 w-8"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Tag Auswahl */}
                    {reportType === 'day' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tag</label>
                            {availableDays.length === 0 ? (
                                <p className="text-xs text-muted-foreground p-2 bg-secondary/30 rounded">
                                    Keine Tage mit Einträgen verfügbar
                                </p>
                            ) : (
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                    {availableDays.slice(0, 30).map(day => (
                                        <Button
                                            key={day}
                                            variant={selectedDay === day ? 'default' : 'outline'}
                                            onClick={() => setSelectedDay(day)}
                                            className={cn('w-full justify-start text-xs', selectedDay === day && 'bg-amber-600 hover:bg-amber-700')}
                                        >
                                            <Calendar className="w-3 h-3 mr-2" />
                                            {format(new Date(day + 'T00:00'), 'EEE, d. MMM yyyy', { locale: de })}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Empfänger Info */}
                    <div className="bg-secondary/20 p-3 rounded-lg text-xs text-foreground space-y-1">
                        <p><strong>📧 Empfänger:</strong> {company.payroll_email}</p>
                        <p><strong>🏢 Von:</strong> {company.company_name}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <AlertDialogCancel className="flex-1">Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => sendMutation.mutate()}
                        disabled={sendMutation.isPending || (reportType === 'day' && !selectedDay)}
                        className="flex-1 bg-amber-600 hover:bg-amber-700"
                    >
                        {sendMutation.isPending ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin mr-2" />
                                Versende...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Versenden
                            </>
                        )}
                    </AlertDialogAction>
                </div>
            </AlertDialogContent>
        </AlertDialog>

        <PayrollReportHistory />
        </div>
    );
}