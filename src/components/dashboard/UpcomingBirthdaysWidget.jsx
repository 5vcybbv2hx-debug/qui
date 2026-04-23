import React, { useMemo } from 'react';
import { format, addDays, parse, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Cake } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function UpcomingBirthdaysWidget({ employees = [] }) {
    const upcomingBirthdays = useMemo(() => {
        const today = new Date();
        const nextWeek = addDays(today, 7);
        
        return employees
            .filter(emp => emp.birthday)
            .map(emp => {
                const [year, month, day] = emp.birthday.split('-');
                const nextBday = new Date(today.getFullYear(), parseInt(month) - 1, parseInt(day));
                
                // Wenn Geburtstag dieses Jahr bereits vorbei, nächstes Jahr
                if (nextBday < today) {
                    nextBday.setFullYear(nextBday.getFullYear() + 1);
                }
                
                return { emp, date: nextBday, daysUntil: Math.ceil((nextBday - today) / (1000 * 60 * 60 * 24)) };
            })
            .filter(({ daysUntil }) => daysUntil >= 0 && daysUntil <= 7)
            .sort((a, b) => a.daysUntil - b.daysUntil);
    }, [employees]);

    if (upcomingBirthdays.length === 0) {
        return null;
    }

    return (
        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <div className="flex items-center gap-2 mb-3">
                <Cake className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-sm text-foreground">Geburtstage</h3>
            </div>
            <div className="space-y-2">
                {upcomingBirthdays.map(({ emp, daysUntil }) => (
                    <div key={emp.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-background/40 hover:bg-background/60 transition-colors">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div 
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                style={{ backgroundColor: emp.color || '#a855f7' }}
                            >
                                {emp.name?.charAt(0)}
                            </div>
                            <span className="text-sm font-medium truncate">{emp.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                            {daysUntil === 0 ? (
                                <span className="text-xs px-2 py-1 bg-purple-500/30 text-purple-300 rounded-full font-semibold">Heute!</span>
                            ) : (
                                <span className="text-xs text-muted-foreground">{daysUntil}d</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}