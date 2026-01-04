import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Clock, Plus, Pencil, Trash2, Calendar, CheckCircle2, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePermissions } from '@/components/auth/usePermissions';
import TimeEntryModal from '@/components/timetracking/TimeEntryModal';

const statusConfig = {
    'entwurf': { label: 'Entwurf', color: 'bg-slate-100 text-slate-700', icon: FileText },
    'eingereicht': { label: 'Eingereicht', color: 'bg-blue-100 text-blue-700', icon: Clock },
    'genehmigt': { label: 'Genehmigt', color: 'bg-green-100 text-green-700', icon: CheckCircle2 }
};

export default function TimeTracking() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [currentEmployee, setCurrentEmployee] = useState(null);

    useEffect(() => {
        const loadEmployee = async () => {
            const user = await base44.auth.me();
            const employees = await base44.entities.Employee.filter({ 
                email: user.email,
                is_active: true 
            });
            if (employees[0]) {
                setCurrentEmployee(employees[0]);
            }
        };
        loadEmployee();
    }, []);

    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time-entries', selectedMonth],
        queryFn: async () => {
            const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
            const end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
            const all = await base44.entities.TimeEntry.list('-date');
            return all.filter(entry => entry.date >= start && entry.date <= end);
        }
    });

    const { data: allEmployees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.TimeEntry.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['time-entries']);
            setModalOpen(false);
            setSelectedEntry(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.TimeEntry.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['time-entries']);
            setModalOpen(false);
            setSelectedEntry(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.TimeEntry.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['time-entries']);
        }
    });

    const handleSave = (data, id) => {
        if (id) {
            updateMutation.mutate({ id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (id) => {
        if (confirm('Zeiteintrag wirklich löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    const canEdit = (entry) => {
        if (permissions.isManager) return true;
        return entry.employee_id === currentEmployee?.id && entry.status === 'entwurf';
    };

    // Filter entries based on permissions
    const visibleEntries = permissions.isManager 
        ? timeEntries 
        : timeEntries.filter(e => e.employee_id === currentEmployee?.id);

    // Calculate totals
    const totalHours = visibleEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
    const approvedHours = visibleEntries.filter(e => e.status === 'genehmigt').reduce((sum, e) => sum + (e.total_hours || 0), 0);

    // Group by employee
    const entriesByEmployee = visibleEntries.reduce((groups, entry) => {
        if (!groups[entry.employee_name]) {
            groups[entry.employee_name] = [];
        }
        groups[entry.employee_name].push(entry);
        return groups;
    }, {});

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Zeiterfassung</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {format(selectedMonth, 'MMMM yyyy', { locale: de })} · {totalHours.toFixed(2)}h gesamt · {approvedHours.toFixed(2)}h genehmigt
                    </p>
                </div>

                {/* Month Selector */}
                <Card className="p-4 bg-slate-800 border-slate-700 mb-6">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)))}
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
                            onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))}
                            className="border-slate-600 hover:bg-slate-700 text-slate-300"
                        >
                            Nächster Monat →
                        </Button>
                    </div>
                </Card>

                {/* Add Entry Button */}
                <Button 
                    onClick={() => {
                        setSelectedEntry(null);
                        setModalOpen(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 mb-6 w-full sm:w-auto"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Neue Zeiterfassung
                </Button>

                {/* Entries by Employee */}
                <div className="space-y-6">
                    {Object.entries(entriesByEmployee).map(([employeeName, entries]) => {
                        const employeeTotal = entries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
                        return (
                            <div key={employeeName}>
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-lg font-semibold text-white">{employeeName}</h2>
                                    <span className="text-sm text-slate-400">{employeeTotal.toFixed(2)}h</span>
                                </div>
                                <div className="space-y-2">
                                    {entries
                                        .sort((a, b) => b.date.localeCompare(a.date))
                                        .map(entry => {
                                            const StatusIcon = statusConfig[entry.status].icon;
                                            return (
                                                <Card key={entry.id} className="p-4 bg-slate-800 border-slate-700">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="font-semibold text-white">
                                                                    {format(parseISO(entry.date), 'dd.MM.yyyy', { locale: de })}
                                                                </span>
                                                                <Badge className={statusConfig[entry.status].color}>
                                                                    <StatusIcon className="w-3 h-3 mr-1" />
                                                                    {statusConfig[entry.status].label}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                                                <span>{entry.start_time} - {entry.end_time}</span>
                                                                {entry.break_minutes > 0 && (
                                                                    <span>Pause: {entry.break_minutes} Min</span>
                                                                )}
                                                                <span className="font-semibold text-amber-400">
                                                                    {entry.total_hours?.toFixed(2)}h
                                                                </span>
                                                            </div>
                                                            {entry.notes && (
                                                                <p className="text-xs text-slate-500 mt-2">{entry.notes}</p>
                                                            )}
                                                        </div>
                                                        {canEdit(entry) && (
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        setSelectedEntry(entry);
                                                                        setModalOpen(true);
                                                                    }}
                                                                    className="text-slate-400 hover:text-white"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDelete(entry.id)}
                                                                    className="text-red-400 hover:text-red-300"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {visibleEntries.length === 0 && (
                    <Card className="p-12 bg-slate-800 border-slate-700">
                        <div className="text-center text-slate-500">
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Noch keine Zeiteinträge für diesen Monat</p>
                            <p className="text-xs mt-1">Erstelle deinen ersten Eintrag</p>
                        </div>
                    </Card>
                )}

                {/* Modal */}
                <TimeEntryModal
                    open={modalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedEntry(null);
                    }}
                    entry={selectedEntry}
                    currentEmployee={currentEmployee}
                    allEmployees={allEmployees}
                    isManager={permissions.isManager}
                    onSave={handleSave}
                />
            </div>
        </div>
    );
}