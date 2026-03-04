import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Wine, Calendar, ArrowDownAZ, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';

function MenuItemCard({ item }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className={`flex items-start gap-3 py-4 border-b border-white/10 last:border-0 ${!item.is_available ? 'opacity-40' : ''}`}>
            {item.image_url && (
                <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-base leading-tight">{item.name}</p>
                        {item.size && (
                            <p className="text-xs text-slate-400 mt-0.5">{item.size}</p>
                        )}
                    </div>
                    <p className="text-amber-400 font-bold text-lg flex-shrink-0">{Number(item.price).toFixed(2)} €</p>
                </div>

                {item.description && (
                    <div>
                        <p className={`text-sm text-slate-400 mt-1 ${expanded ? '' : 'line-clamp-2'}`}>
                            {item.description}
                        </p>
                        {item.description.length > 80 && (
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="text-xs text-amber-400 mt-0.5 flex items-center gap-0.5"
                            >
                                {expanded ? <><ChevronUp className="w-3 h-3" />weniger</> : <><ChevronDown className="w-3 h-3" />mehr</>}
                            </button>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap gap-1 mt-2">
                    {item.is_seasonal && <Badge className="bg-green-900/50 text-green-300 border-green-800 text-xs">Saisonal</Badge>}
                    {item.is_special && <Badge className="bg-amber-900/50 text-amber-300 border-amber-800 text-xs">Special</Badge>}
                    {item.alcohol_content && <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">{item.alcohol_content}% Vol.</Badge>}
                    {item.subcategory && <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">{item.subcategory}</Badge>}
                </div>

                {item.allergens && (
                    <p className="text-xs text-slate-500 mt-1">Allergene: {item.allergens}</p>
                )}
            </div>
        </div>
    );
}

export default function PublicMenu() {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('alpha');
    const urlParams = new URLSearchParams(window.location.search);
    const tableNumber = urlParams.get('table');

    const { data: menuItems = [], isLoading } = useQuery({
        queryKey: ['publicMenu'],
        queryFn: async () => {
            try {
                return await base44.entities.MenuItem.filter({ is_available: true });
            } catch {
                return [];
            }
        }
    });

    const { data: companyInfo } = useQuery({
        queryKey: ['companyInfo'],
        queryFn: async () => {
            try {
                const data = await base44.entities.CompanyInfo.list();
                return data[0] || {};
            } catch {
                return {};
            }
        }
    });

    const categories = ['all', ...new Set(menuItems.map(i => i.category).filter(Boolean))];

    const filteredItems = (selectedCategory === 'all'
        ? menuItems
        : menuItems.filter(item => item.category === selectedCategory)
    ).slice().sort((a, b) => {
        if (sortBy === 'price') return (a.price || 0) - (b.price || 0);
        return (a.name || '').localeCompare(b.name || '', 'de');
    });

    const grouped = filteredItems.reduce((acc, item) => {
        const cat = item.category || 'Sonstiges';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const barName = companyInfo?.company_name || 'BarManager';

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl border-b border-white/10">
                <div className="px-4 pt-4 pb-3 max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                                <Wine className="w-5 h-5 text-slate-900" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white leading-tight">{barName}</h1>
                                {tableNumber && <p className="text-xs text-slate-400">Tisch {tableNumber}</p>}
                            </div>
                        </div>
                        <Link to={createPageUrl('PublicReservation')}>
                            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
                                <Calendar className="w-4 h-4 mr-1" />
                                Tisch reservieren
                            </Button>
                        </Link>
                    </div>

                    {/* Sort buttons */}
                    <div className="flex gap-2 mb-3">
                        <button
                            onClick={() => setSortBy('alpha')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sortBy === 'alpha' ? 'bg-amber-500 text-slate-900' : 'bg-white/10 text-slate-300'}`}
                        >
                            <ArrowDownAZ className="w-4 h-4" /> A–Z
                        </button>
                        <button
                            onClick={() => setSortBy('price')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sortBy === 'price' ? 'bg-amber-500 text-slate-900' : 'bg-white/10 text-slate-300'}`}
                        >
                            <ArrowUpDown className="w-4 h-4" /> Preis
                        </button>
                    </div>

                    {/* Category pills */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                    selectedCategory === cat
                                        ? 'bg-amber-500 text-slate-900'
                                        : 'bg-white/10 text-slate-300'
                                }`}
                            >
                                {cat === 'all' ? 'Alle' : cat}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-2xl mx-auto px-4 py-4 pb-12">
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-20">
                        <Wine className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">Keine Getränke gefunden</p>
                    </div>
                ) : selectedCategory === 'all' ? (
                    // Grouped by category when "Alle" is selected
                    Object.entries(grouped).map(([category, items]) => (
                        <div key={category} className="mb-6">
                            <h2 className="text-base font-bold text-amber-400 uppercase tracking-wider mb-1">{category}</h2>
                            <div className="bg-white/5 rounded-2xl px-4">
                                {items.map(item => <MenuItemCard key={item.id} item={item} />)}
                            </div>
                        </div>
                    ))
                ) : (
                    // Flat list when category is selected
                    <div className="bg-white/5 rounded-2xl px-4">
                        {filteredItems.map(item => <MenuItemCard key={item.id} item={item} />)}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 px-4 py-6 text-center max-w-2xl mx-auto">
                <p className="text-slate-500 text-sm">{companyInfo?.phone && `Tel: ${companyInfo.phone}`}</p>
                <p className="text-slate-600 text-xs mt-1">© 2026 {barName}</p>
            </footer>
        </div>
    );
}