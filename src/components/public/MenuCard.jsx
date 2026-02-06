import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wine, Coffee, Beer, Sparkles } from 'lucide-react';

const getCategoryIcon = (category) => {
    switch (category) {
        case 'Cocktails':
        case 'Moonshiner-Cocktails':
        case 'Longdrinks':
            return <Sparkles className="w-4 h-4" />;
        case 'Bier':
            return <Beer className="w-4 h-4" />;
        case 'Heißgetränke':
            return <Coffee className="w-4 h-4" />;
        default:
            return <Wine className="w-4 h-4" />;
    }
};

export default function MenuCard({ item }) {
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            {item.image_url && (
                <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        {item.size && (
                            <p className="text-sm text-muted-foreground mt-0.5">{item.size}</p>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary" className="flex items-center gap-1">
                            {getCategoryIcon(item.category)}
                            {item.category}
                        </Badge>
                        <span className="text-xl font-bold text-primary">
                            {item.price.toFixed(2)}€
                        </span>
                    </div>
                </div>
            </CardHeader>
            {(item.description || item.allergens || item.alcohol_content) && (
                <CardContent className="pt-0 space-y-2">
                    {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                        {item.alcohol_content > 0 && (
                            <Badge variant="outline" className="text-xs">
                                {item.alcohol_content}% Vol.
                            </Badge>
                        )}
                        {item.is_special && (
                            <Badge className="text-xs bg-amber-500">
                                Tagesangebot
                            </Badge>
                        )}
                        {item.is_seasonal && (
                            <Badge className="text-xs bg-green-500">
                                Saisonal
                            </Badge>
                        )}
                    </div>
                    {item.allergens && (
                        <p className="text-xs text-muted-foreground pt-1">
                            <strong>Allergene:</strong> {item.allergens}
                        </p>
                    )}
                </CardContent>
            )}
        </Card>
    );
}