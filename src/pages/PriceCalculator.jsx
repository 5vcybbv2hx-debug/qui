/**
 * PriceCalculator — verbunden mit Artikeln, Rezepten und Getränkekarte
 *
 * Verbesserungen:
 *  - Sticky-Preis-Footer (immer sichtbar)
 *  - Rückwärts-Modus: Zielpreis → Wareneinsatz
 *  - Fehlende EK-Warnung
 *  - Name-Feld direkt bei Rezept-Auswahl
 *  - Zutaten-UX: Menge direkt beim Hinzufügen
 *  - Klare Erklärung Multiplikator / Szenarien
 */
import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calculator, Search, Package, Wine, Plus, ArrowRight,
    CheckCircle, Info, AlertTriangle, X, ArrowLeftRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import SmartCombobox from '@/components/ui/SmartCombobox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) { return (n ?? 0).toFixed(2); }

/** Preis auf nächste 0,10 € runden */
function roundPrice(n) {
    if (n == null) return null;
    return Math.round(n * 10) / 10;
}

function contentToBase(article) {
    if (!article?.content_amount) return null;
    const u = (article.content_unit || 'ml').toLowerCase();
    if (u === 'l' || u === 'kg') return article.content_amount * 1000;
    return article.content_amount;
}

function ingredientToBase(amount, unit) {
    const a = parseFloat(amount) || 0;
    switch ((unit || 'ml').toLowerCase()) {
        case 'cl':    return a * 10;
        case 'l':     return a * 1000;
        case 'kg':    return a * 1000;
        case 'stk':
        case 'stück': return a;
        default:      return a;
    }
}

function calcIngredientCost(article, amount, unit) {
    if (!article?.purchase_price || !amount) return 0;
    const base = contentToBase(article);
    const u = (unit || 'ml').toLowerCase();
    if (u === 'stk' || u === 'stück') {
        return article.purchase_price * (parseFloat(amount) || 0);
    }
    if (!base) return 0;
    return (article.purchase_price / base) * ingredientToBase(amount, unit);
}

// ── Szenarien ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
    { label: 'Günstig',  foodCostPct: 35, color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30' },
    { label: 'Standard', foodCostPct: 28, color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30' },
    { label: 'Premium',  foodCostPct: 20, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
];

// ── Sticky Ergebnis-Footer ────────────────────────────────────────────────────
function StickyPriceFooter({ label, grossPrice, costPrice, foodCostPct, visible }) {
    if (!visible || grossPrice == null) return null;
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border shadow-lg px-4 py-3">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
                    <p className="text-xs text-muted-foreground">
                        EK {fmt(costPrice)} € · Wareneinsatz {foodCostPct?.toFixed(1)}%
                    </p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Verkaufspreis</p>
                    <p className="text-2xl font-bold text-amber-500">{fmt(grossPrice)} €</p>
                </div>
            </div>
        </div>
    );
}

// ── Einzelartikel-Modus ───────────────────────────────────────────────────────
function SingleMode({ articles, onResult }) {
    const queryClient = useQueryClient();
    const navigate    = useNavigate();
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [portionMl,  setPortionMl]  = useState('40');
    const [foodCostPct, setFoodCostPct] = useState('28');
    const [vatRate,    setVatRate]    = useState('19');
    const [targetPrice, setTargetPrice] = useState('');
    const [reverseMode, setReverseMode] = useState(false);
    const [saving,     setSaving]     = useState(false);

    const articleNames = useMemo(() => articles.map(a => a.name), [articles]);

    const { data: menuItems = [] } = useQuery({
        queryKey: ['menu-items'],
        queryFn: () => base44.entities.MenuItem.list('name', 500),
    });

    const selectByName = name => setSelectedArticle(articles.find(x => x.name === name) || null);

    const linkedMenuItems = useMemo(() => {
        if (!selectedArticle) return [];
        return menuItems.filter(m => {
            const ids = m.linked_article_ids?.length
                ? m.linked_article_ids
                : m.linked_article_id ? [m.linked_article_id] : [];
            return ids.includes(selectedArticle.id);
        });
    }, [menuItems, selectedArticle]);

    // Kalkulation
    const totalBase       = selectedArticle ? contentToBase(selectedArticle) : null;
    const portionNum      = parseFloat(portionMl) || 0;
    const portions        = (totalBase && portionNum > 0) ? totalBase / portionNum : null;
    const ekTotal         = selectedArticle?.purchase_price ?? null;
    const costPerPortion  = (ekTotal != null && portions) ? ekTotal / portions : null;
    const fcPct           = parseFloat(foodCostPct) || 28;
    const vat             = parseFloat(vatRate) || 0;

    // Vorwärts: Kosten → Preis
    const sellNet         = costPerPortion != null ? (costPerPortion / fcPct) * 100 : null;
    const sellGross       = sellNet != null ? roundPrice(sellNet * (1 + vat / 100)) : null;
    const profit          = sellNet != null && costPerPortion != null ? sellNet - costPerPortion : null;
    const actualFoodCost  = (costPerPortion != null && sellNet != null && sellNet > 0)
        ? (costPerPortion / sellNet) * 100 : null;

    // Rückwärts: Zielpreis → Wareneinsatz
    const targetNum       = parseFloat(targetPrice) || 0;
    const targetNet       = targetNum / (1 + vat / 100);
    const reverseFoodCost = (costPerPortion != null && targetNet > 0)
        ? (costPerPortion / targetNet) * 100 : null;
    const reverseProfit   = costPerPortion != null ? targetNet - costPerPortion : null;

    const displayGross    = reverseMode ? (targetNum ? roundPrice(targetNum) : null) : sellGross;
    const displayCost     = costPerPortion;
    const displayFoodCost = reverseMode ? reverseFoodCost : actualFoodCost;

    useEffect(() => {
        onResult({ grossPrice: displayGross, costPrice: displayCost, foodCostPct: displayFoodCost, label: selectedArticle?.name || '' });
    }, [displayGross, displayCost, displayFoodCost, selectedArticle]);

    const handleSaveToMenuItem = async (menuItem) => {
        if (displayGross == null) return;
        setSaving(true);
        try {
            await base44.entities.MenuItem.update(menuItem.id, {
                price: parseFloat(fmt(displayGross)),
                purchase_price: costPerPortion != null ? parseFloat(fmt(costPerPortion)) : undefined,
            });
            queryClient.invalidateQueries({ queryKey: ['menu-items'] });
            toast.success(`Preis ${fmt(displayGross)} € in „${menuItem.name}" übernommen`);
        } catch (e) {
            toast.error('Fehler: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4 pb-28">
            {/* Artikel */}
            <Card className="p-5 bg-card border-border space-y-3">
                <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-400" />
                    <h3 className="font-semibold text-foreground text-sm">Artikel wählen</h3>
                </div>
                <SmartCombobox
                    value={selectedArticle?.name || ''}
                    onChange={selectByName}
                    options={articleNames}
                    placeholder="Artikel suchen…"
                    allowCreate={false}
                />
                {selectedArticle && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {selectedArticle.purchase_price ? (
                            <Badge variant="secondary">EK: {fmt(selectedArticle.purchase_price)} €</Badge>
                        ) : (
                            <Badge className="bg-red-500/12 text-red-400 border-red-500/25 gap-1">
                                <AlertTriangle className="w-3 h-3" />Kein EK hinterlegt
                            </Badge>
                        )}
                        {selectedArticle.content_amount && (
                            <Badge variant="outline">
                                {selectedArticle.content_amount} {selectedArticle.content_unit || 'ml'}
                            </Badge>
                        )}
                        {!selectedArticle.content_amount && (
                            <Badge className="bg-orange-500/12 text-orange-400 border-orange-500/25 gap-1">
                                <AlertTriangle className="w-3 h-3" />Keine Inhaltsmenge
                            </Badge>
                        )}
                    </div>
                )}
            </Card>

            {/* Kalkulation */}
            <Card className="p-5 bg-card border-border space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-blue-400" />
                        <h3 className="font-semibold text-foreground text-sm">Kalkulation</h3>
                    </div>
                    {/* Vorwärts / Rückwärts Toggle */}
                    <button onClick={() => setReverseMode(r => !r)}
                        className={cn(
                            'flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-all',
                            reverseMode
                                ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                                : 'border-border text-muted-foreground hover:text-foreground'
                        )}>
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        {reverseMode ? 'Rückwärts' : 'Vorwärts'}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Portionsgröße (ml/g)</Label>
                        <Input type="number" value={portionMl}
                            onChange={e => setPortionMl(e.target.value)}
                            placeholder="z.B. 40" className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">MwSt.</Label>
                        <Select value={vatRate} onValueChange={setVatRate}>
                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="19">19% (Außer-Haus)</SelectItem>
                                <SelectItem value="7">7% (Inhouse)</SelectItem>
                                <SelectItem value="0">0%</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Vorwärts: Wareneinsatz-Slider */}
                {!reverseMode && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">
                                Wareneinsatz — Gastro-Standard 20–35%
                            </Label>
                            <span className="text-sm font-bold text-amber-500">{foodCostPct}%</span>
                        </div>
                        <input type="range" min="10" max="60" value={foodCostPct}
                            onChange={e => setFoodCostPct(e.target.value)}
                            className="w-full accent-amber-500" />
                        {/* Szenarien */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                            {SCENARIOS.map(s => (
                                <button key={s.label}
                                    onClick={() => setFoodCostPct(String(s.foodCostPct))}
                                    className={cn(
                                        'rounded-xl p-2.5 text-center border transition-all',
                                        String(foodCostPct) === String(s.foodCostPct)
                                            ? s.bg : 'bg-secondary/20 border-border hover:bg-secondary/50'
                                    )}>
                                    <p className={cn('text-[10px] font-semibold', String(foodCostPct) === String(s.foodCostPct) ? s.color : 'text-muted-foreground')}>
                                        {s.label}
                                    </p>
                                    <p className="text-xs font-bold text-foreground">{s.foodCostPct}%</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Rückwärts: Zielpreis eingeben */}
                {reverseMode && (
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                            Zielpreis (brutto) — Wareneinsatz wird berechnet
                        </Label>
                        <div className="relative">
                            <Input type="number" step="0.10" value={targetPrice}
                                onChange={e => setTargetPrice(e.target.value)}
                                placeholder="z.B. 8.90" className="h-11 pr-8" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">€</span>
                        </div>
                    </div>
                )}
            </Card>

            {/* Ergebnis */}
            {selectedArticle && costPerPortion != null && (
                <Card className="p-5 bg-card border-border space-y-4">
                    {/* Hauptpreis */}
                    <div className={cn(
                        'rounded-xl p-4 text-center',
                        reverseMode && reverseFoodCost != null
                            ? reverseFoodCost > 40
                                ? 'bg-red-500/10 border border-red-500/30'
                                : reverseFoodCost > 30
                                    ? 'bg-amber-500/10 border border-amber-500/30'
                                    : 'bg-green-500/10 border border-green-500/30'
                            : 'bg-amber-500/10 border border-amber-500/30'
                    )}>
                        {reverseMode ? (
                            <>
                                <p className="text-xs text-muted-foreground mb-1">Wareneinsatz bei {fmt(targetNum)} € Zielpreis</p>
                                <p className="text-4xl font-bold text-foreground">
                                    {reverseFoodCost != null ? `${reverseFoodCost.toFixed(1)}%` : '—'}
                                </p>
                                {reverseFoodCost != null && (
                                    <p className={cn('text-xs mt-1 font-medium',
                                        reverseFoodCost > 40 ? 'text-red-400' : reverseFoodCost > 30 ? 'text-amber-400' : 'text-green-400')}>
                                        {reverseFoodCost > 40 ? '⚠ Zu hoch — Verlust möglich'
                                            : reverseFoodCost > 30 ? 'Akzeptabel'
                                            : '✓ Sehr gut'}
                                    </p>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="text-xs text-amber-400 mb-1">Empfohlener Verkaufspreis (brutto)</p>
                                <p className="text-4xl font-bold text-foreground">{fmt(sellGross)} €</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Wareneinsatz: {actualFoodCost?.toFixed(1)}%
                                </p>
                            </>
                        )}
                    </div>

                    {/* Kennzahlen */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-secondary/40 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-muted-foreground mb-1">EK / Portion</p>
                            <p className="text-sm font-bold text-foreground">{fmt(costPerPortion)} €</p>
                        </div>
                        <div className="bg-secondary/40 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-muted-foreground mb-1">Portionen</p>
                            <p className="text-sm font-bold text-foreground">{portions?.toFixed(1)}</p>
                        </div>
                        <div className="bg-secondary/40 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-muted-foreground mb-1">Gewinn netto</p>
                            <p className="text-sm font-bold text-green-400">
                                +{fmt(reverseMode ? reverseProfit : profit)} €
                            </p>
                        </div>
                    </div>

                    {/* Übernahme in Getränkekarte */}
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            In Getränkekarte übernehmen
                        </p>
                        {linkedMenuItems.length > 0 ? (
                            <div className="space-y-2">
                                {linkedMenuItems.map(m => (
                                    <div key={m.id} className="flex items-center justify-between bg-secondary/30 rounded-xl px-4 py-3 gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                                            <p className="text-xs text-muted-foreground">Aktuell: {fmt(m.price)} €</p>
                                        </div>
                                        <Button size="sm" onClick={() => handleSaveToMenuItem(m)}
                                            disabled={saving || displayGross == null}
                                            className="shrink-0 h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            {fmt(displayGross)} € setzen
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center bg-secondary/20 rounded-xl p-4">
                                <p className="text-sm text-muted-foreground mb-2">
                                    Kein verknüpftes Getränk gefunden.
                                </p>
                                <Button variant="outline" size="sm"
                                    onClick={() => navigate(createPageUrl('DrinkMenu'))}>
                                    <ArrowRight className="w-4 h-4 mr-1.5" />
                                    Zur Getränkekarte
                                </Button>
                            </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-2 flex items-start gap-1">
                            <Info className="w-3 h-3 mt-0.5 shrink-0" />
                            Einkaufspreis des Artikels wird dabei nicht verändert.
                        </p>
                    </div>
                </Card>
            )}

            {/* Kein EK / keine Inhaltsmenge */}
            {selectedArticle && costPerPortion == null && (
                <Card className="p-5 bg-card border-border text-center space-y-2">
                    <AlertTriangle className="w-8 h-8 text-orange-400 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">Kalkulation nicht möglich</p>
                    <p className="text-xs text-muted-foreground">
                        {!selectedArticle.purchase_price
                            ? 'Kein Einkaufspreis beim Artikel hinterlegt.'
                            : 'Keine Inhaltsmenge beim Artikel hinterlegt (z.B. 700 ml).'}
                    </p>
                    <Button variant="outline" size="sm"
                        onClick={() => navigate(createPageUrl('Articles'))}>
                        <ArrowRight className="w-3.5 h-3.5 mr-1.5" />Artikel bearbeiten
                    </Button>
                </Card>
            )}
        </div>
    );
}

// ── Cocktail / Rezept-Modus ───────────────────────────────────────────────────
function CocktailMode({ articles, recipes, onResult }) {
    const queryClient = useQueryClient();
    const navigate    = useNavigate();

    const [ingredients,    setIngredients]    = useState([]);
    const [margin,         setMargin]         = useState('3');
    const [vatRate,        setVatRate]        = useState('19');
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [menuItemName,   setMenuItemName]   = useState('');
    const [searchTerm,     setSearchTerm]     = useState('');
    const [targetPrice,    setTargetPrice]    = useState('');
    const [reverseMode,    setReverseMode]    = useState(false);

    // Inline Zutat-Add: Menge direkt beim Hinzufügen
    const [pendingArticle, setPendingArticle] = useState(null);
    const [pendingAmount,  setPendingAmount]  = useState('');
    const [pendingUnit,    setPendingUnit]    = useState('ml');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const recipeId = urlParams.get('recipe');
        if (recipeId && recipes.length > 0) {
            const recipe = recipes.find(r => r.id === recipeId);
            if (recipe) loadRecipe(recipe);
        }
    }, [recipes]);

    const createMenuItemMutation = useMutation({
        mutationFn: data => base44.entities.MenuItem.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['menu-items'] });
            toast.success('Zur Getränkekarte hinzugefügt');
            navigate(createPageUrl('DrinkMenu'));
        },
        onError: e => toast.error('Fehler: ' + e.message),
    });

    const loadRecipe = recipe => {
        if (!recipe || !Array.isArray(recipe.ingredients)) return;
        const newIngredients = recipe.ingredients.map((ing, idx) => {
            const article = articles.find(a => a.id === ing.article_id);
            return { id: Date.now() + idx, article: article || { name: ing.article_name, purchase_price: 0 }, amount: ing.amount || '', unit: ing.unit || 'ml' };
        }).filter(ing => ing.article);
        setIngredients(newIngredients);
        setSelectedRecipe(recipe);
        setMenuItemName(recipe.name || '');
    };

    const filteredArticles = articles.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) && a.purchase_price
    );

    const totalCost = ingredients.reduce((sum, ing) =>
        sum + calcIngredientCost(ing.article, ing.amount, ing.unit), 0);

    const derivedAllergens = [...new Set(ingredients.flatMap(ing => ing.article?.allergens_list || []))];
    const derivedAdditives = [...new Set(ingredients.flatMap(ing => ing.article?.additives || []))];

    const vat         = parseFloat(vatRate) || 0;
    const m           = parseFloat(margin) || 1;
    const netPrice    = totalCost * m;
    const grossPrice  = roundPrice(netPrice * (1 + vat / 100));
    const profit      = netPrice - totalCost;
    const foodCostPct = netPrice > 0 ? (totalCost / netPrice) * 100 : 0;

    // Rückwärts
    const targetNum       = parseFloat(targetPrice) || 0;
    const targetNet       = targetNum / (1 + vat / 100);
    const reverseFoodCost = targetNet > 0 ? (totalCost / targetNet) * 100 : null;
    const reverseProfit   = targetNet - totalCost;

    const displayGross    = reverseMode ? (targetNum ? roundPrice(targetNum) : null) : (ingredients.length > 0 ? grossPrice : null);
    const displayFoodCost = reverseMode ? reverseFoodCost : (ingredients.length > 0 ? foodCostPct : null);

    useEffect(() => {
        onResult({ grossPrice: displayGross, costPrice: totalCost, foodCostPct: displayFoodCost, label: menuItemName || selectedRecipe?.name || '' });
    }, [displayGross, totalCost, displayFoodCost, menuItemName]);

    const confirmAddIngredient = () => {
        if (!pendingArticle || !pendingAmount) return;
        setIngredients(prev => [...prev, { id: Date.now(), article: pendingArticle, amount: pendingAmount, unit: pendingUnit }]);
        setPendingArticle(null);
        setPendingAmount('');
        setPendingUnit('ml');
        setSearchTerm('');
    };

    return (
        <div className="space-y-4 pb-28">
            {/* Rezept laden + Name */}
            {recipes.length > 0 && (
                <Card className="p-5 bg-card border-border space-y-3">
                    <div className="flex items-center gap-2">
                        <Wine className="w-4 h-4 text-purple-400" />
                        <h3 className="font-semibold text-foreground text-sm">Rezept laden (optional)</h3>
                    </div>
                    <Select value={selectedRecipe?.id || ''}
                        onValueChange={id => { const r = recipes.find(x => x.id === id); if (r) loadRecipe(r); }}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Rezept wählen…" /></SelectTrigger>
                        <SelectContent>
                            {recipes.filter(r => Array.isArray(r.ingredients) && r.ingredients.length > 0).map(r => (
                                <SelectItem key={r.id} value={r.id}>
                                    {r.name} ({r.ingredients?.length} Zutaten)
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {/* Name direkt hier */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Name für Getränkekarte *</Label>
                        <Input value={menuItemName} onChange={e => setMenuItemName(e.target.value)}
                            placeholder="z.B. Mojito Classic" className="h-11" />
                    </div>
                </Card>
            )}

            {/* Zutat hinzufügen */}
            <Card className="p-5 bg-card border-border space-y-3">
                <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-400" />
                    <h3 className="font-semibold text-foreground text-sm">Zutat hinzufügen</h3>
                </div>

                {/* Inline Pending-Zutat */}
                {pendingArticle ? (
                    <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground">{pendingArticle.name}</p>
                            <button onClick={() => { setPendingArticle(null); setPendingAmount(''); }}
                                className="text-muted-foreground hover:text-foreground p-1">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <Input type="number" autoFocus
                                value={pendingAmount} onChange={e => setPendingAmount(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && confirmAddIngredient()}
                                placeholder="Menge" className="h-10 flex-1 text-sm" />
                            <Select value={pendingUnit} onValueChange={setPendingUnit}>
                                <SelectTrigger className="h-10 w-24 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['ml', 'cl', 'l', 'g', 'kg', 'Stück'].map(u => (
                                        <SelectItem key={u} value={u}>{u}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button size="sm" onClick={confirmAddIngredient}
                            disabled={!pendingAmount}
                            className="w-full h-9 bg-amber-600 hover:bg-amber-700 text-white text-xs">
                            <Plus className="w-3.5 h-3.5 mr-1.5" />Hinzufügen
                        </Button>
                    </div>
                ) : (
                    <>
                        <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Artikel suchen…" className="h-10" />
                        {searchTerm && filteredArticles.length > 0 && (
                            <div className="rounded-xl border border-border overflow-hidden">
                                {filteredArticles.slice(0, 6).map(a => (
                                    <button key={a.id}
                                        onClick={() => { setPendingArticle(a); setSearchTerm(''); }}
                                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors border-b border-border/40 last:border-0 min-h-[48px]">
                                        <span className="text-sm font-medium text-foreground">{a.name}</span>
                                        <span className="text-xs text-muted-foreground">{fmt(a.purchase_price)} €</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {searchTerm && filteredArticles.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">
                                Kein Artikel mit EK gefunden
                            </p>
                        )}
                    </>
                )}
            </Card>

            {/* Zutaten-Liste */}
            {ingredients.length > 0 && (
                <Card className="p-5 bg-card border-border space-y-2">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-foreground text-sm">
                            Zutaten <span className="text-muted-foreground font-normal">({ingredients.length})</span>
                        </h3>
                        <p className="text-xs text-muted-foreground">EK gesamt: <span className="font-bold text-foreground">{fmt(totalCost)} €</span></p>
                    </div>
                    {ingredients.map(ing => {
                        const cost = calcIngredientCost(ing.article, ing.amount, ing.unit);
                        return (
                            <div key={ing.id} className="flex items-center gap-2 bg-secondary/30 rounded-xl px-3 py-2.5">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">{ing.article.name}</p>
                                    {cost > 0 && <p className="text-[10px] text-muted-foreground">{fmt(cost)} €</p>}
                                </div>
                                <Input type="number" value={ing.amount}
                                    onChange={e => setIngredients(prev => prev.map(x => x.id === ing.id ? { ...x, amount: e.target.value } : x))}
                                    className="h-8 w-16 text-xs text-center px-1" />
                                <Select value={ing.unit}
                                    onValueChange={u => setIngredients(prev => prev.map(x => x.id === ing.id ? { ...x, unit: u } : x))}>
                                    <SelectTrigger className="h-8 w-16 text-xs px-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['ml', 'cl', 'l', 'g', 'kg', 'Stück'].map(u => (
                                            <SelectItem key={u} value={u}>{u}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <button onClick={() => setIngredients(prev => prev.filter(x => x.id !== ing.id))}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1 min-w-[32px] min-h-[32px] flex items-center justify-center">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        );
                    })}
                </Card>
            )}

            {/* Kalkulation */}
            {ingredients.length > 0 && (
                <Card className="p-5 bg-card border-border space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-blue-400" />
                            <h3 className="font-semibold text-foreground text-sm">Kalkulation</h3>
                        </div>
                        <button onClick={() => setReverseMode(r => !r)}
                            className={cn(
                                'flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-all',
                                reverseMode ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : 'border-border text-muted-foreground hover:text-foreground'
                            )}>
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            {reverseMode ? 'Rückwärts' : 'Vorwärts'}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {!reverseMode && (
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                    Multiplikator <span className="text-muted-foreground/60">(÷ Wareneinsatz%)</span>
                                </Label>
                                <Input type="number" step="0.1" value={margin}
                                    onChange={e => setMargin(e.target.value)}
                                    placeholder="z.B. 3.5" className="h-11" />
                                <p className="text-[10px] text-muted-foreground">
                                    ×3 = 33% · ×4 = 25% · ×5 = 20%
                                </p>
                            </div>
                        )}
                        {reverseMode && (
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Zielpreis (brutto)</Label>
                                <div className="relative">
                                    <Input type="number" step="0.10" value={targetPrice}
                                        onChange={e => setTargetPrice(e.target.value)}
                                        placeholder="z.B. 9.90" className="h-11 pr-8" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                                </div>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">MwSt.</Label>
                            <Select value={vatRate} onValueChange={setVatRate}>
                                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="19">19% (Außer-Haus)</SelectItem>
                                    <SelectItem value="7">7% (Inhouse)</SelectItem>
                                    <SelectItem value="0">0%</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Szenarien (nur Vorwärts) */}
                    {!reverseMode && (
                        <div className="grid grid-cols-3 gap-2">
                            {SCENARIOS.map(s => {
                                const mv = 100 / s.foodCostPct;
                                const gp = roundPrice(totalCost * mv * (1 + vat / 100));
                                const active = Math.abs(parseFloat(margin) - mv) < 0.05;
                                return (
                                    <button key={s.label}
                                        onClick={() => setMargin(mv.toFixed(2))}
                                        className={cn(
                                            'rounded-xl p-2.5 text-center border transition-all',
                                            active ? s.bg : 'bg-secondary/20 border-border hover:bg-secondary/40'
                                        )}>
                                        <p className={cn('text-[10px] font-semibold', active ? s.color : 'text-muted-foreground')}>{s.label}</p>
                                        <p className="text-xs font-bold text-foreground">{fmt(gp)} €</p>
                                        <p className={cn('text-[10px]', active ? s.color : 'text-muted-foreground/60')}>{s.foodCostPct}%</p>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Ergebnis */}
                    <div className={cn(
                        'rounded-xl p-4 text-center',
                        reverseMode && reverseFoodCost != null
                            ? reverseFoodCost > 40 ? 'bg-red-500/10 border border-red-500/30'
                            : reverseFoodCost > 30 ? 'bg-amber-500/10 border border-amber-500/30'
                            : 'bg-green-500/10 border border-green-500/30'
                            : 'bg-amber-500/10 border border-amber-500/30'
                    )}>
                        {reverseMode ? (
                            <>
                                <p className="text-xs text-muted-foreground mb-1">Wareneinsatz bei {fmt(targetNum)} € Zielpreis</p>
                                <p className="text-4xl font-bold text-foreground">
                                    {reverseFoodCost != null ? `${reverseFoodCost.toFixed(1)}%` : '—'}
                                </p>
                                {reverseFoodCost != null && (
                                    <p className={cn('text-xs mt-1 font-medium',
                                        reverseFoodCost > 40 ? 'text-red-400' : reverseFoodCost > 30 ? 'text-amber-400' : 'text-green-400')}>
                                        {reverseFoodCost > 40 ? '⚠ Zu hoch' : reverseFoodCost > 30 ? 'Akzeptabel' : '✓ Sehr gut'}
                                        {' · Gewinn: +'}{fmt(reverseProfit)} €
                                    </p>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="text-xs text-amber-400 mb-1">Verkaufspreis (brutto)</p>
                                <p className="text-4xl font-bold text-foreground">{fmt(grossPrice)} €</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Wareneinsatz: {foodCostPct.toFixed(1)}% · Gewinn: +{fmt(profit)} €
                                </p>
                            </>
                        )}
                    </div>

                    {/* Zur Getränkekarte */}
                    <Button
                        onClick={() => {
                            if (!menuItemName.trim()) { toast.error('Name fehlt'); return; }
                            createMenuItemMutation.mutate({
                                name: menuItemName,
                                price: parseFloat(fmt(reverseMode ? targetNum : grossPrice)),
                                purchase_price: parseFloat(fmt(totalCost)),
                                category: selectedRecipe?.category || 'Cocktails',
                                linked_recipe_id: selectedRecipe?.id || undefined,
                                allergens_list: derivedAllergens,
                                additives: derivedAdditives,
                                is_available: true,
                            });
                        }}
                        disabled={!menuItemName.trim() || createMenuItemMutation.isPending || ingredients.length === 0}
                        className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                        <Plus className="w-4 h-4 mr-2" />
                        {menuItemName.trim() ? `„${menuItemName}" zur Getränkekarte` : 'Zur Getränkekarte hinzufügen'}
                    </Button>
                </Card>
            )}
        </div>
    );
}

// ── Hauptseite ────────────────────────────────────────────────────────────────
export default function PriceCalculator() {
    const permissions = usePermissions();
    const [mode, setMode]       = useState('single');
    const [result, setResult]   = useState({ grossPrice: null, costPrice: null, foodCostPct: null, label: '' });

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn:  () => base44.entities.Article.list('name'),
    });
    const { data: recipes = [] } = useQuery({
        queryKey: ['recipes'],
        queryFn:  () => base44.entities.Recipe.list('name'),
    });

    if (permissions.isLoading) return null;
    if (!permissions.canViewPriceCalculator) {
        return <PermissionDenied message="Nur Administratoren haben Zugriff auf die Preiskalkulation." />;
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-5">
                    <h1 className="text-xl font-bold text-foreground">Preisrechner</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Artikel → Kalkulation → Getränkekarte
                    </p>
                </div>

                {/* Tab-Switcher */}
                <div className="flex gap-1 p-1 bg-secondary/40 rounded-xl mb-5 border border-border">
                    <button onClick={() => setMode('single')}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
                            mode === 'single' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}>
                        <Package className="w-4 h-4" />Einzelartikel
                    </button>
                    <button onClick={() => setMode('cocktail')}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
                            mode === 'cocktail' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}>
                        <Wine className="w-4 h-4" />Cocktail / Rezept
                    </button>
                </div>

                {mode === 'single'
                    ? <SingleMode articles={articles} onResult={setResult} />
                    : <CocktailMode articles={articles} recipes={recipes} onResult={setResult} />
                }
            </div>

            {/* Sticky Footer */}
            <StickyPriceFooter
                label={result.label}
                grossPrice={result.grossPrice}
                costPrice={result.costPrice}
                foodCostPct={result.foodCostPct}
                visible={result.grossPrice != null}
            />
        </div>
    );
}
