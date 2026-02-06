import React from 'react';
import { Button } from '@/components/ui/button';
import { Wine, Beer, Coffee, Sparkles, Droplets, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = [
    { value: 'all', label: 'Alle', icon: null },
    { value: 'Cocktails', label: 'Cocktails', icon: Sparkles },
    { value: 'Moonshiner-Cocktails', label: 'Moonshiner', icon: Flame },
    { value: 'Longdrinks', label: 'Longdrinks', icon: Droplets },
    { value: 'Bier', label: 'Bier', icon: Beer },
    { value: 'Wein', label: 'Wein', icon: Wine },
    { value: 'Softdrinks', label: 'Softdrinks', icon: Droplets },
    { value: 'Heißgetränke', label: 'Heiß', icon: Coffee },
];

export default function MenuFilters({ selectedCategory, onCategoryChange }) {
    return (
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.value;
                
                return (
                    <Button
                        key={cat.value}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => onCategoryChange(cat.value)}
                        className={cn(
                            "flex items-center gap-2 whitespace-nowrap",
                            isActive && "bg-amber-500 hover:bg-amber-600"
                        )}
                    >
                        {Icon && <Icon className="w-4 h-4" />}
                        {cat.label}
                    </Button>
                );
            })}
        </div>
    );
}