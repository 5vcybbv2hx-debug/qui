import React, { memo, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, GripVertical, MapPin, Package, Plus, Minus } from 'lucide-react';
import LazyImage from '@/components/ui/lazy-image';

const ArticleCard = memo(function ArticleCard({
    article,
    isSelected,
    isLowStock,
    categories,
    onToggleSelect,
    onEdit,
    onDelete,
    onStockChange,
    dragHandleProps,
    isManager,
}) {
    // ── Swipe-to-delete: require 160px + show visual indicator, no accidental fire
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const SWIPE_THRESHOLD = 160;

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        setSwipeOffset(0);
    };

    const handleTouchMove = (e) => {
        const dx = touchStartX.current - e.touches[0].clientX;
        const dy = Math.abs(touchStartY.current - e.touches[0].clientY);
        // Only track horizontal swipe — ignore vertical scrolling
        if (dy > 20) return;
        if (dx > 0) setSwipeOffset(Math.min(dx, SWIPE_THRESHOLD + 20));
    };

    const handleTouchEnd = () => {
        if (swipeOffset >= SWIPE_THRESHOLD) {
            // Trigger the parent's confirm-dialog (already in Articles.jsx via handleDelete)
            onDelete(article.id);
        }
        setSwipeOffset(0);
    };

    // ── Category color lookup (cached via find — memo handles re-renders)
    const catColor = categories.find(c => c.name === article.category)?.color;

    // ── Stock info
    const stock = article.current_stock ?? 0;
    const minStock = article.min_stock ?? 0;
    const stockPercent = minStock > 0 ? Math.min(100, Math.round((stock / minStock) * 100)) : null;

    // ── Primary supplier from supplier_details (new) or legacy suppliers array
    const primarySupplier = article.supplier_details?.find(s => s.is_primary)
        || article.supplier_details?.[0]
        || null;
    const supplierLabel = primarySupplier?.supplier_name
        || article.suppliers?.[0]
        || null;

    return (
        <div className="relative overflow-hidden rounded-[inherit]">
            {/* Swipe delete hint — only visible when swiping */}
            {swipeOffset > 20 && (
                <div
                    className="absolute inset-y-0 right-0 flex items-center justify-center bg-destructive rounded-xl transition-all"
                    style={{ width: `${Math.min(swipeOffset, SWIPE_THRESHOLD + 20)}px` }}
                >
                    <Trash2 className="w-5 h-5 text-white" />
                </div>
            )}

            <Card
                className={[
                    'p-3 bg-card border-border transition-transform will-change-transform',
                    isSelected  ? 'ring-2 ring-amber-500' : '',
                    isLowStock  ? 'border-red-500/60'     : '',
                ].join(' ')}
                style={{ transform: `translateX(-${swipeOffset}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* ── Top row: drag + checkbox + image + name + actions ── */}
                <div className="flex items-start gap-2">
                    {/* Drag handle */}
                    {dragHandleProps && (
                        <div
                            {...dragHandleProps}
                            className="cursor-grab active:cursor-grabbing text-muted-foreground mt-1 touch-none flex-shrink-0"
                        >
                            <GripVertical className="w-4 h-4" />
                        </div>
                    )}

                    {/* Checkbox */}
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(article)}
                        className="mt-1 flex-shrink-0"
                    />

                    {/* Image */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-secondary flex items-center justify-center flex-shrink-0">
                        {article.image_url ? (
                            <LazyImage
                                src={article.image_url}
                                alt={article.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Package className="w-6 h-6 text-muted-foreground" />
                        )}
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm leading-tight truncate">
                            {article.name}
                        </h3>
                        {article.manufacturer && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {article.manufacturer}
                            </p>
                        )}
                        {article.barcode && !article.barcode.startsWith('GEN-') && (
                            <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5 truncate">
                                {article.barcode}
                            </p>
                        )}

                        {/* Category badge */}
                        {article.category && (
                            <Badge
                                className="mt-1 text-[10px] px-1.5 py-0"
                                style={{
                                    backgroundColor: catColor ? catColor + '22' : undefined,
                                    color: catColor || undefined,
                                    borderColor: catColor ? catColor + '44' : undefined,
                                }}
                            >
                                {article.category}
                            </Badge>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => onEdit(article)}
                            className="h-9 w-9 text-muted-foreground hover:text-foreground"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => onDelete(article.id)}
                            className="h-9 w-9 text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>

                {/* ── Bottom row: stock + location + price ── */}
                <div className="mt-2.5 flex items-center gap-3 flex-wrap">

                    {/* Stock quick-edit */}
                    {minStock > 0 ? (
                        <div className="flex items-center gap-1.5">
                            {onStockChange && (
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-7 w-7 rounded-full border border-border"
                                    onClick={() => onStockChange(article.id, Math.max(0, stock - 1))}
                                >
                                    <Minus className="w-3 h-3" />
                                </Button>
                            )}
                            <div className="flex flex-col items-center min-w-[44px]">
                                <span className={[
                                    'text-sm font-bold tabular-nums',
                                    isLowStock ? 'text-red-400' : 'text-foreground',
                                ].join(' ')}>
                                    {stock}
                                    <span className="text-xs font-normal text-muted-foreground">/{minStock}</span>
                                </span>
                                {/* Mini stock bar */}
                                {stockPercent !== null && (
                                    <div className="w-full h-1 bg-secondary rounded-full mt-0.5 overflow-hidden">
                                        <div
                                            className={[
                                                'h-full rounded-full transition-all',
                                                isLowStock ? 'bg-red-400' : 'bg-amber-500',
                                            ].join(' ')}
                                            style={{ width: `${stockPercent}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                            {onStockChange && (
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-7 w-7 rounded-full border border-border"
                                    onClick={() => onStockChange(article.id, stock + 1)}
                                >
                                    <Plus className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground/50 italic">Kein Mindestbestand</span>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Location */}
                    {(article.shelf_id || article.storage_location) && (
                        <p className="flex items-center gap-1 text-xs text-blue-400 font-medium">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {article.shelf_id && (
                                <span className="font-mono bg-blue-500/15 px-1 py-0.5 rounded text-blue-300 text-[10px]">
                                    {article.shelf_id}
                                </span>
                            )}
                            {article.storage_location && (
                                <span className="truncate max-w-[80px]">{article.storage_location}</span>
                            )}
                        </p>
                    )}

                    {/* Price (manager only) */}
                    {isManager && article.purchase_price && (
                        <p className="text-xs font-semibold text-green-400 tabular-nums">
                            {article.purchase_price.toFixed(2)} €
                        </p>
                    )}

                    {/* Supplier */}
                    {supplierLabel && (
                        <p className="text-[10px] text-muted-foreground truncate max-w-[90px]">
                            📦 {supplierLabel}
                        </p>
                    )}
                </div>

                {/* Low stock warning */}
                {isLowStock && (
                    <div className="mt-2 text-[10px] text-red-400 font-medium flex items-center gap-1">
                        ⚠ Mindestbestand unterschritten
                    </div>
                )}

                {/* Allergens */}
                {(article.allergens || article.allergens_list?.length > 0) && (
                    <div className="mt-1.5 text-[10px] text-amber-400/80">
                        ⚠ {article.allergens_list?.join(', ') || article.allergens}
                    </div>
                )}
            </Card>
        </div>
    );
}, (prev, next) =>
    prev.article.id             === next.article.id             &&
    prev.isSelected             === next.isSelected             &&
    prev.isLowStock             === next.isLowStock             &&
    prev.article.current_stock  === next.article.current_stock  &&
    prev.article.image_url      === next.article.image_url      &&
    prev.article.shelf_id       === next.article.shelf_id       &&
    prev.article.storage_location === next.article.storage_location &&
    prev.dragHandleProps        === next.dragHandleProps
);

export default ArticleCard;
