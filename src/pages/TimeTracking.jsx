import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO, startOfWeek, endOfWeek, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { de } from 'date-fns/locale';
import { Clock, Plus, Pencil, Trash2, Calendar, CheckCircle2, FileText, Check, TrendingUp, LogIn, LogOut, Coffee, Pause, Play, Filter, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { usePermissions } from '@/components/auth/usePermissions';
import TimeEntryModal from '@/components/timetracking/TimeEntryModal';
import MonthlyReportExport from '@/components/timetracking/MonthlyReportExport';
import { validateArbZG, formatWarnings } from '@/components/timetracking/ArbZGValidator';

const statusConfig = {
    'entwurf': { label: 'Entwurf', color: 'bg-slate-100 text-slate-700', icon: FileText },
    'eingereicht': { label: 'Eingereicht', color: 'bg-blue-100 text-blue-700', icon: Clock },
    'genehmigt': { label: 'Genehmigt', color: 'bg-green-100 text-green-700', icon: CheckCircle2 }
};

export default function TimeTracking() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        const loadEmployee = async () => {
            const user = await base44.auth.me();
            const employees = await base44.entities.Employee.filter({ 
                email: user.email,
                is_active: true 
            });
            if (employees[0]) {
                setCurrentEmployee(employees[0]);
            }
        };
        loadEmployee();
    }, []);

    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time-entries', selectedMonth],
        queryFn: async () => {
            const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
            const end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
            const all = await base44.entities.TimeEntry.list('-date');
            return all.filter(entry => entry.date >= start && entry.date <= end);
        }
    });

    const { data: allEmployees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const { data: clockEntries = [] } = useQuery({
        queryKey: ['clockEntries'],
        queryFn: () => base44.entities.ClockEntry.list('-clock_in')
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            // ArbZG Validierung
            const warnings = validateArbZG(data, timeEntries);
            if (warnings.length > 0) {
                data.arbzg_warning = formatWarnings(warnings);
            }
            
            await base44.entities.TimeEntry.create(data);
            
            // Create notification for managers when employee submits time entry
            if (data.status === 'eingereicht' && !permissions.isManager) {
                try {
                    await base44.entities.Notification.create({
                        type: 'general',
                        title: 'Neue Zeiterfassung eingereicht',
                        message: `${data.employee_name} hat eine Zeiterfassung für ${format(new Date(data.date), 'dd.MM.yyyy', { locale: de })} eingereicht (${data.total_hours}h).`,
                        related_id: data.employee_id,
                        target_roles: ['admin', 'Manager'],
                        read_by: []
                    });
                } catch (error) {
                    console.error('Fehler beim Erstellen der Benachrichtigung:', error);
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['time-entries']);
            setModalOpen(false);
            setSelectedEntry(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.TimeEntry.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['time-entries']);
            setModalOpen(false);
            setSelectedEntry(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.TimeEntry.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['time-entries']);
        }
    });

    const approveMutation = useMutation({
        mutationFn: async (entryIds) => {
            const user = await base44.auth.me();
            const promises = entryIds.map(async (id) => {
                const entry = timeEntries.find(e => e.id === id);
                await base44.entities.TimeEntry.update(id, { 
                    status: 'genehmigt',
                    manager_approved_by: user.full_name,
                    manager_approved_at: new Date().toISOString()
                });
                
                // Create notification for employee
                if (entry) {
                    try {
                        const employee = await base44.entities.Employee.filter({ id: entry.employee_id });
                        if (employee[0]?.email) {
                            await base44.entities.Notification.create({
                                type: 'general',
                                title: 'Zeiterfassung genehmigt',
                                message: `Deine Zeiterfassung vom ${format(new Date(entry.date), 'dd.MM.yyyy', { locale: de })} wurde genehmigt (${entry.total_hours}h).`,
                                related_id: entry.id,
                                read_by: []
                            });
                        }
                    } catch (error) {
                        console.error('Fehler beim Erstellen der Benachrichtigung:', error);
                    }
                }
            });
            return Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['time-entries']);
        }
    });

    const handleSave = (data, id) => {
        // Wenn ein Mitarbeiter bearbeitet, Status auf "entwurf" zurücksetzen
        if (id && !permissions.isManager) {
            data = { ...data, status: 'entwurf' };
        }
        
        if (id) {
            updateMutation.mutate({ id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (id) => {
        if (confirm('Zeiteintrag wirklich löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleApprove = (id) => {
        approveMutation.mutate([id]);
    };

    const handleApproveEmployee = (employeeName) => {
        const pendingEntries = entriesByEmployee[employeeName]
            .filter(e => e.status !== 'genehmigt')
            .map(e => e.id);
        if (pendingEntries.length > 0) {
            approveMutation.mutate(pendingEntries);
        }
    };

    const canEdit = (entry) => {
        // Genehmigte Einträge dürfen nicht mehr bearbeitet werden (Rechtskonformität)
        if (entry.status === 'genehmigt') return false;
        // Manager können nicht-genehmigte Einträge bearbeiten
        if (permissions.isManager) return true;
        // Mitarbeiter nur ihre eigenen nicht-genehmigten Einträge
        if (entry.employee_id === currentEmployee?.id && entry.status !== 'genehmigt') return true;
        return false;
    };

    const confirmEntryMutation = useMutation({
        mutationFn: async (entryId) => {
            await base44.entities.TimeEntry.update(entryId, {
                employee_confirmed: true,
                employee_confirmed_at: new Date().toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['time-entries']);
        }
    });



    // Stempeluhr functions
    const clockInMutation = useMutation({
        mutationFn: async (employeeId) => {
            const employee = allEmployees.find(e => e.id === employeeId);
            return base44.entities.ClockEntry.create({
                employee_id: employeeId,
                employee_name: employee.name,
                clock_in: new Date().toISOString(),
                status: 'clocked_in'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['clockEntries']);
        }
    });

    const clockOutAllMutation = useMutation({
        mutationFn: async () => {
            const activeClockedIn = clockEntries.filter(e => e.status === 'clocked_in');
            const clockOutTime = new Date();
            
            const promises = activeClockedIn.map(async (entry) => {
                const totalMinutes = differenceInMinutes(clockOutTime, new Date(entry.clock_in));
                const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

                const tempEntry = {
                    date: format(new Date(entry.clock_in), 'yyyy-MM-dd'),
                    start_time: format(new Date(entry.clock_in), 'HH:mm'),
                    end_time: format(clockOutTime, 'HH:mm'),
                    break_minutes: 0,
                    total_hours: totalHours,
                    employee_id: entry.employee_id
                };
                const warnings = validateArbZG(tempEntry, timeEntries);
                const warningText = formatWarnings(warnings);

                await base44.entities.ClockEntry.update(entry.id, {
                    clock_out: clockOutTime.toISOString(),
                    break_minutes: 0,
                    total_hours: totalHours,
                    status: 'clocked_out',
                    arbzg_warning: warningText
                });

                await base44.entities.TimeEntry.create({
                    employee_id: entry.employee_id,
                    employee_name: entry.employee_name,
                    date: format(new Date(entry.clock_in), 'yyyy-MM-dd'),
                    start_time: format(new Date(entry.clock_in), 'HH:mm'),
                    end_time: format(clockOutTime, 'HH:mm'),
                    break_minutes: 0,
                    total_hours: totalHours,
                    notes: 'Automatisch von Stempeluhr übertragen (Massen-Ausstempelung)',
                    status: 'eingereicht',
                    arbzg_warning: warningText,
                    employee_confirmed: true,
                    employee_confirmed_at: clockOutTime.toISOString()
                });
            });

            return Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['clockEntries']);
            queryClient.invalidateQueries(['time-entries']);
        }
    });

    const clockOutMutation = useMutation({
        mutationFn: async (entryId) => {
            const entry = clockEntries.find(e => e.id === entryId);
            const clockOutTime = new Date();
            const totalMinutes = differenceInMinutes(clockOutTime, new Date(entry.clock_in));
            const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

            // ArbZG Prüfung
            const tempEntry = {
                date: format(new Date(entry.clock_in), 'yyyy-MM-dd'),
                start_time: format(new Date(entry.clock_in), 'HH:mm'),
                end_time: format(clockOutTime, 'HH:mm'),
                break_minutes: 0,
                total_hours: totalHours,
                employee_id: entry.employee_id
            };
            const warnings = validateArbZG(tempEntry, timeEntries);
            const warningText = formatWarnings(warnings);

            // Update Clock Entry
            await base44.entities.ClockEntry.update(entryId, {
                clock_out: clockOutTime.toISOString(),
                break_minutes: 0,
                total_hours: totalHours,
                status: 'clocked_out',
                arbzg_warning: warningText
            });

            // Erstelle automatisch einen TimeEntry
            await base44.entities.TimeEntry.create({
                employee_id: entry.employee_id,
                employee_name: entry.employee_name,
                date: format(new Date(entry.clock_in), 'yyyy-MM-dd'),
                start_time: format(new Date(entry.clock_in), 'HH:mm'),
                end_time: format(clockOutTime, 'HH:mm'),
                break_minutes: 0,
                total_hours: totalHours,
                notes: 'Automatisch von Stempeluhr übertragen',
                status: 'eingereicht',
                arbzg_warning: warningText,
                employee_confirmed: true,
                employee_confirmed_at: clockOutTime.toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['clockEntries']);
            queryClient.invalidateQueries(['time-entries']);
        }
    });

    const activeClockEntry = clockEntries.find(
        e => e.employee_id === currentEmployee?.id && e.status === 'clocked_in'
    );

    const todayClockEntries = clockEntries.filter(e => {
        const entryDate = new Date(e.clock_in);
        const today = new Date();
        return entryDate.toDateString() === today.toDateString();
    });

    const handleClockIn = () => {
        if (currentEmployee) {
            clockInMutation.mutate(currentEmployee.id);
        }
    };

    const handleClockOut = (entry) => {
        if (confirm('Möchtest du jetzt ausstempeln?')) {
            clockOutMutation.mutate(entry.id);
        }
    };

    const getWorkingDuration = (clockIn) => {
        const now = new Date();
        const start = new Date(clockIn);
        const minutes = differenceInMinutes(now, start);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    // Filter entries based on permissions
    const visibleEntries = permissions.isManager 
        ? timeEntries 
        : timeEntries.filter(e => e.employee_id === currentEmployee?.id);

    // Calculate totals
    const totalHours = visibleEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
    const approvedHours = visibleEntries.filter(e => e.status === 'genehmigt').reduce((sum, e) => sum + (e.total_hours || 0), 0);

    // Calculate daily, weekly, and monthly stats
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // MY OWN stats (always only for the current employee)
    const myEntries = timeEntries.filter(e => e.employee_id === currentEmployee?.id);
    const myTodayHours = myEntries.filter(e => e.date === todayStr).reduce((sum, e) => sum + (e.total_hours || 0), 0);
    const myWeekHours = myEntries.filter(e => { const d = parseISO(e.date); return d >= weekStart && d <= weekEnd; }).reduce((sum, e) => sum + (e.total_hours || 0), 0);
    const myMonthHours = myEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
    const myApprovedHours = myEntries.filter(e => e.status === 'genehmigt').reduce((sum, e) => sum + (e.total_hours || 0), 0);

    // TEAM stats (all employees, only relevant for managers)
    const todayHours = visibleEntries
        .filter(e => e.date === todayStr)
        .reduce((sum, e) => sum + (e.total_hours || 0), 0);
    
    const weekHours = visibleEntries
        .filter(e => {
            const entryDate = parseISO(e.date);
            return entryDate >= weekStart && entryDate <= weekEnd;
        })
        .reduce((sum, e) => sum + (e.total_hours || 0), 0);

    // Group by employee
    const entriesByEmployee = visibleEntries.reduce((groups, entry) => {
        if (!groups[entry.employee_name]) {
            groups[entry.employee_name] = [];
        }
        groups[entry.employee_name].push(entry);
        return groups;
    }, {});

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Zeit & Stempeluhr</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                        Stempeln und Zeiterfassung in einer Übersicht
                    </p>
                </div>

                {/* Stempeluhr Section - für alle sichtbar */}
                {currentEmployee && (
                    <Card className="p-4 sm:p-6 bg-card border-border mb-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div 
                                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-2xl"
                                    style={{ backgroundColor: currentEmployee.color || '#64748b' }}
                                >
                                    {currentEmployee.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold text-white">{currentEmployee.name}</h2>
                                    <p className="text-xs sm:text-sm text-slate-400">{currentEmployee.role}</p>
                                    {activeClockEntry && (
                                        <p className="text-xs sm:text-sm text-green-400 mt-1">
                                            Eingestempelt um {format(new Date(activeClockEntry.clock_in), 'HH:mm')} Uhr
                                            <span className="ml-2">⏱️ {getWorkingDuration(activeClockEntry.clock_in)}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {activeClockEntry ? (
                                    <>
                                        <Button 
                                            onClick={() => {
                                                if (confirm('Pause starten?')) {
                                                    updateMutation.mutate({
                                                        id: activeClockEntry.id,
                                                        data: {
                                                            status: 'on_break',
                                                            pause_start: new Date().toISOString()
                                                        }
                                                    });
                                                }
                                            }}
                                            size="lg"
                                            className="bg-amber-600 hover:bg-amber-700"
                                        >
                                            <Pause className="w-5 h-5 mr-2" />
                                            Pause
                                        </Button>
                                        <Button 
                                            onClick={() => handleClockOut(activeClockEntry)}
                                            size="lg"
                                            className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                                        >
                                            <LogOut className="w-5 h-5 mr-2" />
                                            Ausstempeln
                                        </Button>
                                    </>
                                ) : (
                                    <Button 
                                        onClick={handleClockIn}
                                        size="lg"
                                        className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                                        disabled={clockInMutation.isPending}
                                    >
                                        <LogIn className="w-5 h-5 mr-2" />
                                        Einstempeln
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Today's Clock Entries */}
                {todayClockEntries.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm sm:text-base font-semibold text-foreground">Heutige Stempelungen</h3>
                            {permissions.isManager && clockEntries.some(e => e.status === 'clocked_in') && (
                                <Button
                                    onClick={() => {
                                        if (confirm('Möchtest du wirklich alle eingestempelten Mitarbeiter ausstempeln?')) {
                                            clockOutAllMutation.mutate();
                                        }
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="border-red-600 text-red-400 hover:bg-red-900/20"
                                    disabled={clockOutAllMutation.isPending}
                                >
                                    <LogOut className="w-3 h-3 mr-1" />
                                    Alle Ausstempeln
                                </Button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {todayClockEntries.map(entry => (
                                <Card key={entry.id} className="p-3 bg-card border-border">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-foreground text-sm truncate">{entry.employee_name}</p>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <LogIn className="w-3 h-3 text-green-500" />
                                                    {format(new Date(entry.clock_in), 'HH:mm')}
                                                </span>
                                                {entry.clock_out && (
                                                    <span className="flex items-center gap-1">
                                                        <LogOut className="w-3 h-3 text-red-500" />
                                                        {format(new Date(entry.clock_out), 'HH:mm')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge className={entry.status === 'clocked_in' ? 'bg-green-600 text-xs' : 'bg-slate-600 text-xs'}>
                                                {entry.status === 'clocked_in' ? 'Aktiv' : 'Fertig'}
                                            </Badge>
                                            {entry.total_hours && (
                                                <p className="text-sm font-bold text-white mt-1">
                                                    {entry.total_hours}h
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Rechtliche Hinweise */}
                <Card className="p-4 bg-blue-900/20 border-blue-700/30 mb-6">
                    <div className="flex gap-3">
                        <div className="text-blue-400 mt-0.5">ℹ️</div>
                        <div className="text-xs sm:text-sm text-blue-200">
                            <p className="font-semibold mb-1">Rechtskonform nach ArbZG</p>
                            <p className="text-blue-300">
                                • Zeiterfassungen werden 2 Jahre gespeichert • Max. 10h pro Tag (§3) • Mind. 11h Ruhezeit (§5) • 
                                Genehmigte Einträge sind unveränderbar • Bei &gt;6h: 30 Min Pause, bei &gt;9h: 45 Min Pause (§4)
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Zeiterfassung Section */}
                <div className="space-y-6">

                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Zeiterfassung</h2>

                {/* MY Stats */}
                <div className="mb-1">
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Meine Stunden</p>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <Card className="p-3 sm:p-4 bg-gradient-to-br from-blue-900/40 to-slate-800 border-slate-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] sm:text-xs text-slate-400 mb-1">Heute</p>
                                    <p className="text-xl sm:text-2xl font-bold text-white">{myTodayHours.toFixed(1)}h</p>
                                </div>
                                <TrendingUp className="w-5 h-5 sm:w-8 sm:h-8 text-blue-400 opacity-50" />
                            </div>
                        </Card>
                        <Card className="p-3 sm:p-4 bg-gradient-to-br from-purple-900/40 to-slate-800 border-slate-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] sm:text-xs text-slate-400 mb-1">Woche</p>
                                    <p className="text-xl sm:text-2xl font-bold text-white">{myWeekHours.toFixed(1)}h</p>
                                </div>
                                <Calendar className="w-5 h-5 sm:w-8 sm:h-8 text-purple-400 opacity-50" />
                            </div>
                        </Card>
                        <Card className="p-3 sm:p-4 bg-gradient-to-br from-amber-900/40 to-slate-800 border-slate-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] sm:text-xs text-slate-400 mb-1">Monat</p>
                                    <p className="text-xl sm:text-2xl font-bold text-white">{myMonthHours.toFixed(1)}h</p>
                                    <p className="text-[10px] sm:text-xs text-green-400 mt-0.5">{myApprovedHours.toFixed(1)}h ✓</p>
                                </div>
                                <CheckCircle2 className="w-5 h-5 sm:w-8 sm:h-8 text-amber-400 opacity-50" />
                            </div>
                        </Card>
                    </div>
                </div>

                {/* TEAM Stats – nur für Manager */}
                {permissions.isManager && (
                    <div className="mb-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Gesamt Team</p>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            <Card className="p-3 sm:p-4 bg-gradient-to-br from-blue-900/20 to-slate-800 border-slate-700/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] sm:text-xs text-slate-500 mb-1">Heute</p>
                                        <p className="text-xl sm:text-2xl font-bold text-slate-300">{todayHours.toFixed(1)}h</p>
                                    </div>
                                    <TrendingUp className="w-5 h-5 sm:w-8 sm:h-8 text-blue-500 opacity-30" />
                                </div>
                            </Card>
                            <Card className="p-3 sm:p-4 bg-gradient-to-br from-purple-900/20 to-slate-800 border-slate-700/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] sm:text-xs text-slate-500 mb-1">Woche</p>
                                        <p className="text-xl sm:text-2xl font-bold text-slate-300">{weekHours.toFixed(1)}h</p>
                                    </div>
                                    <Calendar className="w-5 h-5 sm:w-8 sm:h-8 text-purple-500 opacity-30" />
                                </div>
                            </Card>
                            <Card className="p-3 sm:p-4 bg-gradient-to-br from-amber-900/20 to-slate-800 border-slate-700/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] sm:text-xs text-slate-500 mb-1">Monat</p>
                                        <p className="text-xl sm:text-2xl font-bold text-slate-300">{totalHours.toFixed(1)}h</p>
                                        <p className="text-[10px] sm:text-xs text-green-500 mt-0.5">{approvedHours.toFixed(1)}h ✓</p>
                                    </div>
                                    <CheckCircle2 className="w-5 h-5 sm:w-8 sm:h-8 text-amber-500 opacity-30" />
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Month Selector */}
                <Card className="p-3 sm:p-4 bg-card border-border mb-4">
                <div className="flex items-center justify-between gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)))}
                    className="border-border hover:bg-accent text-muted-foreground text-xs sm:text-sm px-2 sm:px-4"
                        >
                            <span className="hidden sm:inline">← Vorheriger</span>
                            <span className="sm:hidden">←</span>
                        </Button>
                        <div className="flex items-center gap-1 sm:gap-2 text-white">
                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                            <span className="font-semibold text-sm sm:text-base">{format(selectedMonth, 'MMM yyyy', { locale: de })}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))}
                            className="border-border hover:bg-accent text-muted-foreground text-xs sm:text-sm px-2 sm:px-4"
                        >
                            <span className="hidden sm:inline">Nächster →</span>
                            <span className="sm:hidden">→</span>
                        </Button>
                    </div>
                </Card>

                {/* Add Entry Button and Report Export */}
                <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {permissions.isManager && (
                        <Button 
                            onClick={() => {
                                setSelectedEntry(null);
                                setModalOpen(true);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto text-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Neue Zeiterfassung
                        </Button>
                    )}
                    <MonthlyReportExport isVisible={permissions.isManager} />
                </div>

                {/* Entries by Employee */}
                <div className="space-y-4 sm:space-y-6">
                    {Object.entries(entriesByEmployee).map(([employeeName, entries]) => {
                        const employeeTotal = entries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
                        const pendingCount = entries.filter(e => e.status !== 'genehmigt').length;
                        return (
                            <div key={employeeName}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <h2 className="text-base sm:text-lg font-semibold text-foreground">{employeeName}</h2>
                                        <span className="text-xs sm:text-sm text-slate-400">{employeeTotal.toFixed(2)}h</span>
                                    </div>
                                    {permissions.isManager && pendingCount > 0 && (
                                        <Button
                                            onClick={() => handleApproveEmployee(employeeName)}
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm w-full sm:w-auto"
                                        >
                                            <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                            Alle genehmigen ({pendingCount})
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {entries
                                        .sort((a, b) => b.date.localeCompare(a.date))
                                        .map(entry => {
                                            const StatusIcon = statusConfig[entry.status].icon;
                                            return (
                                                <Card key={entry.id} className="p-3 sm:p-4 bg-card border-border">
                                                    <div className="flex items-start justify-between gap-2">
                                                       <div className="flex-1 min-w-0">
                                                           <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                                                               <span className="font-semibold text-foreground text-sm sm:text-base">
                                                                   {format(parseISO(entry.date), 'dd.MM.yyyy', { locale: de })}
                                                               </span>
                                                               <Badge className={cn(statusConfig[entry.status].color, "text-[10px] sm:text-xs")}>
                                                                   <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                                                                   {statusConfig[entry.status].label}
                                                               </Badge>
                                                               {entry.employee_confirmed && (
                                                                   <Badge className="bg-blue-100 text-blue-700 text-[10px] sm:text-xs">
                                                                       ✓ Bestätigt
                                                                   </Badge>
                                                               )}
                                                               {entry.status === 'genehmigt' && (
                                                                   <Badge className="bg-slate-700 text-slate-300 text-[10px] sm:text-xs">
                                                                       🔒 Gesperrt
                                                                   </Badge>
                                                               )}
                                                           </div>
                                                           <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-400">
                                                               <span>
                                                                   {entry.start_time} - {entry.end_time}
                                                                   {entry.end_time < entry.start_time && <span className="ml-1">🌙</span>}
                                                               </span>
                                                               {entry.break_minutes > 0 && (
                                                                   <span>Pause: {entry.break_minutes} Min</span>
                                                               )}
                                                               <span className="font-semibold text-amber-400">
                                                                   {entry.total_hours?.toFixed(2)}h
                                                               </span>
                                                           </div>
                                                           {entry.arbzg_warning && (
                                                               <div className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded text-[10px] sm:text-xs text-red-400">
                                                                   ⚠️ {entry.arbzg_warning}
                                                               </div>
                                                           )}
                                                           {entry.notes && (
                                                               <p className="text-[10px] sm:text-xs text-slate-500 mt-2">{entry.notes}</p>
                                                           )}
                                                           {entry.status === 'genehmigt' && entry.manager_approved_by && (
                                                               <p className="text-[10px] text-slate-500 mt-1">
                                                                   Genehmigt von {entry.manager_approved_by} am {format(parseISO(entry.manager_approved_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                                                               </p>
                                                           )}
                                                       </div>
                                                        <div className="flex gap-1">
                                                            {!entry.employee_confirmed && entry.employee_id === currentEmployee?.id && entry.status !== 'genehmigt' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => confirmEntryMutation.mutate(entry.id)}
                                                                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                                                    title="Bestätigen"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                            {permissions.isManager && entry.status !== 'genehmigt' && entry.employee_confirmed && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleApprove(entry.id)}
                                                                    className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                                                                    title="Genehmigen (rechtsverbindlich)"
                                                                >
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                            {canEdit(entry) && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => {
                                                                            setSelectedEntry(entry);
                                                                            setModalOpen(true);
                                                                        }}
                                                                        className="text-slate-400 hover:text-white"
                                                                        title={!permissions.isManager && entry.status !== 'entwurf' ? 'Bearbeiten setzt Status zurück auf Entwurf' : 'Bearbeiten'}
                                                                    >
                                                                        <Pencil className="w-4 h-4" />
                                                                    </Button>
                                                                    {permissions.isManager && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => handleDelete(entry.id)}
                                                                            className="text-red-400 hover:text-red-300"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {visibleEntries.length === 0 && (
                    <Card className="p-12 bg-card border-border">
                        <div className="text-center text-muted-foreground">
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Noch keine Zeiteinträge für diesen Monat</p>
                            <p className="text-xs mt-1">Stempelzeiten werden automatisch übertragen</p>
                        </div>
                    </Card>
                )}
            </div>



                {/* Modal */}
                <TimeEntryModal
                    open={modalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedEntry(null);
                    }}
                    entry={selectedEntry}
                    currentEmployee={currentEmployee}
                    allEmployees={allEmployees}
                    isManager={permissions.isManager}
                    onSave={handleSave}
                />
            </div>
        </div>
    );
}