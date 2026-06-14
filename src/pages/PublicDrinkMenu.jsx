/**
 * PublicDrinkMenu — Öffentliche Getränkekarte für Gäste
 * Kein Login nötig. Datenabruf direkt über Entities (kein Function-Invoke).
 */
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Info, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ── Allergen-Schnellfilter ────────────────────────────────────────────────────
const TIERISCHE_ALLERGENE = ['Milch', 'Laktose', 'Ei', 'Eier', 'Fisch', 'Krebstiere', 'Weichtiere'];

function hasAllergen(item, keyword) {
    const list = item.allergens_list || [];
    if (list.some(a => a.toLowerCase().includes(keyword.toLowerCase()))) return true;
    if (item.allergens?.toLowerCase().includes(keyword.toLowerCase())) return true;
    return false;
}

const ALLERGEN_FILTERS = [
    {
        id: 'glutenfrei',
        label: 'Glutenfrei',
        match: (item) => !hasAllergen(item, 'Gluten') && !hasAllergen(item, 'Weizen') && !hasAllergen(item, 'Gerste') && !hasAllergen(item, 'Roggen'),
    },
    {
        id: 'laktosefrei',
        label: 'Laktosefrei',
        match: (item) => !hasAllergen(item, 'Milch') && !hasAllergen(item, 'Laktose'),
    },
    {
        id: 'vegan',
        label: 'Vegan',
        match: (item) => !TIERISCHE_ALLERGENE.some(a => hasAllergen(item, a)),
    },
    {
        id: 'alkoholfrei',
        label: 'Alkoholfrei',
        match: (item) => !item.alcohol_content || parseFloat(item.alcohol_content) === 0,
    },
];

// ── Getränke-Karte ────────────────────────────────────────────────────────────
function DrinkCard({ item, onClick }) {
    const hasAllergenInfo = item.allergens_list?.length > 0 || item.additives?.length > 0 || item.allergens;
    const isUnavailable   = item.is_available === false;

    return (
        <button
            onClick={() => !isUnavailable && onClick(item)}
            disabled={isUnavailable}
            className={cn(
                'w-full text-left border rounded-2xl p-4 transition-all min-h-[72px] flex flex-col justify-between',
                isUnavailable
                    ? 'opacity-40 border-border/30 bg-card/30 cursor-not-allowed'
                    : 'bg-card/50 border-border/60 active:scale-[0.98] hover:bg-card hover:border-amber-500/30'
            )}
        >
            {/* Name + Preis */}
            <div className="flex items-baseline justify-between gap-3">
                <p className="font-bold text-base text-foreground leading-tight flex-1">{item.name}</p>
                {item.price != null && (
                    <p className="text-lg font-bold text-amber-500 shrink-0">
                        €{Number(item.price).toFixed(2)}
                    </p>
                )}
            </div>

            {/* Größe + Alkohol + Allergen-Hinweis */}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                {item.size && <span>{item.size}</span>}
                {item.size && item.alcohol_content && Number(item.alcohol_content) > 0 && <span>·</span>}
                {item.alcohol_content && Number(item.alcohol_content) > 0 && (
                    <span>{item.alcohol_content}% Vol.</span>
                )}
                {isUnavailable && (
                    <span className="text-muted-foreground/60 ml-auto">nicht verfügbar</span>
                )}
                {hasAllergenInfo && !isUnavailable && (
                    <span className="ml-auto text-amber-500/80 font-medium flex items-center gap-1">
                        <Info className="w-3 h-3" />Allergen
                    </span>
                )}
            </div>

            {/* Beschreibung */}
            {item.description && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1 leading-snug">
                    {item.description}
                </p>
            )}

            {/* Badges */}
            {(item.is_seasonal || item.is_special) && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                    {item.is_seasonal && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/12 text-green-400 border border-green-500/25">
                            Saisonal
                        </span>
                    )}
                    {item.is_special && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/12 text-amber-400 border border-amber-500/25">
                            Special
                        </span>
                    )}
                </div>
            )}
        </button>
    );
}

// ── Detail-Dialog ─────────────────────────────────────────────────────────────
function DrinkDetail({ item, open, onClose }) {
    if (!item) return null;
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl leading-snug">{item.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {item.image_url && (
                        <img src={item.image_url} alt={item.name}
                            className="w-full h-48 object-cover rounded-xl" />
                    )}

                    {/* Preis + Eigenschaften */}
                    <div className="flex items-center justify-between">
                        {item.price != null && (
                            <p className="text-3xl font-bold text-amber-500">
                                €{Number(item.price).toFixed(2)}
                            </p>
                        )}
                        <div className="flex gap-2 flex-wrap justify-end">
                            {item.size && (
                                <span className="text-xs border border-border rounded-full px-2.5 py-1 text-muted-foreground">
                                    {item.size}
                                </span>
                            )}
                            {item.alcohol_content && Number(item.alcohol_content) > 0 && (
                                <span className="text-xs border border-border rounded-full px-2.5 py-1 text-muted-foreground">
                                    {item.alcohol_content}% Vol.
                                </span>
                            )}
                            {(!item.alcohol_content || Number(item.alcohol_content) === 0) && (
                                <span className="text-xs border border-green-500/30 rounded-full px-2.5 py-1 text-green-400 bg-green-500/8">
                                    Alkoholfrei
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Beschreibung */}
                    {item.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {item.description}
                        </p>
                    )}

                    {/* Allergene & Zusatzstoffe */}
                    {(item.allergens_list?.length > 0 || item.additives?.length > 0 || item.allergens) && (
                        <div className="bg-muted/40 rounded-xl p-3.5 space-y-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Allergene & Zusatzstoffe
                            </p>
                            {item.allergens_list?.length > 0 && (
                                <div>
                                    <p className="text-[10px] text-red-400 font-semibold mb-1">Allergene</p>
                                    <div className="flex flex-wrap gap-1">
                                        {item.allergens_list.map(a => (
                                            <span key={a}
                                                className="px-2 py-0.5 rounded text-xs bg-red-500/10 border border-red-500/20 text-red-400">
                                                {a}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {item.additives?.length > 0 && (
                                <div>
                                    <p className="text-[10px] text-blue-400 font-semibold mb-1">Zusatzstoffe</p>
                                    <div className="flex flex-wrap gap-1">
                                        {item.additives.map(d => (
                                            <span key={d}
                                                className="px-2 py-0.5 rounded text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                                {d}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {!item.allergens_list?.length && !item.additives?.length && item.allergens && (
                                <p className="text-xs text-muted-foreground">{item.allergens}</p>
                            )}
                        </div>
                    )}

                    <p className="text-[10px] text-muted-foreground/50 text-center">
                        Alle Angaben ohne Gewähr · Bei Unverträglichkeiten bitte Personal ansprechen.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function PublicDrinkMenu() {
    const [searchTerm,           setSearchTerm]           = useState('');
    const [selectedCategory,     setSelectedCategory]     = useState('Alle');
    const [activeAllergenFilters, setActiveAllergenFilters] = useState([]);
    const [detailItem,           setDetailItem]           = useState(null);
    const [showFilters,          setShowFilters]          = useState(false);

    // Direkt über Entities — kein Function-Invoke nötig (PublicDrinkMenu ist ohne Auth)
    const { data: items = [], isLoading: itemsLoading, error: itemsError } = useQuery({
        queryKey: ['public-menu-items'],
        queryFn: () => base44.entities.MenuItem.filter({ is_available: true }, 'category', 1000),
        staleTime: 5 * 60 * 1000,
        retry: 2,
    });

    const { data: companyList = [] } = useQuery({
        queryKey: ['public-company'],
        queryFn: () => base44.entities.CompanyInfo.list('created_date', 1),
        staleTime: 10 * 60 * 1000,
    });

    const { data: specials = [] } = useQuery({
        queryKey: ['public-specials'],
        queryFn: () => base44.entities.WeeklySpecial.filter({ is_active: true }),
        staleTime: 5 * 60 * 1000,
    });

    const companyInfo  = companyList[0] || {};
    const barName      = companyInfo.company_name || 'Getränkekarte';
    const activeSpecial = specials[0] || null;

    // Kategorien
    const categories = useMemo(() => {
        const cats = new Set(items.map(i => i.category || 'Sonstiges').filter(Boolean));
        return ['Alle', ...Array.from(cats)];
    }, [items]);

    // Gefilterte Items
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const cat = item.category || 'Sonstiges';
            if (selectedCategory !== 'Alle' && cat !== selectedCategory) return false;
            if (searchTerm) {
                const q = searchTerm.toLowerCase();
                if (!item.name?.toLowerCase().includes(q) &&
                    !(item.description?.toLowerCase() || '').includes(q) &&
                    !(item.category?.toLowerCase() || '').includes(q)) return false;
            }
            for (const filterId of activeAllergenFilters) {
                const f = ALLERGEN_FILTERS.find(af => af.id === filterId);
                if (f && !f.match(item)) return false;
            }
            return true;
        });
    }, [items, selectedCategory, searchTerm, activeAllergenFilters]);

    // Gruppiert nach Kategorie
    const groupedItems = useMemo(() => {
        const map = {};
        filteredItems.forEach(item => {
            const cat = item.category || 'Sonstiges';
            if (!map[cat]) map[cat] = [];
            map[cat].push(item);
        });
        Object.values(map).forEach(arr =>
            arr.sort((a, b) => (a.order_position || 999) - (b.order_position || 999))
        );
        return map;
    }, [filteredItems]);

    const toggleAllergenFilter = (id) =>
        setActiveAllergenFilters(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );

    const activeFilterCount = activeAllergenFilters.length + (selectedCategory !== 'Alle' ? 1 : 0);
    const resetFilters = () => {
        setActiveAllergenFilters([]);
        setSelectedCategory('Alle');
        setSearchTerm('');
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-background">

            {/* ── Sticky Header ────────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 bg-background/95 border-b border-border/80 backdrop-blur-sm">
                <div className="max-w-2xl mx-auto px-4 py-3 space-y-2.5">

                    {/* Brand-Zeile */}
                    <div className="flex items-center gap-3 min-h-[44px]">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl shadow shrink-0">
                            🍹
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-base font-bold text-foreground truncate">{barName}</h1>
                            <p className="text-[11px] text-muted-foreground">
                                {items.length} Getränke
                            </p>
                        </div>
                    </div>

                    {/* Suche + Filter-Button */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Getränk suchen…"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 h-11 text-base rounded-full"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowFilters(v => !v)}
                            className={cn(
                                'h-11 px-3.5 rounded-full border font-semibold transition-all text-sm shrink-0 relative flex items-center gap-1.5',
                                showFilters || activeFilterCount > 0
                                    ? 'bg-amber-500 border-amber-500 text-white'
                                    : 'border-border text-muted-foreground hover:text-foreground bg-card'
                            )}>
                            <SlidersHorizontal className="w-4 h-4" />
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Allergen-Filter Panel */}
                    {showFilters && (
                        <div className="pb-1 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Filtern nach
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {ALLERGEN_FILTERS.map(f => (
                                    <button key={f.id} onClick={() => toggleAllergenFilter(f.id)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all min-h-[36px]',
                                            activeAllergenFilters.includes(f.id)
                                                ? 'bg-green-600 text-white border-green-600'
                                                : 'border-border text-muted-foreground bg-card hover:text-foreground'
                                        )}>
                                        {f.label}
                                    </button>
                                ))}
                                {activeFilterCount > 0 && (
                                    <button onClick={resetFilters}
                                        className="px-3 py-1.5 rounded-full text-xs font-semibold border border-border text-muted-foreground bg-card hover:text-red-400 hover:border-red-400/50 transition-all min-h-[36px]">
                                        Zurücksetzen
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Kategorie-Chips */}
                    <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
                        <div className="flex gap-1.5 pb-1">
                            {categories.map(cat => (
                                <button key={cat} onClick={() => setSelectedCategory(cat)}
                                    className={cn(
                                        'shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-all min-h-[36px] flex items-center',
                                        selectedCategory === cat
                                            ? 'bg-amber-500 text-white font-bold shadow shadow-amber-500/20'
                                            : 'bg-secondary text-muted-foreground hover:text-foreground'
                                    )}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Content ──────────────────────────────────────────────────── */}
            <main className="max-w-2xl mx-auto px-4 py-5 space-y-6 pb-16">

                {/* Weekly Special Banner */}
                {activeSpecial && (
                    <section className="bg-gradient-to-r from-amber-600/15 to-orange-600/15 border border-amber-500/30 rounded-2xl p-4">
                        <p className="text-sm font-bold text-amber-400 mb-1">✨ Wochenspecial</p>
                        <p className="text-xs text-muted-foreground">{activeSpecial.title || activeSpecial.name}</p>
                    </section>
                )}

                {/* Loading */}
                {itemsLoading && (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                    </div>
                )}

                {/* Error */}
                {itemsError && (
                    <div className="text-center py-16">
                        <p className="text-lg font-semibold text-foreground mb-2">Lädt nicht</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Die Getränkekarte konnte nicht geladen werden.
                        </p>
                        <button onClick={() => window.location.reload()}
                            className="text-sm text-amber-500 underline hover:text-amber-400 font-medium">
                            Neu laden
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {!itemsLoading && !itemsError && Object.keys(groupedItems).length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        <p className="text-base font-semibold">Keine Getränke gefunden</p>
                        <p className="text-sm mt-1">Andere Filter oder Suchbegriff versuchen.</p>
                        {activeFilterCount > 0 && (
                            <button onClick={resetFilters}
                                className="mt-4 text-sm text-amber-500 underline hover:text-amber-400 font-medium">
                                Filter zurücksetzen
                            </button>
                        )}
                    </div>
                )}

                {/* Kategorien + Karten */}
                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                    <section key={category} className="space-y-2">
                        <div className="flex items-center gap-3 pt-1">
                            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                                {category}
                            </h2>
                            <div className="flex-1 h-px bg-border/50" />
                            <span className="text-[10px] text-muted-foreground">{categoryItems.length}</span>
                        </div>
                        <div className="space-y-2">
                            {categoryItems.map(item => (
                                <DrinkCard key={item.id} item={item} onClick={setDetailItem} />
                            ))}
                        </div>
                    </section>
                ))}
            </main>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <footer className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground bg-card/20">
                <p className="font-semibold text-foreground">{barName}</p>
                {companyInfo.phone && (
                    <a href={`tel:${companyInfo.phone}`}
                        className="block mt-1 text-amber-500 hover:text-amber-400">
                        ☎ {companyInfo.phone}
                    </a>
                )}
                <p className="mt-3 text-[10px] opacity-40">
                    Preise inkl. MwSt. · Bei Allergien bitte Personal ansprechen.
                </p>
            </footer>

            {/* Detail Dialog */}
            <DrinkDetail item={detailItem} open={!!detailItem} onClose={() => setDetailItem(null)} />
        </div>
    );
}
