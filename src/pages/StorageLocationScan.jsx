import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin, Package, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default function StorageLocationScan() {
    const [slot, setSlot] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Extract slot ID from URL path /StorageLocationScan/:id
    const pathParts = window.location.pathname.split('/');
    const slotId = pathParts[pathParts.length - 1];

    useEffect(() => {
        if (!slotId || slotId === 'StorageLocationScan') {
            setError('Kein Lagerplatz angegeben.');
            setLoading(false);
            return;
        }

        Promise.all([
            base44.entities.StorageSlot.filter({ id: slotId }),
            base44.entities.StorageAssignment.filter({ storage_slot_id: slotId, is_active: true })
        ]).then(([slots, assigns]) => {
            if (!slots || slots.length === 0) {
                setError('Lagerplatz nicht gefunden. Bitte QR-Code erneut scannen.');
            } else {
                setSlot(slots[0]);
                setAssignments(assigns || []);
            }
            setLoading(false);
        }).catch(() => {
            setError('Fehler beim Laden der Daten.');
            setLoading(false);
        });
    }, [slotId]);

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-lg font-semibold text-foreground">{error}</p>
                <p className="text-sm text-muted-foreground mt-1">ID: {slotId}</p>
            </div>
        </div>
    );

    const displayName = slot.full_name || slot.name || 'Lagerplatz';

    return (
        <div className="min-h-screen bg-background pb-10">
            {/* Header — extra top padding for status bar / notch */}
            <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-b border-border px-4 pb-6"
                 style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2.5rem)' }}>
                <div className="max-w-lg mx-auto">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0">
                            📦
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
                                Lagerplatz
                            </p>
                            <h1 className="text-xl font-bold text-foreground leading-tight break-words">{displayName}</h1>
                            {slot.short_code && (
                                <Badge className="mt-1 bg-slate-700 text-slate-300 text-xs font-mono">
                                    {slot.short_code}
                                </Badge>
                            )}
                            {slot.area_name && (
                                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    <span>{[slot.area_name, slot.furniture_name, slot.container_name].filter(Boolean).join(' › ')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {slot.notes && (
                        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-card border border-border">
                            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">{slot.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">
                {/* Assigned articles */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Package className="w-4 h-4 text-amber-400" />
                        <h2 className="font-semibold text-foreground">
                            Inhalt ({assignments.length})
                        </h2>
                    </div>

                    {assignments.length === 0 ? (
                        <Card className="p-8 text-center">
                            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                            <p className="text-sm text-muted-foreground">Keine Artikel diesem Lagerplatz zugeordnet.</p>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            {assignments.map(a => (
                                <Card key={a.id} className="p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-foreground">{a.article_name}</p>
                                            {a.unit && (
                                                <p className="text-xs text-muted-foreground mt-0.5">{a.unit}</p>
                                            )}
                                        </div>
                                        <div className="shrink-0 text-right">
                                            {a.quantity != null && (
                                                <p className="text-lg font-bold text-foreground">{a.quantity}</p>
                                            )}
                                            {a.min_stock != null && (
                                                <p className="text-xs text-muted-foreground">Min: {a.min_stock}</p>
                                            )}
                                        </div>
                                    </div>
                                    {a.notes && (
                                        <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">{a.notes}</p>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}