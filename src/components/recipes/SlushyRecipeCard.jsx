import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Snowflake, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const TARGET_VOLUME = 3.5; // Liter

const spiritColors = {
    'Vodka': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Rum': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Gin': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Whiskey': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'Likör': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Alkoholfrei': 'bg-green-500/20 text-green-300 border-green-500/30',
    'Sonstiges': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

const spiritDots = {
    'Vodka': 'bg-blue-400',
    'Rum': 'bg-amber-400',
    'Gin': 'bg-emerald-400',
    'Whiskey': 'bg-orange-400',
    'Likör': 'bg-purple-400',
    'Alkoholfrei': 'bg-green-400',
    'Sonstiges': 'bg-slate-400',
};

export default function SlushyRecipeCard({ recipe, onEdit, onDelete, isManager }) {
    const [expanded, setExpanded] = useState(false);
    const originalVolume = recipe.slushy_original_volume_liters;
    const factor = originalVolume ? (TARGET_VOLUME / originalVolume) : 1;

    const scaledIngredients = (recipe.ingredients || []).map(ing => {
        if (!ing.amount) return ing;
        // ingredients stored in liters for slushy
        const scaledAmount = ing.amount * factor;
        return { ...ing, scaledAmount: Math.round(scaledAmount * 100) / 100 };
    });

    const spirit = recipe.slushy_spirit_base || 'Sonstiges';

    return (
        <Card className={cn(
            'bg-card border-border overflow-hidden transition-all',
            'hover:border-cyan-500/30'
        )}>
            {/* Color bar top */}
            <div className={cn('h-1 w-full', spiritDots[spirit] || 'bg-slate-400')} />

            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', spiritDots[spirit])} />
                            <h3 className="font-semibold text-foreground text-sm leading-tight">{recipe.name}</h3>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                            {spirit && (
                                <Badge className={cn('text-[10px] border', spiritColors[spirit])}>
                                    {spirit}
                                </Badge>
                            )}
                            <Badge className="text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                                <Snowflake className="w-2.5 h-2.5 mr-1" />
                                Slushy
                            </Badge>
                        </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                        {isManager && (
                            <>
                                <Button variant="ghost" size="icon" onClick={() => onEdit(recipe)}
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent">
                                    <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => onDelete(recipe.id)}
                                    className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Scaling info */}
                {originalVolume && (
                    <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-2.5 py-1.5">
                        <Snowflake className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>Original: <strong className="text-foreground">{originalVolume}L</strong></span>
                        <span className="text-border">→</span>
                        <span className="text-cyan-400 font-semibold">{TARGET_VOLUME}L (Faktor {factor.toFixed(2)})</span>
                    </div>
                )}

                {/* Ingredients */}
                {scaledIngredients.length > 0 && (
                    <div className="space-y-1">
                        {(expanded ? scaledIngredients : scaledIngredients.slice(0, 4)).map((ing, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">{ing.article_name}</span>
                                <span className="text-cyan-400 font-semibold tabular-nums">
                                    {originalVolume
                                        ? `${ing.scaledAmount}L`
                                        : `${ing.amount}${ing.unit || 'L'}`
                                    }
                                </span>
                            </div>
                        ))}
                        {scaledIngredients.length > 4 && (
                            <button
                                onClick={() => setExpanded(v => !v)}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-1 w-full"
                            >
                                {expanded
                                    ? <><ChevronUp className="w-3 h-3" /> Weniger anzeigen</>
                                    : <><ChevronDown className="w-3 h-3" /> +{scaledIngredients.length - 4} weitere Zutaten</>
                                }
                            </button>
                        )}
                    </div>
                )}

                {/* Garnish & Notes */}
                {recipe.garnish && (
                    <p className="text-xs text-amber-400 mt-2">🍋 {recipe.garnish}</p>
                )}
                {recipe.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">💡 {recipe.notes}</p>
                )}
                {recipe.preparation && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t border-border pt-2">
                        {recipe.preparation}
                    </p>
                )}
            </div>
        </Card>
    );
}