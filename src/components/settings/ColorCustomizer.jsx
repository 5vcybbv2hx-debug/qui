import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export const ACCENT_PRESETS = [
    { name: 'Amber (Standard)', key: 'amber', from: '#f59e0b', via: '#f97316', ring: '38 92% 50%' },
    { name: 'Orange', key: 'orange', from: '#f97316', via: '#ef4444', ring: '24 95% 53%' },
    { name: 'Rose', key: 'rose', from: '#f43f5e', via: '#e11d48', ring: '346 87% 60%' },
    { name: 'Violet', key: 'violet', from: '#7c3aed', via: '#6d28d9', ring: '262 83% 58%' },
    { name: 'Blau', key: 'blue', from: '#3b82f6', via: '#2563eb', ring: '217 91% 60%' },
    { name: 'Cyan', key: 'cyan', from: '#06b6d4', via: '#0891b2', ring: '192 91% 50%' },
    { name: 'Grün', key: 'green', from: '#22c55e', via: '#16a34a', ring: '142 71% 45%' },
    { name: 'Pink', key: 'pink', from: '#ec4899', via: '#db2777', ring: '330 86% 60%' },
];

const BG_PRESETS = [
    { name: 'Standard', key: 'default', bg: '222.2 47.4% 11.2%', card: '217.2 32.6% 17.5%', hex: '#1a2236' },
    { name: 'Tief Dunkel', key: 'deep', bg: '0 0% 7%', card: '0 0% 12%', hex: '#111111' },
    { name: 'Marine', key: 'navy', bg: '230 50% 10%', card: '230 40% 15%', hex: '#0d1a36' },
    { name: 'Slate', key: 'slate', bg: '215 28% 12%', card: '215 25% 18%', hex: '#1a2130' },
];

export function applyAccentColor(preset) {
    const root = document.documentElement;
    // CSS Variablen setzen
    root.style.setProperty('--primary', preset.ring);
    root.style.setProperty('--ring', preset.ring);
    // Gradient-Farben als custom properties für die Sidebar
    root.style.setProperty('--accent-from', preset.from);
    root.style.setProperty('--accent-via', preset.via || preset.from);
    // data-accent für eventuelle CSS-Selektoren
    root.setAttribute('data-accent', preset.key);
}

export function applyBgColor(preset) {
    const root = document.documentElement;
    root.style.setProperty('--background', preset.bg);
    root.style.setProperty('--card', preset.card);
    root.style.setProperty('--popover', preset.bg);
    root.style.setProperty('--secondary', preset.card);
    root.style.setProperty('--muted', preset.card);
    root.style.setProperty('--accent', preset.card);
    root.style.setProperty('--border', preset.card);
    root.style.setProperty('--input', preset.card);
    root.setAttribute('data-bg', preset.key);
}

export function loadSavedColors() {
    const accentKey = localStorage.getItem('accentKey');
    const bgKey = localStorage.getItem('bgKey');

    if (accentKey) {
        const preset = ACCENT_PRESETS.find(p => p.key === accentKey);
        if (preset) applyAccentColor(preset);
    }
    if (bgKey) {
        const preset = BG_PRESETS.find(p => p.key === bgKey);
        if (preset) applyBgColor(preset);
    }
}

export default function ColorCustomizer() {
    const [selectedAccent, setSelectedAccent] = useState(
        () => localStorage.getItem('accentKey') || 'amber'
    );
    const [selectedBg, setSelectedBg] = useState(
        () => localStorage.getItem('bgKey') || 'default'
    );

    const handleAccentChange = (preset) => {
        setSelectedAccent(preset.key);
        applyAccentColor(preset);
        localStorage.setItem('accentKey', preset.key);
        toast.success(`Akzentfarbe: ${preset.name}`);
    };

    const handleBgChange = (preset) => {
        setSelectedBg(preset.key);
        applyBgColor(preset);
        localStorage.setItem('bgKey', preset.key);
        toast.success(`Hintergrund: ${preset.name}`);
    };

    const handleReset = () => {
        setSelectedAccent('amber');
        setSelectedBg('default');
        applyAccentColor(ACCENT_PRESETS[0]);
        applyBgColor(BG_PRESETS[0]);
        localStorage.removeItem('accentKey');
        localStorage.removeItem('bgKey');
        const root = document.documentElement;
        root.removeAttribute('data-accent');
        root.removeAttribute('data-bg');
        toast.success('Farben zurückgesetzt');
    };

    return (
        <Card className="p-6 bg-card border-border space-y-6">
            {/* Akzentfarbe */}
            <div>
                <Label className="text-sm font-medium text-foreground mb-1 block">Akzentfarbe</Label>
                <p className="text-xs text-muted-foreground mb-3">
                    Hauptfarbe für aktive Menüpunkte, Buttons und Highlights
                </p>
                <div className="flex flex-wrap gap-3">
                    {ACCENT_PRESETS.map((preset) => {
                        const isActive = selectedAccent === preset.key;
                        return (
                            <button
                                key={preset.key}
                                onClick={() => handleAccentChange(preset)}
                                title={preset.name}
                                className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                                    isActive ? 'border-foreground scale-105 shadow-lg' : 'border-transparent hover:border-muted-foreground'
                                }`}
                            >
                                <div
                                    className="w-10 h-10 rounded-full shadow-md"
                                    style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.via})` }}
                                >
                                    {isActive && (
                                        <span className="flex items-center justify-center w-full h-full text-white text-sm font-bold">✓</span>
                                    )}
                                </div>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{preset.name.split(' ')[0]}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Hintergrundfarbe */}
            <div>
                <Label className="text-sm font-medium text-foreground mb-1 block">Hintergrundfarbe</Label>
                <p className="text-xs text-muted-foreground mb-3">Dunkler Basiston der App</p>
                <div className="flex flex-wrap gap-3">
                    {BG_PRESETS.map((preset) => {
                        const isActive = selectedBg === preset.key;
                        return (
                            <button
                                key={preset.key}
                                onClick={() => handleBgChange(preset)}
                                title={preset.name}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                                    isActive ? 'border-foreground scale-105' : 'border-border hover:border-muted-foreground'
                                }`}
                            >
                                <div
                                    className="w-10 h-10 rounded-lg border border-white/10"
                                    style={{ backgroundColor: preset.hex }}
                                />
                                <span className="text-[10px] text-muted-foreground">{preset.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Vorschau */}
            <div className="rounded-xl overflow-hidden border border-border">
                <div className="px-4 py-3 text-xs font-semibold text-muted-foreground bg-secondary">Vorschau</div>
                <div className="p-4 flex gap-3 items-center">
                    <div
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-900"
                        style={{ background: `linear-gradient(135deg, ${ACCENT_PRESETS.find(p => p.key === selectedAccent)?.from}, ${ACCENT_PRESETS.find(p => p.key === selectedAccent)?.via})` }}
                    >
                        Aktiver Button
                    </div>
                    <div className="px-4 py-2 rounded-lg text-sm border border-border text-muted-foreground">
                        Inaktiv
                    </div>
                </div>
            </div>

            {/* Reset */}
            <div className="pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Zurücksetzen
                </Button>
            </div>
        </Card>
    );
}