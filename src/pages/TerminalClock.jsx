import { toast } from 'sonner';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, LogIn, LogOut, Coffee, FileText, Download, Calendar, Pause, Play } from 'lucide-react';
import TerminalReservation from '@/components/terminal/TerminalReservation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PinVerification from '@/components/terminal/PinVerification';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, addMonths } from 'date-fns';
import { hashPin } from '@/lib/pinUtils';
import { de } from 'date-fns/locale';
import { usePermissions } from '@/components/auth/usePermissions';

export default function TerminalClock() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportMonth, setReportMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [earningsModalOpen, setEarningsModalOpen] = useState(false);
    const [earningsData, setEarningsData] = useState(null);
    const [nightWatchModalOpen, setNightWatchModalOpen] = useState(false);
    const [targetEmployee, setTargetEmployee] = useState(null);
    const [pauseTime, setPauseTime] = useState(0);

    const { data: currentUser } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
    });

    const { data: currentEmployee } = useQuery({
        queryKey: ['currentEmployee', currentUser?.email],
        queryFn: async () => {
            if (!currentUser) return null;
            const employees = await base44.entities.Employee.filter({
                email: currentUser.email,
                is_active: true
            });
            return employees[0];
        },
        enabled: !!currentUser,
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true }, 'name')
    });

    const { data: clockEntries = [] } = useQuery({
        queryKey: ['clock-entries-today'],
        queryFn: async () => {
            // Nachtbetrieb-sicher: alle Einträge der letzten 24h + aktive
            // Aktive Einträge (kein clock_out) sind immer relevant, egal welches Datum
            const entries = await base44.entities.ClockEntry.list('-clock_in', 200);
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return entries.filter(e =>
                !e.clock_out || new Date(e.clock_in) >= oneDayAgo
            );
        }
    });

    const { data: allClockEntries = [] } = useQuery({
        queryKey: ['all-clock-entries'],
        queryFn: () => base44.entities.ClockEntry.list('-clock_in', 500)
    });

    const clockMutation = useMutation({
        mutationFn: (data) => base44.entities.ClockEntry.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clock-entries-today'] });
        }
    });

    const wastageCreationMutation = useMutation({
        mutationFn: async () => {
            const today = format(new Date(), 'yyyy-MM-dd');
            const nightWatchItems = [
                { name: 'Chiemseer Hell', barcode: 'CHIEMSEER_HELL' },
                { name: 'Hacker Hefe', barcode: 'HACKER_HEFE' },
                { name: 'Fürstenberg Pils', barcode: 'FUERSTENBERG_PILS' },
                { name: 'Kloster Dunkel', barcode: 'KLOSTER_DUNKEL' },
                { name: 'Oberbräu Hell', barcode: 'OBERBRAEU_HELL' },
                { name: 'Alpirsbacher Hefe Alkoholfrei', barcode: 'ALPIRSBACHER_HEFE_AF' }
            ];

            const wastageEntries = nightWatchItems.map(item => ({
                barcode: item.barcode,
                article_name: item.name,
                quantity: 0.8,
                unit: 'Liter',
                type: 'Nachtwächter',
                date: today,
                time: format(new Date(), 'HH:mm'),
                noted_by: 'Automatisch',
                notes: 'Automatisch eingetragen beim ersten Einstempeln'
            }));

            await base44.entities.Wastage.bulkCreate(wastageEntries);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ClockEntry.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clock-entries-today'] });
        }
    });

    const handleClockAction = (employee, action) => {
        setTargetEmployee(employee);
        setSelectedAction(action);
        
        // Beim Ausstempeln anderer: Prüfe Berechtigung
        if (action === 'out' && currentEmployee && employee.id !== currentEmployee.id) {
            if (!permissions.isManager && !permissions.canClockOutOthers) {
                alert('❌ Du hast keine Berechtigung, andere Mitarbeiter auszustempeln.');
                return;
            }
            // Manager/Berechtigte verwenden eigene PIN
            setSelectedEmployee(currentEmployee);
        } else {
            // Normaler Fall: Eigene PIN
            setSelectedEmployee(employee);
        }
        
        setPinModalOpen(true);
    };

    const handlePinVerified = async (pin) => {
        const hashedInput = await hashPin(pin);
        // Unterstützt beide Formate: Klartext-PIN (alt) und SHA-256 Hash (neu)
        const pinMatches = selectedEmployee.pin === hashedInput || selectedEmployee.pin === pin;
        if (!pinMatches) {
            alert('Falsche PIN!');
            return;
        }

        // Verwende targetEmployee für die eigentliche Aktion
        const employeeToProcess = targetEmployee || selectedEmployee;
        const activeEntry = clockEntries.find(
            e => e.employee_id === employeeToProcess.id && (e.status === 'clocked_in' || e.status === 'on_break')
        );

        if (selectedAction === 'in') {
            // Wenn on_break → Pause beenden statt neu einstempeln
            if (activeEntry && activeEntry.status === 'on_break') {
                const timestamp = new Date().toISOString();
                const pauseDuration = activeEntry.pause_start
                    ? Math.round((new Date(timestamp) - new Date(activeEntry.pause_start)) / 60000)
                    : 0;
                await updateMutation.mutateAsync({
                    id: activeEntry.id,
                    data: {
                        status: 'clocked_in',
                        pause_end: timestamp,
                        pause_minutes: (activeEntry.pause_minutes || 0) + pauseDuration
                    }
                });
                alert(`✓ ${employeeToProcess.name} - Pause beendet`);
            } else if (activeEntry && activeEntry.status === 'clocked_in') {
                alert('Du bist bereits eingestempelt!');
            } else {
                await clockMutation.mutateAsync({
                    employee_id: employeeToProcess.id,
                    employee_name: employeeToProcess.name,
                    clock_in: new Date().toISOString(),
                    status: 'clocked_in'
                });
                // Erste Einstempelung des Betriebstags = keine anderen aktiven Einträge VOR diesem Einstempeln
                const isFirstOfDay = !clockEntries.some(e => e.status === 'clocked_in' || e.status === 'on_break');
                if (isFirstOfDay) {
                    setNightWatchModalOpen(true);
                } else {
                    alert(`✓ ${employeeToProcess.name} eingestempelt`);
                }
            }
        } else if (selectedAction === 'pause') {
            if (!activeEntry) {
                alert(`${employeeToProcess.name} ist nicht eingestempelt!`);
            } else {
                // PAUSE TOGGLE: clocked_in → on_break → clocked_in
                const newStatus = activeEntry.status === 'clocked_in' ? 'on_break' : 'clocked_in';
                const timestamp = new Date().toISOString();
                const updateData = { status: newStatus };

                if (newStatus === 'on_break') {
                    updateData.pause_start = timestamp;
                } else {
                    const pauseDuration = activeEntry.pause_start
                        ? Math.round((new Date(timestamp) - new Date(activeEntry.pause_start)) / 60000)
                        : 0;
                    updateData.pause_end = timestamp;
                    updateData.pause_minutes = (activeEntry.pause_minutes || 0) + pauseDuration;
                }

                await updateMutation.mutateAsync({ id: activeEntry.id, data: updateData });

                if (newStatus === 'on_break') {
                    toast.success(`☕ ${employeeToProcess.name} — Pause gestartet`);
                } else {
                    toast.success(`${employeeToProcess.name} — Pause beendet ✓`);
                }
            }
        } else if (selectedAction === 'out') {
            if (!activeEntry) {
                alert(`${employeeToProcess.name} ist nicht eingestempelt!`);
            } else {
                const clockIn = new Date(activeEntry.clock_in);
                const clockOut = new Date();
                
                // BERECHNE ARBEITSZEIT: Total minus akkumulierten Pausenminuten
                let workingMinutes = (clockOut - clockIn) / (1000 * 60);
                let accumulatedPause = activeEntry.pause_minutes || 0;
                
                // Falls aktuell in Pause (sollte nicht vorkommen beim Ausstempeln, aber sicher ist sicher)
                if (activeEntry.status === 'on_break' && activeEntry.pause_start) {
                    const currentPauseDuration = Math.round((clockOut - new Date(activeEntry.pause_start)) / 60000);
                    accumulatedPause += currentPauseDuration;
                }
                workingMinutes -= accumulatedPause;
                
                const hours = Math.max(0, Math.round((workingMinutes / 60) * 100) / 100);

                // Automatische Pausen nach ArbZG (bezahlt)
                let pauseMinuten = 0;
                if (hours > 9) {
                    pauseMinuten = 45; // > 9h = 45min
                } else if (hours > 6) {
                    pauseMinuten = 30; // 6-9h = 30min
                }

                await updateMutation.mutateAsync({
                    id: activeEntry.id,
                    data: {
                        clock_out: clockOut.toISOString(),
                        total_hours: Math.round(hours * 100) / 100,
                        pause_minutes: accumulatedPause,
                        status: 'clocked_out'
                    }
                });

                // TimeEntry erstellen, damit die Zeit in der Genehmigungsansicht erscheint
                // Duplikat-Schutz: nur erstellen wenn noch kein TimeEntry für diesen Tag/Mitarbeiter/Startzeit existiert
                const entryDate = format(clockIn, 'yyyy-MM-dd');
                const entryStartTime = format(clockIn, 'HH:mm');
                const existingEntries = await base44.entities.TimeEntry.filter({
                    employee_id: employeeToProcess.id
                });
                const duplicate = existingEntries.find(te =>
                    te.date === entryDate && te.start_time === entryStartTime
                );
                if (!duplicate) {
                    await base44.entities.TimeEntry.create({
                        employee_id: employeeToProcess.id,
                        employee_name: employeeToProcess.name,
                        date: entryDate,
                        start_time: entryStartTime,
                        end_time: format(clockOut, 'HH:mm'),
                        break_minutes: accumulatedPause,
                        total_hours: Math.round(hours * 100) / 100,
                        status: 'eingereicht',
                        employee_confirmed: true,
                        employee_confirmed_at: clockOut.toISOString()
                    });
                }

                const pauseText = pauseMinuten > 0 ? `\n${pauseMinuten}min Pause (bezahlt)` : '';

                // Zeige Verdienst nur bei Stundenlohn (nicht bei Monatsgehalt-Festangestellten)
                const tcHasMonthly = employeeToProcess.monthly_salary && parseFloat(employeeToProcess.monthly_salary) > 0;
                if (employeeToProcess.hourly_rate && !tcHasMonthly) {
                    const earnings = (Math.round(hours * 100) / 100) * employeeToProcess.hourly_rate;
                    setEarningsData({
                        name: employeeToProcess.name,
                        hours: Math.round(hours * 100) / 100,
                        hourlyRate: employeeToProcess.hourly_rate,
                        earnings: earnings,
                        pauseMinutes: pauseMinuten
                    });
                    setEarningsModalOpen(true);
                } else {
                    const wasOtherEmployee = targetEmployee && targetEmployee.id !== selectedEmployee?.id;
                    const outMsg = wasOtherEmployee
                        ? `${employeeToProcess.name} ausgestempelt (von ${selectedEmployee.name}) · ${Math.round(hours * 10) / 10}h`
                        : `${employeeToProcess.name} ausgestempelt ✓ · ${Math.round(hours * 10) / 10}h`;
                    toast.success(outMsg);
                }
            }
        }

        setPinModalOpen(false);
        setSelectedEmployee(null);
        setTargetEmployee(null);
        setSelectedAction(null);
    };

    const getEmployeeStatus = (employee) => {
        // Prüfe für aktive Einstempelung ODER aktive Pause
        const activeEntry = clockEntries.find(
            e => e.employee_id === employee.id && (e.status === 'clocked_in' || e.status === 'on_break')
        );
        return activeEntry;
    };

    const getTodayStats = () => {
        const stats = {};
        clockEntries.forEach(entry => {
            if (!stats[entry.employee_id]) {
                stats[entry.employee_id] = {
                    name: entry.employee_name,
                    total: 0,
                    entries: []
                };
            }
            if (entry.total_hours) {
                stats[entry.employee_id].total += entry.total_hours;
            }
            stats[entry.employee_id].entries.push(entry);
        });
        return Object.values(stats);
    };

    const getMonthlyReport = () => {
        const monthStart = startOfMonth(parseISO(reportMonth + '-01'));
        const monthEnd = endOfMonth(monthStart);
        
        const monthEntries = allClockEntries.filter(e => {
            const entryDate = parseISO(e.clock_in);
            return entryDate >= monthStart && entryDate <= monthEnd;
        });

        const stats = {};
        monthEntries.forEach(entry => {
            if (!stats[entry.employee_id]) {
                stats[entry.employee_id] = {
                    name: entry.employee_name,
                    total: 0,
                    days: {}
                };
            }
            const day = format(parseISO(entry.clock_in), 'yyyy-MM-dd');
            if (!stats[entry.employee_id].days[day]) {
                stats[entry.employee_id].days[day] = 0;
            }
            if (entry.total_hours) {
                stats[entry.employee_id].total += entry.total_hours;
                stats[entry.employee_id].days[day] += entry.total_hours;
            }
        });

        return Object.values(stats);
    };

    const exportToCSV = () => {
        const report = getMonthlyReport();
        const monthStart = startOfMonth(parseISO(reportMonth + '-01'));
        const monthEnd = endOfMonth(monthStart);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

        let csv = 'Mitarbeiter,' + days.map(d => format(d, 'dd.MM.')).join(',') + ',Gesamt\n';
        
        report.forEach(emp => {
            const row = [emp.name];
            days.forEach(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                row.push(emp.days[dayStr] ? emp.days[dayStr].toFixed(2) : '0');
            });
            row.push(emp.total.toFixed(2));
            csv += row.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zeiterfassung-${reportMonth}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                    <div className="text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                            <Clock className="w-8 h-8 text-amber-500" />
                            <h1 className="text-3xl font-bold text-white">Zeiterfassung</h1>
                        </div>
                        <p className="text-slate-400 text-lg">
                            {format(new Date(), "EEEE, d. MMMM yyyy · HH:mm", { locale: de })} Uhr
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <TerminalReservation employees={employees} />
                        <Button
                            onClick={() => setReportModalOpen(true)}
                            variant="outline"
                            className="text-slate-300 border-slate-600 hover:bg-slate-700"
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Berichte & Export
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employees.filter(e => e.pin && !e.is_system_account).map(employee => {
                        const status = getEmployeeStatus(employee);
                        const isActive = !!status;

                        return (
                            <Card key={employee.id} className="p-6 bg-slate-800 border-slate-700">
                                <div className="text-center space-y-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-white mb-2">
                                            {employee.name}
                                        </h3>
                                        {isActive ? (
                                            <Badge className="bg-green-600">
                                                <LogIn className="w-3 h-3 mr-1" />
                                                Eingestempelt
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-slate-400 border-slate-600">
                                                <LogOut className="w-3 h-3 mr-1" />
                                                Ausgestempelt
                                            </Badge>
                                        )}
                                        {status && (
                                           <div className="text-xs text-slate-400 mt-2">
                                               <p>
                                                   seit {format(new Date(status.clock_in), 'HH:mm', { locale: de })} Uhr
                                               </p>
                                               {status.status === 'on_break' && (
                                                   <p className="text-amber-400 font-semibold">☕ In Pause</p>
                                               )}
                                           </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                    <Button
                                    onClick={() => handleClockAction(employee, 'in')}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    disabled={isActive}
                                    >
                                    <LogIn className="w-4 h-4 mr-2" />
                                    Einstempeln
                                    </Button>
                                    <Button
                                    onClick={() => handleClockAction(employee, 'pause')}
                                    className={`flex-1 ${
                                      status?.status === 'on_break'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-amber-600 hover:bg-amber-700'
                                    }`}
                                    disabled={!isActive}
                                    >
                                    {status?.status === 'on_break' ? (
                                      <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Pause beenden
                                      </>
                                    ) : (
                                      <>
                                        <Pause className="w-4 h-4 mr-2" />
                                        Pause starten
                                      </>
                                    )}
                                    </Button>
                                    <Button
                                    onClick={() => handleClockAction(employee, 'out')}
                                    className="flex-1 bg-red-600 hover:bg-red-700"
                                    disabled={!isActive}
                                    >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Ausstempeln
                                    </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {employees.filter(e => e.pin && !e.is_system_account).length === 0 && (
                    <Card className="p-12 bg-slate-800 border-slate-700">
                        <div className="text-center text-slate-400">
                            <Coffee className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Keine Mitarbeiter mit PIN</p>
                            <p className="text-sm mt-1">Lege in den Mitarbeiter-Einstellungen PINs fest</p>
                        </div>
                    </Card>
                )}

                {/* Heute Übersicht – nur für Manager */}
                {permissions.isManager && (<Card className="mt-8 p-6 bg-slate-800 border-slate-700">
                    <h2 className="text-xl font-semibold text-white mb-4">Heutige Arbeitszeiten</h2>
                    <div className="space-y-3">
                        {getTodayStats().map(stat => (
                            <div key={stat.name} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                                <div>
                                    <p className="font-medium text-white">{stat.name}</p>
                                    <p className="text-sm text-slate-400">
                                        {stat.entries.length} {stat.entries.length === 1 ? 'Eintrag' : 'Einträge'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-amber-500">
                                        {stat.total.toFixed(1)}h
                                    </p>
                                </div>
                            </div>
                        ))}
                        {getTodayStats().length === 0 && (
                            <p className="text-center text-slate-400 py-4">Noch keine Zeiterfassung heute</p>
                        )}
                    </div>
                </Card>)}

                <PinVerification
                    open={pinModalOpen}
                    onClose={() => {
                        setPinModalOpen(false);
                        setSelectedEmployee(null);
                        setTargetEmployee(null);
                        setSelectedAction(null);
                    }}
                    onVerified={handlePinVerified}
                    title={targetEmployee && targetEmployee.id !== selectedEmployee?.id 
                        ? `PIN für ${selectedEmployee?.name} (Ausstempeln: ${targetEmployee?.name})`
                        : `PIN für ${selectedEmployee?.name}`}
                />

                {/* Verdienst Modal für Aushilfen */}
                <Dialog open={earningsModalOpen} onOpenChange={setEarningsModalOpen}>
                    <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-center text-2xl">
                                🎉 Gut gemacht!
                            </DialogTitle>
                        </DialogHeader>
                        {earningsData && (
                            <div className="space-y-6 mt-4">
                                <div className="text-center">
                                    <p className="text-slate-400 mb-2">Hallo {earningsData.name},</p>
                                    <p className="text-slate-300 text-lg">du hast heute verdient:</p>
                                </div>

                                <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-8 text-center">
                                    <div className="text-6xl font-bold text-white mb-2">
                                        {earningsData.earnings.toFixed(2)} €
                                    </div>
                                    <div className="text-green-100 text-sm">
                                        {earningsData.hours.toFixed(2)}h × {earningsData.hourlyRate.toFixed(2)} €/h
                                        {earningsData.pauseMinutes > 0 && (
                                            <div className="mt-1 text-xs">
                                                (inkl. {earningsData.pauseMinutes}min Pause bezahlt)
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="text-center text-slate-400 text-sm">
                                    Vielen Dank für deine Arbeit heute! 💪
                                </div>

                                <Button
                                    onClick={() => {
                                        setEarningsModalOpen(false);
                                        setEarningsData(null);
                                    }}
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-lg py-6"
                                >
                                    Okay, verstanden
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Nachtwächter Modal */}
                <Dialog open={nightWatchModalOpen} onOpenChange={setNightWatchModalOpen}>
                    <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-center text-xl">
                                🌙 Nachtwächterliste eintragen?
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <p className="text-slate-300 text-center">
                                Du bist die erste Person, die sich heute einstempelt.
                            </p>
                            <div className="bg-slate-700 rounded-lg p-4">
                                <p className="text-sm font-semibold text-amber-400 mb-2">
                                    Folgende Artikel werden als Nachtwächter eingetragen:
                                </p>
                                <ul className="text-sm text-slate-300 space-y-1">
                                    <li>• Chiemseer Hell (0,8 Liter)</li>
                                    <li>• Hacker Hefe (0,8 Liter)</li>
                                    <li>• Fürstenberg Pils (0,8 Liter)</li>
                                    <li>• Kloster Dunkel (0,8 Liter)</li>
                                    <li>• Oberbräu Hell (0,8 Liter)</li>
                                    <li>• Alpirsbacher Hefe Alkoholfrei (0,8 Liter)</li>
                                </ul>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => {
                                        setNightWatchModalOpen(false);
                                        alert(`✓ ${selectedEmployee?.name} eingestempelt`);
                                    }}
                                    variant="outline"
                                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                    Nein, überspringen
                                </Button>
                                <Button
                                    onClick={async () => {
                                        await wastageCreationMutation.mutateAsync();
                                        setNightWatchModalOpen(false);
                                        alert(`✓ ${selectedEmployee?.name} eingestempelt\n✓ Nachtwächterliste eingetragen`);
                                    }}
                                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                                    disabled={wastageCreationMutation.isPending}
                                >
                                    {wastageCreationMutation.isPending ? 'Wird eingetragen...' : 'Ja, eintragen'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Berichte Modal */}
                <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
                    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Zeiterfassung Berichte
                            </DialogTitle>
                        </DialogHeader>

                        <Tabs defaultValue="monthly" className="mt-4">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="monthly">Monatsbericht</TabsTrigger>
                                <TabsTrigger value="today">Heute</TabsTrigger>
                            </TabsList>

                            <TabsContent value="monthly" className="space-y-4">
                                <div className="flex items-end gap-3">
                                    <div className="flex-1 space-y-2">
                                        <Label>Monat auswählen</Label>
                                        <Input
                                            type="month"
                                            value={reportMonth}
                                            onChange={(e) => setReportMonth(e.target.value)}
                                            max={format(new Date(), 'yyyy-MM')}
                                        />
                                    </div>
                                    <Button
                                        onClick={exportToCSV}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        CSV Export
                                    </Button>
                                </div>

                                <div className="space-y-3 mt-6">
                                    <h3 className="font-semibold text-lg">
                                        {format(parseISO(reportMonth + '-01'), 'MMMM yyyy', { locale: de })}
                                    </h3>
                                    {getMonthlyReport().map(emp => (
                                        <Card key={emp.name} className="p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-semibold text-lg">{emp.name}</h4>
                                                <Badge className="bg-amber-600 text-lg px-3 py-1">
                                                    {emp.total.toFixed(1)}h gesamt
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-7 gap-2 text-sm">
                                                {Object.entries(emp.days)
                                                    .sort(([a], [b]) => a.localeCompare(b))
                                                    .map(([day, hours]) => (
                                                        <div key={day} className="text-center p-2 bg-slate-50 rounded">
                                                            <div className="text-xs text-slate-500">
                                                                {format(parseISO(day), 'dd.MM.')}
                                                            </div>
                                                            <div className="font-semibold text-slate-800">
                                                                {hours.toFixed(1)}h
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </Card>
                                    ))}
                                    {getMonthlyReport().length === 0 && (
                                        <p className="text-center text-slate-500 py-8">
                                            Keine Daten für diesen Monat
                                        </p>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="today" className="space-y-3">
                                {getTodayStats().map(stat => (
                                    <Card key={stat.name} className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-lg">{stat.name}</h4>
                                            <Badge className="bg-amber-600 text-lg px-3 py-1">
                                                {stat.total.toFixed(1)}h
                                            </Badge>
                                        </div>
                                        <div className="space-y-2">
                                            {stat.entries.map(entry => (
                                                <div key={entry.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                                                    <div>
                                                        <span className="font-medium">
                                                            {format(parseISO(entry.clock_in), 'HH:mm', { locale: de })}
                                                        </span>
                                                        {entry.clock_out && (
                                                            <>
                                                                <span className="text-slate-500 mx-2">→</span>
                                                                <span className="font-medium">
                                                                    {format(parseISO(entry.clock_out), 'HH:mm', { locale: de })}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div>
                                                        {entry.total_hours ? (
                                                            <span className="font-semibold text-slate-800">
                                                                {entry.total_hours.toFixed(1)}h
                                                            </span>
                                                        ) : (
                                                            <Badge variant="outline" className="text-green-600 border-green-600">
                                                                Aktiv
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                                {getTodayStats().length === 0 && (
                                    <p className="text-center text-slate-500 py-8">
                                        Noch keine Zeiterfassung heute
                                    </p>
                                )}
                            </TabsContent>
                        </Tabs>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}