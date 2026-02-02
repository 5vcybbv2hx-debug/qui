import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Clock, Calendar, Umbrella, LogIn, LogOut, FileText, TrendingUp, Coffee, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes, isFuture, isToday, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

export default function MyDashboard() {
    const queryClient = useQueryClient();

    const { data: currentUser } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.list()
    });

    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => base44.entities.Shift.list('-date')
    });

    const { data: timeEntries = [] } = useQuery({
        queryKey: ['timeEntries'],
        queryFn: () => base44.entities.TimeEntry.list('-date')
    });

    const { data: clockEntries = [] } = useQuery({
        queryKey: ['clockEntries'],
        queryFn: () => base44.entities.ClockEntry.list('-clock_in')
    });

    const { data: vacationRequests = [] } = useQuery({
        queryKey: ['vacationRequests'],
        queryFn: () => base44.entities.VacationRequest.list('-created_date')
    });

    const clockInMutation = useMutation({
        mutationFn: async (employeeId) => {
            const employee = employees.find(e => e.id === employeeId);
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

            // Update Clock Entry
            await base44.entities.ClockEntry.update(entryId, {
                clock_out: clockOutTime.toISOString(),
                break_minutes: 0,
                total_hours: totalHours,
                status: 'clocked_out'
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
                status: 'eingereicht'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['clockEntries']);
            queryClient.invalidateQueries(['timeEntries']);
        }
    });

    const currentEmployee = employees.find(e => e.email === currentUser?.email);
    
    if (!currentEmployee) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center bg-slate-800 border-slate-700">
                    <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Kein Mitarbeiterprofil</h2>
                    <p className="text-slate-400">
                        Du musst als Mitarbeiter registriert sein, um dein Dashboard zu sehen.
                    </p>
                </Card>
            </div>
        );
    }

    // Get upcoming shifts
    const myUpcomingShifts = shifts
        .filter(s => s.employee_id === currentEmployee.id)
        .filter(s => isFuture(parseISO(s.date)) || isToday(parseISO(s.date)))
        .sort((a, b) => parseISO(a.date) - parseISO(b.date))
        .slice(0, 5);

    // Calculate hours this week
    const weekStart = startOfWeek(new Date(), { locale: de });
    const weekEnd = endOfWeek(new Date(), { locale: de });
    const weekEntries = timeEntries.filter(e => {
        if (e.employee_id !== currentEmployee.id) return false;
        const entryDate = parseISO(e.date);
        return entryDate >= weekStart && entryDate <= weekEnd;
    });
    const hoursThisWeek = weekEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

    // Calculate hours this month
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const monthEntries = timeEntries.filter(e => {
        if (e.employee_id !== currentEmployee.id) return false;
        const entryDate = parseISO(e.date);
        return entryDate >= monthStart && entryDate <= monthEnd;
    });
    const hoursThisMonth = monthEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

    // Calculate vacation days
    const approvedVacations = vacationRequests.filter(
        v => v.employee_id === currentEmployee.id && v.status === 'genehmigt' && v.type === 'Urlaub'
    );
    const usedVacationDays = approvedVacations.reduce((sum, v) => sum + (v.days_count || 0), 0);
    const totalVacationDays = currentEmployee.vacation_days_per_year || 0;
    const remainingVacationDays = totalVacationDays - usedVacationDays;

    // Check active clock entry
    const activeClockEntry = clockEntries.find(
        e => e.employee_id === currentEmployee.id && e.status === 'clocked_in'
    );

    const getWorkingDuration = (clockIn) => {
        const now = new Date();
        const start = new Date(clockIn);
        const minutes = differenceInMinutes(now, start);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const handleClockIn = () => {
        clockInMutation.mutate(currentEmployee.id);
    };

    const handleClockOut = (entry) => {
        if (confirm('Möchtest du jetzt ausstempeln?')) {
            clockOutMutation.mutate(entry.id);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Welcome Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Willkommen, {currentEmployee.name}!
                    </h1>
                    <p className="text-sm sm:text-base text-slate-400">
                        {format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}
                    </p>
                </div>

                {/* Clock Status Banner */}
                <Card className="p-4 sm:p-6 mb-4 sm:mb-6 bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div 
                                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-2xl shrink-0"
                                style={{ backgroundColor: currentEmployee.color || '#64748b' }}
                            >
                                {currentEmployee.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                {activeClockEntry ? (
                                    <>
                                        <p className="text-white font-semibold text-sm sm:text-base">Eingestempelt</p>
                                        <p className="text-green-400 text-xs sm:text-sm">
                                            Seit {format(new Date(activeClockEntry.clock_in), 'HH:mm')} Uhr • {getWorkingDuration(activeClockEntry.clock_in)}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-white font-semibold text-sm sm:text-base">Nicht eingestempelt</p>
                                        <p className="text-slate-400 text-xs sm:text-sm">Bereit zum Einstempeln</p>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            {activeClockEntry ? (
                                <Button 
                                    onClick={() => handleClockOut(activeClockEntry)}
                                    size="lg"
                                    className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                                    disabled={clockOutMutation.isPending}
                                >
                                    <LogOut className="w-5 h-5 mr-2" />
                                    Ausstempeln
                                </Button>
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

                {/* Quick Actions */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">

                    <Link to={createPageUrl('Shifts')} className="block">
                        <Card className="p-3 sm:p-4 bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors cursor-pointer">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 text-center sm:text-left">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
                                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs sm:text-sm text-slate-400">Schichtplan</p>
                                    <p className="font-semibold text-sm sm:text-base text-white">Ansehen</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Vacation')} className="block">
                        <Card className="p-3 sm:p-4 bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors cursor-pointer">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 text-center sm:text-left">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-600/20 flex items-center justify-center shrink-0">
                                    <Umbrella className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs sm:text-sm text-slate-400">Urlaub</p>
                                    <p className="font-semibold text-sm sm:text-base text-white">Beantragen</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('TimeTracking')} className="block">
                        <Card className="p-3 sm:p-4 bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors cursor-pointer">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 text-center sm:text-left">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-amber-600/20 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs sm:text-sm text-slate-400">Zeiteinträge</p>
                                    <p className="font-semibold text-sm sm:text-base text-white">Ansehen</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
                    <Card className="p-4 sm:p-6 bg-slate-800 border-slate-700">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                            </div>
                            <Badge className="bg-blue-600/20 text-blue-400 text-xs">Woche</Badge>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{hoursThisWeek.toFixed(1)}h</p>
                        <p className="text-xs sm:text-sm text-slate-400">Gearbeitete Stunden</p>
                        <p className="text-xs text-slate-500 mt-1 sm:mt-2">
                            Monat: {hoursThisMonth.toFixed(1)}h
                        </p>
                    </Card>

                    <Card className="p-4 sm:p-6 bg-slate-800 border-slate-700">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                                <Umbrella className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                            </div>
                            <Badge className="bg-purple-600/20 text-purple-400 text-xs">Urlaub</Badge>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{remainingVacationDays}</p>
                        <p className="text-xs sm:text-sm text-slate-400">Verbleibende Tage</p>
                        <p className="text-xs text-slate-500 mt-1 sm:mt-2">
                            Von {totalVacationDays} gesamt
                        </p>
                    </Card>

                    <Card className="p-4 sm:p-6 bg-slate-800 border-slate-700">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
                                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                            </div>
                            <Badge className="bg-green-600/20 text-green-400 text-xs">Nächste</Badge>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{myUpcomingShifts.length}</p>
                        <p className="text-xs sm:text-sm text-slate-400">Kommende Schichten</p>
                        {myUpcomingShifts[0] && (
                            <p className="text-xs text-slate-500 mt-1 sm:mt-2">
                                Nächste: {format(parseISO(myUpcomingShifts[0].date), 'EEE, dd.MM', { locale: de })}
                            </p>
                        )}
                    </Card>
                </div>

                {/* Upcoming Shifts */}
                <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg sm:text-xl font-bold text-white">Kommende Schichten</h2>
                        <Link to={createPageUrl('Shifts')}>
                            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs sm:text-sm">
                                Alle
                            </Button>
                        </Link>
                    </div>

                    {myUpcomingShifts.length === 0 ? (
                        <Card className="p-8 text-center bg-slate-800 border-slate-700">
                            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">Keine kommenden Schichten geplant</p>
                        </Card>
                    ) : (
                        <div className="space-y-2 sm:space-y-3">
                            {myUpcomingShifts.map(shift => (
                                <Card key={shift.id} className="p-3 sm:p-4 bg-slate-800 border-slate-700">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                                            <div className="text-center shrink-0">
                                                <p className="text-xl sm:text-2xl font-bold text-white">
                                                    {format(parseISO(shift.date), 'dd')}
                                                </p>
                                                <p className="text-xs text-slate-400 uppercase">
                                                    {format(parseISO(shift.date), 'MMM', { locale: de })}
                                                </p>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-white text-sm sm:text-base">
                                                    {format(parseISO(shift.date), 'EEEE', { locale: de })}
                                                </p>
                                                <p className="text-xs sm:text-sm text-slate-400">
                                                    {shift.start_time} - {shift.end_time}
                                                </p>
                                                {shift.notes && (
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{shift.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                        <Badge className="bg-amber-600/20 text-amber-400 text-xs shrink-0">
                                            {shift.shift_type}
                                        </Badge>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}