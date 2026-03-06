import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

export default function DailyRevenueList({ revenues, timeEntries, tipDistributions, employees = [] }) {
    const employeeMap = new Map(employees.map(emp => [emp.id, emp]));

    const getOperatingDate = (te) => {
        const startHour = parseInt(te.start_time?.split(':')[0] || '12');
        if (startHour < 9) {
            const prev = new Date(te.date);
            prev.setDate(prev.getDate() - 1);
            return prev.toISOString().split('T')[0];
        }
        return te.date;
    };

    // Letzte 30 Tage mit Daten
    const last30Days = revenues.slice(0, 30).map(rev => {
        const dateStr = rev.date;
        const dayEntries = timeEntries.filter(te => getOperatingDate(te) === dateStr && te.status === 'genehmigt');
        const staffCount = new Set(dayEntries.map(te => te.employee_id)).size;
        const laborCost = dayEntries.reduce((sum, te) => {
            const rate = employeeMap.get(te.employee_id)?.hourly_rate || te.hourly_rate || 0;
            return sum + (te.total_hours * rate);
        }, 0);
        const tips = tipDistributions.find(td => td.date === dateStr);

        return {
            date: dateStr,
            revenue: rev.revenue,
            laborCost,
            staffCount,
            tips: tips?.total_tips || 0,
            tipPercentage: tips?.tip_percentage || 0
        };
    });

    if (last30Days.length === 0) {
        return null;
    }

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-white">Letzte Einträge</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left py-2 px-2 text-slate-400 font-semibold">Datum</th>
                                <th className="text-right py-2 px-2 text-slate-400 font-semibold">Umsatz</th>
                                <th className="text-right py-2 px-2 text-slate-400 font-semibold">Personalkosten</th>
                                <th className="text-right py-2 px-2 text-slate-400 font-semibold">Personal</th>
                                <th className="text-right py-2 px-2 text-slate-400 font-semibold">Trinkgeld</th>
                            </tr>
                        </thead>
                        <tbody>
                            {last30Days.map((day) => (
                                <tr key={day.date} className="border-b border-slate-700 hover:bg-slate-900/50">
                                    <td className="py-3 px-2 text-white">
                                        {format(parseISO(day.date), 'dd.MM.yyyy EEEE', { locale: de })}
                                    </td>
                                    <td className="text-right py-3 px-2 text-green-400 font-semibold">
                                        {day.revenue.toFixed(2)} €
                                    </td>
                                    <td className="text-right py-3 px-2 text-amber-400">
                                        {day.laborCost.toFixed(2)} €
                                    </td>
                                    <td className="text-right py-3 px-2 text-slate-400">
                                        {day.staffCount}
                                    </td>
                                    <td className="text-right py-3 px-2">
                                        {day.tips > 0 ? (
                                            <span className="text-purple-400 font-semibold">
                                                {day.tips.toFixed(2)} € ({day.tipPercentage}%)
                                            </span>
                                        ) : (
                                            <span className="text-slate-500">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}