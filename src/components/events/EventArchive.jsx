import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors = {
    'geplant': 'bg-yellow-100 text-yellow-700',
    'bestätigt': 'bg-green-100 text-green-700',
    'abgesagt': 'bg-red-100 text-red-700'
};

const eventTypeColors = {
    'Party': 'bg-purple-100 text-purple-700 border-purple-200',
    'Livemusik': 'bg-pink-100 text-pink-700 border-pink-200',
    'DJ-Night': 'bg-blue-100 text-blue-700 border-blue-200',
    'Special Event': 'bg-amber-100 text-amber-700 border-amber-200',
    'Private Feier': 'bg-green-100 text-green-700 border-green-200',
    'Sonstiges': 'bg-slate-100 text-slate-700 border-slate-200'
};

export default function EventArchive({ events, onEdit, onDelete }) {
    const [expandedId, setExpandedId] = useState(null);

    // Group events by year-month
    const groupedEvents = useMemo(() => {
        const groups = {};
        [...events].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(event => {
            const monthKey = format(parseISO(event.date), 'MMMM yyyy', { locale: de });
            if (!groups[monthKey]) groups[monthKey] = [];
            groups[monthKey].push(event);
        });
        return groups;
    }, [events]);

    const formatDateWithDay = (dateStr) => {
        const date = parseISO(dateStr);
        return format(date, 'EEEE, dd. MMMM yyyy', { locale: de });
    };

    return (
        <div className="space-y-4">
            {Object.entries(groupedEvents).map(([monthKey, monthEvents]) => (
                <div key={monthKey}>
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
                        {monthKey}
                    </h3>
                    <div className="space-y-2">
                        {monthEvents.map(event => (
                            <Card 
                                key={event.id}
                                className="bg-slate-800 border-slate-700 overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                                    className="w-full"
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 text-left">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <CardTitle className="text-base text-white">
                                                        {event.title}
                                                    </CardTitle>
                                                    <Badge className={eventTypeColors[event.event_type]} variant="outline">
                                                        {event.event_type}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-slate-400">
                                                    {formatDateWithDay(event.date)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge className={statusColors[event.status]}>
                                                    {event.status}
                                                </Badge>
                                                {expandedId === event.id ? (
                                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                </button>

                                {expandedId === event.id && (
                                    <CardContent className="pb-4 pt-0 space-y-3 border-t border-slate-700">
                                        {event.start_time && (
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase">Zeit</p>
                                                <p className="text-sm text-slate-300">
                                                    {event.start_time}{event.end_time && ` - ${event.end_time}`}
                                                </p>
                                            </div>
                                        )}

                                        {event.description && (
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase">Beschreibung</p>
                                                <p className="text-sm text-slate-300">{event.description}</p>
                                            </div>
                                        )}

                                        {event.expected_guests && (
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase">Erwartete Gäste</p>
                                                <p className="text-sm text-slate-300">{event.expected_guests}</p>
                                            </div>
                                        )}

                                        {event.notes && (
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase">Notizen</p>
                                                <p className="text-sm text-slate-300 italic">{event.notes}</p>
                                            </div>
                                        )}

                                        <div className="flex gap-2 pt-2 border-t border-slate-700">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEdit(event);
                                                }}
                                                className="flex-1 text-slate-300 hover:text-amber-400 hover:bg-amber-500/10"
                                            >
                                                <Edit className="w-3 h-3 mr-1" />
                                                Bearbeiten
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete(event.id);
                                                }}
                                                className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            >
                                                <Trash2 className="w-3 h-3 mr-1" />
                                                Löschen
                                            </Button>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            ))}

            {events.length === 0 && (
                <Card className="p-8 bg-slate-800 border-slate-700">
                    <div className="text-center text-slate-400">
                        <p className="text-sm">Keine archivierten Events vorhanden</p>
                    </div>
                </Card>
            )}
        </div>
    );
}