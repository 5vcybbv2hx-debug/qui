import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import MenuCard from '@/components/public/MenuCard';
import MenuFilters from '@/components/public/MenuFilters';
import { Wine, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PublicMenu() {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const urlParams = new URLSearchParams(window.location.search);
    const tableNumber = urlParams.get('table');

    const { data: menuItems = [], isLoading } = useQuery({
        queryKey: ['publicMenu'],
        queryFn: async () => {
            const items = await base44.entities.MenuItem.filter({ is_available: true });
            return items.sort((a, b) => (a.order_position || 999) - (b.order_position || 999));
        }
    });

    const { data: companyInfo } = useQuery({
        queryKey: ['companyInfo'],
        queryFn: async () => {
            const infos = await base44.entities.CompanyInfo.list();
            return infos[0] || {};
        }
    });

    const filteredItems = selectedCategory === 'all' 
        ? menuItems 
        : menuItems.filter(item => item.category === selectedCategory);

    const barName = companyInfo?.company_name || 'BarManager';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="bg-card/95 backdrop-blur-xl border-b border-border/50 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                                <Wine className="w-6 h-6 text-slate-900" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">{barName}</h1>
                                {tableNumber && (
                                    <p className="text-sm text-muted-foreground">Tisch {tableNumber}</p>
                                )}
                            </div>
                        </div>
                        <Link to={createPageUrl('PublicReservation')}>
                            <Button className="bg-amber-500 hover:bg-amber-600">
                                <Calendar className="w-4 h-4 mr-2" />
                                Reservieren
                            </Button>
                        </Link>
                    </div>
                    <MenuFilters 
                        selectedCategory={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                    />
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-64 bg-card animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-20">
                        <Wine className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-foreground mb-2">
                            Keine Getränke gefunden
                        </h2>
                        <p className="text-muted-foreground">
                            {selectedCategory === 'all' 
                                ? 'Die Getränkekarte ist derzeit leer.' 
                                : 'In dieser Kategorie sind keine Getränke verfügbar.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.map((item) => (
                            <MenuCard key={item.id} item={item} />
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-card/95 backdrop-blur-xl border-t border-border/50 mt-20">
                <div className="max-w-7xl mx-auto px-4 py-8 text-center">
                    <p className="text-muted-foreground mb-2">
                        {companyInfo?.address || ''}
                    </p>
                    <p className="text-muted-foreground mb-4">
                        {companyInfo?.phone && `Tel: ${companyInfo.phone}`}
                        {companyInfo?.phone && companyInfo?.email && ' • '}
                        {companyInfo?.email && `E-Mail: ${companyInfo.email}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        © 2026 {barName}. Alle Rechte vorbehalten.
                    </p>
                </div>
            </footer>
        </div>
    );
}