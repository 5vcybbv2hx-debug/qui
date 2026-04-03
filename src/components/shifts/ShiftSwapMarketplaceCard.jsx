import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { RepeatIcon, Check, X, Clock, ArrowRight } from 'lucide-react';
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

    // Eigene offene Anfragen (die ich selbst eingestellt habe)
    const myOpenRequests = allRequests.filter(r => r.requesting_employee_id === currentEmployee?.id);

    // Anfragen anderer Mitarbeiter im Marketplace
    const openRequests = allRequests.filter(r => r.requesting_employee_id !== currentEmployee?.id && r.marketplace);

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

    if (myOpenRequests.length === 0 && openRequests.length === 0) return null;

    return (
        <Card className="p-5 bg-card border-border">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <RepeatIcon className="w-4 h-4 text-blue-400" />
                </div>
                <h2 className="font-bold text-foreground">Schichttausch</h2>
                <Badge className="bg-blue-600/20 text-blue-400 ml-auto">{myOpenRequests.length + openRequests.length} offen</Badge>
            </div>

            <div className="space-y-3">
                {/* Eigene offene Anfragen */}
                {myOpenRequests.map(request => (
                    <div key={request.id} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                                <Clock className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-0.5">Deine Anfrage</p>
                                <p className="font-medium text-foreground text-sm">
                                    {format(parseISO(request.shift_date), 'EEE, dd.MM.yyyy', { locale: de })}
                                    {request.shift_time && <span className="text-muted-foreground"> · {request.shift_time}</span>}
                                </p>
                                <p className="text-xs mt-1 text-amber-300">Noch offen – wartet auf Übernahme</p>
                            </div>
                            <Link to={createPageUrl('ShiftSwaps')} className="shrink-0">
                                <Button size="sm" variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 text-xs h-8 px-2">
                                    <ArrowRight className="w-3 h-3" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                ))}

                {/* Offene Marketplace-Angebote anderer */}
                {openRequests.map(request => {
                    const bid = hasBid(request.id);
                    return (
                        <div key={request.id} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                            <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                {request.requesting_employee_name?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-0.5">Marketplace</p>
                                <p className="font-medium text-foreground text-sm">
                                    {format(parseISO(request.shift_date), 'EEE, dd.MM.yyyy', { locale: de })}
                                    {request.shift_time && <span className="text-muted-foreground"> · {request.shift_time}</span>}
                                </p>
                                <p className="text-xs text-muted-foreground">{request.requesting_employee_name} sucht Vertretung</p>
                                {request.reason && <p className="text-xs text-muted-foreground italic mt-0.5 truncate">„{request.reason}“</p>}
                            </div>
                            <div className="shrink-0">
                                {bid ? (
                                    <Button size="sm" variant="outline"
                                        onClick={() => withdrawMutation.mutate(bid.id)}
                                        disabled={withdrawMutation.isPending}
                                        className="border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs h-8 px-2">
                                        <X className="w-3 h-3" />
                                    </Button>
                                ) : (
                                    <Button size="sm"
                                        onClick={() => bidMutation.mutate(request)}
                                        disabled={bidMutation.isPending}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
                                        <Check className="w-3 h-3 mr-1" />Übernehmen
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Link to={createPageUrl('ShiftSwaps')} className="block mt-3">
                <button className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-2 rounded-lg hover:bg-accent/30 transition-colors">
                    Alle Schichttausch-Anfragen <ArrowRight className="w-3 h-3" />
                </button>
            </Link>
        </Card>
    );
}