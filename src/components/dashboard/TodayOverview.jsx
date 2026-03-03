import React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Calendar, AlertCircle, CalendarCheck } from 'lucide-react';

export default function TodayOverview({ shifts = [], events = [], reservations = [], employees = [], maxItems = null }) {
    if (shifts.length === 0 && events.length === 0 && reservations.length === 0) {
        return null;
    }

    const shiftsToShow = maxItems ? shifts.slice(0, maxItems) : shifts;
    const eventsToShow = maxItems ? events.slice(0, maxItems) : events;
    const reservationsToShow = maxItems ? reservations.slice(0, maxItems) : reservations;

    // Hilfsfunktion um Mitarbeiterfarbe zu holen
    const getEmployeeColor = (employeeId) => {
        const employee = employees.find(e => e.id === employeeId);
        return employee?.color || '#64748b';
    };

    return (
        <Card className="p-6 bg-card border-border">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-500" />
                Heute • {format(new Date(), 'EEEE, d. MMMM', { locale: de })}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <p className="text-xs text-slate-400 mb-2 uppercase">Schichten ({shifts.length})</p>
                    <div className="space-y-2">
                        {shiftsToShow.map(shift => (
                            <div key={shift.id} className="flex items-center gap-2 text-sm">
                                <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: shift.color || getEmployeeColor(shift.employee_id) }} 
                                />
                                <span className="text-slate-300 truncate">{shift.employee_name}</span>
                                <span className="text-slate-500 text-xs ml-auto">{shift.start_time?.substring(0, 5)}</span>
                            </div>
                        ))}
                        {shifts.length === 0 && <p className="text-sm text-slate-600 italic">Keine Schichten</p>}
                    </div>
                </div>

                <div>
                    <p className="text-xs text-slate-400 mb-2 uppercase">Events ({events.length})</p>
                    <div className="space-y-2">
                        {eventsToShow.map(event => (
                            <div key={event.id} className="flex items-start gap-2 text-sm">
                                <AlertCircle className="w-4 h-4 text-pink-500 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-slate-300 font-medium truncate">{event.title}</p>
                                    {event.expected_guests && <p className="text-xs text-slate-500">{event.expected_guests} Gäste</p>}
                                </div>
                            </div>
                        ))}
                        {events.length === 0 && <p className="text-sm text-slate-600 italic">Keine Events</p>}
                    </div>
                </div>

                <div>
                    <p className="text-xs text-slate-400 mb-2 uppercase">Reservierungen ({reservations.length})</p>
                    <div className="space-y-2">
                        {reservationsToShow.map(res => (
                            <div key={res.id} className="flex items-start gap-2 text-sm">
                                <CalendarCheck className="w-4 h-4 text-blue-500 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-slate-300 truncate">{res.customer_name}</p>
                                    <p className="text-xs text-slate-500">{res.time} • {res.guests} Gäste</p>
                                </div>
                            </div>
                        ))}
                        {reservations.length === 0 && <p className="text-sm text-slate-600 italic">Keine Reservierungen</p>}
                    </div>
                </div>
            </div>
        </Card>
    );
}