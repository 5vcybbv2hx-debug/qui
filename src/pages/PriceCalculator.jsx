import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Calculator, Search, TrendingUp, Package, Wine } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';

export default function PriceCalculator() {
    const permissions = usePermissions();
    const [ingredients, setIngredients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [margin, setMargin] = useState('3');
    const [vatRate, setVatRate] = useState('19');
    const [selectedRecipe, setSelectedRecipe] = useState(null);

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('name')
    });

    const { data: recipes = [] } = useQuery({
        queryKey: ['recipes'],
        queryFn: () => base44.entities.Recipe.list('name')
    });

    if (!permissions.canViewPriceCalculator) {
        return <PermissionDenied message="Nur Administratoren haben Zugriff auf die Preiskalkulation." />;
    }

    const filteredArticles = articles.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) && a.purchase_price
    );

    const handleArticleSelect = (article) => {
        const newIngredient = {
            id: Date.now(),
            article,
            amount: '',
            unit: 'ml'
        };
        setIngredients([...ingredients, newIngredient]);
        setSearchTerm('');
    };

    const loadRecipe = (recipe) => {
        if (!recipe || !Array.isArray(recipe.ingredients)) return;
        
        const newIngredients = recipe.ingredients.map((ing, idx) => {
            const article = articles.find(a => a.id === ing.article_id);
            return {
                id: Date.now() + idx,
                article: article || { name: ing.article_name, purchase_price: 0, unit: 'ml' },
                amount: ing.amount || '',
                unit: 'ml'
            };
        }).filter(ing => ing.article);

        setIngredients(newIngredients);
        setSelectedRecipe(recipe);
    };

    const updateIngredient = (id, field, value) => {
        setIngredients(ingredients.map(ing => 
            ing.id === id ? { ...ing, [field]: value } : ing
        ));
    };

    const removeIngredient = (id) => {
        setIngredients(ingredients.filter(ing => ing.id !== id));
    };

    // Berechnungen
    const calculatePrices = () => {
        const marginMultiplier = parseFloat(margin) || 1;
        const vat = parseFloat(vatRate) || 0;

        // Gesamtkosten aller Zutaten
        const totalCost = ingredients.reduce((sum, ing) => {
            const article = ing.article;
            const amount = parseFloat(ing.amount) || 0;
            
            if (!article.purchase_price || !article.content_amount || amount === 0) return sum;
            
            // Umrechnung in ml
            let contentInMl = article.content_amount;
            if (article.content_unit === 'l') {
                contentInMl = article.content_amount * 1000;
            } else if (article.content_unit === 'kg') {
                contentInMl = article.content_amount * 1000;
            }
            
            const pricePerMl = article.purchase_price / contentInMl;
            const costForAmount = pricePerMl * amount;
            
            return sum + costForAmount;
        }, 0);

        // Verkaufspreis netto (EK × Aufschlag-Multiplikator)
        const sellingPriceNet = totalCost * marginMultiplier;

        // Verkaufspreis brutto
        const sellingPriceGross = sellingPriceNet * (1 + vat / 100);

        // MwSt-Betrag
        const vatAmount = sellingPriceNet * (vat / 100);

        // Gewinn
        const profit = sellingPriceNet - totalCost;
        const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

        return {
            totalCost,
            sellingPriceNet,
            sellingPriceGross,
            profit,
            profitPercent,
            vatAmount
        };
    };

    const prices = calculatePrices();

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Preiskalkulation</h1>
                    <p className="text-slate-400 text-sm mt-1">Berechne optimale Verkaufspreise für deine Getränke</p>
                </div>

                {/* Rezept-Auswahl */}
                {recipes.length > 0 && (
                    <Card className="p-4 bg-slate-800 border-slate-700 mb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Wine className="w-5 h-5 text-amber-400" />
                            <Label className="text-white font-semibold">Rezept laden</Label>
                        </div>
                        <Select value={selectedRecipe?.id || ''} onValueChange={(id) => {
                            const recipe = recipes.find(r => r.id === id);
                            if (recipe) loadRecipe(recipe);
                        }}>
                            <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                <SelectValue placeholder="Wähle ein Rezept..." />
                            </SelectTrigger>
                            <SelectContent>
                                {recipes.filter(r => Array.isArray(r.ingredients) && r.ingredients.length > 0).map(recipe => (
                                    <SelectItem key={recipe.id} value={recipe.id}>
                                        {recipe.name} ({recipe.ingredients?.length || 0} Zutaten)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Card>
                )}

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Eingabe */}
                    <div className="space-y-6">
                        {/* Artikel auswählen */}
                        <Card className="p-6 bg-slate-800 border-slate-700">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center">
                                    <Package className="w-5 h-5 text-amber-400" />
                                </div>
                                <h2 className="text-lg font-semibold text-white">Artikel wählen</h2>
                            </div>

                            <div className="space-y-3">
                                 <div className="relative">
                                     <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                     <Input
                                         value={searchTerm}
                                         onChange={(e) => setSearchTerm(e.target.value)}
                                         placeholder="Artikel suchen oder eingeben..."
                                         className="pl-10 bg-slate-900 border-slate-600 text-white"
                                         list="price-calc-articles"
                                     />
                                     <datalist id="price-calc-articles">
                                         {articles.filter(a => a.purchase_price).map(article => (
                                             <option key={article.id} value={article.name} />
                                         ))}
                                     </datalist>
                                 </div>

                                 {searchTerm && filteredArticles.length > 0 && (
                                     <div className="max-h-64 overflow-y-auto border border-slate-700 rounded-lg bg-slate-900">
                                         {filteredArticles.map(article => (
                                             <button
                                                 key={article.id}
                                                 onClick={() => handleArticleSelect(article)}
                                                 className="w-full text-left px-4 py-3 border-b border-slate-800 hover:bg-slate-800 transition-colors last:border-b-0"
                                             >
                                                 <p className="text-sm text-white font-medium">{article.name}</p>
                                                 <p className="text-xs text-slate-400 mt-0.5">
                                                     {article.purchase_price?.toFixed(2)} € · {article.content_amount}{article.content_unit || 'Stück'}
                                                 </p>
                                             </button>
                                         ))}
                                     </div>
                                 )}

                                 {searchTerm && filteredArticles.length === 0 && (
                                     <p className="text-xs text-slate-400 text-center py-3">Keine Artikel gefunden</p>
                                 )}
                            </div>
                        </Card>

                        {/* Zutaten Liste */}
                        <Card className="p-6 bg-slate-800 border-slate-700">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                                    <Calculator className="w-5 h-5 text-blue-400" />
                                </div>
                                <h2 className="text-lg font-semibold text-white">Zutaten</h2>
                            </div>

                            {ingredients.length > 0 ? (
                                <div className="space-y-3">
                                    {ingredients.map(ing => (
                                        <div key={ing.id} className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="text-sm text-white font-medium">{ing.article.name}</p>
                                                    <p className="text-xs text-slate-400">
                                                        {ing.article.purchase_price?.toFixed(2)} € pro {ing.article.unit || 'Einheit'}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeIngredient(ing.id)}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 w-6 p-0"
                                                >
                                                    ×
                                                </Button>
                                            </div>
                                            <Input
                                                type="number"
                                                value={ing.amount}
                                                onChange={(e) => updateIngredient(ing.id, 'amount', e.target.value)}
                                                placeholder="Menge (ml/g)"
                                                className="bg-slate-800 border-slate-600 text-white text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 text-center py-4">
                                    Noch keine Zutaten hinzugefügt
                                </p>
                            )}
                        </Card>

                        {/* Parameter */}
                        <Card className="p-6 bg-slate-800 border-slate-700">
                            <h3 className="text-sm font-semibold text-white mb-4">Kalkulation</h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Aufschlag (Multiplikator)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={margin}
                                        onChange={(e) => setMargin(e.target.value)}
                                        placeholder="z.B. 3"
                                        className="bg-slate-900 border-slate-600 text-white"
                                    />
                                    <p className="text-xs text-slate-400">EK × Aufschlag = Netto-Preis</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">MwSt. (%)</Label>
                                    <Select value={vatRate} onValueChange={setVatRate}>
                                        <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="19">19% (Normal)</SelectItem>
                                            <SelectItem value="7">7% (Ermäßigt)</SelectItem>
                                            <SelectItem value="0">0% (Steuerfrei)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Ergebnis */}
                    <div className="space-y-6">
                        <Card className="p-6 bg-gradient-to-br from-amber-900/30 to-amber-800/20 border-amber-700">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-lg font-semibold text-white">Empfohlener Preis</h2>
                            </div>

                            {ingredients.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="text-center py-6 border-b border-amber-700/50">
                                        <p className="text-sm text-amber-400 mb-2">Verkaufspreis (brutto)</p>
                                        <p className="text-5xl font-bold text-white">
                                            {prices.sellingPriceGross.toFixed(2)} €
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-900/50 rounded-lg p-4">
                                            <p className="text-xs text-slate-400 mb-1">Gesamtkosten (EK)</p>
                                            <p className="text-xl font-semibold text-white">
                                                {prices.totalCost.toFixed(2)} €
                                            </p>
                                        </div>

                                        <div className="bg-slate-900/50 rounded-lg p-4">
                                            <p className="text-xs text-slate-400 mb-1">Netto-Preis</p>
                                            <p className="text-xl font-semibold text-white">
                                                {prices.sellingPriceNet.toFixed(2)} €
                                            </p>
                                        </div>

                                        <div className="bg-slate-900/50 rounded-lg p-4">
                                            <p className="text-xs text-slate-400 mb-1">MwSt-Betrag</p>
                                            <p className="text-xl font-semibold text-blue-400">
                                                +{prices.vatAmount.toFixed(2)} €
                                            </p>
                                        </div>

                                        <div className="bg-slate-900/50 rounded-lg p-4">
                                            <p className="text-xs text-slate-400 mb-1">Gewinn</p>
                                            <p className="text-xl font-semibold text-green-400">
                                                +{prices.profit.toFixed(2)} €
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                                        <p className="text-sm text-blue-400 font-medium mb-2">Zutatenübersicht</p>
                                        <div className="space-y-1 text-xs text-blue-300">
                                            {ingredients.map(ing => {
                                                const amount = parseFloat(ing.amount) || 0;
                                                let contentInMl = ing.article.content_amount || 1000;
                                                if (ing.article.content_unit === 'l') {
                                                    contentInMl = ing.article.content_amount * 1000;
                                                } else if (ing.article.content_unit === 'kg') {
                                                    contentInMl = ing.article.content_amount * 1000;
                                                }
                                                const cost = (ing.article.purchase_price / contentInMl) * amount;
                                                return (
                                                    <p key={ing.id}>
                                                        {ing.article.name}: {amount}ml → {cost.toFixed(2)} €
                                                    </p>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-400">
                                    <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Füge Zutaten hinzu,<br />um die Kalkulation zu starten</p>
                                </div>
                            )}
                        </Card>

                        {/* Schnellvergleich */}
                        {ingredients.length > 0 && (
                            <Card className="p-6 bg-slate-800 border-slate-700">
                                <h3 className="text-sm font-semibold text-white mb-3">Aufschlag-Vergleich</h3>
                                <div className="space-y-2">
                                    {[2.5, 3, 3.3, 3.5, 3.8, 4].map(m => {
                                        const nettoTest = prices.totalCost * m;
                                        const testPrice = nettoTest + (nettoTest * parseFloat(vatRate) / 100);
                                        return (
                                            <button
                                                key={m}
                                                onClick={() => setMargin(m.toString())}
                                                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                                                    margin === m.toString() 
                                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 shadow-lg shadow-amber-500/20' 
                                                        : 'bg-slate-900/50 text-slate-300 hover:bg-slate-800/50 border border-slate-700/50'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium">×{m.toFixed(1)}</span>
                                                    <span className="text-sm font-semibold">{testPrice.toFixed(2)} €</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}