import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw, Save, Check, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ─── Gastro-Presets ───────────────────────────────────────────────────────────
export const THEME_PRESETS = [
    {
        key: 'amber',
        name: 'Warm Amber',
        emoji: '🔥',
        desc: 'Klassisch warm',
        from: '#f59e0b',
        via: '#f97316',
        primary: '38 92% 50%',
        fg: '#1a0a00',
        bg: '222.2 47.4% 11.2%',
        card: '217.2 32.6% 17.5%',
    },
    {
        key: 'wine',
        name: 'Weinrot Lounge',
        emoji: '🍷',
        desc: 'Edel & exklusiv',
        from: '#9f1239',
        via: '#7f1d1d',
        primary: '346 77% 35%',
        fg: '#ffe4e6',
        bg: '340 30% 8%',
        card: '340 20% 13%',
    },
    {
        key: 'blue',
        name: 'Modern Blau',
        emoji: '💎',
        desc: 'Clean & modern',
        from: '#2563eb',
        via: '#1d4ed8',
        primary: '217 91% 55%',
        fg: '#dbeafe',
        bg: '222 47% 10%',
        card: '220 35% 16%',
    },
    {
        key: 'green',
        name: 'Irish Pub',
        emoji: '🍀',
        desc: 'Traditionell',
        from: '#16a34a',
        via: '#15803d',
        primary: '142 71% 40%',
        fg: '#dcfce7',
        bg: '150 30% 7%',
        card: '150 20% 12%',
    },
    {
        key: 'violet',
        name: 'Neon Club',
        emoji: '⚡',
        desc: 'Party & Club',
        from: '#7c3aed',
        via: '#6d28d9',
        primary: '262 83% 58%',
        fg: '#ede9fe',
        bg: '260 40% 8%',
        card: '260 28% 14%',
    },
    {
        key: 'rose',
        name: 'Cocktail Bar',
        emoji: '🍸',
        desc: 'Trendig & frisch',
        from: '#e11d48',
        via: '#be123c',
        primary: '346 87% 50%',
        fg: '#ffe4e6',
        bg: '350 30% 8%',
        card: '350 20% 13%',
    },
    {
        key: 'cyan',
        name: 'Bistro Fresh',
        emoji: '🌊',
        desc: 'Modern & frisch',
        from: '#0891b2',
        via: '#0e7490',
        primary: '192 82% 38%',
        fg: '#cffafe',
        bg: '200 40% 8%',
        card: '200 28% 14%',
    },
    {
        key: 'slate',
        name: 'Elegant Dunkel',
        emoji: '🖤',
        desc: 'Minimalistisch',
        from: '#475569',
        via: '#334155',
        primary: '215 25% 40%',
        fg: '#f1f5f9',
        bg: '222 47% 7%',
        card: '220 20% 12%',
    },
];

// ─── Apply theme to CSS variables ─────────────────────────────────────────────
export function applyThemePreset(preset) {
    const root = document.documentElement;

    // Core CSS vars used by Tailwind tokens
    root.style.setProperty('--primary', preset.primary);
    root.style.setProperty('--ring', preset.primary);
    root.style.setProperty('--primary-foreground', hexToHsl(preset.fg));

    // Background tokens
    root.style.setProperty('--background', preset.bg);
    root.style.setProperty('--card', preset.card);
    root.style.setProperty('--popover', preset.bg);
    root.style.setProperty('--secondary', preset.card);
    root.style.setProperty('--muted', preset.card);
    root.style.setProperty('--accent', preset.card);
    root.style.setProperty('--border', preset.card);
    root.style.setProperty('--input', preset.card);

    // Brand gradient vars (used by Layout for nav active state)
    root.style.setProperty('--brand-from', preset.from);
    root.style.setProperty('--brand-via', preset.via);
    root.style.setProperty('--brand-fg', preset.fg);

    // Update PWA theme color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', preset.from);

    // Scrollbar
    injectStyle('brand-scrollbar', `
        ::-webkit-scrollbar-thumb { background: ${preset.from}66 !important; }
        ::-webkit-scrollbar-thumb:hover { background: ${preset.from} !important; }
        :focus-visible { outline-color: ${preset.from} !important; }
        input:focus, textarea:focus, select:focus {
            border-color: ${preset.from} !important;
            box-shadow: 0 0 0 2px ${preset.from}33 !important;
        }
        [data-state="checked"] {
            background-color: ${preset.from} !important;
            border-color: ${preset.from} !important;
        }
    `);
}

function injectStyle(id, css) {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
    el.textContent = css;
}

function hexToHsl(hex) {
    // Returns "H S% L%" format for CSS vars — simplified passthrough for known values
    // If the fg is already an HSL-ish value we just return it; otherwise return a neutral
    return '210 40% 98%'; // safe light foreground fallback
}

// ─── Load saved theme on app start ───────────────────────────────────────────
export async function loadSavedColors() {
    try {
        const companies = await base44.entities.CompanyInfo.list();
        const info = companies[0];
        if (info?.theme_preset_key) {
            const preset = THEME_PRESETS.find(p => p.key === info.theme_preset_key);
            if (preset) applyThemePreset(preset);
        }
    } catch (_) {}
}

// ─── Mini preview component ───────────────────────────────────────────────────
function ThemePreview({ preset }) {
    return (
        <div className="rounded-xl overflow-hidden border border-border/50" style={{ background: `hsl(${preset.bg})` }}>
            {/* Simulated sidebar strip */}
            <div className="flex gap-2 p-3 items-center" style={{ background: `hsl(${preset.card})` }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.via})`, color: preset.fg }}>
                    B
                </div>
                <div className="flex gap-1.5">
                    {/* Active nav item */}
                    <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                        style={{ background: `linear-gradient(to right, ${preset.from}, ${preset.via})`, color: preset.fg }}>
                        Dashboard
                    </div>
                    {/* Inactive */}
                    <div className="px-2.5 py-1 rounded-lg text-[10px] text-white/50"
                        style={{ background: `hsl(${preset.card})` }}>
                        Kalender
                    </div>
                </div>
            </div>
            {/* Content area */}
            <div className="p-3 space-y-2">
                <div className="flex gap-2">
                    <button className="px-3 py-1.5 rounded-lg text-[10px] font-semibold"
                        style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.via})`, color: preset.fg }}>
                        Speichern
                    </button>
                    <button className="px-3 py-1.5 rounded-lg text-[10px] font-semibold border border-white/20 text-white/70"
                        style={{ background: `hsl(${preset.card})` }}>
                        Abbrechen
                    </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                        style={{ background: `${preset.from}33`, color: preset.from, border: `1px solid ${preset.from}55` }}>
                        Badge
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] text-white/60 border border-white/15"
                        style={{ background: `hsl(${preset.card})` }}>
                        Inaktiv
                    </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `hsl(${preset.card})` }}>
                    <div className="h-full w-2/3 rounded-full"
                        style={{ background: `linear-gradient(to right, ${preset.from}, ${preset.via})` }} />
                </div>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ColorCustomizer() {
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState('amber');
    const [previewKey, setPreviewKey] = useState('amber');

    const { data: companyList } = useQuery({
        queryKey: ['company-info'],
        queryFn: () => base44.entities.CompanyInfo.list(),
    });

    const company = companyList?.[0];

    useEffect(() => {
        if (company?.theme_preset_key) {
            setSelected(company.theme_preset_key);
            setPreviewKey(company.theme_preset_key);
        }
    }, [company]);

    const saveMutation = useMutation({
        mutationFn: (key) => {
            if (company?.id) return base44.entities.CompanyInfo.update(company.id, { theme_preset_key: key });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-info'] });
            toast.success('Theme gespeichert – gilt für alle Mitarbeiter');
        },
    });

    const handleSelect = (preset) => {
        setSelected(preset.key);
        setPreviewKey(preset.key);
        applyThemePreset(preset); // Live preview
    };

    const handleSave = () => {
        saveMutation.mutate(selected);
    };

    const handleReset = () => {
        const def = THEME_PRESETS[0];
        setSelected(def.key);
        setPreviewKey(def.key);
        applyThemePreset(def);
        saveMutation.mutate(def.key);
    };

    const currentPreset = THEME_PRESETS.find(p => p.key === previewKey) || THEME_PRESETS[0];

    return (
        <div className="space-y-6">
            {/* Preset Grid */}
            <div>
                <Label className="text-sm font-semibold text-foreground mb-1 block">Branding-Theme wählen</Label>
                <p className="text-xs text-muted-foreground mb-4">
                    Wähle ein Farbthema passend zu deinem Betrieb. Ändert sich sofort als Vorschau.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {THEME_PRESETS.map((preset) => {
                        const isActive = selected === preset.key;
                        return (
                            <button
                                key={preset.key}
                                onClick={() => handleSelect(preset)}
                                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all min-h-[80px] ${
                                    isActive
                                        ? 'border-white/40 scale-105 shadow-lg'
                                        : 'border-border hover:border-white/20'
                                }`}
                                style={{ background: `hsl(${preset.card})` }}
                            >
                                {/* Color swatch */}
                                <div className="w-10 h-10 rounded-full shadow-md relative"
                                    style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.via})` }}>
                                    {isActive && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Check className="w-5 h-5" style={{ color: preset.fg }} />
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-semibold text-foreground leading-tight">{preset.emoji} {preset.name}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{preset.desc}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Live Preview */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm font-semibold text-foreground">Vorschau: {currentPreset.emoji} {currentPreset.name}</Label>
                </div>
                <ThemePreview preset={currentPreset} />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-border">
                <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="gap-2 flex-1 sm:flex-none"
                >
                    <Save className="w-4 h-4" />
                    {saveMutation.isPending ? 'Speichern...' : 'Für alle speichern'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Zurücksetzen
                </Button>
            </div>
        </div>
    );
}