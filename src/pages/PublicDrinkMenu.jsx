import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, X, ChevronDown, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Allergen quick-filters shown to guests
const ALLERGEN_FILTERS = [
    { id: 'kein_gluten', label: 'Glutenfrei', match: (item) => !hasAllergen(item, 'Gluten') },
    { id: 'kein_laktose', label: 'Laktosefrei', match: (item) => !hasAllergen(item, 'Laktose') },
    { id: 'vegan', label: 'Vegan', match: (item) => !hasAllergen(item, 'Milch') && !hasAllergen(item, 'Ei') && !hasAllergen(item, 'Laktose') },
    { id: 'alkoholfrei', label: 'Alkoholfrei', match: (item) => !item.alcohol_content || parseFloat(item.alcohol_content) === 0 },
];

function hasAllergen(item, keyword) {
    const list = item.allergens_list || [];
    if (list.some(a => a.toLowerCase().includes(keyword.toLowerCase()))) return true;
    if (item.allergens?.toLowerCase().includes(keyword.toLowerCase())) return true;
    return false;
}

function DrinkCard({ item, onClick }) {
    const hasInfo = item.allergens_list?.length > 0 || item.additives?.length > 0 || item.allergens;
    return (
        <button
            onClick={() => onClick(item)}
            className="w-full text-left bg-card/50 border border-border/60 rounded-2xl p-4 active:scale-[0.98] transition-transform hover:bg-card hover:border-amber-500/30 min-h-[80px] flex flex-col justify-between"
        >
            {/* Header: Name + Price */}
            <div className="flex items-baseline justify-between gap-3">
                <p className="font-bold text-base text-foreground leading-tight">{item.name}</p>
                <p className="text-lg font-bold text-amber-500 shrink-0">€{Number(item.price).toFixed(2)}</p>
            </div>

            {/* Subtext: Size + Alcohol + Info */}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                {item.size && <span>{item.size}</span>}
                {item.size && item.alcohol_content && Number(item.alcohol_content) > 0 && <span>•</span>}
                {item.alcohol_content && Number(item.alcohol_content) > 0 && <span>{item.alcohol_content}% Vol.</span>}
                {hasInfo && <span className="ml-auto text-amber-600 font-medium">⚠ Allergen</span>}
            </div>

            {/* Description (optional, small) */}
            {item.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-1 leading-snug">{item.description}</p>
            )}

            {/* Tags */}
            {(item.is_seasonal || item.is_special) && (
                <div className="flex gap-1.5 mt-2">
                    {item.is_seasonal && <Badge className="text-[9px] py-0 px-2 bg-green-500/15 text-green-400 border-green-600/30">Saisonal</Badge>}
                    {item.is_special && <Badge className="text-[9px] py-0 px-2 bg-amber-500/15 text-amber-400 border-amber-600/30">Special</Badge>}
                </div>
            )}
        </button>
    );
}

function DrinkDetail({ item, open, onClose }) {
    if (!item) return null;
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl">{item.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {item.image_url && (
                        <img src={item.image_url} alt={item.name} className="w-full h-48 object-cover rounded-xl" />
                    )}
                    <div className="flex items-center justify-between">
                        <p className="text-3xl font-bold text-amber-500">€{Number(item.price).toFixed(2)}</p>
                        <div className="flex gap-2">
                            {item.size && <Badge variant="outline">{item.size}</Badge>}
                            {item.alcohol_content && Number(item.alcohol_content) > 0 && (
                                <Badge variant="outline">{item.alcohol_content}% Vol.</Badge>
                            )}
                        </div>
                    </div>
                    {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}

                    {/* Allergene */}
                    {(item.allergens_list?.length > 0 || item.additives?.length > 0 || item.allergens) && (
                        <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Allergene & Zusatzstoffe</p>
                            {item.allergens_list?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {item.allergens_list.map(a => (
                                        <span key={a} className="px-2 py-0.5 rounded text-xs bg-red-500/10 border border-red-500/20 text-red-400">{a}</span>
                                    ))}
                                </div>
                            )}
                            {item.additives?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {item.additives.map(d => (
                                        <span key={d} className="px-2 py-0.5 rounded text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400">{d}</span>
                                    ))}
                                </div>
                            )}
                            {!item.allergens_list?.length && !item.additives?.length && item.allergens && (
                                <p className="text-xs text-muted-foreground">{item.allergens}</p>
                            )}
                        </div>
                    )}

                    <p className="text-[10px] text-muted-foreground text-center">
                        * Alle Angaben ohne Gewähr. Bei Unverträglichkeiten bitte Personal ansprechen.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function PublicDrinkMenu() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Alle');
    const [activeAllergenFilters, setActiveAllergenFilters] = useState([]);
    const [detailItem, setDetailItem] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    const { data: items = [], isLoading, error: itemsError } = useQuery({
        queryKey: ['public-menu-items'],
        queryFn: () => base44.entities.MenuItem.list('category', 1000),
        retry: 2,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const { data: companyData = [] } = useQuery({
        queryKey: ['company-info'],
        queryFn: () => base44.entities.CompanyInfo.list(),
        retry: 1,
        staleTime: 30 * 60 * 1000, // 30 minutes
    });

    const { data: activeSpecial = null } = useQuery({
        queryKey: ['public-weekly-special'],
        queryFn: async () => {
            const specials = await base44.entities.WeeklySpecial.filter({ is_active: true });
            return specials[0] || null;
        }
    });

    const { data: specialItems = [] } = useQuery({
        queryKey: ['public-weekly-special-items', activeSpecial?.id],
        queryFn: () => activeSpecial ? base44.entities.WeeklySpecialItem.filter({ weekly_special_id: activeSpecial.id }) : Promise.resolve([]),
        enabled: !!activeSpecial?.id
    });

    const companyInfo = companyData[0] || {};
    const barName = companyInfo.company_name || 'Getränkekarte';

    const categories = useMemo(() => {
        const cats = new Set(items.map(i => i.category || 'Sonstiges').filter(Boolean));
        return ['Alle', ...Array.from(cats)];
    }, [items]);

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const itemCategory = item.category || 'Sonstiges';
            if (selectedCategory !== 'Alle' && itemCategory !== selectedCategory) return false;
            if (searchTerm) {
                const q = searchTerm.toLowerCase();
                if (!item.name.toLowerCase().includes(q) &&
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

    const groupedItems = useMemo(() => {
        const map = {};
        filteredItems.forEach(item => {
            const cat = item.category || 'Sonstiges';
            if (!map[cat]) map[cat] = [];
            map[cat].push(item);
        });
        // Sort within each category by order_position
        Object.values(map).forEach(arr => arr.sort((a, b) => (a.order_position || 999) - (b.order_position || 999)));
        return map;
    }, [filteredItems]);

    const toggleAllergenFilter = (id) => {
        setActiveAllergenFilters(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    const activeFilterCount = activeAllergenFilters.length + (selectedCategory !== 'Alle' ? 1 : 0);

    return (
        <div className="min-h-screen bg-background">
            {/* Sticky Header */}
            <header className="sticky top-0 z-40 bg-background border-b border-border/80 backdrop-blur-sm pt-safe">
                <div className="max-w-2xl mx-auto px-4 py-3 space-y-3">
                    {/* Title Bar */}
                    <div className="flex items-center justify-between gap-3 min-h-[48px]">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-md shrink-0">
                                🍹
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg font-bold text-foreground truncate">{barName}</h1>
                                <p className="text-xs text-muted-foreground">Getränke</p>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Suche..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10 h-11 text-base"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowFilters(v => !v)}
                            className={cn(
                                "h-11 px-3 rounded-lg border font-medium transition-all text-sm shrink-0 relative",
                                showFilters || activeFilterCount > 0
                                    ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                                    : "border-border text-muted-foreground hover:text-foreground"
                            )}
                            title="Filter öffnen"
                        >
                            ⚙
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Category Scroll */}
                    <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
                        <div className="flex gap-2 pb-1">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={cn(
                                        "shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px] flex items-center",
                                        selectedCategory === cat
                                            ? "bg-amber-500 text-slate-900 font-bold shadow-lg shadow-amber-500/20"
                                            : "bg-secondary text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Allergen Filters Panel */}
                    {showFilters && (
                        <div className="pt-2 pb-2 border-t border-border space-y-2 animate-in fade-in duration-200">
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Allergen Filter:</p>
                            <div className="flex flex-wrap gap-2">
                                {ALLERGEN_FILTERS.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => toggleAllergenFilter(f.id)}
                                        className={cn(
                                            "px-3 py-2 rounded-full text-xs font-medium border transition-all min-h-[40px] flex items-center",
                                            activeAllergenFilters.includes(f.id)
                                                ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30"
                                                : "border-border text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-500"
                                        )}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Content */}
            <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
                {/* Weekly Special Banner */}
                {activeSpecial && specialItems.length > 0 && (
                    <section className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-l-4 border-amber-500 rounded-r-xl p-6 mb-8">
                        <h2 className="text-2xl font-bold text-amber-400 mb-4">✨ Wochenspecial</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {specialItems
                                .sort((a, b) => a.display_order - b.display_order)
                                .map((item) => (
                                    <div key={item.id} className="bg-card/60 rounded-lg p-3 border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                                        <div className="flex items-baseline justify-between mb-2">
                                            <p className="font-bold text-foreground">{item.menu_item_name}</p>
                                            <p className="text-lg font-bold text-amber-400">€{Number(item.final_price).toFixed(2)}</p>
                                        </div>
                                        <div className="flex gap-2 text-xs text-muted-foreground">
                                            {item.original_price && (
                                                <span className="line-through text-slate-500">€{Number(item.original_price).toFixed(2)}</span>
                                            )}
                                            {item.discount_type === 'fixed' ? (
                                                <span className="text-amber-400 font-semibold">-€{Number(item.discount_value).toFixed(2)}</span>
                                            ) : (
                                                <span className="text-amber-400 font-semibold">-{item.discount_value}%</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </section>
                )}

                {isLoading && (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                    </div>
                )}

                {itemsError && (
                    <div className="text-center py-16 text-red-400">
                        <p className="text-lg font-medium">❌ Fehler beim Laden</p>
                        <p className="text-sm mt-2">Die Getränkekarte konnte nicht geladen werden. Bitte versuche es später erneut.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 text-sm text-amber-500 underline hover:text-amber-400 font-medium"
                        >
                            Seite neu laden
                        </button>
                    </div>
                )}

                {!isLoading && !itemsError && Object.keys(groupedItems).length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        <p className="text-lg font-medium">Keine Getränke gefunden</p>
                        <p className="text-sm mt-1">Versuche andere Filter oder einen anderen Suchbegriff.</p>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={() => { setActiveAllergenFilters([]); setSelectedCategory('Alle'); setSearchTerm(''); }}
                                className="mt-4 text-sm text-amber-500 underline hover:text-amber-400 font-medium"
                            >
                                Filter zurücksetzen
                            </button>
                        )}
                    </div>
                )}

                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                    <section key={category} className="space-y-3">
                        <div className="sticky top-[224px] z-20 bg-background/80 backdrop-blur-sm pt-2 pb-1 border-t border-border/50 mt-6">
                            <h2 className="text-xl font-bold text-foreground">
                                {category} <span className="text-sm font-normal text-muted-foreground ml-2">({categoryItems.length})</span>
                            </h2>
                        </div>
                        <div className="space-y-2.5 pb-2">
                            {categoryItems.map(item => (
                                <DrinkCard key={item.id} item={item} onClick={setDetailItem} />
                            ))}
                        </div>
                    </section>
                ))}
            </main>

            {/* Footer */}
            <footer className="border-t border-border mt-8 px-4 py-6 text-center text-xs text-muted-foreground bg-card/30 pb-safe">
                <p className="font-medium">{barName}</p>
                {companyInfo.phone && <p className="mt-1 text-muted-foreground">☎️ {companyInfo.phone}</p>}
                <p className="mt-3 text-[10px] opacity-50">Preise inkl. MwSt. · Allergie? → Personal fragen</p>
            </footer>

            {/* Detail Dialog */}
            <DrinkDetail item={detailItem} open={!!detailItem} onClose={() => setDetailItem(null)} />
        </div>
    );
}