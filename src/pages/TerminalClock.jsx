import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, LogIn, LogOut, Coffee } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PinVerification from '@/components/terminal/PinVerification';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function TerminalClock() {
    const queryClient = useQueryClient();
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true }, 'name')
    });

    const { data: clockEntries = [] } = useQuery({
        queryKey: ['clock-entries-today'],
        queryFn: async () => {
            const today = format(new Date(), 'yyyy-MM-dd');
            const entries = await base44.entities.ClockEntry.list('-clock_in', 50);
            return entries.filter(e => e.clock_in.startsWith(today));
        }
    });

    const clockMutation = useMutation({
        mutationFn: (data) => base44.entities.ClockEntry.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['clock-entries-today']);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ClockEntry.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['clock-entries-today']);
        }
    });

    const handleClockAction = (employee, action) => {
        setSelectedEmployee(employee);
        setSelectedAction(action);
        setPinModalOpen(true);
    };

    const handlePinVerified = async (pin) => {
        if (selectedEmployee.pin !== pin) {
            alert('Falsche PIN!');
            return;
        }

        const activeEntry = clockEntries.find(
            e => e.employee_id === selectedEmployee.id && e.status === 'clocked_in'
        );

        if (selectedAction === 'in') {
            if (activeEntry) {
                alert('Du bist bereits eingestempelt!');
            } else {
                await clockMutation.mutateAsync({
                    employee_id: selectedEmployee.id,
                    employee_name: selectedEmployee.name,
                    clock_in: new Date().toISOString(),
                    status: 'clocked_in'
                });
                alert(`✓ ${selectedEmployee.name} eingestempelt`);
            }
        } else if (selectedAction === 'out') {
            if (!activeEntry) {
                alert('Du bist nicht eingestempelt!');
            } else {
                const clockIn = new Date(activeEntry.clock_in);
                const clockOut = new Date();
                const hours = (clockOut - clockIn) / (1000 * 60 * 60);

                await updateMutation.mutateAsync({
                    id: activeEntry.id,
                    data: {
                        clock_out: clockOut.toISOString(),
                        total_hours: Math.round(hours * 100) / 100,
                        status: 'clocked_out'
                    }
                });
                alert(`✓ ${selectedEmployee.name} ausgestempelt\nArbeitszeit: ${Math.round(hours * 10) / 10}h`);
            }
        }

        setPinModalOpen(false);
        setSelectedEmployee(null);
        setSelectedAction(null);
    };

    const getEmployeeStatus = (employee) => {
        const activeEntry = clockEntries.find(
            e => e.employee_id === employee.id && e.status === 'clocked_in'
        );
        return activeEntry;
    };

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <Clock className="w-8 h-8 text-amber-500" />
                        <h1 className="text-3xl font-bold text-white">Zeiterfassung</h1>
                    </div>
                    <p className="text-slate-400 text-lg">
                        {format(new Date(), "EEEE, d. MMMM yyyy · HH:mm", { locale: de })} Uhr
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employees.filter(e => e.pin).map(employee => {
                        const status = getEmployeeStatus(employee);
                        const isActive = !!status;

                        return (
                            <Card key={employee.id} className="p-6 bg-slate-800 border-slate-700">
                                <div className="text-center space-y-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-white mb-2">
                                            {employee.name}
                                        </h3>
                                        {isActive ? (
                                            <Badge className="bg-green-600">
                                                <LogIn className="w-3 h-3 mr-1" />
                                                Eingestempelt
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-slate-400 border-slate-600">
                                                <LogOut className="w-3 h-3 mr-1" />
                                                Ausgestempelt
                                            </Badge>
                                        )}
                                        {status && (
                                            <p className="text-xs text-slate-400 mt-2">
                                                seit {format(new Date(status.clock_in), 'HH:mm', { locale: de })} Uhr
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleClockAction(employee, 'in')}
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                            disabled={isActive}
                                        >
                                            <LogIn className="w-4 h-4 mr-2" />
                                            Einstempeln
                                        </Button>
                                        <Button
                                            onClick={() => handleClockAction(employee, 'out')}
                                            className="flex-1 bg-red-600 hover:bg-red-700"
                                            disabled={!isActive}
                                        >
                                            <LogOut className="w-4 h-4 mr-2" />
                                            Ausstempeln
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {employees.filter(e => e.pin).length === 0 && (
                    <Card className="p-12 bg-slate-800 border-slate-700">
                        <div className="text-center text-slate-400">
                            <Coffee className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Keine Mitarbeiter mit PIN</p>
                            <p className="text-sm mt-1">Lege in den Mitarbeiter-Einstellungen PINs fest</p>
                        </div>
                    </Card>
                )}

                <PinVerification
                    open={pinModalOpen}
                    onClose={() => {
                        setPinModalOpen(false);
                        setSelectedEmployee(null);
                        setSelectedAction(null);
                    }}
                    onVerified={handlePinVerified}
                    title={`PIN für ${selectedEmployee?.name}`}
                />
            </div>
        </div>
    );
}