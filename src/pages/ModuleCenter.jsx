/**
 * ModuleCenter.jsx — Modulverwaltung für Admins/Manager
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE } from '@/lib/queryUtils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
    Package, Users, Calendar, Clock, CheckSquare, Brush,
    RefreshCw, ShoppingCart, Wine, BookOpen, TrendingUp,
    FileText, BarChart2, Wrench, Star, Shield, Settings,
    ChevronRight, Info, Lock, MapPin, ClipboardList, Euro,
    Trophy, Archive, BarChart, QrCode, Banknote, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/components/auth/usePermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

// ── Modul-Registry ────────────────────────────────────────────────────────

const MODULE_REGISTRY = [
    // KERN
    {
        id: 'mitarbeiter',
        name: 'Mitarbeiter',
        description: 'Mitarbeiterverwaltung, Personalbogen, Dokumente, RV-Befreiung',
        icon: Users,
        color: 'bg-blue-600',
        category: 'kern',
        page: 'Employees',
        required: true,
        dependents: ['schichten', 'zeiterfassung', 'urlaub', 'onboarding', 'stationsplan'],
    },

    // PLANUNG
    {
        id: 'schichten',
        name: 'Schichtplanung',
        description: 'Schichtplan, Teamkalender, Schichttausch, Anforderungen, Schichtanalyse',
        icon: Calendar,
        color: 'bg-purple-600',
        category: 'planung',
        page: 'Calendar',
        requires: ['mitarbeiter'],
        dependents: ['zeiterfassung'],
        subpages: ['TeamCalendar', 'ShiftSwaps', 'ShiftAnalytics', 'MyShifts'],
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
        subpages: ['TerminalClock', 'TimeTracking'],
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

    // GÄSTE
    {
        id: 'reservierungen',
        name: 'Reservierungen & Tische',
        description: 'Gästereservierungen, Tischplan, Räume, Warteliste',
        icon: MapPin,
        color: 'bg-green-600',
        category: 'gast',
        page: 'GuestHub',
        subpages: ['Reservations'],
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
        id: 'businesscard',
        name: 'Digitale Visitenkarte',
        description: 'Digitale Visitenkarte mit QR-Code zum Abscannen für Gäste',
        icon: QrCode,
        color: 'bg-teal-600',
        category: 'gast',
        page: 'BusinessCard',
    },

    // BETRIEB
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
        description: 'Putzlisten, Bereiche, Wochenaufgaben, Checklisten',
        icon: Brush,
        color: 'bg-teal-600',
        category: 'betrieb',
        page: 'Cleaning',
        subpages: ['CleaningChecklist', 'WeeklyTasks'],
    },
    {
        id: 'wartung',
        name: 'Wartung & Instandhaltung',
        description: 'Wartungsaufgaben, Reparaturen, Kontakte, Kalender',
        icon: Wrench,
        color: 'bg-slate-600',
        category: 'betrieb',
        page: 'Maintenance',
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

    // LAGER
    {
        id: 'artikel',
        name: 'Artikel & Lager',
        description: 'Artikelverwaltung, Bestand, Inventur, Lagerverwaltung, Schwund',
        icon: Package,
        color: 'bg-zinc-600',
        category: 'lager',
        page: 'Articles',
        dependents: ['rezepte', 'kalkulation', 'auffuellen', 'menu', 'lieferanten'],
        subpages: ['Inventory', 'Storage', 'Warehouse', 'Wastage'],
    },
    {
        id: 'auffuellen',
        name: 'Auffüllen & Restock',
        description: 'Nachfülllisten, Lagerauffüllung, Bestandsänderungen',
        icon: RefreshCw,
        color: 'bg-amber-600',
        category: 'lager',
        page: 'Restock',
        requires: ['artikel'],
    },
    {
        id: 'einkauf',
        name: 'Einkaufsliste',
        description: 'Einkauf, Bestellungen, Lieferantenanfragen',
        icon: ShoppingCart,
        color: 'bg-yellow-600',
        category: 'lager',
        page: 'Shopping',
    },
    {
        id: 'lieferanten',
        name: 'Kontakte & Partner',
        description: 'Lieferanten, Steuerberater, Anwälte, Dienstleister',
        icon: Package,
        color: 'bg-stone-600',
        category: 'lager',
        page: 'Suppliers',
    },

    // KARTE
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

    // ANALYTICS
    {
        id: 'analytics',
        name: 'Berichte & Analytik',
        description: 'Tagesabschluss, Umsatzanalyse, Lohnberichte, DATEV-Export',
        icon: BarChart2,
        color: 'bg-violet-600',
        category: 'analytics',
        page: 'DailyAnalysis',
        sensitive: true,
        subpages: ['Reports', 'SalesAnalysis', 'Closing'],
        dependents: ['buchhaltung'],
    },
    {
        id: 'wm',
        name: 'WM-Spielplan',
        description: 'Weltmeisterschaft 2026 — Live-Spielplan, Gruppen, Bracket',
        icon: Trophy,
        color: 'bg-amber-500',
        category: 'analytics',
        page: 'WorldCupSchedule',
    },

    // VERWALTUNG
    {
        id: 'buchhaltung',
        name: 'Buchhaltung',
        description: 'Kassenbuch, Belege, Debitoren/Kreditoren, Monatsabschluss, DATEV-Export',
        icon: Euro,
        color: 'bg-emerald-700',
        category: 'verwaltung',
        page: 'AccountingDashboard',
        sensitive: true,
        requires: ['analytics'],
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
];

const CATEGORIES = {
    kern:        { name: 'Kern',                  color: 'text-blue-400'      },
    planung:     { name: 'Planung & Personal',    color: 'text-purple-400'    },
    gast:        { name: 'Gäste & Events',        color: 'text-green-400'     },
    betrieb:     { name: 'Betrieb & Operativ',    color: 'text-amber-400'     },
    lager:       { name: 'Lager & Einkauf',       color: 'text-zinc-400'      },
    karte:       { name: 'Karte & Rezepte',       color: 'text-red-400'       },
    analytics:   { name: 'Analytik & Reports',   color: 'text-violet-400'    },
    verwaltung:  { name: 'Verwaltung',            color: 'text-cyan-400'      },
};

// ── Modul-State via CompanyInfo (persistent in DB) ────────────────────────

function useModuleState(companyInfo) {
    const queryClient = useQueryClient();

    const getStates = () => {
        try {
            const raw = companyInfo?.module_states;
            return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
        } catch { return {}; }
    };

    const saveMut = useMutation({
        mutationFn: async ({ id: ciId, states }) => {
            await base44.entities.CompanyInfo.update(ciId, { module_states: JSON.stringify(states) });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company-info'] }),
        onError: () => toast.error('Fehler beim Speichern'),
    });

    const setModule = (id, enabled) => {
        if (!companyInfo?.id) { toast.error('Firmendaten nicht geladen'); return; }
        const next = { ...getStates(), [id]: enabled };
        saveMut.mutate({ id: companyInfo.id, states: next });
        toast.success(enabled ? 'Modul aktiviert' : 'Modul deaktiviert');
    };

    const isEnabled = (module) => {
        if (module.required) return true;
        const states = getStates();
        return states[module.id] !== false;
    };

    return { isEnabled, setModule, isSaving: saveMut.isPending };
}

// ── ModuleCard ────────────────────────────────────────────────────────────

function ModuleCard({ module, isEnabled, onToggle, allModules, isSaving, isEnabledFn }) {
    const Icon = module.icon;
    const requires   = (module.requires   || []).map(id => allModules.find(m => m.id === id)).filter(Boolean);
    const dependents = (module.dependents || []).map(id => allModules.find(m => m.id === id)).filter(Boolean);

    // Kann nur deaktiviert werden wenn kein Pflicht-Modul und keine aktiven Dependents
    const activeDependents = dependents.filter(d => isEnabledFn ? isEnabledFn(d) : false);
    const canDisable = !module.required && activeDependents.length === 0;

    return (
        <Card className={cn(
            'border transition-all duration-200',
            isEnabled ? 'border-border bg-card' : 'border-border/40 bg-card/40 opacity-60'
        )}>
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        module.color,
                        !isEnabled && 'grayscale opacity-50'
                    )}>
                        <Icon className="w-5 h-5 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">{module.name}</p>
                            {module.required && (
                                <Badge className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30 py-0">Pflicht</Badge>
                            )}
                            {module.sensitive && (
                                <Badge className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30 py-0 flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" />Admin
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{module.description}</p>

                        {/* Benötigt */}
                        {requires.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                                <span className="text-[10px] text-muted-foreground">Benötigt:</span>
                                {requires.map(r => (
                                    <Badge key={r.id} variant="outline" className="text-[10px] py-0">{r.name}</Badge>
                                ))}
                            </div>
                        )}

                        {/* Warnung: aktive Dependents blockieren Deaktivierung */}
                        {!canDisable && !module.required && isEnabled && activeDependents.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                <span className="text-[10px] text-amber-400">
                                    Wird benötigt von: {activeDependents.map(d => d.name).join(', ')}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Rechts: Switch + Link */}
                    <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                        <Switch
                            checked={isEnabled}
                            onCheckedChange={onToggle}
                            disabled={module.required || !canDisable || isSaving}
                        />
                        <Link to={createPageUrl(module.page)}>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-8 gap-1 text-muted-foreground hover:text-foreground min-h-[44px] px-2"
                            >
                                Öffnen <ChevronRight className="w-3 h-3" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Stats Header ──────────────────────────────────────────────────────────

function ModuleStats({ modules, isEnabled }) {
    const total  = modules.length;
    const active = modules.filter(m => isEnabled(m)).length;
    return (
        <div className="grid grid-cols-3 gap-3">
            {[
                { label: 'Gesamt',  value: total,          color: 'text-foreground'       },
                { label: 'Aktiv',   value: active,         color: 'text-green-400'        },
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
    const permissions        = usePermissions();
    const [selectedCategory, setSelectedCategory] = useState('alle');

    const { data: companyInfo } = useQuery({
        queryKey: ['company-info'],
        queryFn: async () => {
            const r = await base44.entities.CompanyInfo.list('-last_updated', 1);
            return r?.[0] || null;
        },
        staleTime: STALE.SLOW,
    });

    const { isEnabled, setModule, isSaving } = useModuleState(companyInfo);

    if (!permissions.isManager) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="p-8 max-w-sm text-center border-border bg-card">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                    <h2 className="text-lg font-bold text-foreground mb-2">Kein Zugriff</h2>
                    <p className="text-sm text-muted-foreground">Nur Manager und Admins können das Modulcenter verwalten.</p>
                </Card>
            </div>
        );
    }

    const categories = ['alle', ...Object.keys(CATEGORIES)];
    const filtered   = selectedCategory === 'alle'
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
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Package className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Modulcenter</h1>
                            <p className="text-sm text-muted-foreground">Module aktivieren & verwalten</p>
                        </div>
                    </div>
                </div>

                {/* Hinweis */}
                <Alert className="mb-6 bg-blue-500/10 border-blue-500/30">
                    <Info className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-blue-300 text-sm">
                        Aktivierungsstatus wird in den Firmendaten gespeichert und gilt für alle Nutzer.
                        Module mit Abhängigkeiten können erst deaktiviert werden, wenn abhängige Module deaktiviert sind.
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
                                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border min-h-[36px]',
                                selectedCategory === cat
                                    ? 'bg-amber-500 text-slate-900 border-amber-500 font-semibold'
                                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {cat === 'alle' ? `Alle (${MODULE_REGISTRY.length})` : CATEGORIES[cat]?.name || cat}
                        </button>
                    ))}
                </div>

                {/* Module nach Kategorien */}
                <div className="mt-6 space-y-8">
                    {Object.entries(grouped).map(([cat, modules]) => (
                        <div key={cat}>
                            <h3 className={cn(
                                'text-xs font-bold uppercase tracking-widest mb-3',
                                CATEGORIES[cat]?.color || 'text-muted-foreground'
                            )}>
                                {CATEGORIES[cat]?.name || cat}
                                <span className="ml-2 font-normal text-muted-foreground normal-case tracking-normal">
                                    ({modules.filter(m => isEnabled(m)).length}/{modules.length} aktiv)
                                </span>
                            </h3>
                            <div className="space-y-3">
                                {modules.map(module => (
                                    <ModuleCard
                                        key={module.id}
                                        module={module}
                                        isEnabled={isEnabled(module)}
                                        isEnabledFn={isEnabled}
                                        onToggle={(v) => setModule(module.id, v)}
                                        allModules={MODULE_REGISTRY}
                                        isSaving={isSaving}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Links */}
                <Card className="mt-8 border-border bg-card">
                    <CardContent className="p-4">
                        <p className="text-sm font-semibold text-foreground mb-3">Einstellungen & Verwaltung</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                                { to: 'Settings',        icon: Settings,      label: 'Einstellungen'   },
                                { to: 'CompanySettings', icon: FileText,      label: 'Firmendaten'     },
                                { to: 'Permissions',     icon: Shield,        label: 'Berechtigungen'  },
                                { to: 'DataExport',      icon: Package,       label: 'Datenexport'     },
                                { to: 'Dashboard',       icon: ClipboardList, label: 'Dashboard'       },
                                { to: 'AuditLog',        icon: Archive,       label: 'Audit Log'       },
                            ].map(l => (
                                <Link key={l.to} to={createPageUrl(l.to)}>
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/40 hover:bg-secondary transition-all min-h-[44px]">
                                        <l.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                                        <span className="text-xs text-foreground font-medium">{l.label}</span>
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