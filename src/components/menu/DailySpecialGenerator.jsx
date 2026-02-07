import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function DailySpecialGenerator({ menuItems = [] }) {
    const [specials, setSpecials] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const generateSpecials = () => {
        setIsGenerating(true);
        
        // Berechne Marge für alle Getränke mit Einkaufspreis
        const itemsWithMargin = menuItems
            .filter(item => item.purchase_price && item.purchase_price > 0 && item.price > 0)
            .map(item => {
                const margin = item.price - item.purchase_price;
                const margin_percentage = (margin / item.price) * 100;
                return { ...item, margin, margin_percentage };
            });

        if (itemsWithMargin.length === 0) {
            toast.error('Keine Getränke mit Einkaufspreis verfügbar');
            setIsGenerating(false);
            return;
        }

        // Sortiere nach Marge (höchste zuerst)
        const sorted = [...itemsWithMargin].sort((a, b) => 
            b.margin_percentage - a.margin_percentage
        );

        // Nimm die besten 50% und wähle zufällig 3 aus
        const topHalf = sorted.slice(0, Math.max(3, Math.floor(sorted.length * 0.5)));
        const selected = [];
        
        for (let i = 0; i < Math.min(3, topHalf.length); i++) {
            const randomIdx = Math.floor(Math.random() * topHalf.length);
            const item = topHalf.splice(randomIdx, 1)[0];
            selected.push(item);
        }

        setSpecials(selected);
        toast.success('3 Aktionsgetränke ausgewählt!');
        setIsGenerating(false);
    };

    return (
        <Card className="border-amber-600 bg-amber-900">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        Tages-Specials
                    </CardTitle>
                    <Button
                        size="sm"
                        onClick={generateSpecials}
                        disabled={isGenerating}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        {isGenerating ? 'Generiert...' : 'Neu generieren'}
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {specials.length === 0 ? (
                    <p className="text-sm text-slate-300 text-center py-6">
                        Klick auf "Neu generieren" um Aktionsgetränke vorzuschlagen
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {specials.map((item) => (
                            <div key={item.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <h3 className="font-semibold text-white text-sm mb-2">{item.name}</h3>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-300">Marge: {item.margin_percentage?.toFixed(1)}%</span>
                                    <span className="font-bold text-amber-400">{item.price}€</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}