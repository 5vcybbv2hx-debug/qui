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
        
        // Filtere Getränke mit Marge
        const itemsWithMargin = menuItems.filter(item => 
            item.margin_percentage !== undefined && item.margin_percentage !== null
        );

        if (itemsWithMargin.length === 0) {
            toast.error('Keine Getränke mit Margen-Daten verfügbar');
            setIsGenerating(false);
            return;
        }

        // Sortiere nach Marge (höchste zuerst)
        const sorted = [...itemsWithMargin].sort((a, b) => 
            (b.margin_percentage || 0) - (a.margin_percentage || 0)
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
        <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-600" />
                        Tages-Specials
                    </CardTitle>
                    <Button
                        size="sm"
                        onClick={generateSpecials}
                        disabled={isGenerating}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        {isGenerating ? 'Generiert...' : 'Neu generieren'}
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {specials.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                        Klick auf "Neu generieren" um Aktionsgetränke vorzuschlagen
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {specials.map((item) => (
                            <div key={item.id} className="bg-white rounded-lg p-4 border border-amber-200">
                                <h3 className="font-semibold text-foreground text-sm mb-2">{item.name}</h3>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">Marge: {item.margin_percentage?.toFixed(1)}%</span>
                                    <span className="font-bold text-amber-600">{item.price}€</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}