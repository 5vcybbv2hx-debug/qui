import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Calculator, Search, TrendingUp, Package } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PriceCalculator() {
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [margin, setMargin] = useState('200');
    const [vatRate, setVatRate] = useState('19');
    const [portionSize, setPortionSize] = useState('');
    const [bottleSize, setBottleSize] = useState('700');

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('name')
    });

    const filteredArticles = articles.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) && a.purchase_price
    );

    const handleArticleSelect = (article) => {
        setSelectedArticle(article);
        setPurchasePrice(article.purchase_price?.toString() || '');
        setSearchTerm(article.name);
    };

    // Berechnungen
    const calculatePrices = () => {
        const purchase = parseFloat(purchasePrice) || 0;
        const marginPercent = parseFloat(margin) || 0;
        const vat = parseFloat(vatRate) || 0;
        const portion = parseFloat(portionSize) || 0;
        const bottle = parseFloat(bottleSize) || 0;

        // Kosten pro Portion (wenn Portionsgröße angegeben)
        const costPerPortion = portion > 0 && bottle > 0 
            ? (purchase / bottle) * portion 
            : purchase;

        // Verkaufspreis netto
        const sellingPriceNet = costPerPortion * (1 + marginPercent / 100);

        // Verkaufspreis brutto
        const sellingPriceGross = sellingPriceNet * (1 + vat / 100);

        // Gewinn
        const profit = sellingPriceNet - costPerPortion;
        const profitPercent = costPerPortion > 0 ? (profit / costPerPortion) * 100 : 0;

        return {
            costPerPortion,
            sellingPriceNet,
            sellingPriceGross,
            profit,
            profitPercent
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
                                        placeholder="Artikel suchen..."
                                        className="pl-10 bg-slate-900 border-slate-600 text-white"
                                    />
                                </div>

                                {searchTerm && filteredArticles.length > 0 && (
                                    <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-700 rounded-lg p-2 bg-slate-900">
                                        {filteredArticles.slice(0, 5).map(article => (
                                            <button
                                                key={article.id}
                                                onClick={() => handleArticleSelect(article)}
                                                className="w-full text-left px-3 py-2 rounded hover:bg-slate-700 transition-colors"
                                            >
                                                <p className="text-sm text-white font-medium">{article.name}</p>
                                                <p className="text-xs text-slate-400">
                                                    {article.purchase_price?.toFixed(2)} € · {article.unit}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {selectedArticle && (
                                    <div className="p-3 bg-amber-900/20 border border-amber-700 rounded-lg">
                                        <p className="text-sm text-amber-400 font-medium">{selectedArticle.name}</p>
                                        <p className="text-xs text-amber-500 mt-1">
                                            Einkauf: {selectedArticle.purchase_price?.toFixed(2)} €
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Parameter */}
                        <Card className="p-6 bg-slate-800 border-slate-700">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                                    <Calculator className="w-5 h-5 text-blue-400" />
                                </div>
                                <h2 className="text-lg font-semibold text-white">Kalkulation</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Netto-Einkaufspreis (€)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={purchasePrice}
                                        onChange={(e) => setPurchasePrice(e.target.value)}
                                        placeholder="z.B. 12.50"
                                        className="bg-slate-900 border-slate-600 text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Flaschengröße (ml)</Label>
                                        <Input
                                            type="number"
                                            value={bottleSize}
                                            onChange={(e) => setBottleSize(e.target.value)}
                                            placeholder="z.B. 700"
                                            className="bg-slate-900 border-slate-600 text-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Portion (ml)</Label>
                                        <Input
                                            type="number"
                                            value={portionSize}
                                            onChange={(e) => setPortionSize(e.target.value)}
                                            placeholder="z.B. 40"
                                            className="bg-slate-900 border-slate-600 text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Aufschlag (%)</Label>
                                    <Input
                                        type="number"
                                        value={margin}
                                        onChange={(e) => setMargin(e.target.value)}
                                        placeholder="z.B. 200"
                                        className="bg-slate-900 border-slate-600 text-white"
                                    />
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

                            {purchasePrice ? (
                                <div className="space-y-6">
                                    <div className="text-center py-6 border-b border-amber-700/50">
                                        <p className="text-sm text-amber-400 mb-2">Verkaufspreis (brutto)</p>
                                        <p className="text-5xl font-bold text-white">
                                            {prices.sellingPriceGross.toFixed(2)} €
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-900/50 rounded-lg p-4">
                                            <p className="text-xs text-slate-400 mb-1">Kosten</p>
                                            <p className="text-xl font-semibold text-white">
                                                {prices.costPerPortion.toFixed(2)} €
                                            </p>
                                        </div>

                                        <div className="bg-slate-900/50 rounded-lg p-4">
                                            <p className="text-xs text-slate-400 mb-1">Netto-Preis</p>
                                            <p className="text-xl font-semibold text-white">
                                                {prices.sellingPriceNet.toFixed(2)} €
                                            </p>
                                        </div>

                                        <div className="bg-slate-900/50 rounded-lg p-4">
                                            <p className="text-xs text-slate-400 mb-1">Gewinn</p>
                                            <p className="text-xl font-semibold text-green-400">
                                                +{prices.profit.toFixed(2)} €
                                            </p>
                                        </div>

                                        <div className="bg-slate-900/50 rounded-lg p-4">
                                            <p className="text-xs text-slate-400 mb-1">Marge</p>
                                            <p className="text-xl font-semibold text-green-400">
                                                {prices.profitPercent.toFixed(0)}%
                                            </p>
                                        </div>
                                    </div>

                                    {portionSize && bottleSize && (
                                        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                                            <p className="text-sm text-blue-400 font-medium mb-2">Portionsinfo</p>
                                            <div className="space-y-1 text-xs text-blue-300">
                                                <p>Portionen pro Flasche: {Math.floor(parseFloat(bottleSize) / parseFloat(portionSize))}</p>
                                                <p>Umsatz pro Flasche: {(prices.sellingPriceGross * Math.floor(parseFloat(bottleSize) / parseFloat(portionSize))).toFixed(2)} €</p>
                                                <p>Gewinn pro Flasche: {(prices.profit * Math.floor(parseFloat(bottleSize) / parseFloat(portionSize))).toFixed(2)} €</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-400">
                                    <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Gib einen Einkaufspreis ein,<br />um die Kalkulation zu starten</p>
                                </div>
                            )}
                        </Card>

                        {/* Schnellvergleich */}
                        {purchasePrice && (
                            <Card className="p-6 bg-slate-800 border-slate-700">
                                <h3 className="text-sm font-semibold text-white mb-3">Aufschlag-Vergleich</h3>
                                <div className="space-y-2">
                                    {[150, 200, 250, 300].map(m => {
                                        const testPrice = prices.costPerPortion * (1 + m / 100) * (1 + parseFloat(vatRate) / 100);
                                        return (
                                            <button
                                                key={m}
                                                onClick={() => setMargin(m.toString())}
                                                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                                                    margin === m.toString() 
                                                        ? 'bg-amber-600 text-white' 
                                                        : 'bg-slate-900 text-slate-300 hover:bg-slate-700'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium">{m}% Aufschlag</span>
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