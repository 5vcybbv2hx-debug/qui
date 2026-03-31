import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lightbulb, TrendingDown, RefreshCw, ChevronDown, ChevronUp, ShoppingCart, AlertTriangle, BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function buildSuggestions(articles, shoppingHistory) {
    const suggestions = [];

    // Group shopping history by item name (case-insensitive)
    const historyByItem = {};
    for (const entry of shoppingHistory) {
        const key = (entry.item_name || '').toLowerCase().trim();
        if (!key) continue;
        if (!historyByItem[key]) historyByItem[key] = [];
        historyByItem[key].push(entry);
    }

    for (const article of articles) {
        if (article.min_stock == null || article.current_stock == null) continue;
        const deficit = article.min_stock - article.current_stock;
        if (deficit <= 0) continue; // not low stock

        const key = article.name.toLowerCase().trim();
        const history = historyByItem[key] || [];

        // Average past order quantity
        const pastQtys = history.map(h => Number(h.quantity)).filter(q => q > 0);
        const avgQty = pastQtys.length > 0
            ? Math.round(pastQtys.reduce((a, b) => a + b, 0) / pastQtys.length)
            : null;

        // Frequency: how many times ordered
        const orderCount = history.length;

        // Suggested quantity: max of deficit and historical avg
        const suggestedQty = avgQty ? Math.max(deficit, avgQty) : deficit;

        // Pattern insight
        let pattern = null;
        if (orderCount >= 3) pattern = `${orderCount}× nachbestellt`;
        else if (orderCount > 0) pattern = `${orderCount}× in Verlauf`;

        suggestions.push({
            article,
            deficit,
            suggestedQty,
            avgQty,
            orderCount,
            pattern,
            unit: article.content_unit || 'Stück',
            urgency: article.current_stock <= 0 ? 'critical' : 'low',
        });
    }

    // Sort: critical first, then by deficit size
    suggestions.sort((a, b) => {
        if (a.urgency === 'critical' && b.urgency !== 'critical') return -1;
        if (b.urgency === 'critical' && a.urgency !== 'critical') return 1;
        return b.deficit - a.deficit;
    });

    return suggestions;
}

export default function SmartSuggestions() {
    const [expanded, setExpanded] = useState(true);
    const [addedIds, setAddedIds] = useState(new Set());
    const queryClient = useQueryClient();

    const { data: articles = [] } = useQuery({
        queryKey: ['smart-articles'],
        queryFn: () => base44.entities.Article.filter({ is_active: true })
    });

    const { data: shoppingHistory = [] } = useQuery({
        queryKey: ['smart-shopping-history'],
        queryFn: () => base44.entities.ShoppingList.list()
    });

    const addMutation = useMutation({
        mutationFn: (suggestion) => base44.entities.ShoppingList.create({
            item_name: suggestion.article.name,
            category: suggestion.article.category,
            quantity: suggestion.suggestedQty,
            unit: suggestion.unit,
            status: 'offen',
            notes: `Automatisch vorgeschlagen (Bestand: ${suggestion.article.current_stock}, Min: ${suggestion.article.min_stock})`,
        }),
        onSuccess: (_, suggestion) => {
            setAddedIds(prev => new Set([...prev, suggestion.article.id]));
            queryClient.invalidateQueries({ queryKey: ['op-shopping'] });
            queryClient.invalidateQueries({ queryKey: ['smart-shopping-history'] });
        }
    });

    const suggestions = useMemo(() => buildSuggestions(articles, shoppingHistory), [articles, shoppingHistory]);

    if (suggestions.length === 0) return null;

    return (
        <section>
            <div
                className="flex items-center justify-between mb-3 cursor-pointer select-none"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Smarte Vorschläge</h2>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">{suggestions.length}</Badge>
                </div>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {expanded && (
                <div className="space-y-2">
                    {suggestions.map(s => {
                        const isAdded = addedIds.has(s.article.id);
                        const isLoading = addMutation.isPending && addMutation.variables?.article.id === s.article.id;

                        return (
                            <div key={s.article.id} className={cn(
                                'rounded-xl border p-3 flex items-start gap-3 transition-all',
                                s.urgency === 'critical'
                                    ? 'bg-red-500/5 border-red-500/20'
                                    : 'bg-amber-500/5 border-amber-500/20'
                            )}>
                                {s.urgency === 'critical'
                                    ? <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                    : <TrendingDown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                }

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-foreground">{s.article.name}</p>
                                        {s.pattern && (
                                            <Badge className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 flex items-center gap-1">
                                                <BarChart2 className="w-2.5 h-2.5" />
                                                {s.pattern}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Bestand: <span className={cn('font-semibold', s.urgency === 'critical' ? 'text-red-400' : 'text-amber-400')}>{s.article.current_stock}</span>
                                        {' / '}Min: {s.article.min_stock}
                                        {s.avgQty && <span className="ml-2">· Ø Bestellung: {s.avgQty} {s.unit}</span>}
                                    </p>
                                    <p className="text-xs text-foreground mt-1 font-medium">
                                        Vorschlag: {s.suggestedQty} {s.unit} nachbestellen
                                    </p>
                                </div>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isAdded || isLoading}
                                    onClick={() => addMutation.mutate(s)}
                                    className={cn(
                                        'shrink-0 text-xs h-8 border',
                                        isAdded
                                            ? 'border-green-500/30 text-green-400 bg-green-500/10'
                                            : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                                    )}
                                >
                                    {isLoading
                                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                                        : isAdded
                                            ? '✓ Hinzugefügt'
                                            : <><ShoppingCart className="w-3 h-3 mr-1" />Vormerken</>
                                    }
                                </Button>
                            </div>
                        );
                    })}
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                        Vorschläge basieren auf Lagerbestand und Bestellhistorie. Keine automatischen Aktionen.
                    </p>
                </div>
            )}
        </section>
    );
}