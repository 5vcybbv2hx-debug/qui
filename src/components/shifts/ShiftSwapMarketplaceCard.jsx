import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { RepeatIcon, Check, X, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ShiftSwapMarketplaceCard({ currentEmployee }) {
    const queryClient = useQueryClient();

    const { data: allRequests = [] } = useQuery({
        queryKey: ['shift-swap-requests-open'],
        queryFn: () => base44.entities.ShiftSwapRequest.filter({ status: 'ausstehend' })
    });

    const { data: myBids = [] } = useQuery({
        queryKey: ['my-shift-swap-bids', currentEmployee?.id],
        queryFn: () => base44.entities.ShiftSwapBid.filter({ bidding_employee_id: currentEmployee.id }),
        enabled: !!currentEmployee?.id
    });

    // Nur Anfragen anderer Mitarbeiter anzeigen (nicht eigene)
    const openRequests = allRequests.filter(r => r.requesting_employee_id !== currentEmployee?.id);

    const bidMutation = useMutation({
        mutationFn: async (request) => {
            await base44.entities.ShiftSwapBid.create({
                swap_request_id: request.id,
                bidding_employee_id: currentEmployee.id,
                bidding_employee_name: currentEmployee.name,
                shift_id: request.shift_id,
                status: 'ausstehend'
            });
            await base44.entities.Notification.create({
                type: 'shift_swap_bid',
                title: 'Jemand möchte deine Schicht übernehmen',
                message: `${currentEmployee.name} möchte die Schicht am ${format(parseISO(request.shift_date), 'dd.MM.yyyy', { locale: de })} übernehmen.`,
                related_id: request.id,
                target_roles: ['admin', 'Manager'],
                read_by: []
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['my-shift-swap-bids']);
            toast.success('Interesse gemeldet! Der Manager wird informiert.');
        },
        onError: (e) => toast.error('Fehler: ' + e.message)
    });

    const withdrawMutation = useMutation({
        mutationFn: async (bidId) => {
            await base44.entities.ShiftSwapBid.delete(bidId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['my-shift-swap-bids']);
            toast.success('Bewerbung zurückgezogen');
        }
    });

    const hasBid = (requestId) => myBids.find(b => b.swap_request_id === requestId);

    if (openRequests.length === 0) return null;

    return (
        <Card className="p-5 bg-card border-border">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <RepeatIcon className="w-4 h-4 text-blue-400" />
                </div>
                <h2 className="font-bold text-foreground">Schichttausch-Angebote</h2>
                <Badge className="bg-blue-600/20 text-blue-400 ml-auto">{openRequests.length} offen</Badge>
            </div>

            <div className="space-y-3">
                {openRequests.map(request => {
                    const bid = hasBid(request.id);
                    return (
                        <div key={request.id} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                            <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                {request.requesting_employee_name?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground text-sm">
                                    {request.requesting_employee_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {format(parseISO(request.shift_date), 'EEE, dd.MM.yyyy', { locale: de })} • {request.shift_time}
                                </p>
                                {request.reason && (
                                    <p className="text-xs text-muted-foreground italic mt-0.5 truncate">„{request.reason}"</p>
                                )}
                                {request.marketplace && (
                                    <Badge variant="outline" className="text-[10px] mt-1 border-blue-500/50 text-blue-400">Marketplace</Badge>
                                )}
                            </div>
                            <div className="shrink-0">
                                {bid ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => withdrawMutation.mutate(bid.id)}
                                        disabled={withdrawMutation.isPending}
                                        className="border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs"
                                    >
                                        <X className="w-3 h-3 mr-1" />
                                        Zurückziehen
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        onClick={() => bidMutation.mutate(request)}
                                        disabled={bidMutation.isPending}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                    >
                                        <Check className="w-3 h-3 mr-1" />
                                        Übernehmen
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}