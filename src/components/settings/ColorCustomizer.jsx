import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const ACCENT_PRESETS = [
    { name: 'Amber (Standard)', key: 'amber', from: '#f59e0b', via: '#f97316', ring: '38 92% 50%', text: '#92400e' },
    { name: 'Orange', key: 'orange', from: '#f97316', via: '#ef4444', ring: '24 95% 53%', text: '#7c2d12' },
    { name: 'Rose', key: 'rose', from: '#f43f5e', via: '#e11d48', ring: '346 87% 60%', text: '#881337' },
    { name: 'Violet', key: 'violet', from: '#7c3aed', via: '#6d28d9', ring: '262 83% 58%', text: '#ede9fe' },
    { name: 'Blau', key: 'blue', from: '#3b82f6', via: '#2563eb', ring: '217 91% 60%', text: '#dbeafe' },
    { name: 'Cyan', key: 'cyan', from: '#06b6d4', via: '#0891b2', ring: '192 91% 50%', text: '#cffafe' },
    { name: 'Grün', key: 'green', from: '#22c55e', via: '#16a34a', ring: '142 71% 45%', text: '#dcfce7' },
    { name: 'Pink', key: 'pink', from: '#ec4899', via: '#db2777', ring: '330 86% 60%', text: '#fce7f3' },
];

const BG_PRESETS = [
    { name: 'Standard', key: 'default', bg: '222.2 47.4% 11.2%', card: '217.2 32.6% 17.5%', hex: '#1a2236' },
    { name: 'Tief Dunkel', key: 'deep', bg: '0 0% 7%', card: '0 0% 12%', hex: '#111111' },
    { name: 'Marine', key: 'navy', bg: '230 50% 10%', card: '230 40% 15%', hex: '#0d1a36' },
    { name: 'Slate', key: 'slate', bg: '215 28% 12%', card: '215 25% 18%', hex: '#1a2130' },
];

export function applyAccentColor(preset) {
    const root = document.documentElement;
    root.style.setProperty('--primary', preset.ring);
    root.style.setProperty('--ring', preset.ring);
    root.style.setProperty('--accent-from', preset.from);
    root.style.setProperty('--accent-via', preset.via || preset.from);

    // Injiziere dynamisches CSS für alle UI-Elemente
    const styleId = 'accent-color-override';
    let style = document.getElementById(styleId);
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
    }
    style.textContent = `
        /* Buttons */
        .bg-primary, button.bg-primary { background: linear-gradient(135deg, ${preset.from}, ${preset.via}) !important; }
        
        /* Aktive Menüpunkte (Desktop Sidebar) */
        a.bg-gradient-to-r.from-amber-500, 
        a[class*="from-amber-500"],
        a[class*="from-orange-500"] {
            background: linear-gradient(to right, ${preset.from}, ${preset.via}) !important;
        }

        /* Mobile aktive Nav-Links */
        .text-amber-500 { color: ${preset.from} !important; }
        a.text-amber-500, button.text-amber-500 { color: ${preset.from} !important; }
        
        /* Hover-Zustände */
        .hover\\:text-amber-500:hover { color: ${preset.from} !important; }

        /* Logo/Icon in Sidebar */
        .from-amber-500 { --tw-gradient-from: ${preset.from} !important; }
        .via-amber-600 { --tw-gradient-via: ${preset.via} !important; }
        .to-orange-600 { --tw-gradient-to: ${preset.via} !important; }

        /* Gradient-Badges und Highlights */
        .bg-gradient-to-br.from-amber-500\\/10 { background: linear-gradient(to bottom right, ${preset.from}1a, ${preset.via}1a) !important; }
        .border-amber-500\\/20 { border-color: ${preset.from}33 !important; }
        .text-amber-500 { color: ${preset.from} !important; }
        .shadow-amber-500\\/20 { --tw-shadow-color: ${preset.from}33 !important; }

        /* Focus-Ring */
        :focus-visible { outline-color: ${preset.from} !important; }
        input:focus, textarea:focus, select:focus { 
            border-color: ${preset.from} !important; 
            box-shadow: 0 0 0 2px ${preset.from}33 !important; 
        }

        /* Checkboxen & Switches */
        [data-state="checked"] { background-color: ${preset.from} !important; border-color: ${preset.from} !important; }

        /* Progress-Bars */
        .bg-amber-500, [class*="bg-amber"] { background-color: ${preset.from} !important; }
        
        /* Tabs aktiv */
        [data-state="active"][role="tab"] { color: ${preset.from} !important; border-color: ${preset.from} !important; }

        /* Notification-Badge */
        .bg-amber-400, .bg-amber-500, .bg-amber-600 { background-color: ${preset.from} !important; }
        
        /* Scrollbar */
        ::-webkit-scrollbar-thumb { background: ${preset.from}66 !important; }
        ::-webkit-scrollbar-thumb:hover { background: ${preset.from} !important; }
    `;
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
}

export async function loadSavedColors() {
    try {
        const companies = await base44.entities.CompanyInfo.list();
        const info = companies[0];
        if (info) {
            const accentKey = info.accent_color_key || 'amber';
            const bgKey = info.bg_color_key || 'default';
            const accentPreset = ACCENT_PRESETS.find(p => p.key === accentKey);
            const bgPreset = BG_PRESETS.find(p => p.key === bgKey);
            if (accentPreset) applyAccentColor(accentPreset);
            if (bgPreset) applyBgColor(bgPreset);
        }
    } catch (e) {
        // Fallback: nichts tun
    }
}

export default function ColorCustomizer() {
    const queryClient = useQueryClient();
    const [selectedAccent, setSelectedAccent] = useState('amber');
    const [selectedBg, setSelectedBg] = useState('default');

    const { data: companyList } = useQuery({
        queryKey: ['company-info'],
        queryFn: () => base44.entities.CompanyInfo.list(),
    });

    const company = companyList?.[0];

    useEffect(() => {
        if (company) {
            setSelectedAccent(company.accent_color_key || 'amber');
            setSelectedBg(company.bg_color_key || 'default');
        }
    }, [company]);

    const saveMutation = useMutation({
        mutationFn: async ({ accentKey, bgKey }) => {
            if (company?.id) {
                return base44.entities.CompanyInfo.update(company.id, {
                    accent_color_key: accentKey,
                    bg_color_key: bgKey,
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-info'] });
            toast.success('Farben gespeichert – für alle Mitarbeiter übernommen');
        },
    });

    const handleAccentChange = (preset) => {
        setSelectedAccent(preset.key);
        applyAccentColor(preset);
    };

    const handleBgChange = (preset) => {
        setSelectedBg(preset.key);
        applyBgColor(preset);
    };

    const handleSave = () => {
        saveMutation.mutate({ accentKey: selectedAccent, bgKey: selectedBg });
    };

    const handleReset = () => {
        setSelectedAccent('amber');
        setSelectedBg('default');
        applyAccentColor(ACCENT_PRESETS[0]);
        applyBgColor(BG_PRESETS[0]);
        saveMutation.mutate({ accentKey: 'amber', bgKey: 'default' });
    };

    const currentAccent = ACCENT_PRESETS.find(p => p.key === selectedAccent);

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
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-secondary">Vorschau</div>
                <div className="p-4 flex gap-3 items-center">
                    <div
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-900"
                        style={{ background: currentAccent ? `linear-gradient(135deg, ${currentAccent.from}, ${currentAccent.via})` : '' }}
                    >
                        Aktiver Menüpunkt
                    </div>
                    <div className="px-4 py-2 rounded-lg text-sm border border-border text-muted-foreground">
                        Inaktiv
                    </div>
                </div>
            </div>

            {/* Aktionen */}
            <div className="pt-2 border-t border-border flex gap-3">
                <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
                    <Save className="w-4 h-4" />
                    {saveMutation.isPending ? 'Speichern...' : 'Für alle speichern'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Zurücksetzen
                </Button>
            </div>
        </Card>
    );
}