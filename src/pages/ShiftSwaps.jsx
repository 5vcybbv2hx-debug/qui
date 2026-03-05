import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RepeatIcon, Check, X, Clock, Calendar, AlertCircle, User, Search, Users } from 'lucide-react';
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
import ShiftMarketplaceModal from '@/components/shifts/ShiftMarketplaceModal';

export default function ShiftSwaps() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [marketplaceOpen, setMarketplaceOpen] = useState(false);

    const { data: swapRequests = [], isLoading: loadingRequests } = useQuery({
        queryKey: ['shift-swap-requests'],
        queryFn: () => base44.entities.ShiftSwapRequest.list('-created_date')
    });

    const { data: bids = [] } = useQuery({
        queryKey: ['shift-swap-bids'],
        queryFn: () => base44.entities.ShiftSwapBid.list('-created_at', 200)
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
            // Update swap request status
            await base44.entities.ShiftSwapRequest.update(requestId, {
                status: 'genehmigt',
                target_employee_id: newEmployeeId,
                target_employee_name: newEmployeeName,
                approved_by: currentUser?.full_name || currentUser?.email,
                response_date: new Date().toISOString()
            });
            
            // Update the actual shift in the calendar
            await base44.entities.Shift.update(shiftId, {
                employee_id: newEmployeeId,
                employee_name: newEmployeeName
            });

            // Reject all other bids for this request
            try {
                const allBids = await base44.entities.ShiftSwapBid.filter({ swap_request_id: requestId });
                for (const bid of allBids) {
                    await base44.entities.ShiftSwapBid.update(bid.id, {
                        status: bid.bidding_employee_id === newEmployeeId ? 'akzeptiert' : 'abgelehnt'
                    });
                }
            } catch (error) {
                console.error('Fehler beim Aktualisieren der Bewerbungen:', error);
            }

            try {
                const requestingEmployee = employees.find(e => e.id === request.requesting_employee_id);
                const targetEmployee = employees.find(e => e.id === newEmployeeId);
                
                if (requestingEmployee) {
                    await base44.entities.Notification.create({
                        type: 'shift_swap',
                        title: 'Schichttausch genehmigt',
                        message: `Dein Schichttausch für ${format(parseISO(request.shift_date), 'dd.MM.yyyy', { locale: de })} wurde genehmigt. ${newEmployeeName} übernimmt deine Schicht.`,
                        related_id: requestId,
                        read_by: []
                    });
                }
                
                if (targetEmployee) {
                    await base44.entities.Notification.create({
                        type: 'shift_swap',
                        title: 'Schichttausch genehmigt – Du übernimmst die Schicht',
                        message: `Du übernimmst die Schicht von ${request.requesting_employee_name} am ${format(parseISO(request.shift_date), 'dd.MM.yyyy', { locale: de })}.`,
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
            queryClient.invalidateQueries(['shift-swap-bids']);
            queryClient.invalidateQueries(['shifts']);
            setSelectedRequest(null);
            toast.success('Schichttausch genehmigt – Kalender wurde aktualisiert');
        }
    });

    const handleApprove = (request, bidEmployeeId, bidEmployeeName) => {
        // For marketplace requests, require selecting a bidder
        if (request.marketplace && !bidEmployeeId) {
            toast.error('Bitte wähle einen Bewerber aus');
            return;
        }
        const newEmployeeId = bidEmployeeId || request.target_employee_id;
        const newEmployeeName = bidEmployeeName || request.target_employee_name;
        if (confirm(`Schichttausch genehmigen? ${newEmployeeName} übernimmt die Schicht. Der Kalender wird automatisch aktualisiert.`)) {
            approveMutation.mutate({
                requestId: request.id,
                shiftId: request.shift_id,
                newEmployeeId,
                newEmployeeName,
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
                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Clock className="w-3 h-3 mr-1" />
                    Ausstehend
                </Badge>
            );
        } else if (status === 'genehmigt') {
            return (
                <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                    <Check className="w-3 h-3 mr-1" />
                    Genehmigt
                </Badge>
            );
        } else {
            return (
                <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                    <X className="w-3 h-3 mr-1" />
                    Abgelehnt
                </Badge>
            );
        }
    };

    if (loadingRequests) {
        return (
            <div className="min-h-screen bg-background p-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Lade Schichttausch-Anfragen...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <RepeatIcon className="w-7 h-7 text-slate-900" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Schichttausch</h1>
                            <p className="text-muted-foreground">Schichten anbieten, anfragen und genehmigen</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    <Button
                        onClick={() => setMarketplaceOpen(true)}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white gap-2"
                    >
                        <Users className="w-4 h-4" />
                        Marketplace
                    </Button>
                </div>

                <Tabs defaultValue={permissions.isManager ? "pending" : "my-requests"} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid bg-card border border-border/50">
                        <TabsTrigger value="my-requests" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-slate-900">
                            <User className="w-4 h-4" />
                            Meine Anfragen
                            {myRequests.filter(r => r.status === 'ausstehend').length > 0 && (
                                <Badge className="ml-1 bg-amber-500 text-slate-900 text-xs px-1.5 py-0">
                                    {myRequests.filter(r => r.status === 'ausstehend').length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="my-shifts" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-slate-900">
                            <Calendar className="w-4 h-4" />
                            Meine Schichten
                        </TabsTrigger>
                        {permissions.isManager && (
                            <TabsTrigger value="pending" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-slate-900">
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
                                        <Card key={request.id} className="p-5 bg-slate-900/50 border-slate-800/50 hover:border-amber-500/30 transition-all backdrop-blur-xl">
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
                                                            <p className="text-sm font-medium text-white">
                                                                {isRequester ? (
                                                                    <>Du → {request.target_employee_name}</>
                                                                ) : (
                                                                    <>{request.requesting_employee_name} → Du</>
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-4 h-4 text-slate-400" />
                                                            <p className="text-sm text-slate-300">
                                                                {format(parseISO(request.shift_date), 'EEEE, d. MMMM yyyy', { locale: de })} • {request.shift_time}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {request.reason && (
                                                        <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                                            <p className="text-xs text-slate-500 mb-1">Grund:</p>
                                                            <p className="text-sm text-slate-300">{request.reason}</p>
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
                            <Card className="p-12 bg-slate-900/50 border-slate-800/50 backdrop-blur-xl">
                                <div className="text-center text-slate-400">
                                    <RepeatIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                    <p className="text-lg font-medium mb-1 text-white">Keine Tauschanfragen</p>
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
                                    className="pl-10 bg-slate-900/50 border-slate-800/50 text-white placeholder:text-slate-500"
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
                                        <Card key={shift.id} className="p-5 bg-slate-900/50 border-slate-800/50 hover:border-amber-500/30 transition-all backdrop-blur-xl">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                                            {shift.shift_type}
                                                        </Badge>
                                                        {hasPendingRequest && (
                                                            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                Tausch läuft
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-lg font-semibold text-white mb-1">
                                                        {format(parseISO(shift.date), 'EEEE, d. MMMM yyyy', { locale: de })}
                                                    </p>
                                                    <p className="text-sm text-slate-300">
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
                                                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 disabled:opacity-50 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500"
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
                            <Card className="p-12 bg-slate-900/50 border-slate-800/50 backdrop-blur-xl">
                                <div className="text-center text-slate-400">
                                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                    <p className="text-lg font-medium mb-1 text-white">Keine Schichten gefunden</p>
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
                                        <Card key={request.id} className="p-5 bg-slate-900/50 border-slate-800/50 hover:border-amber-500/30 transition-all backdrop-blur-xl border-l-4 border-l-amber-500">
                                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            Ausstehend
                                                        </Badge>
                                                        <span className="text-xs text-slate-500">
                                                            {format(parseISO(request.created_date), 'dd.MM.yyyy HH:mm', { locale: de })}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="space-y-2 mb-4">
                                                        <p className="text-lg font-semibold text-white">
                                                            {request.requesting_employee_name} → {request.target_employee_name}
                                                        </p>
                                                        <p className="text-sm text-slate-300">
                                                            {format(parseISO(request.shift_date), 'EEEE, d. MMMM yyyy', { locale: de })} • {request.shift_time}
                                                        </p>
                                                    </div>
                                                    
                                                    {request.reason && (
                                                       <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                                           <p className="text-xs text-slate-500 mb-1">Grund:</p>
                                                           <p className="text-sm text-slate-300">{request.reason}</p>
                                                       </div>
                                                    )}

                                                    {/* Show bids for marketplace requests */}
                                                    {request.marketplace && (() => {
                                                       const requestBids = bids.filter(b => b.swap_request_id === request.id && b.status === 'ausstehend');
                                                       if (requestBids.length === 0) return (
                                                           <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                                               <p className="text-xs text-slate-500">Noch keine Bewerber</p>
                                                           </div>
                                                       );
                                                       return (
                                                           <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                                               <p className="text-xs text-slate-400 font-medium mb-2">Bewerber ({requestBids.length}):</p>
                                                               <div className="space-y-2">
                                                                   {requestBids.map(bid => (
                                                                       <div key={bid.id} className="flex items-center justify-between">
                                                                           <span className="text-sm text-slate-300">{bid.bidding_employee_name}</span>
                                                                           <Button
                                                                               size="sm"
                                                                               onClick={() => handleApprove(request, bid.bidding_employee_id, bid.bidding_employee_name)}
                                                                               className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                                                                           >
                                                                               <Check className="w-3 h-3 mr-1" />
                                                                               Auswählen
                                                                           </Button>
                                                                       </div>
                                                                   ))}
                                                               </div>
                                                           </div>
                                                       );
                                                    })()}
                                                    </div>

                                                    <div className="flex lg:flex-col gap-2">
                                                   <Button
                                                       variant="outline"
                                                       onClick={() => handleReject(request)}
                                                       className="flex-1 lg:flex-none border-red-500/30 text-red-400 hover:bg-red-500/10"
                                                   >
                                                       <X className="w-4 h-4 mr-2" />
                                                       Ablehnen
                                                   </Button>
                                                   {/* For non-marketplace requests with a target employee */}
                                                   {!request.marketplace && request.target_employee_id && (
                                                       <Button
                                                           onClick={() => handleApprove(request)}
                                                           className="flex-1 lg:flex-none bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                                                       >
                                                           <Check className="w-4 h-4 mr-2" />
                                                           Genehmigen
                                                       </Button>
                                                   )}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <Card className="p-12 bg-slate-900/50 border-slate-800/50 backdrop-blur-xl">
                                    <div className="text-center text-slate-400">
                                        <Check className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                        <p className="text-lg font-medium mb-1 text-white">Keine ausstehenden Anfragen</p>
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

             {/* Shift Marketplace Modal */}
             <ShiftMarketplaceModal
                 open={marketplaceOpen}
                 onOpenChange={setMarketplaceOpen}
             />
            </div>
            );
            }