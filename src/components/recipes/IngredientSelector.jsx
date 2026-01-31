import React, { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function IngredientSelector({ ingredients, onChange, articles }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    // Stelle sicher, dass ingredients immer ein Array ist
    const safeIngredients = Array.isArray(ingredients) ? ingredients : [];

    const filteredArticles = articles.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addIngredient = (article) => {
        const newIngredient = {
            article_id: article.id,
            article_name: article.name,
            amount: 0,
            article_content_unit: article.content_unit || 'ml'
        };
        onChange([...safeIngredients, newIngredient]);
        setSearchTerm('');
        setShowSearch(false);
    };

    const updateIngredient = (index, field, value) => {
        const updated = safeIngredients.map((ing, i) => 
            i === index ? { ...ing, [field]: value } : ing
        );
        onChange(updated);
    };

    const getDisplayUnit = (ingredient) => {
        const unit = ingredient.article_content_unit;
        if (unit === 'l') return 'ml';
        if (unit === 'kg') return 'g';
        return unit || 'ml';
    };

    const getConversionInfo = (ingredient) => {
        const article = articles.find(a => a.id === ingredient.article_id);
        if (!article || !article.content_unit) return null;

        const sourceUnit = article.content_unit;
        const displayUnit = getDisplayUnit(ingredient);
        
        if (sourceUnit === displayUnit) return null;

        // Konvertierungsfaktor berechnen
        let factor = 1;
        if (sourceUnit === 'l' && displayUnit === 'ml') factor = 1000;
        if (sourceUnit === 'kg' && displayUnit === 'g') factor = 1000;

        return {
            sourceUnit,
            displayUnit,
            factor,
            articleAmount: article.content_amount
        };
    };

    const removeIngredient = (index) => {
        onChange(safeIngredients.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label>Zutaten *</Label>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSearch(!showSearch)}
                    className="h-8"
                >
                    <Plus className="w-3 h-3 mr-1" />
                    Artikel hinzufügen
                </Button>
            </div>

            {/* Artikel Suche */}
            {showSearch && (
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 space-y-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Artikel suchen..."
                            className="pl-9 h-9"
                            autoFocus
                        />
                    </div>

                    {searchTerm && filteredArticles.length > 0 && (
                        <div className="max-h-48 overflow-y-auto space-y-1">
                            {filteredArticles.slice(0, 8).map(article => (
                                <button
                                   key={article.id}
                                   type="button"
                                   onClick={() => addIngredient(article)}
                                   className="w-full text-left px-3 py-2 rounded hover:bg-slate-200 transition-colors"
                                >
                                   <p className="text-sm font-medium text-slate-900">{article.name}</p>
                                   <p className="text-xs text-slate-500">
                                       {article.category} {article.content_amount && article.content_unit ? `· ${article.content_amount} ${article.content_unit}` : ''}
                                   </p>
                                </button>
                            ))}
                        </div>
                    )}

                    {searchTerm && filteredArticles.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-2">
                            Keine Artikel gefunden
                        </p>
                    )}
                </div>
            )}

            {/* Zutaten Liste */}
            {safeIngredients.length > 0 ? (
                <div className="space-y-2">
                    {safeIngredients.map((ing, index) => {
                        const conversionInfo = getConversionInfo(ing);
                        const displayUnit = getDisplayUnit(ing);
                        
                        return (
                            <div key={index} className="flex gap-2 items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-900">{ing.article_name}</p>
                                    {conversionInfo && (
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Artikel: {conversionInfo.articleAmount} {conversionInfo.sourceUnit} = {conversionInfo.articleAmount * conversionInfo.factor} {conversionInfo.displayUnit}
                                        </p>
                                    )}
                                </div>
                                <Input
                                    type="number"
                                    value={ing.amount}
                                    onChange={(e) => updateIngredient(index, 'amount', parseFloat(e.target.value) || 0)}
                                    placeholder="Menge"
                                    className="w-24 h-9"
                                    step="0.1"
                                />
                                <span className="text-sm text-slate-500 w-12">{displayUnit}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeIngredient(index)}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <p className="text-sm">Noch keine Zutaten hinzugefügt</p>
                    <p className="text-xs mt-1">Klicke auf "Artikel hinzufügen"</p>
                </div>
            )}
        </div>
    );
}