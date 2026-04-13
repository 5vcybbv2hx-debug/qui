import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isToday, isFuture } from 'date-fns';
import { de } from 'date-fns/locale';
import { RepeatIcon, Check, X, Clock, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MAX_VISIBLE = 4;

export default function ShiftSwapMarketplaceCard({ currentEmployee }) {
    const queryClient = useQueryClient();
    const [expanded, setExpanded] = useState(true);
    const [showAll, setShowAll] = useState(false);

    const { data: allRequests = [] } = useQuery({
        queryKey: ['shift-swap-requests-open'],
        queryFn: () => base44.entities.ShiftSwapRequest.list('-created_date', 200)
    });

    const { data: myBids = [] } = useQuery({
        queryKey: ['my-shift-swap-bids', currentEmployee?.id],
        queryFn: () => base44.entities.ShiftSwapBid.filter({ bidding_employee_id: currentEmployee.id }),
        enabled: !!currentEmployee?.id
    });

    const today = format(new Date(), 'yyyy-MM-dd');

    // Nur zukünftige oder heutige Schichten
    const isRelevantDate = (r) => r.shift_date && r.shift_date >= today;

    // Offene Status: beide alten und neuen Status-Werte abdecken
    const isOpen = (r) => r.status === 'offen' || r.status === 'ausstehend';

    // Eigene offene Anfragen (ich habe die Schicht eingestellt)
    const myOpenRequests = allRequests.filter(r =>
        r.requesting_employee_id === currentEmployee?.id &&
        isOpen(r) &&
        isRelevantDate(r)
    );

    // Fremde offene Marketplace-Anfragen (nicht meine, passendes Datum)
    // Zeigt sowohl Marketplace-Anfragen als auch direkte Anfragen an mich
    const openRequests = allRequests.filter(r =>
        r.requesting_employee_id !== currentEmployee?.id &&
        (r.marketplace === true || r.target_employee_id === currentEmployee?.id) &&
        isOpen(r) &&
        isRelevantDate(r)
    );

    const total = myOpenRequests.length + openRequests.length;

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
                type: 'general',
                category: 'schicht',
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
        mutationFn: async (bidId) => base44.entities.ShiftSwapBid.delete(bidId),
        onSuccess: () => {
            queryClient.invalidateQueries(['my-shift-swap-bids']);
            toast.success('Bewerbung zurückgezogen');
        }
    });

    const hasBid = (requestId) => myBids.find(b => b.swap_request_id === requestId);

    if (total === 0) return null;

    // Combine: own requests first, then others
    const combined = [
        ...myOpenRequests.map(r => ({ ...r, _own: true })),
        ...openRequests.map(r => ({ ...r, _own: false }))
    ];
    const visible = showAll ? combined : combined.slice(0, MAX_VISIBLE);

    return (
        <Card className="overflow-hidden bg-card border-border">
            {/* Compact header — always visible, clickable to expand */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center gap-3 p-4 hover:bg-accent/30 active:bg-accent/50 transition-colors text-left min-h-[56px]"
            >
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
                    <RepeatIcon className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm leading-tight">Schichttausch</p>
                    <p className="text-xs text-muted-foreground leading-tight">
                        {myOpenRequests.length > 0 && `${myOpenRequests.length} eigene`}
                        {myOpenRequests.length > 0 && openRequests.length > 0 && ' · '}
                        {openRequests.length > 0 && `${openRequests.length} im Marketplace`}
                    </p>
                </div>
                <Badge className={cn(
                    'text-xs shrink-0',
                    myOpenRequests.length > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-600/20 text-blue-400'
                )}>
                    {total} offen
                </Badge>
                {expanded
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                }
            </button>

            {/* Expanded content */}
            {expanded && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                    {visible.map(request => {
                        if (request._own) {
                            return (
                                <div key={request.id} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                            <Clock className="w-4 h-4 text-amber-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-0.5">Deine Anfrage</p>
                                            <p className="font-semibold text-foreground text-sm">
                                                {format(parseISO(request.shift_date), 'EEEE, dd.MM.yyyy', { locale: de })}
                                            </p>
                                            {request.shift_time && (
                                                <p className="text-xs text-muted-foreground">{request.shift_time}</p>
                                            )}
                                            <p className="text-xs text-amber-300 mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Wartet auf Übernahme
                                            </p>
                                        </div>
                                        <Link to={createPageUrl('ShiftSwaps')} className="shrink-0">
                                            <Button size="sm" variant="outline"
                                                className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 h-9 px-3 text-xs">
                                                Details
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            );
                        }

                        const bid = hasBid(request.id);
                        return (
                            <div key={request.id} className="p-3 rounded-xl bg-background/50 border border-border/60">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5">
                                        {request.requesting_employee_name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">Marketplace</p>
                                        <p className="font-semibold text-foreground text-sm">
                                            {format(parseISO(request.shift_date), 'EEEE, dd.MM.yyyy', { locale: de })}
                                        </p>
                                        {request.shift_time && (
                                            <p className="text-xs text-muted-foreground">{request.shift_time}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {request.requesting_employee_name} sucht Vertretung
                                        </p>
                                        {request.reason && (
                                            <p className="text-xs text-muted-foreground italic mt-0.5 truncate">„{request.reason}"</p>
                                        )}
                                        {bid && (
                                            <Badge className="mt-1 text-[10px] bg-green-600/20 text-green-400">Beworben</Badge>
                                        )}
                                    </div>
                                    <div className="shrink-0">
                                        {bid ? (
                                            <Button size="sm" variant="outline"
                                                onClick={() => withdrawMutation.mutate(bid.id)}
                                                disabled={withdrawMutation.isPending}
                                                className="border-red-500/40 text-red-400 hover:bg-red-500/10 h-9 px-3 text-xs">
                                                <X className="w-3 h-3 mr-1" />Zurück
                                            </Button>
                                        ) : (
                                            <Button size="sm"
                                                onClick={() => bidMutation.mutate(request)}
                                                disabled={bidMutation.isPending}
                                                className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-3 text-xs">
                                                <Check className="w-3 h-3 mr-1" />Übernehmen
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {combined.length > MAX_VISIBLE && !showAll && (
                        <button
                            onClick={() => setShowAll(true)}
                            className="w-full text-xs text-muted-foreground hover:text-foreground py-2 rounded-lg hover:bg-accent/30 transition-colors">
                            {combined.length - MAX_VISIBLE} weitere anzeigen
                        </button>
                    )}

                    <Link to={createPageUrl('ShiftSwaps')} className="block">
                        <button className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-2 rounded-lg hover:bg-accent/30 transition-colors border border-border/50">
                            Alle Schichttausch-Anfragen <ArrowRight className="w-3 h-3" />
                        </button>
                    </Link>
                </div>
            )}
        </Card>
    );
}