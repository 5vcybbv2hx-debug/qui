import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Users, CheckCircle2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ShiftMarketplaceModal({ open, onOpenChange }) {
    const queryClient = useQueryClient();

    const { data: currentUser } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const { data: availableShifts = [] } = useQuery({
        queryKey: ['available-shift-swaps'],
        queryFn: async () => {
            const requests = await base44.entities.ShiftSwapRequest.filter({ 
                status: 'ausstehend',
                marketplace: true
            });
            return requests;
        }
    });

    const { data: myBids = [] } = useQuery({
        queryKey: ['my-bids'],
        queryFn: async () => {
            if (!currentUser?.email) return [];
            const currentEmployee = employees.find(e => e.email === currentUser.email);
            if (!currentEmployee) return [];
            return base44.entities.ShiftSwapBid.filter({ 
                bidding_employee_id: currentEmployee.id
            });
        },
        enabled: !!currentUser?.email && employees.length > 0
    });

    const bidMutation = useMutation({
        mutationFn: async (swapRequestId) => {
            const currentEmployee = employees.find(e => e.email === currentUser?.email);
            if (!currentEmployee) throw new Error('Mitarbeiter nicht gefunden');

            const request = availableShifts.find(s => s.id === swapRequestId);
            if (!request) throw new Error('Anfrage nicht gefunden');

            // Bewerbung erstellen
            await base44.entities.ShiftSwapBid.create({
                swap_request_id: swapRequestId,
                bidding_employee_id: currentEmployee.id,
                bidding_employee_name: currentEmployee.name,
                shift_id: request.shift_id,
                status: 'ausstehend'
            });

            // Benachrichtigung an Manager
            try {
                await base44.entities.Notification.create({
                    type: 'shift_swap_bid',
                    title: 'Neue Bewerbung für Schichttausch',
                    message: `${currentEmployee.name} möchte die Schicht am ${format(parseISO(request.shift_date), 'dd.MM.yyyy', { locale: de })} übernehmen.`,
                    related_id: swapRequestId,
                    target_roles: ['admin', 'Manager'],
                    read_by: []
                });
            } catch (error) {
                console.error('Fehler bei Benachrichtigung:', error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['available-shift-swaps']);
            queryClient.invalidateQueries(['my-bids']);
            toast.success('Bewerbung versendet!');
        },
        onError: (error) => {
            toast.error('Fehler: ' + error.message);
        }
    });

    const currentEmployee = employees.find(e => e.email === currentUser?.email);
    const myBidShiftIds = myBids.map(b => b.swap_request_id);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Verfügbare Schicht-Tausch-Angebote
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 mt-4">
                    {availableShifts.length > 0 ? (
                        availableShifts.map(shift => {
                            const hasApplied = myBidShiftIds.includes(shift.id);
                            const requestingEmployee = employees.find(e => e.id === shift.requesting_employee_id);
                            return (
                                <Card key={shift.id} className="p-4 border-l-4 border-l-blue-500">
                                    <div className="space-y-3">
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <p className="font-semibold text-foreground flex items-center gap-2">
                                                    {requestingEmployee?.name} sucht Tausch
                                                    {hasApplied && (
                                                        <Badge className="bg-blue-600/20 text-blue-400 text-xs">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Du hast dich beworben
                                                        </Badge>
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Erstellt: {format(parseISO(shift.created_date), 'dd.MM.yyyy HH:mm', { locale: de })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Shift Info */}
                                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                            <p className="text-sm font-medium text-blue-900 mb-2">Schicht zum Tauschen:</p>
                                            <p className="text-sm font-semibold text-slate-700">
                                                {format(parseISO(shift.shift_date), 'EEEE, d. MMMM yyyy', { locale: de })}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                {shift.shift_time}
                                            </p>
                                        </div>

                                        {/* Grund */}
                                        {shift.reason && (
                                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                                <p className="text-xs text-slate-500 font-medium mb-1">Grund:</p>
                                                <p className="text-sm text-slate-700">{shift.reason}</p>
                                            </div>
                                        )}

                                        {/* Action Button */}
                                        <Button
                                            onClick={() => bidMutation.mutate(shift.id)}
                                            disabled={hasApplied || bidMutation.isPending}
                                            className={`w-full ${hasApplied ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                                        >
                                            {bidMutation.isPending ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Wird gesendet...
                                                </>
                                            ) : hasApplied ? (
                                                <>
                                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                                    Du hast dich beworben
                                                </>
                                            ) : (
                                                <>
                                                    <Clock className="w-4 h-4 mr-2" />
                                                    Ich interessiere mich!
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-lg font-medium text-slate-700">Keine verfügbaren Angebote</p>
                            <p className="text-sm mt-1">Aktuell gibt es keine Schichten zum Tauschen</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}