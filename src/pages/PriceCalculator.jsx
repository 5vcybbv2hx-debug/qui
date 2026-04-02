import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calculator, Search, TrendingUp, Package, Wine, Plus, ArrowRight,
    CheckCircle, ChevronDown, ChevronUp, Layers, Repeat, Save
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
import { recordPriceChange } from '@/lib/priceHistoryUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) { return (n ?? 0).toFixed(2); }

function contentToMl(article) {
    if (!article?.content_amount) return null;
    const u = article.content_unit;
    if (u === 'l' || u === 'kg') return article.content_amount * 1000;
    return article.content_amount; // ml / g / Stück
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

const SCENARIOS = [
    { label: 'Günstig', foodCostPct: 35, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
    { label: 'Standard', foodCostPct: 28, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
    { label: 'Premium', foodCostPct: 20, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
];

// ── Single-article mode ────────────────────────────────────────────────────────

function SingleMode({ articles, currentUser }) {
    const queryClient = useQueryClient();
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [portionMl, setPortionMl] = useState('40');
    const [foodCostPct, setFoodCostPct] = useState('28');
    const [vatRate, setVatRate] = useState('19');
    const [saving, setSaving] = useState(false);

    const articleNames = useMemo(() => articles.map(a => a.name), [articles]);

    const selectByName = (name) => {
        const a = articles.find(x => x.name === name);
        setSelectedArticle(a || null);
    };

    const totalMl = selectedArticle ? contentToMl(selectedArticle) : null;
    const portionNum = parseFloat(portionMl) || 0;
    const portions = (totalMl && portionNum > 0) ? totalMl / portionNum : null;
    const ekTotal = selectedArticle?.purchase_price ?? null;
    const costPerPortion = (ekTotal != null && portions) ? ekTotal / portions : null;
    const fcPct = parseFloat(foodCostPct) || 28;

    const sellNet = costPerPortion != null ? (costPerPortion / fcPct) * 100 : null;
    const vat = parseFloat(vatRate) || 0;
    const sellGross = sellNet != null ? sellNet * (1 + vat / 100) : null;
    const profitPerPortion = sellNet != null && costPerPortion != null ? sellNet - costPerPortion : null;
    const profitPerUnit = profitPerPortion != null && portions ? profitPerPortion * portions : null;

    const handleSaveToArticle = async () => {
        if (!selectedArticle || sellGross == null) return;
        setSaving(true);
        try {
            await recordPriceChange({
                articleId: selectedArticle.id,
                articleName: selectedArticle.name,
                oldPrice: selectedArticle.purchase_price,
                newPrice: sellGross,
                user: currentUser,
                note: `Preisrechner: ${portionNum}ml-Portion, ${fcPct}% Wareneinsatz`
            });
            await base44.entities.Article.update(selectedArticle.id, { purchase_price: parseFloat(fmt(sellGross)) });
            queryClient.invalidateQueries({ queryKey: ['articles'] });
            toast.success(`Preis ${fmt(sellGross)} € in Artikel übernommen`);
        } catch (e) {
            toast.error('Fehler beim Speichern: ' + e.message);
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
                    <h3 className="font-semibold text-foreground">Artikel</h3>
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
                            <Badge variant="outline">{selectedArticle.content_amount} {selectedArticle.content_unit || 'ml'}</Badge>
                        )}
                        {selectedArticle.category && (
                            <Badge variant="outline">{selectedArticle.category}</Badge>
                        )}
                    </div>
                )}
            </Card>

            {/* Portion + Parameter */}
            <Card className="p-5 bg-card border-border">
                <div className="flex items-center gap-2 mb-4">
                    <Calculator className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold text-foreground">Kalkulation</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label>Portionsgröße (ml)</Label>
                        <Input type="number" value={portionMl} onChange={e => setPortionMl(e.target.value)} placeholder="z.B. 40" className="h-12 text-base" />
                    </div>
                    <div className="space-y-1">
                        <Label>Wareneinsatz (%)</Label>
                        <Input type="number" value={foodCostPct} onChange={e => setFoodCostPct(e.target.value)} placeholder="z.B. 28" className="h-12 text-base" />
                    </div>
                    <div className="space-y-1 col-span-2">
                        <Label>MwSt.</Label>
                        <Select value={vatRate} onValueChange={setVatRate}>
                            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="19">19% (Normal)</SelectItem>
                                <SelectItem value="7">7% (Ermäßigt)</SelectItem>
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

                    {/* Portionsinfo */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-secondary/40 rounded-xl p-4">
                            <p className="text-xs text-muted-foreground mb-1">Portionen je Einheit</p>
                            <p className="text-2xl font-bold text-foreground">{portions?.toFixed(1) ?? '–'}</p>
                        </div>
                        <div className="bg-secondary/40 rounded-xl p-4">
                            <p className="text-xs text-muted-foreground mb-1">Kosten / Portion</p>
                            <p className="text-2xl font-bold text-foreground">{fmt(costPerPortion)} €</p>
                        </div>
                    </div>

                    {/* Hauptpreis */}
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 text-center mb-4">
                        <p className="text-sm text-amber-400 mb-1">Empfohlener Verkaufspreis (brutto)</p>
                        <p className="text-5xl font-bold text-foreground">{fmt(sellGross)} €</p>
                        <p className="text-xs text-muted-foreground mt-1">Netto: {fmt(sellNet)} € · Wareneinsatz: {fcPct}%</p>
                    </div>

                    {/* Detail-Werte */}
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
                    <div className="mb-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preisvarianten</p>
                        <div className="grid grid-cols-3 gap-2">
                            {SCENARIOS.map(s => {
                                const sNet = costPerPortion != null ? (costPerPortion / s.foodCostPct) * 100 : 0;
                                const sGross = sNet * (1 + vat / 100);
                                const active = Math.abs(fcPct - s.foodCostPct) < 0.5;
                                return (
                                    <button
                                        key={s.label}
                                        onClick={() => setFoodCostPct(String(s.foodCostPct))}
                                        className={cn(
                                            'rounded-xl p-3 text-center border transition-all',
                                            active ? s.bg : 'bg-secondary/20 border-border hover:bg-secondary/50'
                                        )}
                                    >
                                        <p className={cn('text-xs font-medium mb-1', active ? s.color : 'text-muted-foreground')}>{s.label}</p>
                                        <p className="text-base font-bold text-foreground">{fmt(sGross)} €</p>
                                        <p className="text-xs text-muted-foreground">{s.foodCostPct}%</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Speichern */}
                    <Button
                        onClick={handleSaveToArticle}
                        disabled={saving}
                        className="w-full h-12 bg-amber-600 hover:bg-amber-700 font-semibold"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Wird gespeichert…' : `Preis ${fmt(sellGross)} € in Artikel übernehmen`}
                    </Button>
                </Card>
            )}

            {selectedArticle && costPerPortion == null && (
                <Card className="p-5 bg-card border-border text-center text-muted-foreground text-sm">
                    Für die Portionskalkulation muss der Artikel eine Inhaltsmenge (z.B. 700 ml) haben.
                </Card>
            )}
        </div>
    );
}

// ── Multi-ingredient / Cocktail mode ──────────────────────────────────────────

function CocktailMode({ articles, recipes }) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [ingredients, setIngredients] = useState([]);
    const [margin, setMargin] = useState('3');
    const [vatRate, setVatRate] = useState('19');
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [menuItemName, setMenuItemName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

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
            queryClient.invalidateQueries({ queryKey: ['menuItems'] });
            toast.success('Zur Getränkekarte hinzugefügt');
            navigate(createPageUrl('DrinkMenu'));
        }
    });

    const filteredArticles = articles.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) && a.purchase_price
    );

    const loadRecipe = (recipe) => {
        if (!recipe || !Array.isArray(recipe.ingredients)) return;
        const newIngredients = recipe.ingredients.map((ing, idx) => {
            const article = articles.find(a => a.id === ing.article_id);
            return { id: Date.now() + idx, article: article || { name: ing.article_name, purchase_price: 0 }, amount: ing.amount || '', unit: 'ml' };
        }).filter(ing => ing.article);
        setIngredients(newIngredients);
        setSelectedRecipe(recipe);
        setMenuItemName(recipe.name || '');
    };

    const totalCost = ingredients.reduce((sum, ing) => {
        const amount = parseFloat(ing.amount) || 0;
        const ml = contentToMl(ing.article) || 1000;
        if (!ing.article.purchase_price || amount === 0) return sum;
        return sum + (ing.article.purchase_price / ml) * amount;
    }, 0);

    const vat = parseFloat(vatRate) || 0;
    const m = parseFloat(margin) || 1;
    const netPrice = totalCost * m;
    const grossPrice = netPrice * (1 + vat / 100);
    const profit = netPrice - totalCost;

    return (
        <div className="space-y-4">
            {recipes.length > 0 && (
                <Card className="p-5 bg-card border-border">
                    <div className="flex items-center gap-2 mb-3">
                        <Wine className="w-5 h-5 text-purple-400" />
                        <h3 className="font-semibold text-foreground">Rezept laden</h3>
                    </div>
                    <Select value={selectedRecipe?.id || ''} onValueChange={(id) => {
                        const r = recipes.find(x => x.id === id);
                        if (r) loadRecipe(r);
                    }}>
                        <SelectTrigger className="h-12"><SelectValue placeholder="Rezept wählen…" /></SelectTrigger>
                        <SelectContent>
                            {recipes.filter(r => Array.isArray(r.ingredients) && r.ingredients.length > 0).map(r => (
                                <SelectItem key={r.id} value={r.id}>{r.name} ({r.ingredients?.length} Zutaten)</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Card>
            )}

            {/* Artikel-Suche */}
            <Card className="p-5 bg-card border-border">
                <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-amber-400" />
                    <h3 className="font-semibold text-foreground">Zutat hinzufügen</h3>
                </div>
                <Input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Artikel suchen…"
                    className="h-12 text-base"
                />
                {searchTerm && filteredArticles.length > 0 && (
                    <div className="mt-2 rounded-xl border border-border overflow-hidden">
                        {filteredArticles.slice(0, 6).map(a => (
                            <button key={a.id} onClick={() => {
                                setIngredients(prev => [...prev, { id: Date.now(), article: a, amount: '', unit: 'ml' }]);
                                setSearchTerm('');
                            }} className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors border-b border-border/50 last:border-0 min-h-[52px]">
                                <span className="text-sm font-medium text-foreground">{a.name}</span>
                                <span className="text-xs text-muted-foreground">{fmt(a.purchase_price)} €</span>
                            </button>
                        ))}
                    </div>
                )}
            </Card>

            {/* Zutaten */}
            {ingredients.length > 0 && (
                <Card className="p-5 bg-card border-border space-y-3">
                    <h3 className="font-semibold text-foreground">Zutaten</h3>
                    {ingredients.map(ing => (
                        <div key={ing.id} className="bg-secondary/30 rounded-xl p-4 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{ing.article.name}</p>
                                <p className="text-xs text-muted-foreground">{fmt(ing.article.purchase_price)} € / Einheit</p>
                            </div>
                            <Input
                                type="number"
                                value={ing.amount}
                                onChange={e => setIngredients(prev => prev.map(x => x.id === ing.id ? { ...x, amount: e.target.value } : x))}
                                placeholder="ml"
                                className="w-20 h-10 text-sm"
                            />
                            <button onClick={() => setIngredients(prev => prev.filter(x => x.id !== ing.id))}
                                className="text-destructive hover:text-destructive/80 text-xl leading-none min-w-[44px] min-h-[44px] flex items-center justify-center">×</button>
                        </div>
                    ))}
                </Card>
            )}

            {/* Parameter */}
            <Card className="p-5 bg-card border-border">
                <h3 className="font-semibold text-foreground mb-3">Aufschlag</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label>Multiplikator</Label>
                        <Input type="number" step="0.1" value={margin} onChange={e => setMargin(e.target.value)} className="h-12 text-base" />
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
                {/* Aufschlag-Vergleich */}
                {ingredients.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {[2.5, 3, 3.5, 3.8, 4, 4.5].map(mv => {
                            const gp = (totalCost * mv) * (1 + vat / 100);
                            return (
                                <button key={mv} onClick={() => setMargin(mv.toString())}
                                    className={cn('rounded-xl p-3 text-center border transition-all',
                                        margin === mv.toString()
                                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                                            : 'bg-secondary/20 border-border hover:bg-secondary/50 text-muted-foreground')}>
                                    <p className="text-xs font-medium">×{mv.toFixed(1)}</p>
                                    <p className="text-sm font-bold text-foreground">{fmt(gp)} €</p>
                                </button>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Ergebnis */}
            {ingredients.length > 0 && (
                <Card className="p-5 bg-card border-border">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 text-center mb-4">
                        <p className="text-sm text-amber-400 mb-1">Verkaufspreis (brutto)</p>
                        <p className="text-5xl font-bold text-foreground">{fmt(grossPrice)} €</p>
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

                    <div className="space-y-1">
                        <Label>Name für Getränkekarte</Label>
                        <Input value={menuItemName} onChange={e => setMenuItemName(e.target.value)} placeholder="z.B. Mojito Classic" className="h-12 text-base" />
                    </div>
                    <Button
                        onClick={() => {
                            if (!menuItemName.trim()) { toast.error('Name fehlt'); return; }
                            createMenuItemMutation.mutate({
                                name: menuItemName,
                                price: parseFloat(fmt(grossPrice)),
                                category: selectedRecipe?.category || 'Sonstiges',
                                recipe_id: selectedRecipe?.id,
                                cost_price: parseFloat(fmt(totalCost)),
                                is_available: true
                            });
                        }}
                        disabled={!menuItemName.trim() || createMenuItemMutation.isPending}
                        className="w-full h-12 mt-3 bg-amber-600 hover:bg-amber-700 font-semibold"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Zur Getränkekarte hinzufügen
                    </Button>
                </Card>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PriceCalculator() {
    const permissions = usePermissions();
    const currentUser = useRef(null);
    const [mode, setMode] = useState('single'); // 'single' | 'cocktail'

    useEffect(() => { base44.auth.me().then(u => { currentUser.current = u; }).catch(() => {}); }, []);

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
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Preisrechner</h1>
                    <p className="text-muted-foreground text-sm mt-1">Direkt verbunden mit deinen Lagerartikeln</p>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-6 bg-secondary/40 rounded-xl p-1">
                    <button
                        onClick={() => setMode('single')}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                            mode === 'single' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Package className="w-4 h-4" /> Einzelartikel
                    </button>
                    <button
                        onClick={() => setMode('cocktail')}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                            mode === 'cocktail' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Wine className="w-4 h-4" /> Cocktail / Rezept
                    </button>
                </div>

                {mode === 'single'
                    ? <SingleMode articles={articles} currentUser={currentUser.current} />
                    : <CocktailMode articles={articles} recipes={recipes} />
                }
            </div>
        </div>
    );
}