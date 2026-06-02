import React from 'react';
import { useQuery } from '@tanstack/react-query'
import { STALE } from '@/lib/queryUtils';;
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfWeek, endOfWeek, parseISO, subWeeks } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

const COLORS = ['#f59e0b', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function WeeklyHoursChart({ employees = [] }) {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    // Load last 4 weeks + this week of time entries
    const rangeStart = format(subWeeks(weekStart, 3), 'yyyy-MM-dd');
    const rangeEnd = format(weekEnd, 'yyyy-MM-dd');

    const { data: timeEntries = [], isLoading } = useQuery({
        queryKey: ['weekly-hours-chart', rangeStart, rangeEnd],
        queryFn: () => base44.entities.TimeEntry.list('-date', 2000),
        staleTime: STALE.MEDIUM,
    });

    // Build per-employee hours for current week
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    const currentWeekEntries = timeEntries.filter(e => e.date >= weekStartStr && e.date <= weekEndStr);

    // Aggregate by employee
    const empMap = {};
    currentWeekEntries.forEach(e => {
        if (!empMap[e.employee_id]) {
            empMap[e.employee_id] = { name: e.employee_name, hours: 0, id: e.employee_id };
        }
        empMap[e.employee_id].hours += e.total_hours || 0;
    });

    const chartData = Object.values(empMap)
        .map(e => ({ ...e, hours: Math.round(e.hours * 10) / 10, shortName: e.name?.split(' ')[0] || e.name }))
        .sort((a, b) => b.hours - a.hours);

    // Weekly totals for last 4 weeks (line context)
    const weekLabels = Array.from({ length: 4 }, (_, i) => {
        const ws = subWeeks(weekStart, 3 - i);
        const we = endOfWeek(ws, { weekStartsOn: 1 });
        const wsStr = format(ws, 'yyyy-MM-dd');
        const weStr = format(we, 'yyyy-MM-dd');
        const total = timeEntries
            .filter(e => e.date >= wsStr && e.date <= weStr)
            .reduce((sum, e) => sum + (e.total_hours || 0), 0);
        return {
            label: i === 3 ? 'Diese Woche' : `KW ${format(ws, 'w')}`,
            total: Math.round(total * 10) / 10,
        };
    });

    const totalThisWeek = chartData.reduce((s, e) => s + e.hours, 0);

    if (isLoading) {
        return (
            <Card className="bg-card border-border">
                <CardContent className="p-4 flex items-center justify-center h-32 text-muted-foreground text-sm">
                    Lade Stundendaten…
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-card border-border">
            <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-semibold text-foreground">Arbeitsstunden diese Woche</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {format(weekStart, 'd. MMM', { locale: de })} – {format(weekEnd, 'd. MMM', { locale: de })}
                    </span>
                </div>

                {/* Total */}
                <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold text-amber-400">{totalThisWeek.toFixed(1)}h</span>
                    <span className="text-xs text-muted-foreground">gesamt Team</span>
                </div>

                {chartData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Noch keine Einträge diese Woche</p>
                ) : (
                    <div className="space-y-2">
                        {chartData.map((emp, i) => {
                            const maxHours = chartData[0].hours || 1;
                            const pct = Math.round((emp.hours / maxHours) * 100);
                            return (
                                <div key={emp.id} className="flex items-center gap-2">
                                    <span className="text-xs text-foreground font-medium w-20 shrink-0 truncate">{emp.shortName}</span>
                                    <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                                        <div
                                            className="h-2 rounded-full transition-all"
                                            style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                                        />
                                    </div>
                                    <span className="text-xs font-semibold text-foreground w-10 text-right shrink-0">{emp.hours}h</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Last 4 weeks mini-summary */}
                <div className="mt-3 grid grid-cols-4 gap-1 border-t border-border pt-3">
                    {weekLabels.map((w, i) => (
                        <div key={i} className="text-center">
                            <p className={`text-xs font-semibold ${i === 3 ? 'text-amber-400' : 'text-foreground'}`}>{w.total}h</p>
                            <p className="text-[10px] text-muted-foreground">{w.label}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}