import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, TrendingUp, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth, isSameDay, parseISO, isAfter, isBefore, differenceInMinutes } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function MyShiftsPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentUser, setCurrentUser] = useState(null);
    const [employee, setEmployee] = useState(null);

    React.useEffect(() => {
        const loadUser = async () => {
            const user = await base44.auth.me();
            setCurrentUser(user);
            
            const employees = await base44.entities.Employee.filter({ 
                email: user.email,
                is_active: true 
            });
            setEmployee(employees[0]);
        };
        loadUser();
    }, []);

    const { data: shifts = [] } = useQuery({
        queryKey: ['my-shifts', employee?.id],
        queryFn: async () => {
            if (!employee) return [];
            const allShifts = await base44.entities.Shift.filter({ 
                employee_id: employee.id 
            });
            return allShifts.sort((a, b) => new Date(a.date) - new Date(b.date));
        },
        enabled: !!employee
    });

    // Berechne nächste 14 Tage
    const next14Days = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const date = addDays(today, i);
            const dayShifts = shifts.filter(s => isSameDay(parseISO(s.date), date));
            days.push({ date, shifts: dayShifts });
        }
        return days;
    }, [shifts]);

    // Berechne kommende Schichten
    const upcomingShifts = useMemo(() => {
        const today = new Date();
        return shifts.filter(s => isAfter(parseISO(s.date), today) || isSameDay(parseISO(s.date), today));
    }, [shifts]);

    // Berechne Monatsstatistiken
    const monthStats = useMemo(() => {
        const start = startOfMonth(selectedDate);
        const end = endOfMonth(selectedDate);
        const monthShifts = shifts.filter(s => {
            const shiftDate = parseISO(s.date);
            return isAfter(shiftDate, start) && isBefore(shiftDate, end);
        });

        let totalMinutes = 0;
        monthShifts.forEach(shift => {
            const start = new Date(`2000-01-01 ${shift.start_time}`);
            const end = new Date(`2000-01-01 ${shift.end_time}`);
            totalMinutes += differenceInMinutes(end, start);
        });

        return {
            totalShifts: monthShifts.length,
            totalHours: (totalMinutes / 60).toFixed(1),
            shifts: monthShifts
        };
    }, [shifts, selectedDate]);

    // Berechne Monatskalender
    const monthCalendar = useMemo(() => {
        const start = startOfMonth(selectedDate);
        const end = endOfMonth(selectedDate);
        const startWeek = startOfWeek(start, { locale: de });
        const endWeek = endOfWeek(end, { locale: de });
        
        const days = [];
        let currentDay = startWeek;
        
        while (currentDay <= endWeek) {
            const dayShifts = shifts.filter(s => isSameDay(parseISO(s.date), currentDay));
            days.push({
                date: currentDay,
                shifts: dayShifts,
                isCurrentMonth: currentDay >= start && currentDay <= end
            });
            currentDay = addDays(currentDay, 1);
        }
        
        return days;
    }, [shifts, selectedDate]);

    // Team heute/morgen
    const { data: todayTeam = [] } = useQuery({
        queryKey: ['team-today'],
        queryFn: async () => {
            const today = format(new Date(), 'yyyy-MM-dd');
            return await base44.entities.Shift.filter({ date: today });
        }
    });

    const { data: tomorrowTeam = [] } = useQuery({
        queryKey: ['team-tomorrow'],
        queryFn: async () => {
            const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
            return await base44.entities.Shift.filter({ date: tomorrow });
        }
    });

    if (!employee) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Lade Daten...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-foreground">Meine Schichten</h1>
                    <p className="text-muted-foreground">Deine persönliche Schichtübersicht</p>
                </div>

                <Tabs defaultValue="week" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="week">Woche</TabsTrigger>
                        <TabsTrigger value="month">Monat</TabsTrigger>
                        <TabsTrigger value="list">Liste</TabsTrigger>
                        <TabsTrigger value="team">Team</TabsTrigger>
                    </TabsList>

                    {/* Wochenansicht */}
                    <TabsContent value="week" className="space-y-4">
                        <div className="grid gap-4">
                            {next14Days.map(({ date, shifts: dayShifts }) => (
                                <Card key={date.toISOString()} className="overflow-hidden">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-lg">
                                                    {format(date, 'EEEE', { locale: de })}
                                                </CardTitle>
                                                <p className="text-sm text-muted-foreground">
                                                    {format(date, 'dd.MM.yyyy')}
                                                </p>
                                            </div>
                                            {isSameDay(date, new Date()) && (
                                                <Badge className="bg-amber-500 text-slate-900">Heute</Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {dayShifts.length > 0 ? (
                                            <div className="space-y-2">
                                                {dayShifts.map(shift => {
                                                    const start = new Date(`2000-01-01 ${shift.start_time}`);
                                                    const end = new Date(`2000-01-01 ${shift.end_time}`);
                                                    const duration = differenceInMinutes(end, start) / 60;
                                                    
                                                    return (
                                                        <div key={shift.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                                                            <Clock className="w-5 h-5 text-amber-500" />
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-foreground">
                                                                    {shift.start_time} - {shift.end_time}
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {duration.toFixed(1)} Stunden
                                                                    {shift.shift_type && ` • ${shift.shift_type}`}
                                                                </p>
                                                                {shift.notes && (
                                                                    <p className="text-sm text-muted-foreground mt-1">{shift.notes}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground text-sm">Keine Schicht</p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* Monatsansicht */}
                    <TabsContent value="month" className="space-y-4">
                        {/* Statistiken */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Schichten</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold text-foreground">{monthStats.totalShifts}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Stunden</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold text-foreground">{monthStats.totalHours}</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Monatsnavigation */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setSelectedDate(addDays(selectedDate, -30))}
                                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground font-medium"
                            >
                                ← Vorheriger Monat
                            </button>
                            <h2 className="text-xl font-bold text-foreground">
                                {format(selectedDate, 'MMMM yyyy', { locale: de })}
                            </h2>
                            <button
                                onClick={() => setSelectedDate(addDays(selectedDate, 30))}
                                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground font-medium"
                            >
                                Nächster Monat →
                            </button>
                        </div>

                        {/* Kalender */}
                        <Card>
                            <CardContent className="p-4">
                                {/* Wochentage */}
                                <div className="grid grid-cols-7 gap-2 mb-2">
                                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                                        <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Tage */}
                                <div className="grid grid-cols-7 gap-2">
                                    {monthCalendar.map(({ date, shifts: dayShifts, isCurrentMonth }) => (
                                        <div
                                            key={date.toISOString()}
                                            className={cn(
                                                "aspect-square p-2 rounded-lg border transition-all",
                                                isCurrentMonth ? "border-border" : "border-transparent opacity-30",
                                                isSameDay(date, new Date()) && "bg-amber-500/20 border-amber-500",
                                                dayShifts.length > 0 && "bg-accent"
                                            )}
                                        >
                                            <div className="text-sm font-medium text-foreground mb-1">
                                                {format(date, 'd')}
                                            </div>
                                            {dayShifts.length > 0 && (
                                                <div className="space-y-1">
                                                    {dayShifts.map(shift => (
                                                        <div key={shift.id} className="text-xs text-muted-foreground truncate">
                                                            {shift.start_time}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Listenansicht */}
                    <TabsContent value="list" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Kommende Schichten ({upcomingShifts.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {upcomingShifts.length > 0 ? (
                                    <div className="space-y-3">
                                        {upcomingShifts.map(shift => {
                                            const shiftDate = parseISO(shift.date);
                                            const start = new Date(`2000-01-01 ${shift.start_time}`);
                                            const end = new Date(`2000-01-01 ${shift.end_time}`);
                                            const duration = differenceInMinutes(end, start) / 60;
                                            
                                            return (
                                                <div key={shift.id} className="flex items-start gap-4 p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors">
                                                    <div className="flex-shrink-0">
                                                        <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex flex-col items-center justify-center">
                                                            <p className="text-xs font-semibold text-amber-500">
                                                                {format(shiftDate, 'MMM', { locale: de })}
                                                            </p>
                                                            <p className="text-lg font-bold text-amber-500">
                                                                {format(shiftDate, 'd')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold text-foreground">
                                                                {format(shiftDate, 'EEEE, dd.MM.yyyy', { locale: de })}
                                                            </p>
                                                            {isSameDay(shiftDate, new Date()) && (
                                                                <Badge className="bg-amber-500 text-slate-900">Heute</Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                                            <p className="text-sm text-muted-foreground">
                                                                {shift.start_time} - {shift.end_time} ({duration.toFixed(1)} Std.)
                                                            </p>
                                                        </div>
                                                        {shift.shift_type && (
                                                            <Badge variant="outline" className="mt-2">{shift.shift_type}</Badge>
                                                        )}
                                                        {shift.notes && (
                                                            <p className="text-sm text-muted-foreground mt-2">{shift.notes}</p>
                                                        )}
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">Keine kommenden Schichten</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Team heute/morgen */}
                    <TabsContent value="team" className="space-y-4">
                        {/* Heute */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    Heute im Dienst ({todayTeam.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {todayTeam.length > 0 ? (
                                    <div className="space-y-2">
                                        {todayTeam.map(shift => (
                                            <div key={shift.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                                    <span className="text-slate-900 font-bold">
                                                        {shift.employee_name?.charAt(0) || '?'}
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-foreground">{shift.employee_name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {shift.start_time} - {shift.end_time}
                                                        {shift.shift_type && ` • ${shift.shift_type}`}
                                                    </p>
                                                </div>
                                                {shift.employee_id === employee.id && (
                                                    <Badge className="bg-amber-500 text-slate-900">Du</Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">Keine Schichten heute</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Morgen */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    Morgen im Dienst ({tomorrowTeam.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {tomorrowTeam.length > 0 ? (
                                    <div className="space-y-2">
                                        {tomorrowTeam.map(shift => (
                                            <div key={shift.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                                    <span className="text-slate-900 font-bold">
                                                        {shift.employee_name?.charAt(0) || '?'}
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-foreground">{shift.employee_name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {shift.start_time} - {shift.end_time}
                                                        {shift.shift_type && ` • ${shift.shift_type}`}
                                                    </p>
                                                </div>
                                                {shift.employee_id === employee.id && (
                                                    <Badge className="bg-amber-500 text-slate-900">Du</Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">Keine Schichten morgen</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}