import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, Wine } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function PublicDrinkMenu() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Alle');

    const { data: items = [] } = useQuery({
        queryKey: ['public-menu-items'],
        queryFn: () => base44.asServiceRole.entities.MenuItem.filter({ is_available: true })
    });

    const { data: companyData = [] } = useQuery({
        queryKey: ['company-info'],
        queryFn: () => base44.asServiceRole.entities.CompanyInfo.list()
    });

    const companyInfo = companyData[0] || {};
    const barName = companyInfo.company_name || 'BarManager';

    // Get unique categories
    const categories = ['Alle', ...new Set(items.map(item => item.category).filter(Boolean))];

    // Filter items
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchCategory = selectedCategory === 'Alle' || item.category === selectedCategory;
            const matchSearch = searchTerm === '' || 
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            return matchCategory && matchSearch;
        });
    }, [items, selectedCategory, searchTerm]);

    // Group by category
    const groupedItems = useMemo(() => {
        return filteredItems.reduce((acc, item) => {
            const cat = item.category || 'Sonstiges';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
        }, {});
    }, [filteredItems]);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-card border-b border-border/50 backdrop-blur-md">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg">
                            🍷
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{barName}</h1>
                            <p className="text-sm text-muted-foreground">Getränkekarte</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Getränk suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-background border-border"
                        />
                    </div>

                    {/* Category Filter */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {categories.map(cat => (
                            <Button
                                key={cat}
                                variant={selectedCategory === cat ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedCategory(cat)}
                                className={selectedCategory === cat 
                                    ? 'bg-primary hover:bg-primary/90' 
                                    : 'border-border'}
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {Object.entries(groupedItems).length === 0 ? (
                    <Card className="bg-card border-border text-center py-12">
                        <CardContent>
                            <p className="text-muted-foreground">Keine Getränke gefunden</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedItems).map(([category, categoryItems]) => (
                            <div key={category}>
                                <h2 className="text-2xl font-bold text-foreground mb-4">{category}</h2>
                                <div className="space-y-3">
                                    {categoryItems
                                        .sort((a, b) => (a.order_position || 999) - (b.order_position || 999))
                                        .map(item => (
                                            <Card key={item.id} className="bg-card border-border overflow-hidden hover:border-primary/50 transition-colors">
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                                <h3 className="font-semibold text-lg text-foreground">{item.name}</h3>
                                                                {item.is_seasonal && (
                                                                    <Badge className="bg-green-900/50 text-green-300 border-green-800">Saisonal</Badge>
                                                                )}
                                                                {item.is_special && (
                                                                    <Badge className="bg-amber-900/50 text-amber-300 border-amber-800">Special</Badge>
                                                                )}
                                                            </div>
                                                            {item.description && (
                                                                <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                                                            )}
                                                            <div className="flex gap-2 flex-wrap items-center">
                                                                <span className="text-2xl font-bold text-primary">€{item.price.toFixed(2)}</span>
                                                                {item.size && (
                                                                    <Badge variant="outline" className="border-border text-muted-foreground">{item.size}</Badge>
                                                                )}
                                                                {item.alcohol_content && (
                                                                    <Badge variant="outline" className="border-border text-muted-foreground">{item.alcohol_content}% Vol.</Badge>
                                                                )}
                                                            </div>
                                                            {item.allergens && (
                                                                <p className="text-xs text-muted-foreground mt-3">
                                                                    <strong>Allergene:</strong> {item.allergens}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {item.image_url && (
                                                            <img 
                                                                src={item.image_url} 
                                                                alt={item.name}
                                                                className="w-24 h-24 object-cover rounded-lg"
                                                            />
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-card border-t border-border/50 mt-12">
                <div className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
                    <p>© 2026 {barName}</p>
                    {companyInfo.phone && <p>Tel: {companyInfo.phone}</p>}
                </div>
            </footer>
        </div>
    );
}