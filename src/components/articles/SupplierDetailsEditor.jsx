import React, { useState } from 'react';
import { Plus, Trash2, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const emptySupplier = () => ({
    supplier_name: '',
    purchase_price: '',
    article_number: '',
    packaging_info: '',
    notes: '',
    is_primary: false,
});

export default function SupplierDetailsEditor({ value = [], onChange, availableSuppliers = [] }) {
    const [expandedIdx, setExpandedIdx] = useState(null);
    const [newName, setNewName] = useState('');

    const update = (idx, field, val) => {
        const updated = value.map((s, i) => i === idx ? { ...s, [field]: val } : s);
        onChange(updated);
    };

    const setPrimary = (idx) => {
        const updated = value.map((s, i) => ({ ...s, is_primary: i === idx }));
        onChange(updated);
    };

    const remove = (idx) => {
        onChange(value.filter((_, i) => i !== idx));
        if (expandedIdx === idx) setExpandedIdx(null);
    };

    const add = (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const already = value.find(s => s.supplier_name.toLowerCase() === trimmed.toLowerCase());
        if (already) return;
        const isFirst = value.length === 0;
        onChange([...value, { ...emptySupplier(), supplier_name: trimmed, is_primary: isFirst }]);
        setNewName('');
        setExpandedIdx(value.length);
    };

    const cheapestPrice = value.reduce((min, s) => {
        const p = parseFloat(s.purchase_price);
        return !isNaN(p) && (min === null || p < min) ? p : min;
    }, null);

    const suggestions = availableSuppliers.filter(
        s => !value.find(v => v.supplier_name === s) && s.toLowerCase().includes(newName.toLowerCase())
    );

    return (
        <div className="space-y-3">
            {/* Supplier list */}
            {value.map((s, idx) => {
                const price = parseFloat(s.purchase_price);
                const isCheapest = !isNaN(price) && cheapestPrice !== null && price === cheapestPrice && value.filter(v => !isNaN(parseFloat(v.purchase_price))).length > 1;
                const isOpen = expandedIdx === idx;

                return (
                    <div key={idx} className={cn(
                        'rounded-xl border overflow-hidden transition-all',
                        s.is_primary ? 'border-amber-500/50 bg-amber-500/5' : 'border-border bg-card'
                    )}>
                        {/* Header row */}
                        <div className="flex items-center gap-2 px-3 py-2.5">
                            <button
                                type="button"
                                onClick={() => setPrimary(idx)}
                                title="Als Hauptlieferant setzen"
                                className={cn('shrink-0 transition-colors', s.is_primary ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400')}
                            >
                                <Star className={cn('w-4 h-4', s.is_primary && 'fill-amber-400')} />
                            </button>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm text-foreground">{s.supplier_name}</span>
                                    {s.purchase_price && (
                                        <span className={cn(
                                            'text-xs font-semibold px-1.5 py-0.5 rounded',
                                            isCheapest ? 'bg-green-500/20 text-green-400' : 'text-muted-foreground'
                                        )}>
                                            {isCheapest && '✓ '}{parseFloat(s.purchase_price).toFixed(2)} €
                                        </span>
                                    )}
                                    {s.packaging_info && (
                                        <span className="text-xs text-muted-foreground">{s.packaging_info}</span>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setExpandedIdx(isOpen ? null : idx)}
                                className="text-muted-foreground hover:text-foreground p-1"
                            >
                                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <button type="button" onClick={() => remove(idx)} className="text-muted-foreground hover:text-red-400 p-1">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Expanded details */}
                        {isOpen && (
                            <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Einkaufspreis (€)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={s.purchase_price}
                                            onChange={e => update(idx, 'purchase_price', e.target.value)}
                                            placeholder="z.B. 12.50"
                                            className="h-10 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Art.-Nr. Lieferant</Label>
                                        <Input
                                            value={s.article_number}
                                            onChange={e => update(idx, 'article_number', e.target.value)}
                                            placeholder="optional"
                                            className="h-10 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Gebinde / Verpackung</Label>
                                    <Input
                                        value={s.packaging_info}
                                        onChange={e => update(idx, 'packaging_info', e.target.value)}
                                        placeholder="z.B. 24er Kiste, 6er Pack"
                                        className="h-10 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Notizen</Label>
                                    <Input
                                        value={s.notes}
                                        onChange={e => update(idx, 'notes', e.target.value)}
                                        placeholder="z.B. nur auf Anfrage"
                                        className="h-10 text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Price comparison hint */}
            {value.filter(s => s.purchase_price).length > 1 && (
                <p className="text-xs text-green-400 flex items-center gap-1">
                    ✓ Günstigster Preis ist markiert
                </p>
            )}

            {/* Add supplier */}
            <div className="space-y-2">
                <div className="flex gap-2">
                    <Input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(newName); } }}
                        placeholder="Lieferant hinzufügen..."
                        className="h-11 text-base flex-1"
                        list="supplier-suggestions"
                    />
                    <datalist id="supplier-suggestions">
                        {suggestions.map(s => <option key={s} value={s} />)}
                    </datalist>
                    <Button type="button" variant="outline" onClick={() => add(newName)} disabled={!newName.trim()} className="h-11 px-4">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                {/* Quick add from known suppliers — show all when empty, filter when typing */}
                {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {suggestions.slice(0, 8).map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => add(s)}
                                className="text-sm px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-amber-500/50 active:scale-95 transition-all"
                            >
                                + {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}