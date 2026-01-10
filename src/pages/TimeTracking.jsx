import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO, startOfWeek, endOfWeek, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { de } from 'date-fns/locale';
import { Clock, Plus, Pencil, Trash2, Calendar, CheckCircle2, FileText, Check, TrendingUp, LogIn, LogOut, Coffee } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { usePermissions } from '@/components/auth/usePermissions';
import TimeEntryModal from '@/components/timetracking/TimeEntryModal';

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
    const [activeShift, setActiveShift] = useState(null);
    const [activeTab, setActiveTab] = useState('stempeluhr');

    useEffect(() => {
        const loadEmployee = async () => {
            const user = await base44.auth.me();
            const employees = await base44.entities.Employee.filter({ 
                email: user.email,
                is_active: true 
            });
            if (employees[0]) {
                setCurrentEmployee(employees[0]);
                // Prüfe ob eine aktive Schicht läuft
                const today = format(new Date(), 'yyyy-MM-dd');
                const allEntries = await base44.entities.TimeEntry.list('-created_date');
                const todayDraft = allEntries.find(e => 
                    e.employee_id === employees[0].id && 
                    e.date === today && 
                    e.status === 'entwurf' &&
                    !e.end_time
                );
                if (todayDraft) {
                    setActiveShift(todayDraft);
                }
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
            const promises = entryIds.map(async (id) => {
                const entry = timeEntries.find(e => e.id === id);
                await base44.entities.TimeEntry.update(id, { status: 'genehmigt' });
                
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
        // Manager können immer bearbeiten, Mitarbeiter nur ihre eigenen Einträge im Entwurf oder eingereicht Status
        if (permissions.isManager) return true;
        if (entry.employee_id === currentEmployee?.id && entry.status !== 'genehmigt') return true;
        return false;
    };

    const handleStartShift = async () => {
        if (!currentEmployee) return;
        
        const now = new Date();
        const newEntry = {
            employee_id: currentEmployee.id,
            employee_name: currentEmployee.name,
            date: format(now, 'yyyy-MM-dd'),
            start_time: format(now, 'HH:mm'),
            end_time: '',
            break_minutes: 0,
            notes: '',
            status: 'entwurf',
            total_hours: 0
        };
        
        const created = await createMutation.mutateAsync(newEntry);
        setActiveShift(created);
    };

    const handleEndShift = async () => {
        if (!activeShift) return;
        
        const now = new Date();
        const endTime = format(now, 'HH:mm');
        
        // Berechne Stunden
        const [startH, startM] = activeShift.start_time.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        const totalHours = totalMinutes / 60;
        
        await updateMutation.mutateAsync({
            id: activeShift.id,
            data: {
                ...activeShift,
                end_time: endTime,
                total_hours: totalHours,
                status: 'eingereicht' // Automatisch eingereicht
            }
        });
        
        setActiveShift(null);
    };

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

    const clockOutMutation = useMutation({
        mutationFn: async (entryId) => {
            const entry = clockEntries.find(e => e.id === entryId);
            const clockOutTime = new Date();
            const totalMinutes = differenceInMinutes(clockOutTime, new Date(entry.clock_in));
            const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

            // Update Clock Entry only (keine Pause)
            await base44.entities.ClockEntry.update(entryId, {
                clock_out: clockOutTime.toISOString(),
                break_minutes: 0,
                total_hours: totalHours,
                status: 'clocked_out'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['clockEntries']);
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
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Zeit & Stempeluhr</h1>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">
                        Zeiterfassung und Stempeluhr an einem Ort
                    </p>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-800 border-slate-700">
                        <TabsTrigger value="stempeluhr" className="text-sm sm:text-base">
                            <LogIn className="w-4 h-4 mr-2" />
                            Stempeluhr
                        </TabsTrigger>
                        <TabsTrigger value="zeiterfassung" className="text-sm sm:text-base">
                            <Clock className="w-4 h-4 mr-2" />
                            Zeiterfassung
                        </TabsTrigger>
                    </TabsList>

                    {/* Zeiterfassung Tab */}
                    <TabsContent value="zeiterfassung" className="space-y-6">{/* ... existing content ... */}

                        {/* Stats Overview */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <Card className="p-3 sm:p-4 bg-gradient-to-br from-blue-900/40 to-slate-800 border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] sm:text-xs text-slate-400 mb-1">Heute</p>
                                <p className="text-xl sm:text-2xl font-bold text-white">{todayHours.toFixed(1)}h</p>
                            </div>
                            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 opacity-50" />
                        </div>
                    </Card>

                    <Card className="p-3 sm:p-4 bg-gradient-to-br from-purple-900/40 to-slate-800 border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] sm:text-xs text-slate-400 mb-1">Diese Woche</p>
                                <p className="text-xl sm:text-2xl font-bold text-white">{weekHours.toFixed(1)}h</p>
                            </div>
                            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 opacity-50" />
                        </div>
                    </Card>

                    <Card className="p-3 sm:p-4 bg-gradient-to-br from-amber-900/40 to-slate-800 border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] sm:text-xs text-slate-400 mb-1">Dieser Monat</p>
                                <p className="text-xl sm:text-2xl font-bold text-white">{totalHours.toFixed(1)}h</p>
                                <p className="text-[10px] sm:text-xs text-green-400 mt-0.5">{approvedHours.toFixed(1)}h genehmigt</p>
                            </div>
                            <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 opacity-50" />
                        </div>
                    </Card>
                </div>

                {/* Month Selector */}
                <Card className="p-3 sm:p-4 bg-slate-800 border-slate-700 mb-4 sm:mb-6">
                    <div className="flex items-center justify-between gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)))}
                            className="border-slate-600 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm px-2 sm:px-4"
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
                            className="border-slate-600 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm px-2 sm:px-4"
                        >
                            <span className="hidden sm:inline">Nächster →</span>
                            <span className="sm:hidden">→</span>
                        </Button>
                    </div>
                </Card>

                {/* Clock In/Out Buttons */}
                {!permissions.isManager && currentEmployee && (
                    <Card className="p-4 sm:p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 mb-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex-1">
                                <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Zeiterfassung</h3>
                                {activeShift ? (
                                    <div className="text-sm text-slate-400">
                                        Gestartet um {activeShift.start_time} Uhr
                                        <span className="ml-2 inline-flex items-center gap-1 text-green-400">
                                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                            Aktiv
                                        </span>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400">Starte deine Schicht</p>
                                )}
                            </div>
                            {activeShift ? (
                                <Button 
                                    onClick={handleEndShift}
                                    size="lg"
                                    className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                                >
                                    <Clock className="w-5 h-5 mr-2" />
                                    Schicht beenden
                                </Button>
                            ) : (
                                <Button 
                                    onClick={handleStartShift}
                                    size="lg"
                                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                                >
                                    <Clock className="w-5 h-5 mr-2" />
                                    Schicht starten
                                </Button>
                            )}
                        </div>
                    </Card>
                )}

                {/* Add Entry Button - nur für Admins */}
                {permissions.isManager && (
                    <Button 
                        onClick={() => {
                            setSelectedEntry(null);
                            setModalOpen(true);
                        }}
                        className="bg-amber-600 hover:bg-amber-700 mb-4 sm:mb-6 w-full sm:w-auto text-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Neue Zeiterfassung
                    </Button>
                )}

                {/* Entries by Employee */}
                <div className="space-y-4 sm:space-y-6">
                    {Object.entries(entriesByEmployee).map(([employeeName, entries]) => {
                        const employeeTotal = entries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
                        const pendingCount = entries.filter(e => e.status !== 'genehmigt').length;
                        return (
                            <div key={employeeName}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <h2 className="text-base sm:text-lg font-semibold text-white">{employeeName}</h2>
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
                                                <Card key={entry.id} className="p-3 sm:p-4 bg-slate-800 border-slate-700">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                                                                <span className="font-semibold text-white text-sm sm:text-base">
                                                                    {format(parseISO(entry.date), 'dd.MM.yyyy', { locale: de })}
                                                                </span>
                                                                <Badge className={cn(statusConfig[entry.status].color, "text-[10px] sm:text-xs")}>
                                                                    <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                                                                    {statusConfig[entry.status].label}
                                                                </Badge>
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
                                                            {entry.notes && (
                                                                <p className="text-[10px] sm:text-xs text-slate-500 mt-2">{entry.notes}</p>
                                                            )}
                                                        </div>
                                                        {canEdit(entry) && (
                                                            <div className="flex gap-1">
                                                                {permissions.isManager && entry.status !== 'genehmigt' && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleApprove(entry.id)}
                                                                        className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                                                                        title="Genehmigen"
                                                                    >
                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                    </Button>
                                                                )}
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
                                                            </div>
                                                        )}
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
                            <Card className="p-12 bg-slate-800 border-slate-700">
                                <div className="text-center text-slate-500">
                                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Noch keine Zeiteinträge für diesen Monat</p>
                                    <p className="text-xs mt-1">Erstelle deinen ersten Eintrag</p>
                                </div>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Stempeluhr Tab */}
                    <TabsContent value="stempeluhr" className="space-y-6">
                        {currentEmployee ? (
                            <>
                                {/* Clock Card */}
                                <Card className="p-6 sm:p-8 bg-slate-800 border-slate-700">
                                    <div className="text-center">
                                        <div className="mb-4 sm:mb-6">
                                            <div 
                                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl sm:text-3xl mx-auto mb-3 sm:mb-4"
                                                style={{ backgroundColor: currentEmployee.color || '#64748b' }}
                                            >
                                                {currentEmployee.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{currentEmployee.name}</h2>
                                            <p className="text-sm sm:text-base text-slate-400">{currentEmployee.role}</p>
                                        </div>

                                        {activeClockEntry ? (
                                            <div className="space-y-3 sm:space-y-4">
                                                <Badge className="bg-green-600 text-white text-base sm:text-lg px-3 sm:px-4 py-1.5 sm:py-2">
                                                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                                    Eingestempelt
                                                </Badge>
                                                <div className="text-slate-300">
                                                    <p className="text-xs sm:text-sm">Eingestempelt um</p>
                                                    <p className="text-xl sm:text-2xl font-bold text-white">
                                                        {format(new Date(activeClockEntry.clock_in), 'HH:mm')} Uhr
                                                    </p>
                                                    <p className="text-sm sm:text-base text-slate-400 mt-2">
                                                        Arbeitszeit: {getWorkingDuration(activeClockEntry.clock_in)}
                                                    </p>
                                                </div>
                                                <Button 
                                                    onClick={() => handleClockOut(activeClockEntry)}
                                                    size="lg"
                                                    className="bg-red-600 hover:bg-red-700 text-white mt-3 sm:mt-4 w-full sm:w-auto"
                                                >
                                                    <LogOut className="w-5 h-5 mr-2" />
                                                    Ausstempeln
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 sm:space-y-4">
                                                <Badge className="bg-slate-600 text-white text-base sm:text-lg px-3 sm:px-4 py-1.5 sm:py-2">
                                                    Nicht eingestempelt
                                                </Badge>
                                                <Button 
                                                    onClick={handleClockIn}
                                                    size="lg"
                                                    className="bg-green-600 hover:bg-green-700 text-white mt-3 sm:mt-4 w-full sm:w-auto"
                                                    disabled={clockInMutation.isPending}
                                                >
                                                    <LogIn className="w-5 h-5 mr-2" />
                                                    Einstempeln
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </Card>

                                {/* Today's Clock Entries */}
                                <div className="space-y-3 sm:space-y-4">
                                    <h3 className="text-base sm:text-lg font-semibold text-white">Heutige Stempelungen</h3>
                                    {todayClockEntries.length === 0 ? (
                                        <Card className="p-6 text-center bg-slate-800 border-slate-700">
                                            <p className="text-sm sm:text-base text-slate-400">Noch keine Stempelungen heute</p>
                                        </Card>
                                    ) : (
                                        todayClockEntries.map(entry => (
                                            <Card key={entry.id} className="p-3 sm:p-4 bg-slate-800 border-slate-700">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-white text-sm sm:text-base truncate">{entry.employee_name}</p>
                                                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-slate-400">
                                                            <span className="flex items-center gap-1">
                                                                <LogIn className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                                                                {format(new Date(entry.clock_in), 'HH:mm')}
                                                            </span>
                                                            {entry.clock_out && (
                                                                <>
                                                                    <span className="flex items-center gap-1">
                                                                        <LogOut className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                                                                        {format(new Date(entry.clock_out), 'HH:mm')}
                                                                    </span>

                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <Badge className={entry.status === 'clocked_in' ? 'bg-green-600 text-xs' : 'bg-slate-600 text-xs'}>
                                                            {entry.status === 'clocked_in' ? 'Aktiv' : 'Beendet'}
                                                        </Badge>
                                                        {entry.total_hours && (
                                                            <p className="text-base sm:text-lg font-bold text-white mt-1">
                                                                {entry.total_hours}h
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </>
                        ) : (
                            <Card className="p-8 text-center bg-slate-800 border-slate-700">
                                <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                                <h2 className="text-xl font-bold text-white mb-2">Kein Mitarbeiterprofil</h2>
                                <p className="text-slate-400">
                                    Du musst als Mitarbeiter registriert sein, um die Stempeluhr zu nutzen.
                                </p>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>



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