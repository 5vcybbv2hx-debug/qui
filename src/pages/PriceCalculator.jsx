/**
 * PriceCalculator — verbunden mit Artikeln, Rezepten und Getränkekarte
 *
 * Architektur / Single Source of Truth:
 *  - Article.purchase_price = Einkaufspreis (NIEMALS vom Preisrechner überschreiben)
 *  - MenuItem.price         = Verkaufspreis in der Getränkekarte
 *  - MenuItem.purchase_price = berechneter/hinterlegter EK des Getränks (Kostenbasis)
 *  - PriceHistory           = nur für EK-Änderungen an Artikeln
 *
 * Preisrechner-Modi:
 *  - Einzelartikel: Portionskalkulation → Empfehlung → Übernahme in verknüpfte MenuItems
 *  - Cocktail/Rezept: Mehrzutaten-Kalkulation → Übernahme in Getränkekarte
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calculator, Search, TrendingUp, Package, Wine, Plus, Save,
    ArrowRight, CheckCircle, Link2, Info
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

/** Inhalt eines Artikels in ml (oder g) umrechnen */
function contentToBase(article) {
    if (!article?.content_amount) return null;
    const u = (article.content_unit || 'ml').toLowerCase();
    if (u === 'l' || u === 'kg') return article.content_amount * 1000;
    return article.content_amount; // ml, g, Stück
}

/** Zutaten-Menge in dieselbe Basis wie contentToBase umrechnen */
function ingredientToBase(amount, unit) {
    const a = parseFloat(amount) || 0;
    switch ((unit || 'ml').toLowerCase()) {
        case 'cl':   return a * 10;
        case 'l':    return a * 1000;
        case 'kg':   return a * 1000;
        case 'stk':
        case 'stück':return a; // wird separat behandelt
        default:     return a; // ml, g
    }
}

/** Kosten für eine Zutatenmenge aus einem Artikel berechnen */
function calcIngredientCost(article, amount, unit) {
    if (!article?.purchase_price || !amount) return 0;
    const base = contentToBase(article);
    const u = (unit || 'ml').toLowerCase();

    // Stückware: purchase_price pro Stück
    if (u === 'stk' || u === 'stück') {
        return article.purchase_price * (parseFloat(amount) || 0);
    }

    if (!base) return 0;
    const amountBase = ingredientToBase(amount, unit);
    return (article.purchase_price / base) * amountBase;
}

// ── Szenarien ─────────────────────────────────────────────────────────────────

const SCENARIOS = [
    { label: 'Günstig',   foodCostPct: 35, color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30' },
    { label: 'Standard',  foodCostPct: 28, color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30' },
    { label: 'Premium',   foodCostPct: 20, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
];

// ── Einzelartikel-Modus ───────────────────────────────────────────────────────

function SingleMode({ articles }) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [portionMl, setPortionMl] = useState('40');
    const [foodCostPct, setFoodCostPct] = useState('28');
    const [vatRate, setVatRate] = useState('19');
    const [saving, setSaving] = useState(false);

    const articleNames = useMemo(() => articles.map(a => a.name), [articles]);

    const { data: menuItems = [] } = useQuery({
        queryKey: ['menu-items'],
        queryFn: () => base44.entities.MenuItem.list('name', 500)
    });

    const selectByName = (name) => {
        setSelectedArticle(articles.find(x => x.name === name) || null);
    };

    // MenuItems die mit diesem Artikel verknüpft sind
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
    const totalBase = selectedArticle ? contentToBase(selectedArticle) : null;
    const portionNum = parseFloat(portionMl) || 0;
    const portions = (totalBase && portionNum > 0) ? totalBase / portionNum : null;
    const ekTotal = selectedArticle?.purchase_price ?? null;
    const costPerPortion = (ekTotal != null && portions) ? ekTotal / portions : null;
    const fcPct = parseFloat(foodCostPct) || 28;
    const vat = parseFloat(vatRate) || 0;

    // Verkaufspreis = Kosten / Wareneinsatz% × 100
    const sellNet = costPerPortion != null ? (costPerPortion / fcPct) * 100 : null;
    const sellGross = sellNet != null ? sellNet * (1 + vat / 100) : null;
    const profitPerPortion = sellNet != null && costPerPortion != null ? sellNet - costPerPortion : null;
    const profitPerUnit = profitPerPortion != null && portions ? profitPerPortion * portions : null;
    const actualFoodCost = (costPerPortion != null && sellNet != null && sellNet > 0)
        ? (costPerPortion / sellNet) * 100 : null;

    /** Verkaufspreis in verknüpftes MenuItem schreiben — NIEMALS in Article.purchase_price */
    const handleSaveToMenuItem = async (menuItem) => {
        if (sellGross == null) return;
        setSaving(true);
        try {
            await base44.entities.MenuItem.update(menuItem.id, {
                price: parseFloat(fmt(sellGross)),
                purchase_price: costPerPortion != null ? parseFloat(fmt(costPerPortion)) : undefined
            });
            queryClient.invalidateQueries({ queryKey: ['menu-items'] });
            toast.success(`Verkaufspreis ${fmt(sellGross)} € in „${menuItem.name}" übernommen`);
        } catch (e) {
            toast.error('Fehler: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Artikel auswählen */}
            <Card className="p-5 bg-card border-border">
                <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-amber-400" />
                    <h3 className="font-semibold text-foreground">Artikel (Einkaufspreis-Basis)</h3>
                </div>
                <SmartCombobox
                    value={selectedArticle?.name || ''}
                    onChange={selectByName}
                    options={articleNames}
                    placeholder="Artikel suchen…"
                    allowCreate={false}
                />
                {selectedArticle && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary">EK: {fmt(selectedArticle.purchase_price)} €</Badge>
                        {selectedArticle.content_amount && (
                            <Badge variant="outline">
                                {selectedArticle.content_amount} {selectedArticle.content_unit || 'ml'}
                            </Badge>
                        )}
                        {selectedArticle.category && <Badge variant="outline">{selectedArticle.category}</Badge>}
                    </div>
                )}
            </Card>

            {/* Kalkulation */}
            <Card className="p-5 bg-card border-border">
                <div className="flex items-center gap-2 mb-4">
                    <Calculator className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold text-foreground">Portions-Kalkulation</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label>Portionsgröße (ml/g)</Label>
                        <Input type="number" value={portionMl} onChange={e => setPortionMl(e.target.value)}
                            placeholder="z.B. 40" className="h-12 text-base" />
                    </div>
                    <div className="space-y-1">
                        <Label>Wareneinsatz (%)</Label>
                        <Input type="number" value={foodCostPct} onChange={e => setFoodCostPct(e.target.value)}
                            placeholder="z.B. 28" className="h-12 text-base" />
                        <p className="text-xs text-muted-foreground">Gastro-Standard: 20–35%</p>
                    </div>
                    <div className="space-y-1 col-span-2">
                        <Label>MwSt.</Label>
                        <Select value={vatRate} onValueChange={setVatRate}>
                            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="19">19% (Außer-Haus)</SelectItem>
                                <SelectItem value="7">7% (Inhouse)</SelectItem>
                                <SelectItem value="0">0%</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Ergebnis */}
            {selectedArticle && costPerPortion != null && (
                <Card className="p-5 bg-card border-border">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        <h3 className="font-semibold text-foreground">Ergebnis</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-secondary/40 rounded-xl p-4">
                            <p className="text-xs text-muted-foreground mb-1">Portionen / Einheit</p>
                            <p className="text-2xl font-bold text-foreground">{portions?.toFixed(1) ?? '–'}</p>
                        </div>
                        <div className="bg-secondary/40 rounded-xl p-4">
                            <p className="text-xs text-muted-foreground mb-1">EK / Portion</p>
                            <p className="text-2xl font-bold text-foreground">{fmt(costPerPortion)} €</p>
                        </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 text-center mb-4">
                        <p className="text-sm text-amber-400 mb-1">Empfohlener Verkaufspreis (brutto)</p>
                        <p className="text-5xl font-bold text-foreground">{fmt(sellGross)} €</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Netto: {fmt(sellNet)} € · Wareneinsatz: {fcPct}%
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-secondary/40 rounded-xl p-4">
                            <p className="text-xs text-muted-foreground mb-1">Gewinn / Portion</p>
                            <p className="text-xl font-bold text-green-400">+{fmt(profitPerPortion)} €</p>
                        </div>
                        <div className="bg-secondary/40 rounded-xl p-4">
                            <p className="text-xs text-muted-foreground mb-1">Gewinn / Einheit</p>
                            <p className="text-xl font-bold text-green-400">+{fmt(profitPerUnit)} €</p>
                        </div>
                    </div>

                    {/* Szenarien */}
                    <div className="mb-5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preisvarianten</p>
                        <div className="grid grid-cols-3 gap-2">
                            {SCENARIOS.map(s => {
                                const sNet = costPerPortion != null ? (costPerPortion / s.foodCostPct) * 100 : 0;
                                const sGross = sNet * (1 + vat / 100);
                                const active = Math.abs(fcPct - s.foodCostPct) < 0.5;
                                return (
                                    <button key={s.label} onClick={() => setFoodCostPct(String(s.foodCostPct))}
                                        className={cn('rounded-xl p-3 text-center border transition-all',
                                            active ? s.bg : 'bg-secondary/20 border-border hover:bg-secondary/50')}>
                                        <p className={cn('text-xs font-medium mb-1', active ? s.color : 'text-muted-foreground')}>{s.label}</p>
                                        <p className="text-base font-bold text-foreground">{fmt(sGross)} €</p>
                                        <p className="text-xs text-muted-foreground">{s.foodCostPct}%</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Übernahme in Getränkekarte */}
                    <div className="border-t border-border pt-4">
                        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-muted-foreground" />
                            Verkaufspreis in Getränkekarte übernehmen
                        </p>

                        {linkedMenuItems.length > 0 ? (
                            <div className="space-y-2">
                                {linkedMenuItems.map(m => (
                                    <div key={m.id}
                                        className="flex items-center justify-between gap-3 bg-secondary/30 rounded-xl px-4 py-3">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{m.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Aktuell: {m.price ? fmt(m.price) + ' €' : '–'}
                                            </p>
                                        </div>
                                        <Button onClick={() => handleSaveToMenuItem(m)}
                                            disabled={saving} size="sm"
                                            className="h-10 bg-amber-600 hover:bg-amber-700 shrink-0">
                                            <Save className="w-4 h-4 mr-1.5" />
                                            {fmt(sellGross)} €
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-secondary/20 rounded-xl p-4 text-center">
                                <p className="text-sm text-muted-foreground mb-3">
                                    Kein verknüpftes Getränk gefunden.
                                    Verknüpfe diesen Artikel in der Getränkekarte, um den Preis direkt zu übernehmen.
                                </p>
                                <Button variant="outline" size="sm"
                                    onClick={() => navigate(createPageUrl('DrinkMenu'))}>
                                    <ArrowRight className="w-4 h-4 mr-1.5" />
                                    Zur Getränkekarte
                                </Button>
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
                            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            Der Einkaufspreis des Artikels wird dabei <strong>nicht</strong> verändert.
                            Nur der Verkaufspreis in der Getränkekarte wird aktualisiert.
                        </p>
                    </div>
                </Card>
            )}

            {selectedArticle && costPerPortion == null && (
                <Card className="p-5 bg-card border-border text-center text-muted-foreground text-sm">
                    Für die Portionskalkulation muss der Artikel eine Inhaltsmenge (z.B. 700 ml) hinterlegt haben.
                </Card>
            )}
        </div>
    );
}

// ── Cocktail / Rezept-Modus ───────────────────────────────────────────────────

function CocktailMode({ articles, recipes }) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [ingredients, setIngredients] = useState([]);
    const [margin, setMargin] = useState('3');
    const [vatRate, setVatRate] = useState('19');
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [menuItemName, setMenuItemName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // URL-Parameter für Rezept-Vorauswahl
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const recipeId = urlParams.get('recipe');
        if (recipeId && recipes.length > 0) {
            const recipe = recipes.find(r => r.id === recipeId);
            if (recipe) loadRecipe(recipe);
        }
    }, [recipes]);

    const createMenuItemMutation = useMutation({
        mutationFn: (data) => base44.entities.MenuItem.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['menu-items'] });
            toast.success('Zur Getränkekarte hinzugefügt');
            navigate(createPageUrl('DrinkMenu'));
        }
    });

    /** Rezept laden — Originaleinheiten beibehalten, Allergene ableiten */
    const loadRecipe = (recipe) => {
        if (!recipe || !Array.isArray(recipe.ingredients)) return;
        const newIngredients = recipe.ingredients.map((ing, idx) => {
            const article = articles.find(a => a.id === ing.article_id);
            return {
                id: Date.now() + idx,
                article: article || { name: ing.article_name, purchase_price: 0 },
                amount: ing.amount || '',
                unit: ing.unit || 'ml'  // Originaleinheit aus Rezept beibehalten
            };
        }).filter(ing => ing.article);
        setIngredients(newIngredients);
        setSelectedRecipe(recipe);
        setMenuItemName(recipe.name || '');
    };

    const filteredArticles = articles.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) && a.purchase_price
    );

    // Gesamtkosten mit einheitenkorrekter Berechnung
    const totalCost = ingredients.reduce((sum, ing) => {
        return sum + calcIngredientCost(ing.article, ing.amount, ing.unit);
    }, 0);

    // Abgeleitete Allergene & Zusatzstoffe aus allen Zutaten
    const derivedAllergens = [...new Set(ingredients.flatMap(ing => ing.article?.allergens_list || []))];
    const derivedAdditives = [...new Set(ingredients.flatMap(ing => ing.article?.additives || []))];

    const vat = parseFloat(vatRate) || 0;
    const m = parseFloat(margin) || 1;
    const netPrice = totalCost * m;
    const grossPrice = netPrice * (1 + vat / 100);
    const profit = netPrice - totalCost;
    const foodCostPct = netPrice > 0 ? (totalCost / netPrice) * 100 : 0;

    return (
        <div className="space-y-4">
            {/* Rezept laden */}
            {recipes.length > 0 && (
                <Card className="p-5 bg-card border-border">
                    <div className="flex items-center gap-2 mb-3">
                        <Wine className="w-5 h-5 text-purple-400" />
                        <h3 className="font-semibold text-foreground">Rezept laden</h3>
                    </div>
                    <Select value={selectedRecipe?.id || ''}
                        onValueChange={(id) => {
                            const r = recipes.find(x => x.id === id);
                            if (r) loadRecipe(r);
                        }}>
                        <SelectTrigger className="h-12"><SelectValue placeholder="Rezept wählen…" /></SelectTrigger>
                        <SelectContent>
                            {recipes.filter(r => Array.isArray(r.ingredients) && r.ingredients.length > 0).map(r => (
                                <SelectItem key={r.id} value={r.id}>
                                    {r.name} ({r.ingredients?.length} Zutaten)
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Card>
            )}

            {/* Zutat hinzufügen */}
            <Card className="p-5 bg-card border-border">
                <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-amber-400" />
                    <h3 className="font-semibold text-foreground">Zutat hinzufügen</h3>
                </div>
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Artikel suchen…" className="h-12 text-base" />
                {searchTerm && filteredArticles.length > 0 && (
                    <div className="mt-2 rounded-xl border border-border overflow-hidden">
                        {filteredArticles.slice(0, 6).map(a => (
                            <button key={a.id}
                                onClick={() => {
                                    setIngredients(prev => [...prev, { id: Date.now(), article: a, amount: '', unit: 'ml' }]);
                                    setSearchTerm('');
                                }}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors border-b border-border/50 last:border-0 min-h-[52px]">
                                <span className="text-sm font-medium text-foreground">{a.name}</span>
                                <span className="text-xs text-muted-foreground">{fmt(a.purchase_price)} €</span>
                            </button>
                        ))}
                    </div>
                )}
            </Card>

            {/* Zutaten-Liste */}
            {ingredients.length > 0 && (
                <Card className="p-5 bg-card border-border space-y-3">
                    <h3 className="font-semibold text-foreground">Zutaten</h3>
                    {ingredients.map(ing => (
                        <div key={ing.id} className="bg-secondary/30 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{ing.article.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        EK: {fmt(ing.article.purchase_price)} € ·{' '}
                                        {ing.article.content_amount}{ing.article.content_unit || 'ml'}
                                    </p>
                                </div>
                                <button onClick={() => setIngredients(prev => prev.filter(x => x.id !== ing.id))}
                                    className="text-destructive hover:text-destructive/80 text-xl leading-none min-w-[44px] min-h-[44px] flex items-center justify-center">×</button>
                            </div>
                            <div className="flex gap-2">
                                <Input type="number" value={ing.amount}
                                    onChange={e => setIngredients(prev => prev.map(x => x.id === ing.id ? { ...x, amount: e.target.value } : x))}
                                    placeholder="Menge" className="h-10 text-sm flex-1" />
                                <Select value={ing.unit}
                                    onValueChange={u => setIngredients(prev => prev.map(x => x.id === ing.id ? { ...x, unit: u } : x))}>
                                    <SelectTrigger className="h-10 w-24 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['ml', 'cl', 'l', 'g', 'kg', 'Stück'].map(u => (
                                            <SelectItem key={u} value={u}>{u}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {ing.amount && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Kosten: {fmt(calcIngredientCost(ing.article, ing.amount, ing.unit))} €
                                </p>
                            )}
                        </div>
                    ))}

                    {/* Abgeleitete Allergene */}
                    {derivedAllergens.length > 0 && (
                        <div className="pt-2 border-t border-border">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Allergene (abgeleitet)</p>
                            <div className="flex flex-wrap gap-1">
                                {derivedAllergens.map(a => (
                                    <span key={a} className="px-2 py-0.5 rounded text-xs bg-red-500/10 border border-red-500/20 text-red-400">{a}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {derivedAdditives.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Zusatzstoffe (abgeleitet)</p>
                            <div className="flex flex-wrap gap-1">
                                {derivedAdditives.map(d => (
                                    <span key={d} className="px-2 py-0.5 rounded text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400">{d}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* Aufschlag */}
            <Card className="p-5 bg-card border-border">
                <h3 className="font-semibold text-foreground mb-3">Aufschlag</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label>Multiplikator (EK × x)</Label>
                        <Input type="number" step="0.1" value={margin} onChange={e => setMargin(e.target.value)}
                            className="h-12 text-base" />
                    </div>
                    <div className="space-y-1">
                        <Label>MwSt.</Label>
                        <Select value={vatRate} onValueChange={setVatRate}>
                            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="19">19%</SelectItem>
                                <SelectItem value="7">7%</SelectItem>
                                <SelectItem value="0">0%</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {ingredients.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {[2.5, 3, 3.5, 3.8, 4, 4.5].map(mv => {
                            const gp = (totalCost * mv) * (1 + vat / 100);
                            const active = margin === mv.toString();
                            return (
                                <button key={mv} onClick={() => setMargin(mv.toString())}
                                    className={cn('rounded-xl p-3 text-center border transition-all',
                                        active ? 'bg-amber-500/15 border-amber-500/40' : 'bg-secondary/20 border-border hover:bg-secondary/50')}>
                                    <p className={cn('text-xs font-medium', active ? 'text-amber-400' : 'text-muted-foreground')}>×{mv.toFixed(1)}</p>
                                    <p className="text-sm font-bold text-foreground">{fmt(gp)} €</p>
                                </button>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Ergebnis + Übernahme */}
            {ingredients.length > 0 && (
                <Card className="p-5 bg-card border-border">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 text-center mb-4">
                        <p className="text-sm text-amber-400 mb-1">Verkaufspreis (brutto)</p>
                        <p className="text-5xl font-bold text-foreground">{fmt(grossPrice)} €</p>
                        <p className="text-xs text-muted-foreground mt-1">Wareneinsatz: {foodCostPct.toFixed(1)}%</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-secondary/40 rounded-xl p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Kosten</p>
                            <p className="text-lg font-bold text-foreground">{fmt(totalCost)} €</p>
                        </div>
                        <div className="bg-secondary/40 rounded-xl p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Netto</p>
                            <p className="text-lg font-bold text-foreground">{fmt(netPrice)} €</p>
                        </div>
                        <div className="bg-secondary/40 rounded-xl p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Gewinn</p>
                            <p className="text-lg font-bold text-green-400">+{fmt(profit)} €</p>
                        </div>
                    </div>

                    <div className="space-y-2 mb-3">
                        <Label>Name für Getränkekarte *</Label>
                        <Input value={menuItemName} onChange={e => setMenuItemName(e.target.value)}
                            placeholder="z.B. Mojito Classic" className="h-12 text-base" />
                    </div>
                    <Button
                        onClick={() => {
                            if (!menuItemName.trim()) { toast.error('Name fehlt'); return; }
                            // linked_recipe_id ist das korrekte Feld im MenuItem-Schema
                            createMenuItemMutation.mutate({
                                name: menuItemName,
                                price: parseFloat(fmt(grossPrice)),
                                purchase_price: parseFloat(fmt(totalCost)),
                                category: selectedRecipe?.category || 'Cocktails',
                                linked_recipe_id: selectedRecipe?.id || undefined,
                                allergens_list: derivedAllergens,
                                additives: derivedAdditives,
                                is_available: true
                            });
                        }}
                        disabled={!menuItemName.trim() || createMenuItemMutation.isPending}
                        className="w-full h-12 bg-amber-600 hover:bg-amber-700 font-semibold"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Zur Getränkekarte hinzufügen
                    </Button>
                </Card>
            )}
        </div>
    );
}

// ── Hauptseite ────────────────────────────────────────────────────────────────

export default function PriceCalculator() {
    const permissions = usePermissions();
    const [mode, setMode] = useState('single');

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('name')
    });
    const { data: recipes = [] } = useQuery({
        queryKey: ['recipes'],
        queryFn: () => base44.entities.Recipe.list('name')
    });

    if (permissions.isLoading) return null;
    if (!permissions.canViewPriceCalculator) {
        return <PermissionDenied message="Nur Administratoren haben Zugriff auf die Preiskalkulation." />;
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Preisrechner</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Artikel → Kalkulation → Getränkekarte
                    </p>
                </div>

                <div className="flex gap-2 mb-6 bg-secondary/40 rounded-xl p-1">
                    <button onClick={() => setMode('single')}
                        className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                            mode === 'single' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                        <Package className="w-4 h-4" /> Einzelartikel
                    </button>
                    <button onClick={() => setMode('cocktail')}
                        className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                            mode === 'cocktail' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                        <Wine className="w-4 h-4" /> Cocktail / Rezept
                    </button>
                </div>

                {mode === 'single'
                    ? <SingleMode articles={articles} />
                    : <CocktailMode articles={articles} recipes={recipes} />
                }
            </div>
        </div>
    );
}