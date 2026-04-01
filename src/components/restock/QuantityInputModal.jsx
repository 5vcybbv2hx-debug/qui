import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK = [1, 5, 10, 24];

export default function QuantityInputModal({ open, onClose, onConfirm, articleName, existingQuantity = null }) {
    const [display, setDisplay] = useState('1');

    useEffect(() => {
        if (open) setDisplay('1');
    }, [open]);

    const value = parseInt(display) || 0;

    const press = (digit) => {
        setDisplay(prev => {
            const next = prev === '0' || prev === '1' && digit !== '0' ? String(digit) : prev + String(digit);
            return next.length > 4 ? prev : next;
        });
    };

    const backspace = () => {
        setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '1');
    };

    const adjust = (delta) => {
        setDisplay(prev => {
            const next = Math.max(1, (parseInt(prev) || 0) + delta);
            return String(next);
        });
    };

    const handleConfirm = () => {
        if (value < 1) return;
        onConfirm(value);
    };

    const digits = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-xs p-0 overflow-hidden max-h-[95dvh]">
                {/* Article name banner */}
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        {existingQuantity !== null ? 'Menge ändern' : 'Menge eingeben'}
                    </p>
                    <p className="font-semibold text-foreground text-sm mt-0.5 truncate">{articleName}</p>
                    {existingQuantity !== null && (
                        <p className="text-xs text-muted-foreground mt-0.5">Aktuell: {existingQuantity}×</p>
                    )}
                </div>

                <div className="p-4 space-y-3">
                    {/* Big display */}
                    <div className="flex items-center justify-between bg-secondary/50 rounded-xl px-4 py-3">
                        <span className="text-5xl font-bold text-foreground tracking-tight">{display}</span>
                        <div className="flex flex-col gap-1">
                            <button onClick={() => adjust(1)} className="w-10 h-10 rounded-lg bg-green-500/20 text-green-400 font-bold text-lg flex items-center justify-center active:scale-95">+</button>
                            <button onClick={() => adjust(-1)} disabled={value <= 1} className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 font-bold text-lg flex items-center justify-center active:scale-95 disabled:opacity-30">−</button>
                        </div>
                    </div>

                    {/* Quick qty buttons */}
                    <div className="grid grid-cols-4 gap-2">
                        {QUICK.map(q => (
                            <button
                                key={q}
                                onClick={() => setDisplay(String(q))}
                                className={cn(
                                    'h-11 rounded-xl border text-sm font-semibold transition-all active:scale-95',
                                    value === q
                                        ? 'bg-amber-500 text-slate-900 border-amber-500'
                                        : 'border-border text-muted-foreground hover:text-foreground bg-card'
                                )}
                            >
                                {q}×
                            </button>
                        ))}
                    </div>

                    {/* Numpad */}
                    <div className="grid grid-cols-3 gap-2">
                        {digits.map(d => (
                            <button
                                key={d}
                                onClick={() => press(d)}
                                className="h-14 rounded-xl bg-secondary text-foreground text-xl font-semibold active:bg-secondary/70 active:scale-95 transition-all"
                            >
                                {d}
                            </button>
                        ))}
                        {/* Bottom row: 0, backspace */}
                        <button onClick={() => press('0')} className="h-14 rounded-xl bg-secondary text-foreground text-xl font-semibold active:bg-secondary/70 active:scale-95 transition-all">
                            0
                        </button>
                        <button onClick={backspace} className="h-14 rounded-xl bg-secondary text-muted-foreground active:bg-secondary/70 active:scale-95 transition-all col-span-2 flex items-center justify-center gap-2">
                            <Delete className="w-5 h-5" />
                            <span className="text-sm font-medium">Löschen</span>
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button variant="outline" onClick={onClose} className="h-12 text-base">
                            <X className="w-4 h-4 mr-1" /> Abbrechen
                        </Button>
                        <Button onClick={handleConfirm} disabled={value < 1}
                            className="h-12 text-base bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold">
                            <Check className="w-4 h-4 mr-1" /> {existingQuantity !== null ? 'Speichern' : `${value}× Hinzufügen`}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}