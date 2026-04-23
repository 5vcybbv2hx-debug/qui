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
    root.style.setProperty('--primary-foreground', '210 40% 98%');

    // Background tokens
    root.style.setProperty('--background', preset.bg);
    root.style.setProperty('--card', preset.card);
    root.style.setProperty('--popover', preset.bg);
    root.style.setProperty('--secondary', preset.card);
    root.style.setProperty('--muted', preset.card);
    root.style.setProperty('--accent', preset.card);
    root.style.setProperty('--border', preset.card);
    root.style.setProperty('--input', preset.card);

    // Brand gradient vars (used by Layout and all inline style brand refs)
    root.style.setProperty('--brand-from', preset.from);
    root.style.setProperty('--brand-via', preset.via);
    root.style.setProperty('--brand-fg', preset.fg);

    // Update PWA theme color
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.name = 'theme-color';
        document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', preset.from);

    // ─── Comprehensive brand CSS override ───────────────────────────────────────
    // Replaces ALL hardcoded amber/orange/brand Tailwind classes app-wide
    injectStyle('brand-overrides', `
        /* ── Gradient utilities ── */
        .from-amber-400, .from-amber-500, .from-amber-600,
        .from-orange-500, .from-orange-600 {
            --tw-gradient-from: ${preset.from} !important;
        }
        .via-amber-500, .via-amber-600, .via-orange-500, .via-orange-600 {
            --tw-gradient-via: ${preset.via} !important;
        }
        .to-amber-500, .to-amber-600, .to-orange-500, .to-orange-600 {
            --tw-gradient-to: ${preset.via} !important;
        }

        /* ── Background colors ── */
        .bg-amber-400, .bg-amber-500, .bg-amber-600, .bg-amber-700,
        .bg-orange-500, .bg-orange-600 {
            background-color: ${preset.from} !important;
        }
        .bg-amber-500\/10, .bg-amber-500\/20 { background-color: ${preset.from}1a !important; }
        .bg-amber-500\/5  { background-color: ${preset.from}0d !important; }
        .bg-amber-600\/20 { background-color: ${preset.from}33 !important; }
        .bg-amber-600\/10 { background-color: ${preset.from}1a !important; }
        .bg-amber-900\/30, .bg-amber-900\/20 { background-color: ${preset.from}22 !important; }
        .bg-orange-500\/10 { background-color: ${preset.via}1a !important; }

        /* ── Text colors ── */
        .text-amber-400, .text-amber-500, .text-amber-600,
        .text-orange-400, .text-orange-500 {
            color: ${preset.from} !important;
        }
        .text-amber-300 { color: ${preset.from}cc !important; }

        /* ── Border colors ── */
        .border-amber-500, .border-amber-600, .border-amber-700,
        .border-orange-500, .border-orange-600 {
            border-color: ${preset.from} !important;
        }
        .border-amber-500\/20 { border-color: ${preset.from}33 !important; }
        .border-amber-500\/30 { border-color: ${preset.from}4d !important; }
        .border-amber-600\/30 { border-color: ${preset.from}4d !important; }
        .border-amber-700 { border-color: ${preset.from}99 !important; }

        /* ── Hover backgrounds ── */
        .hover\:bg-amber-600:hover, .hover\:bg-amber-700:hover {
            background-color: ${preset.via} !important;
        }
        .hover\:bg-amber-500\/10:hover { background-color: ${preset.from}1a !important; }
        .hover\:border-amber-500:hover { border-color: ${preset.from} !important; }
        .hover\:text-amber-300:hover, .hover\:text-amber-400:hover { color: ${preset.from} !important; }

        /* ── Gradient backgrounds ── */
        .bg-gradient-to-r.from-amber-500,
        .bg-gradient-to-br.from-amber-500 {
            background: linear-gradient(to right, ${preset.from}, ${preset.via}) !important;
            color: ${preset.fg} !important;
        }
        .bg-gradient-to-r.from-amber-500.to-orange-500 {
            background: linear-gradient(to right, ${preset.from}, ${preset.via}) !important;
        }

        /* ── Shadow colors ── */
        .shadow-amber-500\/20 { --tw-shadow-color: ${preset.from}33 !important; }
        .shadow-amber-500\/40 { --tw-shadow-color: ${preset.from}66 !important; }

        /* ── Ring colors ── */
        .ring-amber-500\/30 { --tw-ring-color: ${preset.from}4d !important; }
        .ring-2.ring-inset.ring-amber-500\/30 { --tw-ring-color: ${preset.from}4d !important; }

        /* ── Tabs: active state ── */
        [role="tab"][data-state="active"],
        [data-state="active"][role="tab"] {
            background-color: ${preset.from} !important;
            color: ${preset.fg} !important;
        }
        .data-\[state\=active\]\:bg-amber-600[data-state="active"] {
            background-color: ${preset.from} !important;
            color: ${preset.fg} !important;
        }

        /* ── Buttons with brand bg ── */
        .bg-amber-600 { background-color: ${preset.from} !important; color: ${preset.fg} !important; }
        .bg-amber-600.hover\:bg-amber-700:hover { background-color: ${preset.via} !important; }

        /* ── Primary button (uses --primary HSL) ── */
        .bg-primary { background: linear-gradient(135deg, ${preset.from}, ${preset.via}) !important; color: ${preset.fg} !important; }
        .hover\:bg-primary\/90:hover { background: linear-gradient(135deg, ${preset.via}, ${preset.from}) !important; }

        /* ── Active nav & mobile states ── */
        [class*="text-amber-"] { color: ${preset.from} !important; }

        /* ── Focus & ring ── */
        :focus-visible { outline-color: ${preset.from} !important; }
        input:focus, textarea:focus, select:focus {
            border-color: ${preset.from} !important;
            box-shadow: 0 0 0 2px ${preset.from}33 !important;
        }

        /* ── Checkbox & Switch checked ── */
        [data-state="checked"] {
            background-color: ${preset.from} !important;
            border-color: ${preset.from} !important;
        }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar-thumb { background: ${preset.from}55 !important; }
        ::-webkit-scrollbar-thumb:hover { background: ${preset.from} !important; }

        /* ── Progress bars ── */
        .bg-amber-500, .bg-amber-600 { background-color: ${preset.from} !important; }

        /* ── Dot indicators ── */
        .bg-amber-500.rounded-full, .w-2.h-2.bg-amber-500 { background-color: ${preset.from} !important; }

        /* ── Gradient cards / panels ── */
        .from-amber-500\/10 { --tw-gradient-from: ${preset.from}1a !important; }
        .to-orange-500\/10, .to-orange-500\/20 { --tw-gradient-to: ${preset.via}1a !important; }
        .from-amber-900\/30 { --tw-gradient-from: ${preset.from}33 !important; }
        .to-orange-900\/20 { --tw-gradient-to: ${preset.via}22 !important; }
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
        const raw = companies[0];
        const info = raw?.data ? raw.data : raw;
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

    const rawCompany = companyList?.[0];
    const company = rawCompany?.data ? { ...rawCompany.data, id: rawCompany.id } : rawCompany;

    useEffect(() => {
        if (company?.theme_preset_key) {
            setSelected(company.theme_preset_key);
            setPreviewKey(company.theme_preset_key);
        }
    }, [company]);

    const saveMutation = useMutation({
        mutationFn: async (key) => {
            if (!company?.id) throw new Error('Keine Firmendaten gefunden');
            return base44.entities.CompanyInfo.update(company.id, { theme_preset_key: key });
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