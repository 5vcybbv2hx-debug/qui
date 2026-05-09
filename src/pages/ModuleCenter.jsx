/**
 * ModuleCenter.jsx — Modulverwaltung für Admins/Manager
 * 
 * Zeigt alle aktiven Module, erlaubt Aktivieren/Deaktivieren,
 * und zeigt Abhängigkeiten zwischen Modulen.
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
    Package, Users, Calendar, Clock, CheckSquare, Brush, 
    RefreshCw, ShoppingCart, Wine, BookOpen, TrendingUp,
    FileText, BarChart2, Wrench, Star, Shield, Settings,
    ChevronRight, AlertTriangle, CheckCircle2, Info, Lock,
    MapPin, ClipboardList, Trash2, Euro
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/components/auth/usePermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ── Modul-Konfiguration ────────────────────────────────────────────────────

const MODULE_REGISTRY = [
    {
        id: 'mitarbeiter',
        name: 'Mitarbeiter',
        description: 'Mitarbeiterverwaltung, Personalbogen, Dokumente, RV-Befreiung',
        icon: Users,
        color: 'bg-blue-600',
        category: 'kern',
        page: 'Employees',
        required: true, // Pflichtmodul
        dependents: ['schichten', 'zeiterfassung', 'urlaub'],
    },
    {
        id: 'schichten',
        name: 'Schichtplanung',
        description: 'Schichtplan, Teamkalender, Schichttausch, Schichtanforderungen',
        icon: Calendar,
        color: 'bg-purple-600',
        category: 'planung',
        page: 'Calendar',
        requires: ['mitarbeiter'],
        dependents: ['zeiterfassung'],
    },
    {
        id: 'zeiterfassung',
        name: 'Zeiterfassung',
        description: 'Stempeluhr, Zeiteinträge, ArbZG-Prüfung, Terminal',
        icon: Clock,
        color: 'bg-indigo-600',
        category: 'planung',
        page: 'TimeManagement',
        requires: ['mitarbeiter'],
    },
    {
        id: 'urlaub',
        name: 'Urlaub & Abwesenheit',
        description: 'Urlaubsanträge, Abwesenheitsverwaltung',
        icon: Calendar,
        color: 'bg-sky-600',
        category: 'planung',
        page: 'Vacation',
        requires: ['mitarbeiter'],
    },
    {
        id: 'reservierungen',
        name: 'Reservierungen & Tische',
        description: 'Gästereservierungen, Tischplan, Räume, Warteliste',
        icon: MapPin,
        color: 'bg-green-600',
        category: 'gast',
        page: 'GuestHub',
    },
    {
        id: 'events',
        name: 'Events',
        description: 'Veranstaltungsplanung, Eventideen, Eventvorbereitungen',
        icon: Star,
        color: 'bg-pink-600',
        category: 'gast',
        page: 'Events',
    },
    {
        id: 'aufgaben',
        name: 'Aufgaben & To-Dos',
        description: 'Aufgabenverwaltung, Kategorien, Fälligkeiten, Anhänge',
        icon: CheckSquare,
        color: 'bg-orange-600',
        category: 'betrieb',
        page: 'Todos',
    },
    {
        id: 'reinigung',
        name: 'Reinigung & Hygiene',
        description: 'Putztlisten, Bereiche, Wochenaufgaben, Checklisten',
        icon: Brush,
        color: 'bg-teal-600',
        category: 'betrieb',
        page: 'Cleaning',
    },
    {
        id: 'auffuellen',
        name: 'Auffüllen & Restock',
        description: 'Nachfülllisten, Lagerauffüllung, Bestandsänderungen',
        icon: RefreshCw,
        color: 'bg-amber-600',
        category: 'betrieb',
        page: 'Restock',
        requires: ['artikel'],
    },
    {
        id: 'einkauf',
        name: 'Einkaufsliste',
        description: 'Einkauf, Bestellungen, Lieferantenanfragen',
        icon: ShoppingCart,
        color: 'bg-yellow-600',
        category: 'betrieb',
        page: 'Shopping',
    },
    {
        id: 'artikel',
        name: 'Artikel & Lager',
        description: 'Artikelverwaltung, Bestand, Inventur, Lagerverwaltung, Schwund',
        icon: Package,
        color: 'bg-slate-600',
        category: 'lager',
        page: 'Articles',
        dependents: ['rezepte', 'kalkulation', 'auffuellen', 'menu'],
    },
    {
        id: 'lieferanten',
        name: 'Lieferanten',
        description: 'Lieferantenstammdaten, Kontakte, Konditionen',
        icon: Package,
        color: 'bg-stone-600',
        category: 'lager',
        page: 'Suppliers',
        requires: ['artikel'],
    },
    {
        id: 'rezepte',
        name: 'Rezepte',
        description: 'Rezeptverwaltung, Zutaten, Allergene, Produktionsmengen',
        icon: BookOpen,
        color: 'bg-rose-600',
        category: 'karte',
        page: 'Recipes',
        requires: ['artikel'],
    },
    {
        id: 'menu',
        name: 'Getränkekarte',
        description: 'Digitale Speisekarte, Public Menu, Tagesangebote, QR-Code',
        icon: Wine,
        color: 'bg-red-700',
        category: 'karte',
        page: 'DrinkMenu',
        requires: ['artikel'],
    },
    {
        id: 'kalkulation',
        name: 'Preiskalkulation',
        description: 'Getränkekalkulation, Marge, Deckungsbeitrag, Preisvorschläge',
        icon: TrendingUp,
        color: 'bg-emerald-600',
        category: 'karte',
        page: 'PriceCalculator',
        requires: ['artikel'],
        sensitive: true,
    },
    {
        id: 'analytics',
        name: 'Berichte & Analytik',
        description: 'Tagesabschluss, Umsatzanalyse, Lohnberichte, DATEV-Export',
        icon: BarChart2,
        color: 'bg-violet-600',
        category: 'analytics',
        page: 'DailyAnalysis',
        sensitive: true,
    },
    {
        id: 'buchhaltung',
        name: 'Buchhaltung',
        description: 'KI-gestützte Buchhaltungsvorbereitung mit Kassenbuch, Belegen, Debitoren, Kreditoren, Monatsabschluss und DATEV-Export',
        icon: Euro,
        color: 'bg-emerald-600',
        category: 'verwaltung',
        page: 'AccountingDashboard',
        sensitive: true,
        requires: ['analytics'],
    },
    {
        id: 'wartung',
        name: 'Wartung & Instandhaltung',
        description: 'Wartungsaufgaben, Reparaturen, Kontakte, Kalender',
        icon: Wrench,
        color: 'bg-zinc-600',
        category: 'betrieb',
        page: 'Maintenance',
    },
    {
        id: 'dokumente',
        name: 'Dokumente',
        description: 'Dokumentenarchiv, Kategorien, Verträge, Anhänge',
        icon: FileText,
        color: 'bg-cyan-700',
        category: 'verwaltung',
        page: 'Documents',
    },
    {
        id: 'onboarding',
        name: 'Einarbeitung',
        description: 'Onboarding-Checklisten, Aufgaben, Fortschritt',
        icon: Users,
        color: 'bg-lime-600',
        category: 'verwaltung',
        page: 'Onboarding',
        requires: ['mitarbeiter'],
    },
    {
        id: 'stationsplan',
        name: 'Stationsplan',
        description: 'Stationen zuweisen, Mitarbeiter einplanen, Überblick über Positionen',
        icon: MapPin,
        color: 'bg-fuchsia-600',
        category: 'betrieb',
        page: 'Stationsplan',
        requires: ['mitarbeiter'],
    },
];

const CATEGORIES = {
    kern:       { name: 'Kern', color: 'text-blue-400'   },
    planung:    { name: 'Planung & Personal', color: 'text-purple-400' },
    gast:       { name: 'Gäste & Veranstaltungen', color: 'text-green-400' },
    betrieb:    { name: 'Betrieb & Operativ', color: 'text-amber-400'  },
    lager:      { name: 'Lager & Einkauf', color: 'text-slate-400'   },
    karte:      { name: 'Karte & Rezepte', color: 'text-red-400'    },
    analytics:  { name: 'Analytik & Reports', color: 'text-violet-400' },
    verwaltung: { name: 'Verwaltung', color: 'text-cyan-400'  },
    buchhaltung: { name: 'Buchhaltung', color: 'text-emerald-400' },
};

// Lokal gespeicherter Aktivierungsstatus (könnte später in DB)
function useModuleState() {
    const [moduleStates, setModuleStates] = useState(() => {
        try {
            const saved = localStorage.getItem('moduleCenter_states');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const setModule = (id, enabled) => {
        const next = { ...moduleStates, [id]: enabled };
        setModuleStates(next);
        localStorage.setItem('moduleCenter_states', JSON.stringify(next));
    };

    const isEnabled = (module) => {
        if (module.required) return true;
        return moduleStates[module.id] !== false; // default: aktiviert
    };

    return { isEnabled, setModule };
}

// ── Modul Karte ────────────────────────────────────────────────────────────

function ModuleCard({ module, isEnabled, onToggle, allModules }) {
    const Icon = module.icon;
    const requires = (module.requires || []).map(id => allModules.find(m => m.id === id)).filter(Boolean);
    const dependents = (module.dependents || []).map(id => allModules.find(m => m.id === id)).filter(Boolean);
    const canDisable = !module.required && dependents.length === 0;

    return (
        <Card className={cn(
            'border transition-all',
            isEnabled ? 'border-border bg-card' : 'border-border/40 bg-card/50 opacity-60'
        )}>
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', module.color, !isEnabled && 'grayscale opacity-50')}>
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-foreground">{module.name}</p>
                            {module.required && <Badge className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">Pflicht</Badge>}
                            {module.sensitive && <Badge className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" />Admin</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{module.description}</p>

                        {/* Abhängigkeiten */}
                        {requires.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                                <span className="text-[10px] text-muted-foreground">Benötigt:</span>
                                {requires.map(r => (
                                    <Badge key={r.id} variant="outline" className="text-[10px] py-0">{r.name}</Badge>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <Switch
                            checked={isEnabled}
                            onCheckedChange={onToggle}
                            disabled={module.required}
                        />
                        <Link to={createPageUrl(module.page)}>
                            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-muted-foreground">
                                Öffnen <ChevronRight className="w-3 h-3" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Statistik Header ───────────────────────────────────────────────────────

function ModuleStats({ modules, isEnabled }) {
    const total = modules.length;
    const active = modules.filter(m => isEnabled(m)).length;

    return (
        <div className="grid grid-cols-3 gap-3">
            {[
                { label: 'Gesamt', value: total, color: 'text-foreground' },
                { label: 'Aktiv', value: active, color: 'text-green-400' },
                { label: 'Inaktiv', value: total - active, color: 'text-muted-foreground' },
            ].map(s => (
                <Card key={s.label} className="bg-card border-border">
                    <CardContent className="p-3 text-center">
                        <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// ── MAIN ──────────────────────────────────────────────────────────────────

export default function ModuleCenter() {
    const permissions = usePermissions();
    const { isEnabled, setModule } = useModuleState();
    const [selectedCategory, setSelectedCategory] = useState('alle');

    if (!permissions.isManager) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="p-8 max-w-sm text-center border-border bg-card">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-foreground mb-2">Kein Zugriff</h2>
                    <p className="text-sm text-muted-foreground">Nur Manager und Admins können das Modulcenter verwalten.</p>
                </Card>
            </div>
        );
    }

    const categories = ['alle', ...Object.keys(CATEGORIES)];
    const filtered = selectedCategory === 'alle'
        ? MODULE_REGISTRY
        : MODULE_REGISTRY.filter(m => m.category === selectedCategory);

    const grouped = filtered.reduce((acc, m) => {
        if (!acc[m.category]) acc[m.category] = [];
        acc[m.category].push(m);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-8">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">

                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Package className="w-5 h-5 brand-text" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Modulcenter</h1>
                            <p className="text-sm text-muted-foreground">Module aktivieren, konfigurieren und verwalten</p>
                        </div>
                    </div>
                </div>

                {/* Hinweis */}
                <Alert className="mb-6 bg-blue-500/10 border-blue-500/30">
                    <Info className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-blue-300 text-sm">
                        Diese Software unterstützt betriebliche Prozesse, ersetzt jedoch keine Rechts-, Steuer- oder Arbeitsrechtsberatung.
                    </AlertDescription>
                </Alert>

                {/* Stats */}
                <ModuleStats modules={MODULE_REGISTRY} isEnabled={isEnabled} />

                {/* Kategorie Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2 mt-6 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                                selectedCategory === cat
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {cat === 'alle' ? 'Alle' : CATEGORIES[cat]?.name || cat}
                        </button>
                    ))}
                </div>

                {/* Module nach Kategorien */}
                <div className="mt-6 space-y-8">
                    {Object.entries(grouped).map(([cat, modules]) => (
                        <div key={cat}>
                            <h3 className={cn('text-xs font-bold uppercase tracking-widest mb-3', CATEGORIES[cat]?.color || 'text-muted-foreground')}>
                                {CATEGORIES[cat]?.name || cat}
                            </h3>
                            <div className="space-y-3">
                                {modules.map(module => (
                                    <ModuleCard
                                        key={module.id}
                                        module={module}
                                        isEnabled={isEnabled(module)}
                                        onToggle={(v) => setModule(module.id, v)}
                                        allModules={MODULE_REGISTRY}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Links zu Einstellungen */}
                <Card className="mt-8 border-border bg-card">
                    <CardContent className="p-4">
                        <p className="text-sm font-semibold text-foreground mb-3">Weitere Einstellungen</p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { to: 'Settings',        icon: Settings,   label: 'Einstellungen'  },
                                { to: 'CompanySettings', icon: FileText,   label: 'Firmendaten'    },
                                { to: 'Permissions',     icon: Shield,     label: 'Berechtigungen' },
                                { to: 'DataExport',      icon: Package,    label: 'Datenexport'    },
                                { to: 'MeinTag',         icon: Users,      label: 'Mein Tag'       },
                                { to: 'Dashboard',       icon: ClipboardList, label: 'Dashboard'   },
                            ].map(l => (
                                <Link key={l.to} to={createPageUrl(l.to)}>
                                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary transition-all">
                                        <l.icon className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-xs font-medium text-foreground">{l.label}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}