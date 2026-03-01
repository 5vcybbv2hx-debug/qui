import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

export default function MenuCard({ item }) {
    return (
        <div className="bg-card/80 backdrop-blur border border-border/50 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-black/20 transition-all">
            {item.image_url && (
                <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-40 object-cover"
                />
            )}
            <div className="p-5 space-y-3">
                <div className="flex justify-between items-start gap-2">
                    <div>
                        <h3 className="font-bold text-lg text-foreground">{item.name}</h3>
                        {item.subcategory && (
                            <p className="text-xs text-muted-foreground">{item.subcategory}</p>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <span className="text-xl font-bold text-amber-400">
                            {Number(item.price).toFixed(2)} €
                        </span>
                        {item.size && (
                            <p className="text-xs text-muted-foreground">{item.size}</p>
                        )}
                    </div>
                </div>

                {item.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                )}

                <div className="flex flex-wrap gap-2">
                    {item.is_special && (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Special</Badge>
                    )}
                    {item.is_seasonal && (
                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Saisonal</Badge>
                    )}
                    {item.alcohol_content && (
                        <Badge variant="outline" className="text-muted-foreground border-border/50">
                            {item.alcohol_content}% Vol.
                        </Badge>
                    )}
                </div>

                {item.allergens && (
                    <div className="flex items-start gap-2 pt-2 border-t border-border/30">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-amber-400/80">Allergene: </span>
                            {item.allergens}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}