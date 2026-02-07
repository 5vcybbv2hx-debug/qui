import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';

// Hilfsfunktion zum Parsen der Größenangabe in Liter
const parseServingSize = (sizeString) => {
    if (!sizeString) return 0;
    
    const size = sizeString.toLowerCase().replace(',', '.');
    
    if (size.includes('l')) {
        return parseFloat(size.replace('l', '').trim()) || 0;
    }
    if (size.includes('cl')) {
        return (parseFloat(size.replace('cl', '').trim()) || 0) / 100;
    }
    if (size.includes('ml')) {
        return (parseFloat(size.replace('ml', '').trim()) || 0) / 1000;
    }
    
    return 0;
};

export default function DailySpecialGenerator({ menuItems = [] }) {
    const [specials, setSpecials] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list()
    });

    const generateSpecials = () => {
        setIsGenerating(true);
        
        // Berechne Marge für alle Getränke
        const itemsWithMargin = menuItems
            .map(item => {
                let purchasePrice = 0;

                // Wenn mit Artikel verknüpft, berechne EK anhand Größe
                if (item.linked_article_id) {
                    const linkedArticle = articles.find(a => a.id === item.linked_article_id);
                    if (linkedArticle) {
                        const servingSize = parseServingSize(item.size);
                        
                        if (linkedArticle.price_per_liter && servingSize > 0) {
                            purchasePrice = linkedArticle.price_per_liter * servingSize;
                        } else if (linkedArticle.purchase_price && linkedArticle.content_amount && servingSize > 0) {
                            let contentInLiters = linkedArticle.content_amount;
                            const contentUnit = (linkedArticle.content_unit || 'ml').toLowerCase();
                            
                            if (contentUnit === 'ml') contentInLiters = linkedArticle.content_amount / 1000;
                            else if (contentUnit === 'cl') contentInLiters = linkedArticle.content_amount / 100;
                            else if (contentUnit === 'g') contentInLiters = linkedArticle.content_amount / 1000;
                            else if (contentUnit === 'l' || contentUnit === 'kg') contentInLiters = linkedArticle.content_amount;
                            
                            const pricePerLiter = linkedArticle.purchase_price / contentInLiters;
                            purchasePrice = pricePerLiter * servingSize;
                        }
                    }
                }
                // Sonst nehme manuellen EK
                else if (item.purchase_price) {
                    purchasePrice = item.purchase_price;
                }

                if (purchasePrice > 0 && item.price > 0) {
                    const margin = item.price - purchasePrice;
                    const margin_percentage = (margin / purchasePrice) * 100;
                    return { ...item, margin, margin_percentage, calculated_purchase_price: purchasePrice };
                }
                
                return null;
            })
            .filter(item => item !== null);

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
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={generateSpecials}
                            disabled={isGenerating}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {isGenerating ? 'Generiert...' : 'Neu generieren'}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(createPageUrl('DailySpecialsDisplay'), '_blank')}
                            className="border-amber-600 text-amber-400 hover:bg-amber-600/10"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Display
                        </Button>
                    </div>
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