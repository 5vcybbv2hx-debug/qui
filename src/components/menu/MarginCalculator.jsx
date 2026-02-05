import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calculator, AlertTriangle } from 'lucide-react';

export default function MarginCalculator({ menuItem }) {
    const [calculatedData, setCalculatedData] = useState(null);

    const { data: recipe } = useQuery({
        queryKey: ['recipe', menuItem?.linked_recipe_id],
        queryFn: () => base44.entities.Recipe.filter({ id: menuItem.linked_recipe_id }),
        enabled: !!menuItem?.linked_recipe_id && menuItem?.use_recipe_calculation,
        select: (data) => data[0]
    });

    const { data: articles = [] } = useQuery({
        queryKey: ['articles-for-margin'],
        queryFn: () => base44.entities.Article.list(),
        initialData: []
    });

    useEffect(() => {
        if (!menuItem) return;

        let purchasePrice = 0;
        let calculationMethod = 'none';

        // Berechnung aus Rezept
        if (menuItem.use_recipe_calculation && recipe?.ingredients) {
            let totalCost = 0;
            recipe.ingredients.forEach(ingredient => {
                const article = articles.find(a => a.id === ingredient.article_id);
                if (article && article.price_per_liter && ingredient.amount) {
                    // amount ist in ml/g, price_per_liter ist pro Liter/kg
                    totalCost += (ingredient.amount / 1000) * article.price_per_liter;
                }
            });
            purchasePrice = totalCost;
            calculationMethod = 'recipe';
        }
        // Berechnung aus verknüpftem Artikel
        else if (menuItem.linked_article_id) {
            const linkedArticle = articles.find(a => a.id === menuItem.linked_article_id);
            if (linkedArticle?.purchase_price) {
                purchasePrice = linkedArticle.purchase_price;
                calculationMethod = 'article';
            }
        }
        // Manueller EK
        else if (menuItem.purchase_price) {
            purchasePrice = menuItem.purchase_price;
            calculationMethod = 'manual';
        }

        // Margen berechnen
        const marginAbsolute = menuItem.price - purchasePrice;
        const marginPercentage = purchasePrice > 0 
            ? ((marginAbsolute / purchasePrice) * 100)
            : 0;

        setCalculatedData({
            purchasePrice,
            marginAbsolute,
            marginPercentage,
            calculationMethod,
            hasData: purchasePrice > 0
        });
    }, [menuItem, recipe, articles]);

    if (!calculatedData?.hasData) {
        return (
            <Card className="border-slate-600 bg-slate-800/30">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        Keine Margenberechnung möglich - EK fehlt
                    </div>
                </CardContent>
            </Card>
        );
    }

    const isGoodMargin = calculatedData.marginPercentage >= 300;
    const isOkMargin = calculatedData.marginPercentage >= 200;

    return (
        <Card className="border-slate-600 bg-gradient-to-br from-slate-800/50 to-slate-800/30">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Margenanalyse
                    <Badge variant="outline" className="ml-auto text-xs">
                        {calculatedData.calculationMethod === 'recipe' ? 'Rezept' : 
                         calculatedData.calculationMethod === 'article' ? 'Artikel' : 
                         'Manuell'}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <p className="text-xs text-slate-400 mb-1">VK</p>
                        <p className="text-lg font-bold text-white">
                            {menuItem.price?.toFixed(2)} €
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 mb-1">EK</p>
                        <p className="text-lg font-bold text-slate-300">
                            {calculatedData.purchasePrice.toFixed(2)} €
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 mb-1">Gewinn</p>
                        <p className="text-lg font-bold text-green-400">
                            {calculatedData.marginAbsolute.toFixed(2)} €
                        </p>
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-700">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Aufschlag</span>
                        <div className="flex items-center gap-2">
                            {isGoodMargin ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                            ) : !isOkMargin ? (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                            ) : (
                                <TrendingUp className="w-4 h-4 text-yellow-500" />
                            )}
                            <span className={`text-xl font-bold ${
                                isGoodMargin ? 'text-green-400' : 
                                isOkMargin ? 'text-yellow-400' : 
                                'text-red-400'
                            }`}>
                                {calculatedData.marginPercentage.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        {isGoodMargin ? '✓ Sehr gut' : 
                         isOkMargin ? '⚠ OK' : 
                         '⚠ Zu niedrig'}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}