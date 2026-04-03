import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin, Package, ChevronRight, Info, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const TYPE_ICONS = {
    Regal: '🗄️', Schrank: '🚪', Fach: '📦', Schublade: '🗃️',
    Kiste: '📫', Kühlschrank: '❄️', Sonstiges: '📌'
};

const CONDITION_STYLE = {
    gut: 'bg-green-500/20 text-green-400',
    ok: 'bg-yellow-500/20 text-yellow-400',
    defekt: 'bg-red-500/20 text-red-400',
};

export default function StorageLocationScan() {
    const [location, setLocation] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Extract location ID from URL path /StorageLocationScan/:id
    const pathParts = window.location.pathname.split('/');
    const locationId = pathParts[pathParts.length - 1];

    useEffect(() => {
        if (!locationId || locationId === 'StorageLocationScan') {
            setError('Kein Lagerort angegeben.');
            setLoading(false);
            return;
        }

        Promise.all([
            base44.entities.StorageLocation.filter({ id: locationId }),
            base44.entities.StorageItem.filter({ location_id: locationId, is_active: true })
        ]).then(([locs, itms]) => {
            if (!locs || locs.length === 0) {
                setError('Lagerort nicht gefunden.');
            } else {
                setLocation(locs[0]);
                setItems(itms || []);
            }
            setLoading(false);
        }).catch(() => {
            setError('Fehler beim Laden der Daten.');
            setLoading(false);
        });
    }, [locationId]);

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
                <p className="text-sm text-muted-foreground mt-1">Bitte QR-Code erneut scannen.</p>
            </div>
        </div>
    );

    const displayName = location.name || [location.area, location.furniture, location.position].filter(Boolean).join(' › ');
    const typeIcon = TYPE_ICONS[location.location_type] || '📌';

    return (
        <div className="min-h-screen bg-background pb-10">
            {/* Header */}
            <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-b border-border px-4 pt-8 pb-6">
                <div className="max-w-lg mx-auto">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0">
                            {typeIcon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
                                {location.location_type || 'Lagerort'}
                            </p>
                            <h1 className="text-xl font-bold text-foreground leading-tight break-words">{displayName}</h1>
                            {location.short_code && (
                                <Badge className="mt-1 bg-slate-700 text-slate-300 text-xs font-mono">
                                    {location.short_code}
                                </Badge>
                            )}
                            <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span>{location.area}</span>
                            </div>
                        </div>
                    </div>

                    {location.description && (
                        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-card border border-border">
                            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">{location.description}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">
                {/* Photo */}
                {location.photo_url && (
                    <div className="rounded-2xl overflow-hidden border border-border">
                        <img src={location.photo_url} alt={displayName} className="w-full object-cover max-h-48" />
                    </div>
                )}

                {/* Items */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Package className="w-4 h-4 text-amber-400" />
                        <h2 className="font-semibold text-foreground">
                            Artikel hier ({items.length})
                        </h2>
                    </div>

                    {items.length === 0 ? (
                        <Card className="p-8 text-center">
                            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                            <p className="text-sm text-muted-foreground">Keine Artikel diesem Lagerort zugeordnet.</p>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            {items.map(item => (
                                <Card key={item.id} className="p-4">
                                    <div className="flex items-start gap-3">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name}
                                                className="w-12 h-12 rounded-lg object-cover border border-border shrink-0" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                                                <Package className="w-5 h-5 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-foreground">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">{item.category}</p>
                                            {item.description && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                                            )}
                                        </div>
                                        <div className="shrink-0 flex flex-col items-end gap-1">
                                            {item.quantity > 1 && (
                                                <span className="text-sm font-bold text-foreground">×{item.quantity}</span>
                                            )}
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONDITION_STYLE[item.condition] || 'bg-secondary text-muted-foreground'}`}>
                                                {item.condition || 'gut'}
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {location.notes && (
                    <Card className="p-4 border-amber-500/20 bg-amber-500/5">
                        <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Hinweis</p>
                        <p className="text-sm text-foreground">{location.notes}</p>
                    </Card>
                )}
            </div>
        </div>
    );
}