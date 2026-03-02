import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { FileText, Download, Calendar, TrendingUp, Users, Clock } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function Reports() {
    const permissions = usePermissions();
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);

    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time-entries-all'],
        queryFn: () => base44.entities.TimeEntry.list('-date')
    });

    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts-all'],
        queryFn: () => base44.entities.Shift.list('-date')
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.list('name')
    });

    if (!permissions.isManager) {
        return <PermissionDenied message="Nur Admins haben Zugriff auf Berichte." />;
    }

    // Filter entries for selected month
    const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

    let monthTimeEntries = timeEntries.filter(e => e.date >= monthStart && e.date <= monthEnd);
    let monthShifts = shifts.filter(s => s.date >= monthStart && s.date <= monthEnd);

    // Apply day filter if selected
    if (selectedDay) {
        monthTimeEntries = monthTimeEntries.filter(e => e.date === selectedDay);
        monthShifts = monthShifts.filter(s => s.date === selectedDay);
    }

    // Get unique days with entries for the day selector
    const daysWithEntries = Array.from(new Set([
        ...timeEntries.filter(e => e.date >= monthStart && e.date <= monthEnd).map(e => e.date),
        ...shifts.filter(s => s.date >= monthStart && s.date <= monthEnd).map(s => s.date)
    ])).sort();

    // Calculate hours by employee
    const hoursByEmployee = employees.map(emp => {
        const empEntries = monthTimeEntries.filter(e => e.employee_id === emp.id);
        const totalHours = empEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
        const approvedHours = empEntries.filter(e => e.status === 'genehmigt').reduce((sum, e) => sum + (e.total_hours || 0), 0);
        const pendingHours = empEntries.filter(e => e.status !== 'genehmigt').reduce((sum, e) => sum + (e.total_hours || 0), 0);
        const hourlyRate = emp.hourly_rate || 0;
        const estimatedSalary = approvedHours * hourlyRate;
        
        return {
            employee: emp.name,
            contractType: emp.contract_type || '-',
            hourlyRate: hourlyRate.toFixed(2),
            totalHours: totalHours.toFixed(2),
            approvedHours: approvedHours.toFixed(2),
            pendingHours: pendingHours.toFixed(2),
            estimatedSalary: estimatedSalary.toFixed(2),
            entryCount: empEntries.length
        };
    }).filter(e => e.entryCount > 0);

    // Shifts by employee
    const shiftsByEmployee = employees.map(emp => {
        const empShifts = monthShifts.filter(s => s.employee_id === emp.id);
        const shiftTypes = empShifts.reduce((acc, s) => {
            acc[s.shift_type] = (acc[s.shift_type] || 0) + 1;
            return acc;
        }, {});

        return {
            employee: emp.name,
            totalShifts: empShifts.length,
            aufmachen: shiftTypes['Aufmachen'] || 0,
            fruehschicht: shiftTypes['Frühschicht'] || 0,
            spaetschicht: shiftTypes['Spätschicht'] || 0,
            sonderschicht: shiftTypes['Sonderschicht'] || 0
        };
    }).filter(e => e.totalShifts > 0);

    // Overtime calculation
    const overtimeData = employees.map(emp => {
        const empEntries = monthTimeEntries.filter(e => e.employee_id === emp.id);
        const totalHours = empEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
        
        // Minijobs haben 43h/Monat, andere 160h
        const expectedHours = emp.contract_type === 'Minijob' ? 43 : 160;
        const overtime = totalHours - expectedHours;

        return {
            employee: emp.name,
            contractType: emp.contract_type || '-',
            totalHours: totalHours.toFixed(2),
            expectedHours: expectedHours.toFixed(2),
            overtime: overtime.toFixed(2)
        };
    }).filter(e => parseFloat(e.totalHours) > 0);

    // CSV Export Functions
    const exportToCSV = (data, filename) => {
        if (data.length === 0) {
            alert('Keine Daten zum Exportieren');
            return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header]?.toString() || '';
                return value.includes(',') ? `"${value}"` : value;
            }).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${format(selectedMonth, 'yyyy-MM')}.csv`;
        link.click();
    };

    const totalHoursAllEmployees = hoursByEmployee.reduce((sum, e) => sum + parseFloat(e.totalHours), 0);
    const totalApprovedHours = hoursByEmployee.reduce((sum, e) => sum + parseFloat(e.approvedHours), 0);

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Berichte</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Auswertungen und Export-Funktionen
                    </p>
                </div>

                {/* Month Selector */}
                <Card className="p-4 bg-slate-800 border-slate-700 mb-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            onClick={() => {
                                const newDate = new Date(selectedMonth);
                                newDate.setMonth(newDate.getMonth() - 1);
                                setSelectedMonth(newDate);
                                setSelectedDay(null);
                            }}
                            className="border-slate-600 hover:bg-slate-700 text-slate-300"
                        >
                            ← Vorheriger Monat
                        </Button>
                        <div className="flex items-center gap-2 text-white">
                            <Calendar className="w-5 h-5 text-amber-400" />
                            <span className="font-semibold">{format(selectedMonth, 'MMMM yyyy', { locale: de })}</span>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                const newDate = new Date(selectedMonth);
                                newDate.setMonth(newDate.getMonth() + 1);
                                setSelectedMonth(newDate);
                                setSelectedDay(null);
                            }}
                            className="border-slate-600 hover:bg-slate-700 text-slate-300"
                        >
                            Nächster Monat →
                        </Button>
                    </div>

                    {/* Day Filter */}
                    {daysWithEntries.length > 0 && (
                        <div className="border-t border-slate-700 pt-4">
                            <p className="text-sm text-slate-400 mb-2">Nach Tag filtern:</p>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant={selectedDay ? "outline" : "default"}
                                    onClick={() => setSelectedDay(null)}
                                    size="sm"
                                    className={selectedDay ? "border-slate-600 text-slate-300" : "bg-amber-600 hover:bg-amber-700"}
                                >
                                    Alle Tage
                                </Button>
                                {daysWithEntries.map(day => (
                                    <Button
                                        key={day}
                                        variant={selectedDay === day ? "default" : "outline"}
                                        onClick={() => setSelectedDay(day)}
                                        size="sm"
                                        className={selectedDay === day 
                                            ? "bg-amber-600 hover:bg-amber-700" 
                                            : "border-slate-600 text-slate-300"
                                        }
                                    >
                                        {format(new Date(day + 'T00:00'), 'd. MMM', { locale: de })}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                {/* Summary Cards */}
                <div className="grid sm:grid-cols-3 gap-4 mb-6">
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Gesamtstunden</p>
                                <p className="text-2xl font-bold text-white">{totalHoursAllEmployees.toFixed(0)}h</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Genehmigt</p>
                                <p className="text-2xl font-bold text-white">{totalApprovedHours.toFixed(0)}h</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Mitarbeiter</p>
                                <p className="text-2xl font-bold text-white">{hoursByEmployee.length}</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Reports Tabs */}
                <Tabs defaultValue="hours" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
                        <TabsTrigger value="hours">Stundenauswertung</TabsTrigger>
                        <TabsTrigger value="shifts">Schichten</TabsTrigger>
                        <TabsTrigger value="overtime">Überstunden</TabsTrigger>
                    </TabsList>

                    {/* Hours Report */}
                    <TabsContent value="hours">
                        <Card className="bg-slate-800 border-slate-700">
                            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-amber-400" />
                                    <h3 className="font-semibold text-white">Stundenauswertung & Gehaltsabrechnung</h3>
                                </div>
                                <Button
                                    onClick={() => exportToCSV(hoursByEmployee, 'stundenauswertung')}
                                    variant="outline"
                                    size="sm"
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    CSV Export
                                </Button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-900/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Mitarbeiter
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Vertrag
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                €/h
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Gesamt
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Genehmigt
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Ausstehend
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Gehalt
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {hoursByEmployee.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-700/50 transition-colors">
                                                <td className="px-4 py-3 text-sm font-medium text-white">
                                                    {row.employee}
                                                    {row.contractType === 'Minijob' && parseFloat(row.approvedHours) >= 43 && (
                                                        <div className="mt-1">
                                                            <Badge className="bg-red-100 text-red-700 text-xs">
                                                                ⚠️ Minijob-Grenze erreicht
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-center">
                                                    <Badge className={
                                                        row.contractType === 'Minijob' && parseFloat(row.approvedHours) >= 43
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-slate-700 text-slate-300"
                                                    }>
                                                        {row.contractType}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right text-slate-400">
                                                    {row.hourlyRate}€
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right text-slate-300">
                                                    {row.totalHours}h
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right">
                                                    <Badge className={
                                                        row.contractType === 'Minijob' && parseFloat(row.approvedHours) >= 43
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-green-100 text-green-700"
                                                    }>
                                                        {row.approvedHours}h
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right">
                                                    <Badge className="bg-blue-100 text-blue-700">
                                                        {row.pendingHours}h
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold text-amber-400">
                                                    {row.estimatedSalary}€
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-900/50 font-semibold">
                                            <td colSpan="6" className="px-4 py-3 text-sm text-right text-white">
                                                Gesamtsumme (genehmigte Stunden):
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-amber-400 font-bold">
                                                {hoursByEmployee.reduce((sum, row) => sum + parseFloat(row.estimatedSalary), 0).toFixed(2)}€
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            {hoursByEmployee.length === 0 && (
                                <div className="p-8 text-center text-slate-500">
                                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Keine Daten für diesen Monat</p>
                                </div>
                            )}
                        </Card>
                    </TabsContent>

                    {/* Shifts Report */}
                    <TabsContent value="shifts">
                        <Card className="bg-slate-800 border-slate-700">
                            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-amber-400" />
                                    <h3 className="font-semibold text-white">Schichtenübersicht</h3>
                                </div>
                                <Button
                                    onClick={() => exportToCSV(shiftsByEmployee, 'schichten')}
                                    variant="outline"
                                    size="sm"
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    CSV Export
                                </Button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-900/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Mitarbeiter
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Gesamt
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Aufmachen
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Frühschicht
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Spätschicht
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Sonderschicht
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {shiftsByEmployee.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-700/50 transition-colors">
                                                <td className="px-4 py-3 text-sm font-medium text-white">
                                                    {row.employee}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right text-slate-300 font-semibold">
                                                    {row.totalShifts}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right text-slate-400">
                                                    {row.aufmachen}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right text-slate-400">
                                                    {row.fruehschicht}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right text-slate-400">
                                                    {row.spaetschicht}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right text-slate-400">
                                                    {row.sonderschicht}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {shiftsByEmployee.length === 0 && (
                                <div className="p-8 text-center text-slate-500">
                                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Keine Schichten für diesen Monat</p>
                                </div>
                            )}
                        </Card>
                    </TabsContent>

                    {/* Overtime Report */}
                    <TabsContent value="overtime">
                        <Card className="bg-slate-800 border-slate-700">
                            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-amber-400" />
                                    <h3 className="font-semibold text-white">Überstundenauswertung</h3>
                                </div>
                                <Button
                                    onClick={() => exportToCSV(overtimeData, 'ueberstunden')}
                                    variant="outline"
                                    size="sm"
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    CSV Export
                                </Button>
                            </div>
                            <div className="p-4 bg-blue-900/20 border-b border-slate-700">
                                <p className="text-sm text-blue-300">
                                    ℹ️ Minijobs: 43 Stunden/Monat | Vollzeit/Teilzeit: 160 Stunden/Monat
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-900/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Mitarbeiter
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Vertrag
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Gearbeitet
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Soll
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Differenz
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {overtimeData.map((row, i) => {
                                            const overtime = parseFloat(row.overtime);
                                            return (
                                                <tr key={i} className="hover:bg-slate-700/50 transition-colors">
                                                    <td className="px-4 py-3 text-sm font-medium text-white">
                                                        {row.employee}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-center">
                                                        <Badge className="bg-slate-700 text-slate-300">
                                                            {row.contractType}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right text-slate-300">
                                                        {row.totalHours}h
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right text-slate-400">
                                                        {row.expectedHours}h
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right">
                                                        <Badge className={
                                                            overtime > 0 
                                                                ? 'bg-green-100 text-green-700' 
                                                                : overtime < 0 
                                                                    ? 'bg-red-100 text-red-700'
                                                                    : 'bg-slate-100 text-slate-700'
                                                        }>
                                                            {overtime > 0 ? '+' : ''}{row.overtime}h
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {overtimeData.length === 0 && (
                                <div className="p-8 text-center text-slate-500">
                                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Keine Daten für diesen Monat</p>
                                </div>
                            )}
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}