import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Palette, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const ACCENT_PRESETS = [
    { name: 'Amber', primary: '38 92% 50%', label: '#f59e0b', hex: '#f59e0b' },
    { name: 'Orange', primary: '24 95% 53%', label: '#f97316', hex: '#f97316' },
    { name: 'Rose', primary: '346 87% 60%', label: '#f43f5e', hex: '#f43f5e' },
    { name: 'Violet', primary: '262 83% 58%', label: '#7c3aed', hex: '#7c3aed' },
    { name: 'Blau', primary: '217 91% 60%', label: '#3b82f6', hex: '#3b82f6' },
    { name: 'Cyan', primary: '192 91% 36%', label: '#0891b2', hex: '#0891b2' },
    { name: 'Grün', primary: '142 71% 45%', label: '#22c55e', hex: '#22c55e' },
    { name: 'Smaragd', primary: '160 84% 39%', label: '#10b981', hex: '#10b981' },
    { name: 'Pink', primary: '330 86% 60%', label: '#ec4899', hex: '#ec4899' },
];

const BG_PRESETS = [
    { name: 'Standard Dunkel', bg: '222.2 47.4% 11.2%', card: '217.2 32.6% 17.5%', label: '#1a2236' },
    { name: 'Tief Dunkel', bg: '0 0% 7%', card: '0 0% 12%', label: '#111111' },
    { name: 'Marine', bg: '230 50% 10%', card: '230 40% 15%', label: '#0d1a36' },
    { name: 'Slate', bg: '215 28% 12%', card: '215 25% 18%', label: '#1a2130' },
];

function hslStringToHex(hsl) {
    const [h, s, l] = hsl.split(' ').map((v, i) => i === 0 ? parseFloat(v) : parseFloat(v) / 100);
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export function applyColorTheme(primaryHsl, bgHsl, cardHsl) {
    const root = document.documentElement;
    if (primaryHsl) {
        root.style.setProperty('--primary', primaryHsl);
        root.style.setProperty('--ring', primaryHsl);
    }
    if (bgHsl) root.style.setProperty('--background', bgHsl);
    if (cardHsl) {
        root.style.setProperty('--card', cardHsl);
        root.style.setProperty('--popover', bgHsl || cardHsl);
        root.style.setProperty('--secondary', cardHsl);
        root.style.setProperty('--muted', cardHsl);
        root.style.setProperty('--accent', cardHsl);
        root.style.setProperty('--border', cardHsl);
        root.style.setProperty('--input', cardHsl);
    }
}

export function loadSavedColors() {
    const primary = localStorage.getItem('accentColor');
    const bg = localStorage.getItem('bgColor');
    const card = localStorage.getItem('cardColor');
    if (primary || bg) {
        applyColorTheme(primary, bg, card);
    }
}

export default function ColorCustomizer() {
    const [selectedAccent, setSelectedAccent] = useState(() => localStorage.getItem('accentColor') || ACCENT_PRESETS[0].primary);
    const [selectedBg, setSelectedBg] = useState(() => localStorage.getItem('bgColor') || BG_PRESETS[0].bg);
    const [selectedCard, setSelectedCard] = useState(() => localStorage.getItem('cardColor') || BG_PRESETS[0].card);

    const handleAccentChange = (preset) => {
        setSelectedAccent(preset.primary);
        applyColorTheme(preset.primary, null, null);
        localStorage.setItem('accentColor', preset.primary);
        toast.success(`Akzentfarbe auf ${preset.name} geändert`);
    };

    const handleBgChange = (preset) => {
        setSelectedBg(preset.bg);
        setSelectedCard(preset.card);
        applyColorTheme(null, preset.bg, preset.card);
        localStorage.setItem('bgColor', preset.bg);
        localStorage.setItem('cardColor', preset.card);
        toast.success(`Hintergrund auf ${preset.name} geändert`);
    };

    const handleReset = () => {
        const defaultAccent = ACCENT_PRESETS[0].primary;
        const defaultBg = BG_PRESETS[0].bg;
        const defaultCard = BG_PRESETS[0].card;
        setSelectedAccent(defaultAccent);
        setSelectedBg(defaultBg);
        setSelectedCard(defaultCard);
        applyColorTheme(defaultAccent, defaultBg, defaultCard);
        localStorage.removeItem('accentColor');
        localStorage.removeItem('bgColor');
        localStorage.removeItem('cardColor');
        toast.success('Farben zurückgesetzt');
    };

    return (
        <Card className="p-6 bg-card border-border space-y-6">
            {/* Akzentfarbe */}
            <div>
                <Label className="text-sm font-medium text-foreground mb-1 block">Akzentfarbe</Label>
                <p className="text-xs text-muted-foreground mb-3">Hauptfarbe für Buttons, aktive Elemente und Highlights</p>
                <div className="flex flex-wrap gap-2">
                    {ACCENT_PRESETS.map((preset) => {
                        const isActive = selectedAccent === preset.primary;
                        return (
                            <button
                                key={preset.name}
                                onClick={() => handleAccentChange(preset)}
                                title={preset.name}
                                className={`relative w-10 h-10 rounded-full border-2 transition-all ${isActive ? 'border-foreground scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: preset.hex }}
                            >
                                {isActive && (
                                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">✓</span>
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    {ACCENT_PRESETS.map((preset) => (
                        selectedAccent === preset.primary && (
                            <span key={preset.name} className="text-xs text-muted-foreground">{preset.name} ausgewählt</span>
                        )
                    ))}
                </div>
            </div>

            {/* Hintergrund */}
            <div>
                <Label className="text-sm font-medium text-foreground mb-1 block">Hintergrundfarbe</Label>
                <p className="text-xs text-muted-foreground mb-3">Basis-Hintergrund der App (nur im Dunkelmodus)</p>
                <div className="flex flex-wrap gap-3">
                    {BG_PRESETS.map((preset) => {
                        const isActive = selectedBg === preset.bg;
                        return (
                            <button
                                key={preset.name}
                                onClick={() => handleBgChange(preset)}
                                title={preset.name}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${isActive ? 'border-primary scale-105' : 'border-border hover:border-muted-foreground'}`}
                            >
                                <div
                                    className="w-10 h-10 rounded-lg border border-white/10"
                                    style={{ backgroundColor: preset.label }}
                                />
                                <span className="text-[10px] text-muted-foreground">{preset.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Reset */}
            <div className="pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Farben zurücksetzen
                </Button>
            </div>
        </Card>
    );
}