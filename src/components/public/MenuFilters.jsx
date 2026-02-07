import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

export default function MenuFilters({ selectedCategory, onCategoryChange }) {
    const { data: menuItems = [] } = useQuery({
        queryKey: ['publicMenu'],
        queryFn: async () => {
            const response = await base44.functions.invoke('getPublicMenu', {});
            return response.data.items || [];
        }
    });

    const categories = ['all', ...new Set(menuItems.map(item => item.category).filter(Boolean))];

    return (
        <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
                <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => onCategoryChange(cat)}
                    className={selectedCategory === cat 
                        ? "bg-amber-500 hover:bg-amber-600 text-slate-900 whitespace-nowrap" 
                        : "border-slate-600 text-slate-300 hover:bg-slate-700 whitespace-nowrap"}
                >
                    {cat === 'all' ? 'Alle' : cat}
                </Button>
            ))}
        </div>
    );
}