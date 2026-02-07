import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function MenuCard({ item }) {
    return (
        <Card className="bg-slate-800 border-slate-700 overflow-hidden hover:scale-[1.02] transition-transform">
            {item.image_url && (
                <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="w-full h-48 object-cover"
                />
            )}
            <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
                
                {item.description && (
                    <p className="text-slate-400 text-sm mb-4">{item.description}</p>
                )}

                <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-amber-500">
                        €{item.price.toFixed(2)}
                    </div>
                    {item.category && (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                            {item.category}
                        </Badge>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                    {item.size && (
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                            {item.size}
                        </Badge>
                    )}
                    {item.alcohol_content && (
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                            {item.alcohol_content}% Vol.
                        </Badge>
                    )}
                    {item.is_seasonal && (
                        <Badge className="bg-green-900/50 text-green-300 border-green-800">
                            Saisonal
                        </Badge>
                    )}
                    {item.is_special && (
                        <Badge className="bg-amber-900/50 text-amber-300 border-amber-800">
                            Special
                        </Badge>
                    )}
                </div>

                {item.allergens && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                        <p className="text-xs text-slate-500">
                            <span className="font-semibold">Allergene:</span> {item.allergens}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}