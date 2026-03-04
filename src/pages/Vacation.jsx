import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, differenceInBusinessDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Plus, Check, X, Clock, AlertCircle, FileText, Trash2 } from 'lucide-react';
import VacationTaxReport from '@/components/vacation/VacationTaxReport';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { usePermissions } from '@/components/auth/usePermissions';

const statusConfig = {
    'beantragt': { label: 'Beantragt', color: 'bg-blue-100 text-blue-700', icon: Clock },
    'genehmigt': { label: 'Genehmigt', color: 'bg-green-100 text-green-700', icon: Check },
    'abgelehnt': { label: 'Abgelehnt', color: 'bg-red-100 text-red-700', icon: X }
};

const typeColors = {
    'Urlaub': 'bg-amber-100 text-amber-700',
    'Krankheit': 'bg-red-100 text-red-700',
    'Sonderurlaub': 'bg-purple-100 text-purple-700'
};

export default function Vacation() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [modalOpen, setModalOpen] = useState(false);
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [formData, setFormData] = useState({
        start_date: '',
        end_date: '',
        type: 'Urlaub',
        notes: ''
    });

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

    const { data: vacationRequests = [] } = useQuery({
        queryKey: ['vacation-requests', selectedYear],
        queryFn: async () => {
            const all = await base44.entities.VacationRequest.list('-created_date');
            return all.filter(req => {
                const year = new Date(req.start_date).getFullYear();
                return year === selectedYear;
            });
        }
    });

    const { data: allEmployees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ 
            is_active: true,
            contract_type: 'Vollzeit'
        })
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.VacationRequest.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['vacation-requests']);
            setModalOpen(false);
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.VacationRequest.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['vacation-requests']);
        }
    });

    const withdrawMutation = useMutation({
        mutationFn: (id) => base44.entities.VacationRequest.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['vacation-requests'])
    });

    const calculateBusinessDays = (start, end) => {
        let count = 0;
        let current = new Date(start);
        const endDate = new Date(end);
        
        while (current <= endDate) {
            const dayOfWeek = current.getDay();
            // Nur Sonntag (0) ist kein Werktag, Montag-Samstag (1-6) sind Werktage
            if (dayOfWeek !== 0) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return count;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const daysCount = calculateBusinessDays(formData.start_date, formData.end_date);
        
        const newRequest = {
            employee_id: currentEmployee.id,
            employee_name: currentEmployee.name,
            start_date: formData.start_date,
            end_date: formData.end_date,
            days_count: daysCount,
            type: formData.type,
            notes: formData.notes,
            status: 'beantragt'
        };

        createMutation.mutate(newRequest);
    };

    const handleApprove = async (request) => {
        const user = await base44.auth.me();
        await updateMutation.mutateAsync({
            id: request.id,
            data: {
                status: 'genehmigt',
                approved_by: user.full_name,
                approved_date: new Date().toISOString()
            }
        });
    };

    const handleReject = async (request) => {
        const user = await base44.auth.me();
        await updateMutation.mutateAsync({
            id: request.id,
            data: {
                status: 'abgelehnt',
                approved_by: user.full_name,
                approved_date: new Date().toISOString()
            }
        });
    };

    const resetForm = () => {
        setFormData({
            start_date: '',
            end_date: '',
            type: 'Urlaub',
            notes: ''
        });
    };

    // Filter requests based on permissions
    const visibleRequests = permissions.isManager 
        ? vacationRequests 
        : vacationRequests.filter(r => r.employee_id === currentEmployee?.id);

    // Calculate stats per employee
    const employeeStats = {};
    allEmployees.forEach(emp => {
        const empRequests = vacationRequests.filter(r => 
            r.employee_id === emp.id && r.status === 'genehmigt' && r.type === 'Urlaub'
        );
        const usedDays = empRequests.reduce((sum, r) => sum + r.days_count, 0);
        const totalDays = emp.vacation_days_per_year || 30; // Individuelle Tage oder Standard
        employeeStats[emp.id] = {
            name: emp.name,
            used: usedDays,
            total: totalDays,
            remaining: totalDays - usedDays
        };
    });

    const currentEmployeeStats = currentEmployee ? employeeStats[currentEmployee.id] : null;
    const pendingRequests = visibleRequests.filter(r => r.status === 'beantragt');
    const [showTaxReport, setShowTaxReport] = React.useState(false);

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Urlaubsverwaltung</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {selectedYear} · {pendingRequests.length} offene Anträge
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {permissions.isManager && (
                            <Button
                                variant="outline"
                                onClick={() => setShowTaxReport(!showTaxReport)}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Steuerberater-Auswertung
                            </Button>
                        )}
                        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                            <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={(selectedYear - 1).toString()}>{selectedYear - 1}</SelectItem>
                                <SelectItem value={selectedYear.toString()}>{selectedYear}</SelectItem>
                                <SelectItem value={(selectedYear + 1).toString()}>{selectedYear + 1}</SelectItem>
                            </SelectContent>
                        </Select>
                        {currentEmployee && (
                            <Button 
                                onClick={() => setModalOpen(true)}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Urlaub beantragen
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stats Card */}
                {currentEmployeeStats && (
                    <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400 mb-1">Dein Urlaubskonto {selectedYear}</p>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-3xl font-bold text-white">
                                        {currentEmployeeStats.remaining}
                                    </span>
                                    <span className="text-slate-400">von {currentEmployeeStats.total} Tagen</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-slate-400 mb-1">Genommen</p>
                                <p className="text-2xl font-semibold text-amber-400">
                                    {currentEmployeeStats.used} Tage
                                </p>
                            </div>
                        </div>
                        {currentEmployeeStats.remaining < 5 && (
                            <div className="mt-4 flex items-center gap-2 text-orange-400 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                Weniger als 5 Tage verfügbar
                            </div>
                        )}
                    </Card>
                )}

                {/* Tax Report for Steuerberater */}
                {showTaxReport && permissions.isManager && (
                    <VacationTaxReport
                        vacationRequests={vacationRequests}
                        employees={allEmployees}
                        selectedYear={selectedYear}
                    />
                )}

                {/* Manager: Employee Overview */}
                {permissions.isManager && (
                    <Card className="p-6 bg-slate-800 border-slate-700 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Mitarbeiter-Übersicht</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allEmployees.map(emp => {
                                const stats = employeeStats[emp.id];
                                if (!stats) return null;
                                return (
                                    <div key={emp.id} className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                                        <p className="font-medium text-white mb-2">{stats.name}</p>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Genommen:</span>
                                            <span className="text-white">{stats.used} Tage</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Verfügbar:</span>
                                            <span className={cn(
                                                "font-semibold",
                                                stats.remaining < 5 ? "text-orange-400" : "text-green-400"
                                            )}>
                                                {stats.remaining} Tage
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                )}

                {/* Requests */}
                <div className="space-y-4">
                    {visibleRequests.length > 0 ? (
                        visibleRequests
                            .sort((a, b) => b.created_date.localeCompare(a.created_date))
                            .map(request => {
                                const StatusIcon = statusConfig[request.status].icon;
                                return (
                                    <Card key={request.id} className="p-5 bg-slate-800 border-slate-700">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-semibold text-white">
                                                        {request.employee_name}
                                                    </span>
                                                    <Badge className={typeColors[request.type]}>
                                                        {request.type}
                                                    </Badge>
                                                    <Badge className={statusConfig[request.status].color}>
                                                        <StatusIcon className="w-3 h-3 mr-1" />
                                                        {statusConfig[request.status].label}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>
                                                            {format(parseISO(request.start_date), 'dd.MM.yyyy', { locale: de })}
                                                            {' - '}
                                                            {format(parseISO(request.end_date), 'dd.MM.yyyy', { locale: de })}
                                                        </span>
                                                    </div>
                                                    <span className="font-semibold text-amber-400">
                                                        {request.days_count} Tage
                                                    </span>
                                                </div>
                                                {request.notes && (
                                                    <p className="text-sm text-slate-400 mt-2">{request.notes}</p>
                                                )}
                                                {request.approved_by && (
                                                    <p className="text-xs text-slate-500 mt-2">
                                                        {request.status === 'genehmigt' ? 'Genehmigt' : 'Abgelehnt'} von {request.approved_by}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2 items-end">
                                                {permissions.isManager && request.status === 'beantragt' && (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            onClick={() => handleApprove(request)}
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700"
                                                        >
                                                            <Check className="w-4 h-4 mr-1" />
                                                            Genehmigen
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleReject(request)}
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                                                        >
                                                            <X className="w-4 h-4 mr-1" />
                                                            Ablehnen
                                                        </Button>
                                                    </div>
                                                )}
                                                {request.employee_id === currentEmployee?.id && 
                                                 (request.status === 'beantragt' || request.status === 'genehmigt') && (
                                                    <Button
                                                        onClick={() => {
                                                            if (confirm('Urlaubsantrag wirklich zurückziehen?')) {
                                                                withdrawMutation.mutate(request.id);
                                                            }
                                                        }}
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-orange-600 text-orange-400 hover:bg-orange-600 hover:text-white"
                                                    >
                                                        <X className="w-4 h-4 mr-1" />
                                                        Zurückziehen
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })
                    ) : (
                        <Card className="p-12 bg-slate-800 border-slate-700">
                            <div className="text-center text-slate-500">
                                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Keine Urlaubsanträge für {selectedYear}</p>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Modal */}
                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Urlaub beantragen</DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Art</Label>
                                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Urlaub">Urlaub</SelectItem>
                                        <SelectItem value="Krankheit">Krankheit</SelectItem>
                                        <SelectItem value="Sonderurlaub">Sonderurlaub</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Von *</Label>
                                    <Input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Bis *</Label>
                                    <Input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {formData.start_date && formData.end_date && (
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm text-blue-800">
                                        <span className="font-semibold">
                                            {calculateBusinessDays(formData.start_date, formData.end_date)} Arbeitstage
                                        </span>
                                        {' '}(Mo-Sa sind Werktage)
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Notizen</Label>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Optional: Grund oder Hinweise..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">
                                    Abbrechen
                                </Button>
                                <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700">
                                    Beantragen
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}