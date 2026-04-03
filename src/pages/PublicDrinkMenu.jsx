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
            className="w-full text-left bg-card border border-border rounded-2xl p-4 flex gap-3 items-start active:scale-[0.98] transition-transform hover:border-amber-500/40"
        >
            {item.image_url && (
                <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-xl shrink-0" />
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="font-semibold text-foreground leading-tight">{item.name}</p>
                        {item.size && <p className="text-xs text-muted-foreground">{item.size}</p>}
                    </div>
                    <p className="text-lg font-bold text-amber-500 shrink-0">€{Number(item.price).toFixed(2)}</p>
                </div>
                {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                    {item.is_seasonal && <Badge className="text-[10px] py-0 bg-green-500/10 text-green-400 border-green-500/30">Saisonal</Badge>}
                    {item.is_special && <Badge className="text-[10px] py-0 bg-amber-500/10 text-amber-400 border-amber-500/30">Special</Badge>}
                    {item.alcohol_content && Number(item.alcohol_content) > 0 && (
                        <Badge variant="outline" className="text-[10px] py-0 border-border text-muted-foreground">{item.alcohol_content}% Vol.</Badge>
                    )}
                    {hasInfo && (
                        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Info className="w-3 h-3" /> Allergene
                        </span>
                    )}
                </div>
            </div>
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

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['public-menu-items'],
        queryFn: () => base44.asServiceRole.entities.MenuItem.filter({ is_available: true })
    });

    const { data: companyData = [] } = useQuery({
        queryKey: ['company-info'],
        queryFn: () => base44.asServiceRole.entities.CompanyInfo.list()
    });

    const companyInfo = companyData[0] || {};
    const barName = companyInfo.company_name || 'Getränkekarte';

    const categories = useMemo(() => ['Alle', ...new Set(items.map(i => i.category).filter(Boolean))], [items]);

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            if (selectedCategory !== 'Alle' && item.category !== selectedCategory) return false;
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
            <header className="sticky top-0 z-40 bg-card/95 border-b border-border backdrop-blur-md">
                <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
                    {/* Title */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl shadow-lg shrink-0">
                            🍹
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground leading-tight">{barName}</h1>
                            <p className="text-xs text-muted-foreground">Getränkekarte</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Getränk suchen..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowFilters(v => !v)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                                showFilters || activeFilterCount > 0
                                    ? "bg-amber-500 text-slate-900 border-amber-500"
                                    : "border-border text-muted-foreground hover:border-border/80"
                            )}
                        >
                            Filter
                            {activeFilterCount > 0 && (
                                <span className="bg-slate-900 text-amber-500 text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>
                            )}
                            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showFilters && "rotate-180")} />
                        </button>
                    </div>

                    {/* Category pills */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                                    selectedCategory === cat
                                        ? "bg-amber-500 text-slate-900"
                                        : "bg-secondary text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Allergen filters (expandable) */}
                    {showFilters && (
                        <div className="flex flex-wrap gap-2 pt-1 pb-1 border-t border-border">
                            <p className="w-full text-xs text-muted-foreground font-medium">Ohne / Mit:</p>
                            {ALLERGEN_FILTERS.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => toggleAllergenFilter(f.id)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                                        activeAllergenFilters.includes(f.id)
                                            ? "bg-emerald-500 text-white border-emerald-500"
                                            : "border-border text-muted-foreground hover:border-emerald-500/50"
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* Content */}
            <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
                {isLoading && (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                    </div>
                )}

                {!isLoading && Object.keys(groupedItems).length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        <p className="text-lg font-medium">Keine Getränke gefunden</p>
                        <p className="text-sm mt-1">Versuche andere Filter oder einen anderen Suchbegriff.</p>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={() => { setActiveAllergenFilters([]); setSelectedCategory('Alle'); setSearchTerm(''); }}
                                className="mt-4 text-sm text-amber-500 underline"
                            >
                                Filter zurücksetzen
                            </button>
                        )}
                    </div>
                )}

                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                    <section key={category}>
                        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                            {category}
                            <span className="text-sm font-normal text-muted-foreground">({categoryItems.length})</span>
                        </h2>
                        <div className="space-y-2">
                            {categoryItems.map(item => (
                                <DrinkCard key={item.id} item={item} onClick={setDetailItem} />
                            ))}
                        </div>
                    </section>
                ))}
            </main>

            {/* Footer */}
            <footer className="border-t border-border mt-12 px-4 py-8 text-center text-xs text-muted-foreground max-w-2xl mx-auto">
                <p>© {new Date().getFullYear()} {barName}</p>
                {companyInfo.phone && <p className="mt-1">Tel: {companyInfo.phone}</p>}
                <p className="mt-3 text-[10px] opacity-60">Alle Preise inkl. MwSt. · Irrtümer vorbehalten</p>
            </footer>

            {/* Detail Dialog */}
            <DrinkDetail item={detailItem} open={!!detailItem} onClose={() => setDetailItem(null)} />
        </div>
    );
}