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

    const handleQuickClockIn = () => {
        clockInMutation.mutate(currentEmployee.id);
    };

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Welcome Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Willkommen, {currentEmployee.name}!
                    </h1>
                    <p className="text-slate-400">
                        {format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}
                    </p>
                </div>

                {/* Clock Status Banner */}
                {activeClockEntry && (
                    <Card className="p-4 mb-6 bg-gradient-to-r from-green-900/30 to-green-800/30 border-green-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                <div>
                                    <p className="text-white font-semibold">Aktuell eingestempelt</p>
                                    <p className="text-green-300 text-sm">
                                        Seit {format(new Date(activeClockEntry.clock_in), 'HH:mm')} Uhr • {getWorkingDuration(activeClockEntry.clock_in)}
                                    </p>
                                </div>
                            </div>
                            <Link to={createPageUrl('ClockIn')}>
                                <Button variant="outline" className="border-green-600 text-green-300 hover:bg-green-800">
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Ausstempeln
                                </Button>
                            </Link>
                        </div>
                    </Card>
                )}

                {/* Quick Actions */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Link to={createPageUrl('ClockIn')} className="block">
                        <Card className="p-4 bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
                                    {activeClockEntry ? (
                                        <LogOut className="w-6 h-6 text-green-500" />
                                    ) : (
                                        <LogIn className="w-6 h-6 text-green-500" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Stempeluhr</p>
                                    <p className="font-semibold text-white">
                                        {activeClockEntry ? 'Ausstempeln' : 'Einstempeln'}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Shifts')} className="block">
                        <Card className="p-4 bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                    <Calendar className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Schichtplan</p>
                                    <p className="font-semibold text-white">Ansehen</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Vacation')} className="block">
                        <Card className="p-4 bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                                    <Umbrella className="w-6 h-6 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Urlaub</p>
                                    <p className="font-semibold text-white">Beantragen</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('TimeTracking')} className="block">
                        <Card className="p-4 bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-amber-600/20 flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Zeiteinträge</p>
                                    <p className="font-semibold text-white">Ansehen</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-blue-500" />
                            </div>
                            <Badge className="bg-blue-600/20 text-blue-400">Diese Woche</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{hoursThisWeek.toFixed(1)}h</p>
                        <p className="text-sm text-slate-400">Gearbeitete Stunden</p>
                        <p className="text-xs text-slate-500 mt-2">
                            Monat: {hoursThisMonth.toFixed(1)}h
                        </p>
                    </Card>

                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                                <Umbrella className="w-6 h-6 text-purple-500" />
                            </div>
                            <Badge className="bg-purple-600/20 text-purple-400">Urlaub</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{remainingVacationDays}</p>
                        <p className="text-sm text-slate-400">Verbleibende Tage</p>
                        <p className="text-xs text-slate-500 mt-2">
                            Von {totalVacationDays} Tagen gesamt
                        </p>
                    </Card>

                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-green-500" />
                            </div>
                            <Badge className="bg-green-600/20 text-green-400">Nächste</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{myUpcomingShifts.length}</p>
                        <p className="text-sm text-slate-400">Kommende Schichten</p>
                        {myUpcomingShifts[0] && (
                            <p className="text-xs text-slate-500 mt-2">
                                Nächste: {format(parseISO(myUpcomingShifts[0].date), 'EEE, dd.MM', { locale: de })}
                            </p>
                        )}
                    </Card>
                </div>

                {/* Upcoming Shifts */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">Kommende Schichten</h2>
                        <Link to={createPageUrl('Shifts')}>
                            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                                Alle anzeigen
                            </Button>
                        </Link>
                    </div>

                    {myUpcomingShifts.length === 0 ? (
                        <Card className="p-8 text-center bg-slate-800 border-slate-700">
                            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">Keine kommenden Schichten geplant</p>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {myUpcomingShifts.map(shift => (
                                <Card key={shift.id} className="p-4 bg-slate-800 border-slate-700">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-white">
                                                    {format(parseISO(shift.date), 'dd')}
                                                </p>
                                                <p className="text-xs text-slate-400 uppercase">
                                                    {format(parseISO(shift.date), 'MMM', { locale: de })}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">
                                                    {format(parseISO(shift.date), 'EEEE', { locale: de })}
                                                </p>
                                                <p className="text-sm text-slate-400">
                                                    {shift.start_time} - {shift.end_time} Uhr
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge className="bg-amber-600/20 text-amber-400">
                                                {shift.shift_type}
                                            </Badge>
                                            {shift.notes && (
                                                <p className="text-xs text-slate-500 mt-1">{shift.notes}</p>
                                            )}
                                        </div>
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