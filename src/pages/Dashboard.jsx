import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, isToday, startOfWeek, endOfWeek, parseISO, addDays, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time-entries'],
        queryFn: () => base44.entities.TimeEntry.list('-date', 100)
    });

    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => base44.entities.Shift.list('-date', 100)
    });

    const { data: events = [] } = useQuery({
        queryKey: ['events'],
        queryFn: () => base44.entities.Event.list('-date', 30)
    });

    const { data: reservations = [] } = useQuery({
        queryKey: ['reservations'],
        queryFn: () => base44.entities.Reservation.list('-date', 30)
    });

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    // Zeiterfassungen die genehmigt werden müssen
    const pendingTimeEntries = timeEntries.filter(e => e.status === 'eingereicht');

    // Wochentage für Übersicht
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // Daten pro Tag
    const getDayData = (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayShifts = shifts.filter(s => s.date === dateStr);
        const dayEvents = events.filter(e => e.date === dateStr && e.status !== 'abgesagt');
        const dayReservations = reservations.filter(r => r.date === dateStr && r.status !== 'storniert');
        
        return { dayShifts, dayEvents, dayReservations };
    };

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white mb-1">
                        Manager Dashboard
                    </h1>
                    <p className="text-slate-400 text-sm">
                        {format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
                    </p>
                </div>

                {/* Zeiterfassungen zu genehmigen */}
                {pendingTimeEntries.length > 0 && (
                    <Card className="p-6 bg-slate-800 border-slate-700 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-amber-500" />
                                Zeiterfassungen zu genehmigen
                                <Badge className="bg-amber-600 text-white ml-2">{pendingTimeEntries.length}</Badge>
                            </h3>
                            <Link to={createPageUrl('TimeTracking')}>
                                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                        <div className="space-y-2">
                            {pendingTimeEntries.slice(0, 5).map(entry => (
                                <Link to={createPageUrl('TimeTracking')} key={entry.id}>
                                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer">
                                        <div>
                                            <p className="text-sm font-medium text-white">{entry.employee_name}</p>
                                            <p className="text-xs text-slate-400">
                                                {format(parseISO(entry.date), 'dd.MM.yyyy', { locale: de })} • {entry.start_time} - {entry.end_time}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-amber-400">{entry.total_hours?.toFixed(2)}h</p>
                                            <Badge className="bg-blue-100 text-blue-700 text-xs">Eingereicht</Badge>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Wochenübersicht */}
                <Card className="p-6 bg-slate-800 border-slate-700">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-500" />
                        Wochenübersicht {format(weekStart, 'dd.MM.')} - {format(weekEnd, 'dd.MM.yyyy')}
                    </h3>
                    
                    <div className="space-y-3">
                        {weekDays.map(day => {
                            const { dayShifts, dayEvents, dayReservations } = getDayData(day);
                            const isToday = isSameDay(day, new Date());
                            
                            return (
                                <div 
                                    key={day.toString()} 
                                    className={`p-4 rounded-lg ${isToday ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-slate-900'}`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className={`font-semibold ${isToday ? 'text-amber-400' : 'text-white'}`}>
                                                {format(day, 'EEEE', { locale: de })}
                                            </p>
                                            <p className="text-xs text-slate-400">{format(day, 'dd.MM.yyyy')}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {dayShifts.length > 0 && (
                                                <Badge variant="outline" className="text-xs border-purple-600 text-purple-400">
                                                    {dayShifts.length} Schichten
                                                </Badge>
                                            )}
                                            {dayReservations.length > 0 && (
                                                <Badge variant="outline" className="text-xs border-blue-600 text-blue-400">
                                                    {dayReservations.length} Res.
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Schichten */}
                                    {dayShifts.length > 0 && (
                                        <div className="space-y-1.5 mb-2">
                                            {dayShifts.slice(0, 3).map(shift => (
                                                <div key={shift.id} className="flex items-center gap-2 text-xs">
                                                    <div 
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: shift.color || '#64748b' }}
                                                    />
                                                    <span className="text-slate-300">{shift.employee_name}</span>
                                                    <span className="text-slate-500">
                                                        {shift.start_time} - {shift.end_time}
                                                    </span>
                                                </div>
                                            ))}
                                            {dayShifts.length > 3 && (
                                                <p className="text-xs text-slate-500 ml-4">+{dayShifts.length - 3} weitere</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Events */}
                                    {dayEvents.length > 0 && (
                                        <div className="space-y-1 pt-2 border-t border-slate-700">
                                            {dayEvents.map(event => (
                                                <div key={event.id} className="flex items-center gap-2 text-xs">
                                                    <AlertCircle className="w-3 h-3 text-pink-500" />
                                                    <span className="text-slate-300 font-medium">{event.title}</span>
                                                    {event.expected_guests && (
                                                        <span className="text-slate-500">({event.expected_guests} Gäste)</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {dayShifts.length === 0 && dayEvents.length === 0 && dayReservations.length === 0 && (
                                        <p className="text-xs text-slate-600 italic">Keine Einträge</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </div>
    );
}