import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, LogIn, LogOut, Coffee, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, differenceInMinutes } from 'date-fns';
import { de } from 'date-fns/locale';

export default function ClockIn() {
    const queryClient = useQueryClient();
    const [breakModalOpen, setBreakModalOpen] = useState(false);
    const [breakMinutes, setBreakMinutes] = useState(30);
    const [clockOutEntry, setClockOutEntry] = useState(null);

    const { data: currentUser } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.list()
    });

    const { data: clockEntries = [] } = useQuery({
        queryKey: ['clockEntries'],
        queryFn: () => base44.entities.ClockEntry.list('-clock_in')
    });

    const { data: timeEntries = [] } = useQuery({
        queryKey: ['timeEntries'],
        queryFn: () => base44.entities.TimeEntry.list('-date')
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
        mutationFn: async ({ entryId, breakMinutes }) => {
            const entry = clockEntries.find(e => e.id === entryId);
            const clockOutTime = new Date();
            const totalMinutes = differenceInMinutes(clockOutTime, new Date(entry.clock_in));
            const workMinutes = totalMinutes - breakMinutes;
            const totalHours = Math.round((workMinutes / 60) * 100) / 100;

            // Update Clock Entry only
            await base44.entities.ClockEntry.update(entryId, {
                clock_out: clockOutTime.toISOString(),
                break_minutes: breakMinutes,
                total_hours: totalHours,
                status: 'clocked_out'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['clockEntries']);
            setBreakModalOpen(false);
            setClockOutEntry(null);
            setBreakMinutes(30);
        }
    });

    const currentEmployee = employees.find(e => e.email === currentUser?.email);
    const activeEntry = clockEntries.find(
        e => e.employee_id === currentEmployee?.id && e.status === 'clocked_in'
    );

    const todayEntries = clockEntries.filter(e => {
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
        setClockOutEntry(entry);
        setBreakModalOpen(true);
    };

    const confirmClockOut = () => {
        if (clockOutEntry) {
            clockOutMutation.mutate({
                entryId: clockOutEntry.id,
                breakMinutes: parseInt(breakMinutes) || 0
            });
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

    if (!currentEmployee) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center bg-slate-800 border-slate-700">
                    <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Kein Mitarbeiterprofil</h2>
                    <p className="text-slate-400">
                        Du musst als Mitarbeiter registriert sein, um die Stempeluhr zu nutzen.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="text-center mb-6 sm:mb-8">
                    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                        <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Stempeluhr</h1>
                    </div>
                    <p className="text-sm sm:text-base text-slate-400">
                        {format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}
                    </p>
                    <p className="text-xl sm:text-2xl font-mono text-white mt-2">
                        {format(new Date(), 'HH:mm:ss')}
                    </p>
                </div>

                {/* Main Clock Card */}
                <Card className="p-6 sm:p-8 mb-4 sm:mb-6 bg-slate-800 border-slate-700">
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

                        {activeEntry ? (
                            <div className="space-y-3 sm:space-y-4">
                                <Badge className="bg-green-600 text-white text-base sm:text-lg px-3 sm:px-4 py-1.5 sm:py-2">
                                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                    Eingestempelt
                                </Badge>
                                <div className="text-slate-300">
                                    <p className="text-xs sm:text-sm">Eingestempelt um</p>
                                    <p className="text-xl sm:text-2xl font-bold text-white">
                                        {format(new Date(activeEntry.clock_in), 'HH:mm')} Uhr
                                    </p>
                                    <p className="text-sm sm:text-base text-slate-400 mt-2">
                                        Arbeitszeit: {getWorkingDuration(activeEntry.clock_in)}
                                    </p>
                                </div>
                                <Button 
                                    onClick={() => handleClockOut(activeEntry)}
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

                {/* Today's Entries */}
                <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold text-white">Heutige Stempelungen</h3>
                    {todayEntries.length === 0 ? (
                        <Card className="p-6 text-center bg-slate-800 border-slate-700">
                            <p className="text-sm sm:text-base text-slate-400">Noch keine Stempelungen heute</p>
                        </Card>
                    ) : (
                        todayEntries.map(entry => (
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
                                                    {entry.break_minutes > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <Coffee className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
                                                            {entry.break_minutes}m
                                                        </span>
                                                    )}
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

                {/* Break Modal */}
                <Dialog open={breakModalOpen} onOpenChange={setBreakModalOpen}>
                    <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700">
                        <DialogHeader>
                            <DialogTitle className="text-white">
                                <Coffee className="w-5 h-5 inline mr-2 text-amber-500" />
                                Pausenzeit angeben
                            </DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Pausenzeit (Minuten)</Label>
                                <Input
                                    type="number"
                                    value={breakMinutes}
                                    onChange={(e) => setBreakMinutes(e.target.value)}
                                    min="0"
                                    step="5"
                                    className="bg-slate-700 border-slate-600 text-white"
                                />
                                <p className="text-xs text-slate-400">
                                    Gib deine Pausenzeit in Minuten an
                                </p>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setBreakModalOpen(false)}
                                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                    Abbrechen
                                </Button>
                                <Button 
                                    onClick={confirmClockOut}
                                    className="flex-1 bg-red-600 hover:bg-red-700"
                                    disabled={clockOutMutation.isPending}
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Ausstempeln
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}