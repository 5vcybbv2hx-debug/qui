import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RepeatIcon, Check, X, Clock, Calendar, AlertCircle, User, Search } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isPast, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import ShiftSwapRequestModal from '@/components/shifts/ShiftSwapRequestModal';

export default function ShiftSwaps() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);

    const { data: swapRequests = [], isLoading: loadingRequests } = useQuery({
        queryKey: ['shift-swap-requests'],
        queryFn: () => base44.entities.ShiftSwapRequest.list('-created_date')
    });

    const { data: currentUser } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => base44.entities.Shift.list()
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data, request }) => {
            await base44.entities.ShiftSwapRequest.update(id, data);
            
            try {
                const requestingEmployee = employees.find(e => e.id === request.requesting_employee_id);
                if (requestingEmployee?.email) {
                    await base44.entities.Notification.create({
                        type: 'shift_swap',
                        title: data.status === 'genehmigt' ? 'Schichttausch genehmigt' : 'Schichttausch abgelehnt',
                        message: `Dein Schichttausch für ${format(parseISO(request.shift_date), 'dd.MM.yyyy', { locale: de })} wurde ${data.status === 'genehmigt' ? 'genehmigt' : 'abgelehnt'}.`,
                        related_id: id,
                        read_by: []
                    });
                }
            } catch (error) {
                console.error('Fehler beim Erstellen der Benachrichtigung:', error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries(['shift-swap-requests']);
            setSelectedRequest(null);
            toast.success(variables.data.status === 'genehmigt' ? 'Tauschanfrage genehmigt' : 'Tauschanfrage abgelehnt');
        }
    });

    const approveMutation = useMutation({
        mutationFn: async ({ requestId, shiftId, newEmployeeId, newEmployeeName, request }) => {
            await base44.entities.ShiftSwapRequest.update(requestId, {
                status: 'genehmigt',
                approved_by: currentUser?.full_name || currentUser?.email,
                response_date: new Date().toISOString()
            });
            
            await base44.entities.Shift.update(shiftId, {
                employee_id: newEmployeeId,
                employee_name: newEmployeeName
            });

            try {
                const requestingEmployee = employees.find(e => e.id === request.requesting_employee_id);
                const targetEmployee = employees.find(e => e.id === request.target_employee_id);
                
                if (requestingEmployee?.email) {
                    await base44.entities.Notification.create({
                        type: 'shift_swap',
                        title: 'Schichttausch genehmigt',
                        message: `Dein Schichttausch für ${format(parseISO(request.shift_date), 'dd.MM.yyyy', { locale: de })} wurde genehmigt.`,
                        related_id: requestId,
                        read_by: []
                    });
                }
                
                if (targetEmployee?.email) {
                    await base44.entities.Notification.create({
                        type: 'shift_swap',
                        title: 'Schichttausch genehmigt',
                        message: `Der Schichttausch mit ${request.requesting_employee_name} am ${format(parseISO(request.shift_date), 'dd.MM.yyyy', { locale: de })} wurde genehmigt.`,
                        related_id: requestId,
                        read_by: []
                    });
                }
            } catch (error) {
                console.error('Fehler beim Erstellen der Benachrichtigung:', error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['shift-swap-requests']);
            queryClient.invalidateQueries(['shifts']);
            setSelectedRequest(null);
            toast.success('Tauschanfrage genehmigt - Kalender wurde aktualisiert');
        }
    });

    const handleApprove = (request) => {
        if (confirm('Schichttausch genehmigen? Der Kalender wird automatisch aktualisiert.')) {
            approveMutation.mutate({
                requestId: request.id,
                shiftId: request.shift_id,
                newEmployeeId: request.target_employee_id,
                newEmployeeName: request.target_employee_name,
                request: request
            });
        }
    };

    const handleReject = (request) => {
        if (confirm('Schichttausch ablehnen?')) {
            updateMutation.mutate({
                id: request.id,
                data: {
                    status: 'abgelehnt',
                    approved_by: currentUser?.full_name || currentUser?.email,
                    response_date: new Date().toISOString()
                },
                request: request
            });
        }
    };

    const handleCreateRequest = (shift) => {
        setSelectedShift(shift);
        setCreateModalOpen(true);
    };

    // Filter current employee
    const currentEmployee = employees.find(e => e.email === currentUser?.email);

    // Filter requests
    const myRequests = swapRequests.filter(r => 
        r.requesting_employee_id === currentEmployee?.id ||
        r.target_employee_id === currentEmployee?.id
    );

    const pendingRequests = swapRequests.filter(r => r.status === 'ausstehend');
    const processedRequests = swapRequests.filter(r => r.status !== 'ausstehend');

    // Filter my upcoming shifts
    const myUpcomingShifts = shifts
        .filter(s => 
            s.employee_id === currentEmployee?.id && 
            !isPast(parseISO(s.date))
        )
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10);

    // Filter shifts based on search
    const filteredShifts = searchQuery 
        ? myUpcomingShifts.filter(s => 
            s.date.includes(searchQuery) || 
            s.shift_type?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : myUpcomingShifts;

    const getStatusBadge = (status) => {
        if (status === 'ausstehend') {
            return (
                <Badge className="bg-amber-100 text-amber-700">
                    <Clock className="w-3 h-3 mr-1" />
                    Ausstehend
                </Badge>
            );
        } else if (status === 'genehmigt') {
            return (
                <Badge className="bg-green-100 text-green-700">
                    <Check className="w-3 h-3 mr-1" />
                    Genehmigt
                </Badge>
            );
        } else {
            return (
                <Badge className="bg-red-100 text-red-700">
                    <X className="w-3 h-3 mr-1" />
                    Abgelehnt
                </Badge>
            );
        }
    };

    if (loadingRequests) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Lade Schichttausch-Anfragen...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <RepeatIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Schichttausch</h1>
                            <p className="text-slate-600">Schichten anbieten, anfragen und genehmigen</p>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue={permissions.isManager ? "pending" : "my-requests"} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
                        <TabsTrigger value="my-requests" className="gap-2">
                            <User className="w-4 h-4" />
                            Meine Anfragen
                            {myRequests.filter(r => r.status === 'ausstehend').length > 0 && (
                                <Badge className="ml-1 bg-amber-500 text-white text-xs px-1.5 py-0">
                                    {myRequests.filter(r => r.status === 'ausstehend').length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="my-shifts" className="gap-2">
                            <Calendar className="w-4 h-4" />
                            Meine Schichten
                        </TabsTrigger>
                        {permissions.isManager && (
                            <TabsTrigger value="pending" className="gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Zu genehmigen
                                {pendingRequests.length > 0 && (
                                    <Badge className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0">
                                        {pendingRequests.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* My Requests Tab */}
                    <TabsContent value="my-requests" className="space-y-4">
                        {myRequests.length > 0 ? (
                            <div className="grid gap-4">
                                {myRequests.map(request => {
                                    const isRequester = request.requesting_employee_id === currentEmployee?.id;
                                    return (
                                        <Card key={request.id} className="p-5 hover:shadow-md transition-shadow">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        {getStatusBadge(request.status)}
                                                        <span className="text-xs text-slate-500">
                                                            {format(parseISO(request.created_date), 'dd.MM.yyyy HH:mm', { locale: de })}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <RepeatIcon className="w-4 h-4 text-slate-400" />
                                                            <p className="text-sm font-medium text-slate-700">
                                                                {isRequester ? (
                                                                    <>Du → {request.target_employee_name}</>
                                                                ) : (
                                                                    <>{request.requesting_employee_name} → Du</>
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-4 h-4 text-slate-400" />
                                                            <p className="text-sm text-slate-600">
                                                                {format(parseISO(request.shift_date), 'EEEE, d. MMMM yyyy', { locale: de })} • {request.shift_time}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {request.reason && (
                                                        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                            <p className="text-xs text-slate-500 mb-1">Grund:</p>
                                                            <p className="text-sm text-slate-700">{request.reason}</p>
                                                        </div>
                                                    )}

                                                    {request.approved_by && (
                                                        <p className="text-xs text-slate-500 mt-3">
                                                            {request.status === 'genehmigt' ? 'Genehmigt' : 'Abgelehnt'} von {request.approved_by} am {format(parseISO(request.response_date), 'dd.MM.yyyy', { locale: de })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <Card className="p-12">
                                <div className="text-center text-slate-500">
                                    <RepeatIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                    <p className="text-lg font-medium mb-1">Keine Tauschanfragen</p>
                                    <p className="text-sm">Gehe zu "Meine Schichten", um eine Schicht anzubieten</p>
                                </div>
                            </Card>
                        )}
                    </TabsContent>

                    {/* My Shifts Tab */}
                    <TabsContent value="my-shifts" className="space-y-4">
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <Input
                                    type="text"
                                    placeholder="Schichten durchsuchen..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {filteredShifts.length > 0 ? (
                            <div className="grid gap-4">
                                {filteredShifts.map(shift => {
                                    const hasPendingRequest = swapRequests.some(r => 
                                        r.shift_id === shift.id && r.status === 'ausstehend'
                                    );
                                    return (
                                        <Card key={shift.id} className="p-5 hover:shadow-md transition-shadow">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge className="bg-blue-100 text-blue-700">
                                                            {shift.shift_type}
                                                        </Badge>
                                                        {hasPendingRequest && (
                                                            <Badge className="bg-amber-100 text-amber-700">
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                Tausch läuft
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-lg font-semibold text-slate-800 mb-1">
                                                        {format(parseISO(shift.date), 'EEEE, d. MMMM yyyy', { locale: de })}
                                                    </p>
                                                    <p className="text-sm text-slate-600">
                                                        {shift.start_time} - {shift.end_time}
                                                    </p>
                                                    {shift.notes && (
                                                        <p className="text-xs text-slate-500 mt-2">{shift.notes}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Button
                                                        onClick={() => handleCreateRequest(shift)}
                                                        disabled={hasPendingRequest}
                                                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                                    >
                                                        <RepeatIcon className="w-4 h-4 mr-2" />
                                                        {hasPendingRequest ? 'Anfrage läuft' : 'Tausch anfragen'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <Card className="p-12">
                                <div className="text-center text-slate-500">
                                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                    <p className="text-lg font-medium mb-1">Keine Schichten gefunden</p>
                                    <p className="text-sm">Du hast aktuell keine bevorstehenden Schichten</p>
                                </div>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Manager Approval Tab */}
                    {permissions.isManager && (
                        <TabsContent value="pending" className="space-y-4">
                            {pendingRequests.length > 0 ? (
                                <div className="grid gap-4">
                                    {pendingRequests.map(request => (
                                        <Card key={request.id} className="p-5 hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
                                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Badge className="bg-amber-100 text-amber-700">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            Ausstehend
                                                        </Badge>
                                                        <span className="text-xs text-slate-500">
                                                            {format(parseISO(request.created_date), 'dd.MM.yyyy HH:mm', { locale: de })}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="space-y-2 mb-4">
                                                        <p className="text-lg font-semibold text-slate-800">
                                                            {request.requesting_employee_name} → {request.target_employee_name}
                                                        </p>
                                                        <p className="text-sm text-slate-600">
                                                            {format(parseISO(request.shift_date), 'EEEE, d. MMMM yyyy', { locale: de })} • {request.shift_time}
                                                        </p>
                                                    </div>
                                                    
                                                    {request.reason && (
                                                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                            <p className="text-xs text-slate-500 mb-1">Grund:</p>
                                                            <p className="text-sm text-slate-700">{request.reason}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex lg:flex-col gap-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => handleReject(request)}
                                                        className="flex-1 lg:flex-none border-red-200 text-red-600 hover:bg-red-50"
                                                    >
                                                        <X className="w-4 h-4 mr-2" />
                                                        Ablehnen
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleApprove(request)}
                                                        className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700"
                                                    >
                                                        <Check className="w-4 h-4 mr-2" />
                                                        Genehmigen
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <Card className="p-12">
                                    <div className="text-center text-slate-500">
                                        <Check className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                        <p className="text-lg font-medium mb-1">Keine ausstehenden Anfragen</p>
                                        <p className="text-sm">Alle Tauschanfragen wurden bearbeitet</p>
                                    </div>
                                </Card>
                            )}
                        </TabsContent>
                    )}
                </Tabs>
            </div>

            {/* Shift Swap Request Modal */}
            {selectedShift && (
                <ShiftSwapRequestModal
                    shift={selectedShift}
                    open={createModalOpen}
                    onOpenChange={setCreateModalOpen}
                    onSuccess={() => {
                        setCreateModalOpen(false);
                        setSelectedShift(null);
                        queryClient.invalidateQueries(['shift-swap-requests']);
                    }}
                />
            )}
        </div>
    );
}