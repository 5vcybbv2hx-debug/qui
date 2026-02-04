import React, { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2 } from 'lucide-react';
import LazyImage from '@/components/ui/lazy-image';

const ArticleCard = memo(function ArticleCard({ 
    article, 
    isSelected, 
    isLowStock, 
    categories,
    onToggleSelect,
    onEdit,
    onDelete 
}) {
    let touchStartX = 0;
    let touchEndX = 0;
    
    const handleTouchStart = (e) => {
        touchStartX = e.touches[0].clientX;
    };
    
    const handleTouchEnd = (e) => {
        touchEndX = e.changedTouches[0].clientX;
        if (touchStartX - touchEndX > 100) {
            onDelete(article.id);
        }
    };

    return (
        <Card 
            className={`p-4 bg-slate-800 border-slate-700 ${isSelected ? 'ring-2 ring-amber-500' : ''} ${isLowStock ? 'border-red-500' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2 flex-1">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(article)}
                        className="mt-1"
                    />
                    <div className="flex-1">
                        {article.image_url && (
                            <LazyImage 
                                src={article.image_url} 
                                alt={article.name}
                                className="w-full h-24 object-cover rounded-lg mb-2"
                            />
                        )}
                        <h3 className="font-semibold text-white text-sm mb-1">{article.name}</h3>
                        <p className="text-xs text-slate-400 font-mono">{article.barcode}</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(article)}
                        className="h-8 w-8 text-slate-400 hover:text-white"
                    >
                        <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(article.id)}
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                {article.category && (
                    <Badge style={{ 
                        backgroundColor: categories.find(c => c.name === article.category)?.color + '20',
                        color: categories.find(c => c.name === article.category)?.color || '#64748b'
                    }}>
                        {article.category}
                    </Badge>
                )}
                
                <div className="text-xs text-slate-400 space-y-1">
                    {article.suppliers?.length > 0 && (
                        <p>📦 {article.suppliers.join(', ')}</p>
                    )}
                    {article.quantity && article.unit && (
                        <p>📦 {article.quantity} {article.unit}</p>
                    )}
                    {article.purchase_price && (
                        <p className="font-semibold text-green-400">💰 {article.purchase_price.toFixed(2)} €</p>
                    )}
                    {article.min_stock && (
                        <p className={isLowStock ? 'text-red-400 font-semibold' : ''}>
                            📊 Bestand: {article.current_stock || 0} / {article.min_stock}
                        </p>
                    )}
                </div>
            </div>
        </Card>
    );
}, (prevProps, nextProps) => {
    return prevProps.article.id === nextProps.article.id &&
           prevProps.isSelected === nextProps.isSelected &&
           prevProps.isLowStock === nextProps.isLowStock &&
           prevProps.article.current_stock === nextProps.article.current_stock &&
           prevProps.article.image_url === nextProps.article.image_url;
});

export default ArticleCard;